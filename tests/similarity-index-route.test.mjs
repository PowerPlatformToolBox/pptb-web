import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const source = await compile("../app/api/admin/similarity-index/route.ts");
const policySource = await compile("../lib/tool-similarity.ts");

async function post({ token = "Bearer test", authenticated = true, admin = true, roleError = null, configured = true, fail = false, invalidAuth = false } = {}) {
    const policy = {};
    vm.runInNewContext(policySource, { exports: policy, console });
    const exports = {};
    let indexCalls = 0;
    let authCalls = 0;
    const filters = [];
    const supabase = {
        auth: { getUser: async () => {
            authCalls++;
            return { data: { user: authenticated ? { id: "user-id" } : null }, error: invalidAuth ? {} : null };
        } },
        from(table) {
            assert.equal(table, "user_roles");
            const query = {
                select: () => query,
                eq: (...args) => { filters.push(args); return query; },
                maybeSingle: async () => ({ data: admin ? { role: "admin" } : null, error: roleError }),
            };
            return query;
        },
    };
    vm.runInNewContext(source, {
        exports,
        require(name) {
            if (name === "@supabase/supabase-js") return { createClient: () => supabase };
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            if (name === "@/lib/tool-similarity") return policy;
            if (name === "@/lib/similarity-index") return { indexPublishedTools: async () => {
                indexCalls++;
                if (fail) throw new policy.SimilarityServiceError("index_incomplete");
                return { indexed: 3, hasMore: true };
            } };
            throw new Error(`Unexpected import: ${name}`);
        },
        process: { env: configured ? { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test-key" } : {} },
        console: { error() {} },
    });
    const response = await exports.POST({ headers: new Headers(token ? { authorization: token } : {}) });
    return { status: response.status, body: await response.json(), indexCalls, authCalls, filters, maxDuration: exports.maxDuration };
}

test("admin can run a bounded backfill batch", async () => {
    const result = await post();
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.indexed, 3);
    assert.equal(result.body.hasMore, true);
    assert.deepEqual(result.filters, [["user_id", "user-id"], ["role", "admin"]]);
    assert.equal(result.maxDuration, 60);
});

for (const [options, expected] of [
    [{ token: null }, 401],
    [{ token: "Basic test" }, 401],
    [{ authenticated: false }, 401],
    [{ invalidAuth: true }, 401],
    [{ admin: false }, 403],
    [{ roleError: {} }, 500],
    [{ configured: false }, 500],
]) {
    test(`indexing is not invoked for ${JSON.stringify(options)}`, async () => {
        const result = await post(options);
        assert.equal(result.status, expected);
        assert.equal(result.indexCalls, 0);
    });
}

test("batch failure returns a safe explicit error", async () => {
    const result = await post({ fail: true });
    assert.equal(result.status, 502);
    assert.equal(result.body.code, "index_incomplete");
    assert.equal(result.body.success, undefined);
});
