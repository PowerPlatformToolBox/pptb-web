import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function compile(path) {
    return ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
}
const profileModule = {};
vm.runInNewContext(await compile("../lib/profile.ts"), { exports: profileModule });
const { validateProfile, hasDisplayName } = profileModule;
const apiSource = await compile("../app/api/profile/route.ts");
const pageSource = await compile("../app/(authenticated)/profile/page.tsx");
const reminderSource = await compile("../components/ProfileReminder.tsx");
const hookSource = await compile("../lib/useProfile.ts");
const valid = { name: "Chosen Name", linkedin_profile_url: "", discord_handle: "" };
const plain = (value) => JSON.parse(JSON.stringify(value));

async function api({ method = "GET", body = valid, authorized = true, token = "Bearer test", configured = true, row = null, databaseError = null, invalidJson = false } = {}) {
    const calls = [];
    const logged = [];
    const exports = {};
    vm.runInNewContext(apiSource, {
        exports,
        console: { error: (...args) => logged.push(args) },
        process: { env: configured ? { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test-key" } : {} },
        require(name) {
            if (name === "@/lib/profile") return profileModule;
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            if (name === "@supabase/supabase-js") return {
                createClient: () => ({
                    auth: { getUser: async (token) => {
                        calls.push({ token });
                        return { data: { user: authorized ? { id: "verified-user" } : null }, error: authorized ? null : { message: "Invalid token" } };
                    } },
                    from(table) {
                        calls.push({ table });
                        return {
                            select(columns) { calls.push({ columns }); return this; },
                            eq(column, value) { calls.push({ column, value }); return this; },
                            maybeSingle: async () => ({ data: row, error: databaseError }),
                            upsert: async (values, options) => { calls.push({ values: plain(values), options: plain(options) }); return { error: databaseError }; },
                        };
                    },
                }),
            };
            throw new Error(`Unexpected import: ${name}`);
        },
    });
    const response = await exports[method]({
        headers: new Headers(token ? { Authorization: token } : {}),
        json: async () => { if (invalidJson) throw new SyntaxError("Invalid"); return body; },
    });
    return { status: response.status, body: await response.json(), headers: response.headers, calls, logged };
}

test("profile read is scoped to the verified user and does not expose other profile fields", async () => {
    const result = await api({ row: { ...valid, email: "private@example.test", is_tool_developer: true } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { profile: valid });
    assert.equal(result.headers.get("cache-control"), "private, no-store");
    assert.ok(result.calls.some((call) => call.column === "id" && call.value === "verified-user"));
    assert.ok(result.calls.some((call) => call.columns === "name, linkedin_profile_url, discord_handle"));
});

test("missing and nullable profile fields return an incomplete profile for onboarding", async () => {
    for (const row of [null, { name: null, linkedin_profile_url: null, discord_handle: null }]) {
        const result = await api({ row });
        assert.deepEqual(result.body.profile, { name: "", linkedin_profile_url: "", discord_handle: "" });
    }
});

test("saving a profile uses only verified identity, trims fields, and clears optional fields", async () => {
    const result = await api({ method: "PATCH", body: { name: "  Chosen Name ", linkedin_profile_url: " ", discord_handle: " " } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { profile: valid });
    const write = result.calls.find((call) => call.values);
    assert.equal(write.values.id, "verified-user");
    assert.equal(write.values.name, "Chosen Name");
    assert.equal(write.values.linkedin_profile_url, null);
    assert.equal(write.values.discord_handle, null);
    assert.deepEqual(Object.keys(write.values).sort(), ["discord_handle", "id", "linkedin_profile_url", "name", "updated_at"]);
    assert.deepEqual(write.options, { onConflict: "id" });
});

test("both profile operations reject missing, malformed, and invalid tokens before database access", async () => {
    for (const method of ["GET", "PATCH"]) {
        for (const options of [{ token: null }, { token: "Basic test" }, { authorized: false }]) {
            const result = await api({ method, ...options });
            assert.equal(result.status, 401);
            assert.equal(result.calls.some((call) => call.table), false);
        }
    }
});

test("profile edits cannot change identity, email, developer status, or avatar", async () => {
    for (const field of ["id", "email", "is_tool_developer", "avatar_url"]) {
        const result = await api({ method: "PATCH", body: { ...valid, [field]: "forged" } });
        assert.equal(result.status, 400);
        assert.equal(result.calls.some((call) => call.values), false);
    }
});

test("validation accepts only bounded display names and valid optional contact fields", async () => {
    const invalid = [
        null, [], {}, { ...valid, name: null }, { ...valid, name: 42 },
        { ...valid, name: "" }, { ...valid, name: "   " }, { ...valid, name: "name@example.test" },
        { ...valid, name: "a".repeat(101) }, { ...valid, name: "Name\nBreak" },
        { ...valid, linkedin_profile_url: "https://linkedin.com.evil.test/in/test" },
        { ...valid, linkedin_profile_url: "http://linkedin.com/in/test" },
        { ...valid, linkedin_profile_url: "javascript:alert(1)" },
        { ...valid, discord_handle: "d".repeat(101) },
        { ...valid, discord_handle: null },
    ];
    for (const body of invalid) {
        assert.ok("error" in validateProfile(body));
        const result = await api({ method: "PATCH", body });
        assert.equal(result.status, 400);
        assert.equal(result.calls.some((call) => call.values), false);
    }
    for (const linkedin_profile_url of ["", "https://www.linkedin.com/in/test-user", "https://uk.linkedin.com/in/test-user/"]) {
        assert.ok("profile" in validateProfile({ ...valid, linkedin_profile_url, discord_handle: "d".repeat(100), name: "a".repeat(100) }));
    }
});

test("invalid JSON, unavailable configuration, and database failures are explicit", async () => {
    assert.equal((await api({ method: "PATCH", invalidJson: true })).status, 400);
    assert.equal((await api({ configured: false })).status, 500);
    for (const method of ["GET", "PATCH"]) {
        const result = await api({ method, databaseError: { message: "private database details" } });
        assert.equal(result.status, 500);
        assert.equal(result.logged.length, 1);
        assert.equal(JSON.stringify(result.body).includes("private database details"), false);
    }
});

function ui(source, { profile = valid, error = null, loading = false } = {}) {
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        require(name) {
            if (name === "@/lib/profile") return profileModule;
            if (name === "@/lib/useProfile") return { useProfile: () => ({ profile, error, loading }) };
            if (name === "@/lib/useSupabase") return { useSupabase: () => ({ supabase: null }) };
            if (name === "@/components/Container") return { Container: ({ children }) => React.createElement("div", null, children) };
            if (name === "next/link") return { default: ({ href, children }) => React.createElement("a", { href }, children) };
            return require(name);
        },
    });
    return exports;
}

test("reminder is non-blocking, links to profile, and disappears for a complete name", () => {
    for (const name of [null, "", " ", "private@example.test"]) {
        assert.equal(hasDisplayName(name), false);
        const { ProfileReminder } = ui(reminderSource, { profile: { ...valid, name } });
        const html = renderToStaticMarkup(React.createElement(ProfileReminder));
        assert.match(html, /Complete your profile/);
        assert.match(html, /href="\/profile"/);
        assert.match(html, /You can keep using the site/);
    }
    const { ProfileReminder } = ui(reminderSource);
    assert.equal(renderToStaticMarkup(React.createElement(ProfileReminder)), "");
    const failed = ui(reminderSource, { error: "Failed" });
    assert.match(renderToStaticMarkup(React.createElement(failed.ProfileReminder)), /role="alert"/);
});

test("profile page exposes the three agreed fields, public-name notice, and load errors", () => {
    const page = ui(pageSource);
    const html = renderToStaticMarkup(React.createElement(page.default));
    for (const text of ["Public display name", "LinkedIn profile URL (optional)", "Discord handle (optional)", "including existing reviews", "Save profile"]) {
        assert.ok(html.includes(text));
    }
    assert.equal(html.includes('type="email"'), false);
    const failed = ui(pageSource, { error: "Unable to load your profile." });
    assert.match(renderToStaticMarkup(React.createElement(failed.default)), /Try again/);
});

test("profile subscription reloads after saves, clears on sign-out, and aborts pending work on unmount", async () => {
    const effects = [];
    const states = [];
    const listeners = new Map();
    const requests = [];
    let callback;
    let unsubscribed = false;
    const exports = {};
    vm.runInNewContext(hookSource, {
        exports, AbortController,
        window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) },
        console: { error() {} },
        fetch: async (_url, options) => { requests.push(options); return Response.json({ profile: valid }); },
        require(name) {
            if (name === "react") return {
                useState: (initial) => {
                    const index = states.length;
                    states.push(initial);
                    return [initial, (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
                },
                useEffect: (fn) => effects.push(fn),
                useRef: (initial) => ({ current: initial }),
            };
            if (name === "@/lib/profile") return profileModule;
            if (name === "@/lib/useSupabase") return {
                useSupabase: () => ({ supabase: {
                    auth: { onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } }; } },
                }, error: null }),
            };
            throw new Error(`Unexpected import ${name}`);
        },
    });
    exports.useProfile();
    const cleanups = effects.map((effect) => effect());
    callback("INITIAL_SESSION", { access_token: "fresh-token", user: { id: "first-user" } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(plain(states[0]), valid);
    assert.equal(states[1], false);
    assert.equal(requests[0].headers.Authorization, "Bearer fresh-token");
    listeners.get("profile-updated")();
    assert.equal(states[3], 1);
    callback("SIGNED_IN", { access_token: "second-token", user: { id: "second-user" } });
    assert.equal(states[0], null);
    await new Promise((resolve) => setImmediate(resolve));
    callback("SIGNED_OUT", null);
    assert.equal(states[0], null);
    cleanups.forEach((cleanup) => cleanup());
    assert.equal(unsubscribed, true);
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(listeners.size, 0);
});

test("profile name sync keeps a chosen name through later auth metadata updates", async (t) => {
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`
        CREATE SCHEMA auth;
        CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
        CREATE TABLE public.user_profiles (
            id uuid PRIMARY KEY, email text, name text, avatar_url text, updated_at timestamptz
        );
    `);
    const migration = await readFile(new URL("../docs/sql/profile-name-sync.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(`
        CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
        INSERT INTO auth.users VALUES
            ('11111111-1111-4111-8111-111111111111', 'test@example.test', '{"name":" ","full_name":" Provider Name "}'),
            ('22222222-2222-4222-8222-222222222222', 'missing@example.test', '{}');
    `);
    assert.equal((await db.query("SELECT name FROM public.user_profiles WHERE email='test@example.test'")).rows[0].name, "Provider Name");
    assert.equal((await db.query("SELECT name FROM public.user_profiles WHERE email='missing@example.test'")).rows[0].name, null);
    await db.exec(`
        UPDATE public.user_profiles SET name='Chosen Name' WHERE email='test@example.test';
        UPDATE auth.users SET raw_user_meta_data='{"name":"Old Provider Name"}' WHERE email='test@example.test';
        UPDATE auth.users SET raw_user_meta_data='{}' WHERE email='test@example.test';
    `);
    assert.equal((await db.query("SELECT name FROM public.user_profiles WHERE email='test@example.test'")).rows[0].name, "Chosen Name");
});

test("concurrently mounted profile/header hooks share one Supabase client initialization", async () => {
    const compiled = await compile("../lib/useSupabase.ts");
    const exports = {};
    const effects = [];
    let fetches = 0;
    let clients = 0;
    let resolveFetch;
    const received = [];
    vm.runInNewContext(compiled, {
        exports,
        fetch: () => {
            fetches++;
            return new Promise((resolve) => { resolveFetch = resolve; });
        },
        console: { error() {} },
        require(name) {
            if (name === "@supabase/supabase-js") return { createClient: () => { clients++; return { client: true }; } };
            if (name === "react") return {
                useEffect: (effect) => effects.push(effect),
                useState: (initial) => [initial, (value) => received.push(value)],
            };
            throw new Error(`Unexpected import ${name}`);
        },
    });
    exports.useSupabase();
    exports.useSupabase();
    effects.forEach((effect) => effect());
    assert.equal(fetches, 1);
    resolveFetch(Response.json({ url: "https://example.test", anonKey: "test" }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(clients, 1);
    assert.equal(received.length, 2);
    assert.equal(received[0], received[1]);
});
