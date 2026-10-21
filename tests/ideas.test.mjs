import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(source, dependencies = {}) {
    const exports = {};
    vm.runInNewContext(
        ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
        {
            exports,
            require: (name) => dependencies[name] ?? require(name),
            process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
            console: { error() {} },
        },
    );
    return exports;
}
const ideas = load(await readFile(new URL("../lib/ideas.ts", import.meta.url), "utf8"));
const routeSource = await readFile(new URL("../app/api/admin/ideas/route.ts", import.meta.url), "utf8");
const id = "11111111-1111-4111-8111-111111111111";
const original = "22222222-2222-4222-8222-222222222222";
const validReview = {
    id,
    expectedUpdatedAt: "2026-10-21T12:00:00.123456Z",
    status: "open",
    resolution: null,
    publicNote: null,
    duplicateOf: null,
    githubIssueUrl: null,
};

test("idea filters compose all three types with every status", () => {
    const entries = Object.keys(ideas.IDEA_TYPES).flatMap((idea_type) => Object.keys(ideas.IDEA_STATUSES).map((status) => ({ idea_type, status })));
    assert.equal(ideas.filterIdeas(entries, "all", "all").length, 15);
    for (const type of Object.keys(ideas.IDEA_TYPES)) {
        assert.equal(ideas.filterIdeas(entries, type, "all").length, 5);
        for (const status of Object.keys(ideas.IDEA_STATUSES)) {
            assert.equal(ideas.filterIdeas(entries, type, status).length, 1);
        }
    }
    assert.equal(ideas.filterIdeas([], "tool", "open").length, 0);
});

test("vote eligibility excludes closed and duplicate ideas", () => {
    for (const status of ["open", "under_review", "planned"]) assert.equal(ideas.canVoteForIdea(status), true);
    for (const status of ["closed", "duplicate"]) assert.equal(ideas.canVoteForIdea(status), false);
});

test("GitHub links must use the canonical matching repository issue URL", () => {
    const desktop = "https://github.com/PowerPlatformToolBox/desktop-app/issues/12";
    assert.equal(ideas.isGithubIssueUrl(desktop, "pptb_desktop"), true);
    assert.equal(ideas.isGithubIssueUrl(desktop, "pptb_vscode"), false);
    assert.equal(ideas.isGithubIssueUrl(desktop, "tool"), false);
    for (const url of [
        desktop + "?foo=bar",
        desktop + "#comment",
        desktop + "\n",
        desktop.replace("issues/12", "pull/12"),
        desktop.replace("/12", "/0"),
        desktop.replace("github.com/", "github.com.evil.test/"),
        desktop.replace("https:", "http:"),
        "javascript:alert(1)",
    ])
        assert.equal(ideas.isGithubIssueUrl(url, "pptb_desktop"), false);
});

test("review validation enforces status/resolution/duplicate combinations", () => {
    assert.equal(ideas.validateIdeaReview(validReview), null);
    for (const resolution of Object.keys(ideas.IDEA_RESOLUTIONS)) {
        assert.equal(ideas.validateIdeaReview({ ...validReview, status: "closed", resolution, publicNote: "Explanation" }), null);
    }
    assert.equal(ideas.validateIdeaReview({ ...validReview, status: "duplicate", duplicateOf: original }), null);
    for (const invalid of [
        null,
        {},
        { ...validReview, status: "unknown" },
        { ...validReview, status: "toString" },
        { ...validReview, status: "closed" },
        { ...validReview, status: "closed", resolution: "implemented", publicNote: " " },
        { ...validReview, resolution: "implemented" },
        { ...validReview, publicNote: "x".repeat(3001) },
        { ...validReview, status: "duplicate", duplicateOf: id },
        { ...validReview, duplicateOf: original },
        { ...validReview, status: "duplicate", duplicateOf: "invalid" },
        { ...validReview, githubIssueUrl: "https://example.test" },
        { ...validReview, expectedUpdatedAt: "invalid" },
    ])
        assert.ok(ideas.validateIdeaReview(invalid));
});

async function call({ method = "PATCH", token = "token", admin = true, authenticated = true, roleError = false, rpcError = null, body = validReview, invalidJson = false } = {}) {
    const calls = [];
    const configs = [];
    const client = {
        auth: { getUser: async () => ({ data: { user: authenticated ? { id: "admin-id" } : null }, error: null }) },
        from: () => {
            const query = {
                select() {
                    return query;
                },
                eq() {
                    return query;
                },
                limit: async () => ({ data: admin ? [{ role: "admin" }] : [], error: roleError ? { message: "Failed" } : null }),
            };
            return query;
        },
        rpc: async (name, args) => {
            calls.push({ name, args });
            return { data: name === "get_ideas" ? [] : null, error: rpcError };
        },
    };
    const route = load(routeSource, {
        "@/lib/ideas": ideas,
        "@supabase/supabase-js": {
            createClient: (_url, _key, config) => {
                configs.push(config);
                return client;
            },
        },
        "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    });
    const response = await route[method]({
        headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}),
        json: async () => {
            if (invalidJson) throw new SyntaxError("Invalid JSON");
            return body;
        },
    });
    return { status: response.status, body: await response.json(), calls, configs };
}

test("admin API rejects missing/expired auth, non-admins and role lookup failures", async () => {
    for (const [options, expected] of [
        [{ token: null }, 401],
        [{ authenticated: false }, 401],
        [{ admin: false }, 403],
        [{ roleError: true }, 500],
    ]) {
        for (const method of ["GET", "PATCH"]) {
            const result = await call({ ...options, method });
            assert.equal(result.status, expected);
            assert.equal(result.calls.length, 0);
        }
    }
});

test("admin API rejects malformed updates before calling the review RPC", async () => {
    for (const options of [{ invalidJson: true }, { body: { ...validReview, status: "closed" } }, { body: null }]) {
        const result = await call(options);
        assert.equal(result.status, 400);
        assert.equal(result.calls.length, 0);
    }
});

test("admin API forwards verified identity and exact timestamp to database authorization", async () => {
    const result = await call();
    assert.equal(result.status, 200);
    assert.equal(result.configs[1].global.headers.Authorization, "Bearer token");
    assert.deepEqual(JSON.parse(JSON.stringify(result.calls)), [
        {
            name: "review_idea",
            args: {
                p_id: id,
                p_expected_updated_at: validReview.expectedUpdatedAt,
                p_status: "open",
                p_resolution: null,
                p_public_note: null,
                p_duplicate_of: null,
                p_github_issue_url: null,
            },
        },
    ]);
});

test("admin GET uses the public-safe combined board projection", async () => {
    const result = await call({ method: "GET" });
    assert.equal(result.status, 200);
    assert.equal(result.calls[0].name, "get_ideas");
    assert.deepEqual(result.body.data, []);
});

test("admin API surfaces conflicts, invalid references, permission failures and database errors", async () => {
    for (const [code, status] of [
        ["40001", 409],
        ["23514", 400],
        ["23503", 400],
        ["22023", 400],
        ["42501", 403],
        ["P0002", 404],
        ["XX000", 500],
    ]) {
        const result = await call({ rpcError: { code, message: "Internal database details" } });
        assert.equal(result.status, status);
        assert.ok(!result.body.error.includes("Internal database details"));
    }
});
