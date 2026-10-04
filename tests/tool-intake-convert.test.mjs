import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/api/admin/tool-intakes/convert/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function convert({ intakeVersion = "2.0.0", releaseVersion = "2.0.0", releaseId = "release-id", releaseError = null, mcpEnabled = true } = {}) {
    const calls = [];
    let workflowInputs;
    const results = {
        user_roles: { data: { role: "admin" }, error: null },
        tool_intakes: {
            data: { id: "intake-id", status: "approved", package_name: "test-tool", version: intakeVersion, mcp_enabled: mcpEnabled },
            error: null,
        },
        tools: { data: { id: "tool-id", name: "Test Tool", version: "1.0.0", current_release_id: releaseId }, error: null },
        tool_releases: { data: releaseError ? null : { id: "release-id", version: releaseVersion }, error: releaseError },
        tool_release_features: { error: null },
    };
    const supabase = {
        auth: { getUser: async () => ({ data: { user: { id: "admin-id" } }, error: null }) },
        from(table) {
            const query = {
                then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject); },
            };
            for (const method of ["select", "eq", "single", "upsert", "delete", "update", "insert"]) {
                query[method] = (...args) => {
                    calls.push({ table, method, args });
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
            if (name === "@/lib/github-api") return { runConvertToolWorkflow: async ({ inputs }) => { workflowInputs = inputs; return "success"; } };
            if (name === "@/lib/resend") return { sendEmail: async () => {} };
            if (name === "@supabase/supabase-js") return { createClient: () => supabase };
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            return require(name);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test", GH_PAT_TOKEN: "test" } },
        console: { error() {} },
    });
    const response = await exports.POST({
        headers: new Headers({ authorization: "Bearer test" }),
        json: async () => ({ intakeId: "intake-id" }),
    });
    return { status: response.status, body: await response.json(), calls, workflowInputs };
}

test("conversion checks the linked release instead of the stale legacy tools version", async () => {
    const result = await convert();
    assert.equal(result.status, 200);
    assert.equal(result.body.data.status, "converted_to_tool");
    assert.ok(result.calls.some(({ table, method, args }) => table === "tool_releases" && method === "eq" && args[0] === "tool_id" && args[1] === "tool-id"));
    assert.ok(result.calls.some(({ table, method, args }) => table === "tool_releases" && method === "eq" && args[0] === "id" && args[1] === "release-id"));
    assert.ok(result.calls.some(({ table, method, args }) => table === "tool_release_features" && method === "upsert" && args[0].release_id === "release-id"));
    assert.ok(result.calls.some(({ table, method, args }) => table === "tool_intakes" && method === "update" && args[0].status === "converted_to_tool"));
});

test("conversion uses the workflow's default version when the intake version is missing", async () => {
    const result = await convert({ intakeVersion: null, releaseVersion: "1.0.0" });
    assert.equal(result.workflowInputs.version, "1.0.0");
    assert.equal(result.status, 200);
});

test("conversion removes MCP status when the intake does not enable it", async () => {
    const result = await convert({ mcpEnabled: false });
    assert.equal(result.status, 200);
    assert.ok(result.calls.some(({ table, method }) => table === "tool_release_features" && method === "delete"));
});

for (const [name, options, message] of [
    ["missing current release", { releaseId: null }, /no current release/],
    ["release lookup failure", { releaseError: { message: "not found" } }, /could not be loaded/],
    ["wrong release version", { releaseVersion: "1.5.0" }, /version "1.5.0" instead of the expected "2.0.0"/],
]) {
    test(`conversion rejects ${name} without updating MCP or intake status`, async () => {
        const result = await convert(options);
        assert.equal(result.status, 500);
        assert.match(result.body.error, message);
        assert.ok(!result.calls.some(({ table }) => table === "tool_release_features"));
        assert.ok(!result.calls.some(({ table, method }) => table === "tool_intakes" && method === "update"));
    });
}