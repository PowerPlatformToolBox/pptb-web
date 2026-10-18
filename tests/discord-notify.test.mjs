import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/discord-notify.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const URL_ENV = "https://bot.example.test/events";
const SECRET = "test-secret";

function load({ env = { DISCORD_EVENTS_URL: URL_ENV, DISCORD_EVENTS_SECRET: SECRET }, fetchImpl } = {}) {
    const fetchCalls = [];
    const errors = [];
    const afterCallbacks = [];
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "next/server") return { after: (callback) => afterCallbacks.push(callback) };
            return require(name);
        },
        process: { env: { ...env } },
        console: { error: (...args) => errors.push(args.map(String).join(" ")) },
        fetch: async (url, init) => {
            fetchCalls.push({ url, init });
            return fetchImpl ? fetchImpl(url, init) : new Response("ok", { status: 200 });
        },
        AbortSignal,
        URL,
    });
    return { lib: exports, fetchCalls, errors, afterCallbacks };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("signs the exact body bytes with HMAC-SHA256 over `${timestamp}.${body}`", async () => {
    const { lib, fetchCalls, errors } = load();
    const before = Math.floor(Date.now() / 1000);
    await lib.notifyDiscord("tool.deprecated", { tool: { id: "t1", name: "Tool" }, reason: "old" });
    const after = Math.floor(Date.now() / 1000);

    assert.equal(fetchCalls.length, 1);
    assert.deepEqual(errors, []);
    const { url, init } = fetchCalls[0];
    assert.equal(url, URL_ENV);
    assert.equal(init.method, "POST");
    assert.equal(typeof init.body, "string");
    assert.ok(init.signal instanceof AbortSignal);

    const headers = init.headers;
    assert.equal(headers["Content-Type"], "application/json");
    assert.match(headers["X-PPTB-Timestamp"], /^\d+$/);
    const timestamp = Number(headers["X-PPTB-Timestamp"]);
    assert.ok(timestamp >= before && timestamp <= after);

    const expected = "sha256=" + createHmac("sha256", SECRET).update(`${headers["X-PPTB-Timestamp"]}.${init.body}`).digest("hex");
    assert.match(headers["X-PPTB-Signature"], /^sha256=[0-9a-f]{64}$/);
    assert.equal(headers["X-PPTB-Signature"], expected);

    const body = JSON.parse(init.body);
    assert.deepEqual(Object.keys(body), ["type", "id", "occurredAt", "data"]);
    assert.equal(body.type, "tool.deprecated");
    assert.match(body.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(new Date(body.occurredAt).toISOString(), body.occurredAt);
    assert.deepEqual(body.data, { tool: { id: "t1", name: "Tool" }, reason: "old" });
});

for (const [label, env] of [
    ["DISCORD_EVENTS_URL is", { DISCORD_EVENTS_SECRET: SECRET }],
    ["DISCORD_EVENTS_SECRET is", { DISCORD_EVENTS_URL: URL_ENV }],
    ["both settings are", {}],
]) {
    test(`does nothing when ${label} missing`, async () => {
        const { lib, fetchCalls, errors, afterCallbacks } = load({ env });
        await lib.notifyDiscord("tool.deleted", { tool: { id: "t1", name: "Tool" } });
        let built = false;
        lib.notifyDiscordAfterResponse("tool.deleted", () => ((built = true), {}));
        assert.equal(fetchCalls.length, 0);
        assert.equal(afterCallbacks.length, 0);
        assert.equal(built, false);
        assert.deepEqual(errors, []);
    });
}

test("swallows network errors and logs the event type", async () => {
    const { lib, errors } = load({
        fetchImpl: async () => {
            throw new TypeError("fetch failed");
        },
    });
    await assert.doesNotReject(lib.notifyDiscord("verify.approved", { tool: { id: "t1", name: "Tool" } }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /verify\.approved/);
    assert.match(errors[0], /fetch failed/);
});

test("logs type, status and response text on non-2xx responses without throwing", async () => {
    const { lib, errors } = load({ fetchImpl: async () => new Response("bad signature", { status: 401 }) });
    await assert.doesNotReject(lib.notifyDiscord("tool.update", { tool: { id: "t1", name: "Tool", version: "1.0.0" } }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /tool\.update/);
    assert.match(errors[0], /401/);
    assert.match(errors[0], /bad signature/);
});

test("notifyDiscordAfterResponse defers payload building and sending to after()", async () => {
    const { lib, fetchCalls, errors, afterCallbacks } = load();
    let built = false;
    lib.notifyDiscordAfterResponse("verify.requested", async () => ((built = true), { tool: { id: "t1", name: "Tool" } }));
    assert.equal(built, false);
    assert.equal(fetchCalls.length, 0);
    assert.equal(afterCallbacks.length, 1);

    await afterCallbacks[0]();
    assert.equal(built, true);
    assert.equal(fetchCalls.length, 1);
    assert.equal(JSON.parse(fetchCalls[0].init.body).type, "verify.requested");

    lib.notifyDiscordAfterResponse("verify.requested", async () => {
        throw new Error("lookup failed");
    });
    lib.notifyDiscordAfterResponse("verify.requested", async () => null);
    await assert.doesNotReject(afterCallbacks[1]());
    await afterCallbacks[2]();
    assert.equal(fetchCalls.length, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /lookup failed/);
});

test("toDiscordTool omits empty fields and normalizes tool rows", () => {
    const { lib } = load();
    const description = "x".repeat(1200);
    const tool = plain(
        lib.toDiscordTool({
            id: "abc",
            name: "My Tool",
            packagename: "my-tool",
            version: "1.2.3",
            description,
            icon: "https://cdn.example.test/icon.png",
            tool_contributors: [{ contributors: { name: "Alice" } }, { contributors: { name: "Bob" } }, { contributors: null }],
        }),
    );
    assert.equal(tool.description.length, 1000);
    delete tool.description;
    assert.deepEqual(tool, {
        id: "abc",
        name: "My Tool",
        packageName: "my-tool",
        version: "1.2.3",
        authors: ["Alice", "Bob"],
        url: "https://www.powerplatformtoolbox.com/tools/abc",
        iconUrl: "https://cdn.example.test/icon.png",
    });

    assert.deepEqual(
        plain(lib.toDiscordTool({ id: "i1", display_name: "Intake", package_name: "intake-pkg", description: "", version: null, icon: "dist/icon.svg", authors: [] }, { includeUrl: false })),
        {
            id: "i1",
            name: "Intake",
            packageName: "intake-pkg",
        },
    );
    assert.equal(lib.toDiscordTool({ id: "h", icon: "http://insecure.example.test/i.png" }).iconUrl, undefined);
});

test("toDiscordActor never includes email and prefers the profile display name", () => {
    const { lib } = load();
    assert.deepEqual(plain(lib.toDiscordActor({ name: "Dev", discord_handle: "dev#1", email: "dev@example.test" })), { name: "Dev", discordHandle: "dev#1" });
    assert.deepEqual(plain(lib.toDiscordActor({ name: null, discord_handle: "" }, { email: "x@example.test", user_metadata: { full_name: "Meta Name" } })), { name: "Meta Name" });
});
