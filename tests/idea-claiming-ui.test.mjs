import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compile = (source) =>
    ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
const ideas = {};
vm.runInNewContext(compile(await readFile(new URL("../lib/ideas.ts", import.meta.url), "utf8")), { exports: ideas });
const source = compile(await readFile(new URL("../components/IdeaClaimForm.tsx", import.meta.url), "utf8"));
const idea = { id: "11111111-1111-4111-8111-111111111111", idea_type: "tool", status: "open", claim_id: null, title: "First tool" };
const repository = "https://github.com/first-builder/my-tool";

test("admin messages do not promise review audit history after its removal", async () => {
    const source = await readFile(new URL("../app/(authenticated)/admin/ideas/page.tsx", import.meta.url), "utf8");
    assert.ok(source.includes('setSuccess("Idea updated.")'));
    assert.ok(source.includes("previous claim record will be retained with its release date"));
    assert.equal(source.includes("history is retained"), false);
    assert.equal(source.includes("review change has been recorded"), false);
});
function mount({ userId = "new-user", entry = idea, response = { ok: true, json: async () => ({ claimId: "claim" }) }, refreshFailure = false, authenticated = true } = {}) {
    const exports = {},
        states = [],
        requests = [];
    let index = 0,
        refreshes = 0,
        release;
    const waiting = new Promise((resolve) => {
        release = resolve;
    });
    vm.runInNewContext(source, {
        exports,
        require(name) {
            if (name === "react")
                return {
                    ...React,
                    useState(value) {
                        const i = index++;
                        if (!(i in states)) states[i] = value;
                        return [
                            states[i],
                            (next) => {
                                states[i] = next;
                            },
                        ];
                    },
                };
            if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
            if (name === "@/lib/ideas") return ideas;
            return require(name);
        },
        fetch: async (...args) => {
            requests.push(args);
            await waiting;
            return response;
        },
        console: { error() {} },
        Error,
    });
    const props = {
        idea: entry,
        userId,
        supabase: { auth: { getSession: async () => ({ data: { session: authenticated ? { access_token: "jwt" } : null } }) } },
        onChanged: async () => {
            refreshes++;
            if (refreshFailure) throw new Error("Read failed");
        },
    };
    return {
        requests,
        release,
        get refreshes() {
            return refreshes;
        },
        tree() {
            index = 0;
            return exports.IdeaClaimForm(props);
        },
    };
}
function find(tree, predicate) {
    if (!tree || typeof tree !== "object") return null;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) {
        const found = find(child, predicate);
        if (found) return found;
    }
    return null;
}
function openAndFill(ui, value = repository) {
    find(ui.tree(), (node) => node.type === "button" && node.props.children === "Start working on this").props.onClick();
    find(ui.tree(), (node) => node.type === "input").props.onChange({ target: { value } });
}
const submit = (ui) => find(ui.tree(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("signed-out users get an idea-specific sign-in link; PPTB ideas and claimed ideas cannot be picked up", () => {
    const signedOut = renderToStaticMarkup(mount({ userId: null }).tree());
    assert.match(signedOut, /Sign in to start working/);
    assert.ok(signedOut.includes(encodeURIComponent(`/ideas#idea-${idea.id}`)));
    for (const entry of [
        { ...idea, idea_type: "pptb_desktop" },
        { ...idea, idea_type: "pptb_vscode" },
        { ...idea, status: "in_progress", claim_id: "claim" },
    ])
        assert.equal(renderToStaticMarkup(mount({ entry }).tree()).includes("Start working on this"), false);
});

test("first-time builders get a repository form and clear reservation/publicity confirmation", () => {
    const ui = mount();
    openAndFill(ui);
    const html = renderToStaticMarkup(ui.tree());
    assert.match(html, /No existing developer profile is required/);
    assert.match(html, /reserved to you/);
    assert.match(html, /Discord/);
    assert.match(html, /GitHub repository URL/);
    assert.match(html, /Contact a maintainer/);
});

test("invalid links preserve input and fail before an API call", async () => {
    const ui = mount();
    openAndFill(ui, repository + "/issues/1");
    await submit(ui);
    assert.equal(ui.requests.length, 0);
    assert.equal(find(ui.tree(), (node) => node.type === "input").props.value, repository + "/issues/1");
    assert.match(renderToStaticMarkup(ui.tree()), /Use a GitHub repository URL/);
});

test("saving disables submission, then confirms the claim and refreshes the board", async () => {
    const ui = mount();
    openAndFill(ui);
    submit(ui);
    await tick();
    assert.equal(find(ui.tree(), (node) => node.type === "button" && node.props.type === "submit").props.disabled, true);
    assert.equal(ui.requests.length, 1);
    assert.equal(JSON.parse(ui.requests[0][1].body).repositoryUrl, repository);
    ui.release();
    await tick();
    assert.equal(ui.refreshes, 1);
    assert.match(renderToStaticMarkup(ui.tree()), /now working on this idea/);
    assert.equal(
        find(ui.tree(), (node) => node.type === "form"),
        null,
    );
});

test("a conflict refreshes the board and shows a clear error without a success message", async () => {
    const ui = mount({ response: { ok: false, status: 409, json: async () => ({ error: "This idea has already been picked up." }) } });
    openAndFill(ui);
    submit(ui);
    ui.release();
    await tick();
    assert.equal(ui.refreshes, 1);
    assert.match(renderToStaticMarkup(ui.tree()), /already been picked up/);
    assert.equal(renderToStaticMarkup(ui.tree()).includes("now working on this idea"), false);
});

test("post-commit refresh failure never misrepresents a successful claim as unsaved", async () => {
    const ui = mount({ refreshFailure: true });
    openAndFill(ui);
    submit(ui);
    ui.release();
    await tick();
    assert.match(renderToStaticMarkup(ui.tree()), /claim was saved/);
});

test("an expired session fails explicitly without calling the claim endpoint", async () => {
    const ui = mount({ authenticated: false });
    openAndFill(ui);
    submit(ui);
    await tick();
    assert.equal(ui.requests.length, 0);
    assert.match(renderToStaticMarkup(ui.tree()), /sign in again/);
});

test("OAuth and email sign-in preserve the selected idea without allowing external redirects", async () => {
    const signInSource = compile(await readFile(new URL("../app/(auth)/auth/signin/page.tsx", import.meta.url), "utf8"));
    for (const next of [`/ideas#idea-${idea.id}`, "https://evil.example", "//evil.example", "/dashboard"]) {
        const exports = {},
            requests = [],
            state = [null, null, "new@example.test", false];
        let index = 0;
        const auth = {
            signInWithOAuth: async (value) => {
                requests.push(value.options.redirectTo);
                return {};
            },
            signInWithOtp: async (value) => {
                requests.push(value.options.emailRedirectTo);
                return {};
            },
        };
        vm.runInNewContext(signInSource, {
            exports,
            URLSearchParams,
            window: { location: { origin: "https://pptb.example", search: `?next=${encodeURIComponent(next)}` } },
            console: { error() {} },
            require(name) {
                if (name === "react") return { ...React, useState: () => [state[index++], () => {}] };
                if (name === "@/lib/useSupabase") return { useSupabase: () => ({ supabase: { auth } }) };
                if (name === "@/components/Logo") return { Logo: () => null };
                if (name === "@/components/SlimLayout") return { SlimLayout: ({ children }) => children };
                if (name === "next/link") return { default: ({ children }) => children };
                return require(name);
            },
        });
        const tree = exports.default();
        await find(tree, (node) => node.type === "button" && typeof node.props.onClick === "function").props.onClick();
        await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
        const expected = next.startsWith("/ideas#") ? `https://pptb.example/ideas?idea=${idea.id}` : "https://pptb.example/dashboard";
        assert.deepEqual(requests, [expected, expected]);
    }
});

test("creator emails render public links and escape untrusted names and idea titles", async () => {
    const exports = {};
    vm.runInNewContext(compile(await readFile(new URL("../components/emails/PPTBEmails.tsx", import.meta.url), "utf8")), {
        exports,
        require,
        process: { env: {} },
    });
    const html = renderToStaticMarkup(
        React.createElement(exports.IdeaClaimedEmail, {
            ideaTitle: "<script>idea</script>",
            claimantName: "<script>name</script>",
            repositoryUrl: repository,
            ideaUrl: `https://pptb.example/ideas#idea-${idea.id}`,
        }),
    );
    assert.ok(html.includes(repository));
    assert.ok(html.includes(`https://pptb.example/ideas#idea-${idea.id}`));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /not a guarantee/);
});
