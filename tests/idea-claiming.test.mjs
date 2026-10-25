import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
function load(source, dependencies = {}, globals = {}) {
    const exports = {};
    vm.runInNewContext(
        ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
        }).outputText,
        {
            exports,
            require: (name) => dependencies[name] ?? require(name),
            process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "service", CRON_SECRET: "cron" } },
            console: { error() {}, warn() {} },
            Buffer,
            Error,
            ...globals,
        },
    );
    return exports;
}
const ideas = load(await read("../lib/ideas.ts"));
const routeSource = await read("../app/api/ideas/claim/route.ts");
const workerSource = await read("../lib/idea-claim-notifications.ts");
const id = "11111111-1111-4111-8111-111111111111";
const repositoryUrl = "https://github.com/first-time-builder/my-tool";

test("claim eligibility is restricted to open unclaimed Tool Ideas, not developer classification", () => {
    assert.equal(ideas.canClaimIdea({ idea_type: "tool", status: "open", claim_id: null }), true);
    for (const idea_type of ["pptb_desktop", "pptb_vscode"]) assert.equal(ideas.canClaimIdea({ idea_type, status: "open", claim_id: null }), false);
    for (const status of ["planned", "under_review", "in_progress", "closed", "duplicate"]) assert.equal(ideas.canClaimIdea({ idea_type: "tool", status, claim_id: null }), false);
    assert.equal(ideas.canClaimIdea({ idea_type: "tool", status: "open", claim_id: id }), false);
});

test("repository validation rejects credentials, lookalike hosts, paths, query strings and invalid segments", () => {
    assert.equal(ideas.validateIdeaClaim({ id, repositoryUrl }), null);
    for (const value of [
        repositoryUrl + "/",
        repositoryUrl + ".git",
        repositoryUrl + "/issues/1",
        repositoryUrl + "?foo=1",
        repositoryUrl + "#readme",
        repositoryUrl + "\n",
        repositoryUrl.replace("https:", "http:"),
        repositoryUrl.replace("github.com", "github.com.evil.test"),
        "https://user:pass@github.com/a/b",
        "https://github.com/a/.",
        "https://github.com/a/..",
        "https://github.com/-bad/repo",
        "https://github.com/bad-/repo",
        "javascript:alert(1)",
    ])
        assert.equal(ideas.isGithubRepositoryUrl(value), false, value);
    for (const body of [null, [], {}, { id: "bad", repositoryUrl }, { id, repositoryUrl: null }]) assert.ok(ideas.validateIdeaClaim(body));
    assert.ok(
        ideas.validateIdeaReview({
            id,
            expectedUpdatedAt: "2026-10-23",
            status: "closed",
            resolution: "implemented",
            publicNote: "Done",
            duplicateOf: null,
            githubIssueUrl: null,
            releaseClaim: true,
        }),
    );
});

async function claimRequest({
    token = "jwt",
    authenticated = true,
    body = { id, repositoryUrl },
    rpcError = null,
    invalidJson = false,
    alreadyClaimed = false,
    deliveryFailure = false,
    pending = 0,
} = {}) {
    const calls = [],
        configs = [],
        callbacks = [],
        deliveries = [];
    const client = {
        auth: { getUser: async () => ({ data: { user: authenticated ? { id: "first-time-user" } : null }, error: null }) },
        from() {
            throw new Error("Claim API must not require an existing developer profile");
        },
        rpc: async (name, args) => {
            calls.push({ name, args });
            return { data: [{ claim_id: id, already_claimed: alreadyClaimed }], error: rpcError };
        },
    };
    const route = load(routeSource, {
        "@/lib/ideas": ideas,
        "@/lib/idea-claim-notifications": {
            sendIdeaClaimNotifications: async (_service, claimId) => {
                deliveries.push(claimId);
                if (deliveryFailure) throw new Error("Delivery unavailable");
                return { failed: pending };
            },
        },
        "@supabase/supabase-js": {
            createClient: (_url, _key, options) => {
                configs.push(options);
                return client;
            },
        },
        "next/server": { NextResponse: { json: Response.json }, after: (callback) => callbacks.push(callback) },
    });
    const response = await route.POST({
        headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}),
        json: async () => {
            if (invalidJson) throw new SyntaxError();
            return body;
        },
    });
    return { status: response.status, body: await response.json(), calls, configs, callbacks, deliveries };
}

test("claim endpoint authenticates and validates before mutating", async () => {
    for (const [options, status] of [
        [{ token: null }, 401],
        [{ authenticated: false }, 401],
        [{ body: {} }, 400],
        [{ invalidJson: true }, 400],
    ]) {
        const result = await claimRequest(options);
        assert.equal(result.status, status);
        assert.equal(result.calls.length, 0);
        assert.equal(result.callbacks.length, 0);
    }
});

test("claim endpoint sends notifications directly after commit, before returning", async () => {
    for (const alreadyClaimed of [false, true]) {
        const result = await claimRequest({ alreadyClaimed });
        assert.equal(result.status, 200);
        assert.equal(result.body.claimId, id);
        assert.equal(result.body.alreadyClaimed, alreadyClaimed);
        assert.equal(result.configs[1].global.headers.Authorization, "Bearer jwt");
        assert.equal(result.calls[0].name, "claim_idea");
        assert.equal(result.calls[0].args.p_repository_url, repositoryUrl);
        assert.equal(result.callbacks.length, 0);
        assert.equal(result.body.notificationWarning, null);
        assert.deepEqual(result.deliveries, alreadyClaimed ? [] : [id]);
    }
});

test("claim endpoint surfaces conflict, missing idea, forbidden, validation and server failures", async () => {
    for (const [code, status] of [
        ["40001", 409],
        ["23505", 409],
        ["P0002", 404],
        ["42501", 403],
        ["22023", 400],
        ["XX000", 500],
    ]) {
        const result = await claimRequest({ rpcError: { code, message: "Private database details" } });
        assert.equal(result.status, status);
        assert.equal(result.callbacks.length, 0);
        assert.equal(JSON.stringify(result.body).includes("Private database details"), false);
    }
});

async function deliver({ creatorId = "creator", discordFailure = false, emailResult = { success: true }, lookupError = false } = {}) {
    const discord = [],
        emails = [];
    const supabase = {
        from: (table) => {
            assert.ok(["idea_claims", "ideas"].includes(table));
            const query = {
                select() {
                    return query;
                },
                eq() {
                    return query;
                },
                async single() {
                    return {
                        data:
                            table === "idea_claims"
                                ? { idea_id: id, claimant_name: "First-time builder", repository_url: repositoryUrl, created_at: "2026-10-23T12:00:00Z" }
                                : { title: "My idea", creator_user_id: creatorId },
                        error: lookupError ? { message: "Lookup failed" } : null,
                    };
                },
            };
            return query;
        },
    };
    const worker = load(workerSource, {
        "@/lib/discord-notify": {
            getSiteUrl: () => "https://pptb.example",
            deliverDiscordEvent: async (...args) => {
                discord.push(args);
                if (discordFailure) throw new Error("Discord unavailable");
            },
        },
        "@/lib/resend": {
            sendEmail: async (message) => {
                emails.push(message);
                return emailResult;
            },
        },
    });
    const result = await worker.sendIdeaClaimNotifications(supabase, id);
    return { result, discord, emails };
}

test("delivery sends public Discord data and a linked-creator email using stable event identities", async () => {
    const result = await deliver();
    assert.equal(result.result.failed, 0);
    assert.equal(result.discord[0][0], "idea.claimed");
    assert.equal(result.discord[0][2].id, id);
    assert.equal(result.discord[0][2].occurredAt, "2026-10-23T12:00:00Z");
    assert.equal(result.discord[0][1].repositoryUrl, repositoryUrl);
    assert.equal(JSON.stringify(result.discord).includes("creator"), false);
    assert.equal(result.emails[0].data.creatorId, "creator");
    assert.equal(result.emails[0].data.eventId, id);
});

test("unlinked and missing-email creators are explicitly skipped without emailing submitted addresses", async () => {
    const unlinked = await deliver({ creatorId: null });
    assert.equal(unlinked.emails.length, 0);
    assert.equal(unlinked.result.failed, 0);
    const missingEmail = await deliver({ emailResult: { success: true, skipped: true } });
    assert.equal(missingEmail.result.failed, 0);
});

test("channel failures do not prevent the other send and lookup errors are explicit", async () => {
    const partial = await deliver({ discordFailure: true });
    assert.equal(partial.result.failed, 1);
    assert.equal(partial.emails.length, 1);
    const emailFailure = await deliver({ emailResult: { success: false, error: "Email unavailable" } });
    assert.equal(emailFailure.result.failed, 1);
    assert.equal(emailFailure.discord.length, 1);
    await assert.rejects(deliver({ lookupError: true }), /Could not load claim/);
});

test("direct notification failures return a warning without undoing a committed claim", async () => {
    for (const options of [{ deliveryFailure: true }, { pending: 1 }]) {
        const result = await claimRequest(options);
        assert.equal(result.status, 200);
        assert.equal(result.body.claimId, id);
        assert.match(result.body.notificationWarning, /claim was saved/);
        assert.equal(result.deliveries.length, 1);
    }
});

test("creator email uses the linked auth account, skips deleted accounts, and retries lookup errors", async () => {
    const sent = [];
    const email = load(
        await read("../lib/resend.ts"),
        {
            "@/components/emails/PPTBEmails": { IdeaClaimedEmail: () => null },
            resend: {
                Resend: class {
                    emails = {
                        send: async (...args) => {
                            sent.push(args);
                            return { error: null };
                        },
                    };
                },
            },
        },
        { process: { env: { RESEND_API_KEY: "test", RESEND_FROM_EMAIL: "test@example.test" } } },
    );
    const options = (user, error = null) => ({
        type: "idea-claimed",
        data: { creatorId: "creator", eventId: "event", ideaTitle: "Idea", claimantName: "Builder", repositoryUrl, ideaUrl: "https://pptb.example/ideas" },
        supabase: { auth: { admin: { getUserById: async () => ({ data: { user }, error }) } } },
    });
    assert.equal((await email.sendEmail(options({ email: "creator@example.test" }))).success, true);
    assert.equal(sent[0][0].to[0], "creator@example.test");
    assert.equal(sent[0][1].idempotencyKey, "idea-claimed/event");
    assert.equal((await email.sendEmail(options(null, { status: 404 }))).skipped, true);
    assert.equal((await email.sendEmail(options({}))).skipped, true);
    assert.equal((await email.sendEmail(options(null, { status: 503, message: "Auth unavailable" }))).success, false);
    assert.equal(sent.length, 1);
});
