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

const revision = "2026-11-19T23:00:00+00:00";
const receipt = { tool_id: "tool-id", release_id: "release-id", version: "1.1.0" };

async function convert({ intakeOverrides, requestOverrides, existingTool = null, available = true, workflowConclusion = "success", finalized = { ...receipt, finalized_now: true } } = {}) {
    const calls = [];
    const results = {
        user_roles: { data: { role: "admin" } },
        tool_intakes: { data: {
            id: "intake-id", status: "approved", package_name: "test-tool", version: "1.1.0", updated_at: revision, submitted_by: "developer-id", ...intakeOverrides,
        } },
        tools: { data: existingTool },
    };
    const supabase = {
        auth: { getUser: async () => ({ data: { user: { id: "admin-id" } } }) },
        from(table) {
            calls.push({ type: "table", table });
            const query = { select: () => query, eq: () => query, maybeSingle: async () => results[table] };
            return query;
        },
        rpc: async (name, args) => {
            calls.push({ type: "rpc", name, args });
            return { data: finalized };
        },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "@/lib/github-api") return {
                runConvertToolWorkflow: async ({ inputs }) => {
                    calls.push({ type: "workflow", inputs });
                    return { conclusion: workflowConclusion, failureReason: "Publish did not finish" };
                },
            };
            if (name === "@/lib/intake-package") return {
                fetchIntakeManifest: async (packageName, version) => {
                    calls.push({ type: "npm", packageName, version });
                    if (!available) throw new Error("Not found");
                    return { version };
                },
            };
            if (name === "@/lib/resend") return { sendEmail: async () => { calls.push({ type: "email" }); } };
            if (name === "@supabase/supabase-js") return { createClient: () => supabase };
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            return require(name);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test", GH_PAT_TOKEN: "test" } },
        console: { error() {}, warn() {} },
    });
    const response = await exports.POST({
        headers: new Headers({ authorization: `Bearer ${"test"}` }),
        json: async () => ({ intakeId: "intake-id", version: "1.1.0", revision, ...requestOverrides }),
    });
    return { status: response.status, body: await response.json(), calls };
}

test("conversion pins the approved version from npm through finalization", async () => {
    const { status, body, calls } = await convert();
    assert.equal(status, 200);
    assert.equal(body.data.releaseId, "release-id");
    assert.equal(body.data.version, "1.1.0");
    assert.equal(calls.find(({ type }) => type === "npm").version, "1.1.0");
    const { inputs } = calls.find(({ type }) => type === "workflow");
    assert.equal(inputs.version, "1.1.0");
    assert.equal(inputs.intake_revision, revision);
    assert.match(inputs.request_id, /^[0-9a-f-]{36}$/);
    const { name, args } = calls.find(({ type }) => type === "rpc");
    assert.equal(name, "finalize_tool_intake_conversion");
    assert.equal(args.p_version, "1.1.0");
    assert.ok(calls.some(({ type }) => type === "email"));
});

test("retry uses the existing receipt without npm lookup or workflow dispatch", async () => {
    const { status, calls } = await convert({ intakeOverrides: { conversion_receipt: receipt }, finalized: { ...receipt, finalized_now: false } });
    assert.equal(status, 200);
    assert.deepEqual(calls.map(({ type }) => type), ["table", "table", "rpc"]);
});

test("a receipt can be finalized even if the workflow acknowledgement timed out", async () => {
    const { status, body } = await convert({ workflowConclusion: null });
    assert.equal(status, 200);
    assert.equal(body.data.releaseId, "release-id");
});

for (const [label, options, message] of [
    ["stale approval", { requestOverrides: { version: "1.2.0" } }, /intake has changed/],
    ["missing intake version", { intakeOverrides: { version: null } }, /intake has changed/],
    ["existing marketplace listing", { existingTool: { id: "tool-id" } }, /already has a marketplace listing/],
    ["unavailable approved package", { available: false }, /test-tool@1\.1\.0/],
    ["current release conflict after publishing", { intakeOverrides: { conversion_receipt: receipt }, finalized: null }, /neither will be overwritten/],
]) {
    test(`conversion does not dispatch for ${label}`, async () => {
        const { status, body, calls } = await convert(options);
        assert.equal(status, 409);
        assert.match(body.error, message);
        assert.ok(!calls.some(({ type }) => type === "workflow" || type === "email"));
    });
}
