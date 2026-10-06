import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/api/submit-tool/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function submit({
    status = "needs_changes",
    owner = "user-id",
    inline = false,
    authenticated = true,
    failure,
    validPackage = true,
    contributors = [{ name: "New contributor", url: "https://example.test" }],
} = {}) {
    const original = status
        ? {
              id: "intake-id",
              package_name: "test-tool",
              submitted_by: owner,
              status,
              version: "1.0.0",
              display_name: "Original Tool",
              description: "Original description",
              license: "MIT",
              icon: null,
              csp_exceptions: null,
              configurations: null,
              validation_warnings: null,
              features: null,
              min_api: null,
              mcp_enabled: false,
              tool_idea_id: "idea-id",
              reviewer_notes: "Please fix",
              reviewed_by: "admin-id",
              reviewed_at: "2026-01-01T00:00:00Z",
              created_at: "2025-01-01T00:00:00Z",
          }
        : null;
    let intake = original && { ...original };
    let categories = original ? [{ tool_intake_id: "intake-id", category_id: 1 }] : [];
    let contributorLinks = original ? [{ tool_intake_id: "intake-id", contributor_id: "old-contributor" }] : [];
    const calls = [];
    const emails = [];
    const packageInfo = {
        name: "test-tool",
        version: "2.0.0",
        displayName: "Updated Tool",
        description: "Updated description",
        license: "MIT",
        contributors,
        configurations: { repository: "https://example.test/repo" },
        features: { minAPI: "1.2.3" },
    };
    const supabase = {
        auth: { getUser: async () => ({ data: { user: authenticated ? { id: "user-id", email: "developer@example.test" } : null }, error: null }) },
        from(table) {
            let operation = "select";
            let values;
            const filters = [];
            const query = {
                then(resolve, reject) {
                    let result = { data: null, error: null };
                    const key = `${table}:${operation}`;
                    if (failure === key && !(table === "tool_intake_categories" && operation === "insert" && values[0]?.category_id === 1)) {
                        result.error = { message: "Database failure" };
                    } else if (table === "tool_intakes") {
                        if (operation === "select") result.data = intake;
                        if (operation === "insert") {
                            intake = { id: "new-intake-id", ...values };
                            result.data = intake;
                        }
                        if (operation === "update" && failure !== "concurrent_update") {
                            const matches = filters.every(([column, value]) => intake?.[column] === value);
                            if (matches) {
                                intake = { ...intake, ...values };
                                result.data = intake;
                            }
                        }
                        if (operation === "delete") intake = null;
                    } else if (table === "tool_intake_categories") {
                        if (operation === "select") result.data = categories;
                        if (operation === "delete") categories = [];
                        if (operation === "insert") categories = [...categories, ...values];
                    } else if (table === "tool_intake_contributors") {
                        if (operation === "delete") contributorLinks = [];
                        if (operation === "insert") contributorLinks.push(values);
                    } else if (table === "categories") {
                        result.data = failure === "invalid_category" ? [] : [{ id: 1 }, { id: 2 }];
                    } else if (table === "contributors") {
                        result.data = { id: "new-contributor" };
                    } else if (table === "tool_ideas") {
                        result.data = { id: "idea-id" };
                    }
                    return Promise.resolve(result).then(resolve, reject);
                },
            };
            for (const method of ["select", "eq", "in", "single", "maybeSingle", "upsert", "delete", "update", "insert"]) {
                query[method] = (...args) => {
                    calls.push({ table, method, args });
                    if (["upsert", "delete", "update", "insert"].includes(method)) {
                        operation = method;
                        values = args[0];
                    }
                    if (method === "eq") filters.push(args);
                    return query;
                };
            }
            return query;
        },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "@/lib/resend") return { sendEmail: async (email) => emails.push(email) };
            if (name === "@/lib/tool-validation") return { fetchNpmPackageInfo: async () => ({ success: true, data: packageInfo }) };
            if (name === "@/lib/version-extraction")
                return { extractVersionInfo: async () => ({ success: true, data: { minAPI: "1.2.3", mcpEnabled: true, warnings: ["Config warning"] } }) };
            if (name === "@pptb/validate")
                return { validatePackageJson: async () => ({ valid: validPackage, packageInfo, errors: ["Invalid package"], warnings: ["Package warning"] }) };
            if (name === "@pptb/validate/npm")
                return { validatePackageStructure: async () => ({ success: true, data: { hasDistFolder: true, hasDistIndexHtml: true } }) };
            if (name === "@supabase/supabase-js") return { createClient: () => supabase };
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            return require(name);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
        console: { error() {}, warn() {}, log() {} },
    });
    const response = await exports.POST({
        headers: new Headers({ authorization: "Bearer " + "test-user-token" }),
        json: async () =>
            inline
                ? { intakeId: "intake-id" }
                : { packageName: " Test-Tool ", categoryIds: [2], linkedinProfileUrl: "https://linkedin.com/in/developer", toolIdeaId: "idea-id" },
    });
    return { status: response.status, body: await response.json(), calls, intake, original, categories, contributorLinks, emails };
}

test("resubmission refreshes the existing intake and replaces categories and contributors", async () => {
    const result = await submit();
    assert.equal(result.status, 200);
    assert.equal(result.body.data.id, "intake-id");
    assert.equal(result.intake.created_at, result.original.created_at);
    assert.equal(result.intake.submitted_by, "user-id");
    assert.equal(result.intake.status, "pending_review");
    assert.equal(result.intake.version, "2.0.0");
    assert.equal(result.intake.display_name, "Updated Tool");
    assert.equal(result.intake.description, "Updated description");
    assert.equal(result.intake.min_api, "1.2.3");
    assert.equal(result.intake.mcp_enabled, true);
    assert.equal(result.intake.reviewer_notes, null);
    assert.equal(result.intake.reviewed_by, null);
    assert.equal(result.intake.reviewed_at, null);
    assert.deepEqual(Array.from(result.intake.validation_warnings), ["Package warning", "Config warning"]);
    assert.deepEqual(Array.from(result.categories, (relation) => relation.category_id), [2]);
    assert.deepEqual(result.contributorLinks.map((relation) => relation.contributor_id), ["new-contributor"]);
    assert.equal(result.emails.length, 1);
    assert.ok(!result.calls.some(({ table, method }) => table === "tool_intakes" && ["insert", "delete"].includes(method)));
    assert.ok(result.calls.some(({ table, method, args }) => table === "tool_intakes" && method === "eq" && args[0] === "status" && args[1] === "needs_changes"));
});

test("inline resubmission reuses saved categories and idea without overwriting the developer profile", async () => {
    const result = await submit({ inline: true });
    assert.equal(result.status, 200);
    assert.equal(result.intake.tool_idea_id, "idea-id");
    assert.deepEqual(Array.from(result.categories, (relation) => relation.category_id), [1]);
    assert.ok(!result.calls.some(({ table, method }) => table === "user_profiles" && method === "upsert"));
});

test("resubmission removes stale contributor links even when the new package has none", async () => {
    const result = await submit({ contributors: [] });
    assert.equal(result.status, 200);
    assert.deepEqual(result.contributorLinks, []);
});

test("new submissions still insert a pending-review intake", async () => {
    const result = await submit({ status: null });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.id, "new-intake-id");
    assert.equal(result.intake.status, "pending_review");
    assert.ok(result.calls.some(({ table, method }) => table === "tool_intakes" && method === "insert"));
});

for (const status of ["pending_review", "approved", "rejected", "converted_to_tool"]) {
    test(`existing ${status} intakes remain duplicate submissions`, async () => {
        const result = await submit({ status });
        assert.equal(result.status, 409);
        assert.equal(result.body.step, "duplicate_check");
        assert.deepEqual(result.intake, result.original);
        assert.equal(result.emails.length, 0);
    });
}

for (const inline of [false, true]) {
    test(`resubmission requires ownership (${inline ? "inline" : "form"})`, async () => {
        const result = await submit({ owner: "another-user", inline });
        assert.equal(result.status, 403);
        assert.deepEqual(result.intake, result.original);
        assert.ok(!result.calls.some(({ method }) => ["insert", "delete", "update", "upsert"].includes(method)));
    });
}

test("resubmission requires authentication", async () => {
    const result = await submit({ authenticated: false, inline: true });
    assert.equal(result.status, 401);
    assert.equal(result.calls.length, 0);
});

test("inline resubmission rejects missing intakes", async () => {
    const result = await submit({ status: null, inline: true });
    assert.equal(result.status, 404);
    assert.equal(result.intake, null);
});

test("invalid npm packages leave the existing intake untouched", async () => {
    const result = await submit({ validPackage: false, inline: true });
    assert.equal(result.status, 400);
    assert.equal(result.body.step, "validation");
    assert.deepEqual(result.intake, result.original);
});

for (const failure of ["tool_intakes:select", "tool_intake_categories:select", "categories:select", "invalid_category", "tool_intakes:update", "concurrent_update"]) {
    test(`${failure} leaves the existing intake and relationships untouched`, async () => {
        const result = await submit({ failure });
        assert.equal(result.status, failure === "invalid_category" ? 400 : failure === "concurrent_update" ? 409 : 500);
        assert.deepEqual(result.intake, result.original);
        assert.deepEqual(Array.from(result.categories, (relation) => relation.category_id), [1]);
        assert.deepEqual(result.contributorLinks.map((relation) => relation.contributor_id), ["old-contributor"]);
        assert.equal(result.emails.length, 0);
    });
}

for (const failure of ["tool_intake_categories:delete", "tool_intake_categories:insert", "tool_intake_contributors:delete"]) {
    test(`${failure} restores rather than deletes a resubmitted intake`, async () => {
        const result = await submit({ failure });
        assert.equal(result.status, 500);
        assert.deepEqual(result.intake, result.original);
        assert.deepEqual(Array.from(result.categories, (relation) => relation.category_id), [1]);
        assert.deepEqual(result.contributorLinks.map((relation) => relation.contributor_id), ["old-contributor"]);
        assert.ok(!result.calls.some(({ table, method }) => table === "tool_intakes" && method === "delete"));
        assert.equal(result.emails.length, 0);
    });
}

test("category insert failure still rolls back a newly inserted intake", async () => {
    const result = await submit({ status: null, failure: "tool_intake_categories:insert" });
    assert.equal(result.status, 500);
    assert.equal(result.intake, null);
    assert.ok(result.calls.some(({ table, method }) => table === "tool_intakes" && method === "delete"));
});
