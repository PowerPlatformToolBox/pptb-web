import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function load(path, client) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    const errors = [];
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            if (name === "@supabase/supabase-js") return { createClient: () => client };
            if (name === "@/lib/mock-auth") return { MOCK_AUTH_TOKEN: "mock" };
            throw new Error(`Unexpected import ${name}`);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
        console: { error: (...args) => errors.push(args) },
        URL,
    });
    return { exports, errors };
}

function request(body, token = "valid") {
    return new Request("https://example.test", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
    });
}

test("review submission validates version/rating/comment and stores a trimmed version", async () => {
    let inserted;
    const { exports } = await load("../app/api/ratings/submit/route.ts", {
        auth: { getUser: async () => ({ data: { user: { id: "reviewer" } } }) },
        from: () => ({ insert: async (row) => { inserted = row; return { error: null }; } }),
    });
    const valid = { toolId: "tool", rating: 5, toolVersion: " 1.2.3 ", comment: " Nice " };
    for (const change of [
        { toolVersion: " " }, { toolVersion: 123 },
        { toolVersion: "v".repeat(101) }, { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: "5" },
        { comment: {} }, { comment: "x".repeat(501) }, { toolId: {} },
    ]) {
        assert.equal((await exports.POST(request({ ...valid, ...change }))).status, 400);
        assert.equal(inserted, undefined);
    }
    assert.equal((await exports.POST(new Request("https://example.test", { method: "POST", body: "{" }))).status, 400);
    assert.equal((await exports.POST(request(valid, null))).status, 401);
    assert.equal((await exports.POST(request(valid))).status, 200);
    assert.equal(inserted.tool_version, "1.2.3");
    assert.equal(inserted.comment, "Nice");
    assert.equal(inserted.user_id, "reviewer");
    for (const toolVersion of [undefined, null]) {
        assert.equal((await exports.POST(request({ ...valid, toolVersion }))).status, 200);
        assert.equal(inserted.tool_version, null);
    }
});

test("author endpoints enforce identity, ownership, review membership and explicit errors", async () => {
    let owner = true, found = true, authValid = true, rpcError = null;
    let calls = 0;
    const client = {
        auth: { getUser: async () => ({ data: { user: authValid ? { id: "owner" } : null } }) },
        from(table) {
            return {
                select() { return this; }, eq() { return this; },
                async maybeSingle() {
                    return { data: table === "tools" ? { user_id: owner ? "owner" : "other" } : found ? { id: "review" } : null, error: null };
                },
            };
        },
        async rpc(name, args) {
            calls++;
            assert.equal(name, "save_rating_author_reply");
            assert.equal(args.p_rating_id, "review");
            assert.equal(args.p_reply, "Thanks");
            return { data: { reply: "Thanks", created_at: "created", updated_at: "updated" }, error: rpcError };
        },
    };
    const { exports, errors } = await load("../app/api/ratings/[toolId]/reply/route.ts", client);
    const params = { params: Promise.resolve({ toolId: "tool" }) };
    const body = { ratingId: "review", reply: " Thanks " };
    assert.equal((await exports.POST(request(body, null), params)).status, 401);
    authValid = false;
    assert.equal((await exports.POST(request(body), params)).status, 401);
    authValid = true;
    owner = false;
    assert.deepEqual(await (await exports.GET(request({}), params)).json(), { canReply: false });
    assert.equal((await exports.POST(request(body), params)).status, 403);
    owner = true;
    assert.deepEqual(await (await exports.GET(request({}), params)).json(), { canReply: true });
    for (const reply of ["", " ", null, 12, "x".repeat(2001)]) {
        assert.equal((await exports.POST(request({ ...body, reply }), params)).status, 400);
    }
    found = false;
    assert.equal((await exports.POST(request(body), params)).status, 404);
    assert.equal(calls, 0);
    found = true;
    const response = await exports.POST(request(body), params);
    assert.deepEqual(await response.json(), { authorReply: { reply: "Thanks", createdAt: "created", updatedAt: "updated" } });
    for (const [code, status] of [["42501", 403], ["P0002", 404], ["XX000", 500]]) {
        rpcError = { code, message: "private database error" };
        const failed = await exports.POST(request(body), params);
        assert.equal(failed.status, status);
        assert.equal(JSON.stringify(await failed.json()).includes("private"), false);
    }
    assert.equal(errors.length, 1);
});

test("GitHub issue links are scoped to safe tool repositories", async () => {
    const { exports } = await load("../lib/reviews.ts", {});
    for (const url of ["https://github.com/owner/repo", "https://github.com/owner/repo.git/"]) {
        assert.equal(exports.getToolIssuesUrl(url), "https://github.com/owner/repo/issues");
    }
    for (const url of [null, "", "bad", "javascript:alert(1)", "https://example.test/o/r", "http://github.com/o/r", "https://github.com/o/r/extra", "https://user@github.com/o/r", "https://github.com:444/o/r"]) {
        assert.equal(exports.getToolIssuesUrl(url), null);
    }
});
