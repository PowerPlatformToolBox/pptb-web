import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const dateExports = {};
vm.runInNewContext(ts.transpileModule(
    await readFile(new URL("../lib/date.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, { exports: dateExports });
const reviewTextExports = {};
vm.runInNewContext(ts.transpileModule(
    await readFile(new URL("../components/ReviewText.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText, { exports: reviewTextExports, require, URL });

async function mount(path, props, initialStates = [], response = { ok: true, json: async () => ({}) }) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports = {}, states = [...initialStates], requests = [];
    let index = 0;
    const wrapper = ({ children }) => React.createElement("div", null, children);
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "react") return {
                ...React, useEffect() {},
                useState(value) {
                    const i = index++;
                    if (!(i in states)) states[i] = value;
                    return [states[i], (next) => { states[i] = next; }];
                },
            };
            if (name === "@/lib/useSupabase") return { useSupabase: () => ({
                supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "jwt" } } }) } },
            }) };
            if (name === "next/navigation") return { useRouter: () => ({}), useSearchParams: () => ({ get: () => "tool" }) };
            if (name === "next/link" || name === "next/image") return { default: wrapper };
            if (name === "@/components/Container") return { Container: wrapper };
            if (name === "@/components/animations") return { FadeIn: wrapper };
            if (name === "@/components/ReviewText") return reviewTextExports;
            if (name === "@/lib/date") return dateExports;
            if (name === "@/lib/mock-auth") return {};
            if (name === "@/lib/reviews") return { getToolIssuesUrl: (repo) => repo ? `${repo}/issues` : null };
            return require(name);
        },
        fetch: async (...args) => { requests.push(args); return response; },
        console: { error() {} },
    });
    const Component = exports.ReviewAuthorReply || exports.default;
    return {
        requests,
        tree() { index = 0; return Component(props); },
    };
}

function find(tree, predicate) {
    if (!tree || typeof tree !== "object") return null;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) {
        const result = find(child, predicate);
        if (result) return result;
    }
    return null;
}
const button = (label) => (node) => node.type === "button" && node.props.children === label;
const saved = { reply: "<script>unsafe()</script>", createdAt: "2026-10-22", updatedAt: "2026-10-23" };

test("public author responses render safely with no non-owner controls", async () => {
    const ui = await mount("../components/ReviewAuthorReply.tsx", { toolId: "tool", ratingId: "review", authorReply: saved, canReply: false });
    const html = renderToStaticMarkup(ui.tree());
    assert.match(html, /Tool author response/);
    assert.match(html, /&lt;script&gt;/);
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("Edit author response"), false);
});

test("shared date formatter uses the long English date format", () => {
    assert.equal(dateExports.formatDate("2026-10-23T12:00:00"), "October 23, 2026");
    assert.equal(dateExports.formatDate("2026-01-02T12:00:00"), "January 2, 2026");
});

test("author response dates match reviewer date format and retain the updated timestamp", async () => {
    const ui = await mount("../components/ReviewAuthorReply.tsx", {
        toolId: "tool", ratingId: "review", canReply: false,
        authorReply: { reply: "Thanks", createdAt: "2026-10-22T12:00:00", updatedAt: "2026-10-23T12:00:00" },
    });
    const html = renderToStaticMarkup(ui.tree());
    assert.match(html, /October 23, 2026/);
    assert.equal(html.includes("October 22, 2026"), false);
    assert.equal(html.includes("10/23/2026"), false);
});

test("existing author response URLs render as clickable external links", async () => {
    const urls = [
        "https://github.com/Power-Maverick/PPTB-Tools/issues/82",
        "https://github.com/Power-Maverick/PPTB-Tools/issues/83",
    ];
    const ui = await mount("../components/ReviewAuthorReply.tsx", {
        toolId: "tool", ratingId: "review", canReply: false,
        authorReply: { ...saved, reply: `Track progress here:\n${urls.join("\n")}\n\nShould be resolved soon.` },
    });
    const html = renderToStaticMarkup(ui.tree());
    for (const url of urls) {
        assert.ok(html.includes(`href="${url}"`));
    }
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
    assert.match(html, /whitespace-pre-wrap/);
    assert.ok(html.includes("\n\nShould be resolved soon."));
});

test("review links keep text escaped and exclude punctuation without dropping balanced URL parentheses", () => {
    const text = '<script>alert(1)</script> javascript:alert(1) data:text/html,bad ' +
        '(https://example.test/issues/82). https://example.test/wiki/Thing_(test), ' +
        'http://example.test/?one=1&two=2! https:// https://[invalid]';
    const html = renderToStaticMarkup(React.createElement(reviewTextExports.ReviewText, { text }));
    assert.match(html, /&lt;script&gt;/);
    assert.equal(html.includes("<script>"), false);
    assert.equal((html.match(/<a /g) || []).length, 3);
    assert.ok(html.includes('href="https://example.test/issues/82"'));
    assert.ok(html.includes('href="https://example.test/wiki/Thing_(test)"'));
    assert.ok(html.includes('href="http://example.test/?one=1&amp;two=2"'));
    assert.ok(html.includes("</a>)."));
    assert.ok(html.includes("</a>,"));
    assert.ok(html.includes("</a>!"));
    assert.equal(html.includes('href="javascript:'), false);
    assert.equal(html.includes('href="data:'), false);
});

test("owner reply editor saves via authenticated API and cancel restores saved response", async () => {
    const ui = await mount("../components/ReviewAuthorReply.tsx", { toolId: "tool", ratingId: "review", authorReply: null, canReply: true }, [], {
        ok: true, json: async () => ({ authorReply: { ...saved, reply: "Thanks" } }),
    });
    find(ui.tree(), button("Reply as tool author")).props.onClick();
    find(ui.tree(), (node) => node.type === "textarea").props.onChange({ target: { value: "Thanks" } });
    await find(ui.tree(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(ui.requests[0][0], "/api/ratings/tool/reply");
    assert.equal(ui.requests[0][1].headers.Authorization, "Bearer jwt");
    assert.deepEqual(JSON.parse(ui.requests[0][1].body), { ratingId: "review", reply: "Thanks" });
    assert.match(renderToStaticMarkup(ui.tree()), /Thanks/);
    find(ui.tree(), button("Edit author response")).props.onClick();
    find(ui.tree(), (node) => node.type === "textarea").props.onChange({ target: { value: "Draft" } });
    find(ui.tree(), button("Cancel")).props.onClick();
    find(ui.tree(), button("Edit author response")).props.onClick();
    assert.equal(find(ui.tree(), (node) => node.type === "textarea").props.value, "Thanks");
});

test("failed author reply saves retain draft and display an explicit error", async () => {
    const ui = await mount("../components/ReviewAuthorReply.tsx", { toolId: "tool", ratingId: "review", authorReply: null, canReply: true }, [], {
        ok: false, json: async () => ({ error: "Only the tool owner can reply" }),
    });
    find(ui.tree(), button("Reply as tool author")).props.onClick();
    find(ui.tree(), (node) => node.type === "textarea").props.onChange({ target: { value: "Draft" } });
    await find(ui.tree(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(find(ui.tree(), (node) => node.type === "textarea").props.value, "Draft");
    assert.match(renderToStaticMarkup(ui.tree()), /role="alert"/);
    assert.match(renderToStaticMarkup(ui.tree()), /Only the tool owner can reply/);
});

test("review form requires explicit version and reminds users to report issues on the tool repository", async () => {
    for (const repository of ["https://github.com/tool/own-repo", undefined]) {
        const ui = await mount("../app/(authenticated)/rate-tool/page.tsx", {}, [
            { id: "user" }, { id: "tool", name: "Tool", icon: "icon", repository }, 5, 0, "", false, false, false, null, "jwt", "",
        ]);
        const tree = ui.tree(), html = renderToStaticMarkup(tree);
        const version = find(tree, (node) => node.type === "input" && node.props.id === "toolVersion");
        assert.equal(version.props.required, true);
        assert.equal(version.props.maxLength, 100);
        assert.equal(version.props.value, "");
        assert.match(html, /Please log bugs and issues/);
        assert.equal(html.includes("https://github.com/tool/own-repo/issues"), !!repository);
        assert.equal(find(tree, (node) => node.type === "button" && node.props.type === "submit").props.disabled, true);
        await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
        assert.equal(ui.requests.length, 0);
        assert.match(renderToStaticMarkup(ui.tree()), /Please specify the tool version/);
    }
});
