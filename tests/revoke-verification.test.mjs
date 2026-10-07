import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/api/revoke-verification/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function notify({ event, details, tool = { id: "22222222-2222-4222-8222-222222222222", name: "Test Tool", user_id: "11111111-1111-4111-8111-111111111111" } }) {
    const emailCalls = [];
    const query = {
        select() {
            return this;
        },
        eq() {
            return this;
        },
        maybeSingle: async () => ({ data: tool, error: null }),
    };
    const supabase = { from: () => query };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "@/lib/resend") return { sendEmail: async (options) => (emailCalls.push(options), { success: true }) };
            if (name === "@supabase/supabase-js") return { createClient: () => supabase };
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            return require(name);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
        console: { error() {}, warn() {} },
    });
    const response = await exports.POST({
        json: async () => ({
            event,
            developerId: "11111111-1111-4111-8111-111111111111",
            toolId: "22222222-2222-4222-8222-222222222222",
            toolName: "Payload Tool Name",
            details,
        }),
    });
    return { status: response.status, body: await response.json(), emailCalls };
}

test("CVE grace start sends the deadline and severity counts through the verification email", async () => {
    const result = await notify({
        event: "cve_grace_started",
        details: { deadlineAt: "2026-10-20T12:30:00.000Z", highCount: 3, criticalCount: 1 },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.notificationSent, true);
    assert.equal(result.emailCalls[0].type, "verification-revoked");
    assert.deepEqual(JSON.parse(JSON.stringify(result.emailCalls[0].data)), {
        developerId: "11111111-1111-4111-8111-111111111111",
        toolName: "Test Tool",
        variant: "grace",
        reason: "High or critical severity vulnerabilities were found in your tool's dependencies. Your Verified badge will remain during the 14-day remediation period, but verification may be removed if the vulnerabilities remain at the deadline.",
        deadlineAt: "2026-10-20",
        highCount: 3,
        criticalCount: 1,
    });
});

test("expired CVE grace sends a revocation notice with its deadline", async () => {
    const result = await notify({ event: "revoked_grace_expired_cve", details: { deadlineAt: "2026-10-20T12:30:00.000Z" } });
    assert.equal(result.status, 200);
    assert.equal(result.emailCalls[0].data.variant, "revoked");
    assert.equal(result.emailCalls[0].data.deadlineAt, "2026-10-20");
    assert.match(result.emailCalls[0].data.reason, /expired with unresolved high or critical/);
});

for (const [name, event, details] of [
    ["missing CVE grace deadline", "cve_grace_started", { highCount: 1, criticalCount: 0 }],
    ["invalid CVE grace deadline", "cve_grace_started", { deadlineAt: "not-a-date", highCount: 1, criticalCount: 0 }],
    ["missing severity counts", "cve_grace_started", { deadlineAt: "2026-10-20T12:30:00Z", highCount: 1 }],
    ["negative severity count", "cve_grace_started", { deadlineAt: "2026-10-20T12:30:00Z", highCount: -1, criticalCount: 0 }],
    ["missing expired grace deadline", "revoked_grace_expired_cve", {}],
]) {
    test(`rejects ${name} without sending email`, async () => {
        const result = await notify({ event, details });
        assert.equal(result.status, 400);
        assert.equal(result.emailCalls.length, 0);
    });
}

test("existing bug-health grace event keeps its existing email behavior", async () => {
    const result = await notify({ event: "bug_health_grace_started", details: { deadlineAt: "2026-10-20T12:30:00.000Z", threshold: "5 open bugs" } });
    assert.equal(result.status, 200);
    assert.equal(result.emailCalls[0].data.variant, "grace");
    assert.match(result.emailCalls[0].data.reason, /bug health has breached/);
    assert.equal(result.emailCalls[0].data.threshold, "5 open bugs");
    assert.equal(result.emailCalls[0].data.highCount, undefined);
});
