import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/(authenticated)/admin/tool-intakes/page.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function mountReview(cspExceptions) {
    const intake = {
        id: "intake-id", package_name: "test-tool", version: "1.0.0", display_name: "Test Tool",
        description: "Test submission", license: "MIT", contributors: [], configurations: {},
        status: "pending_review", created_at: "2026-11-04", csp_exceptions: cspExceptions,
    };
    const states = [[intake], false, null, "pending_review", null, "", false, true, "token"];
    let index = 0;
    const exports = {};
    const wrapper = ({ children }) => React.createElement("div", null, children);
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "react") return {
                ...React,
                useEffect() {},
                useState(initial) {
                    const i = index++;
                    if (!(i in states)) states[i] = initial;
                    return [states[i], (next) => { states[i] = next; }];
                },
            };
            if (name === "next/link") return { default: wrapper };
            if (name === "@/components/Container") return { Container: wrapper };
            if (name === "@/components/animations") return { FadeIn: wrapper, SlideIn: wrapper };
            if (name === "@/components/PackageIconPreview") return { PackageIconPreview: () => null };
            if (name === "@/lib/useSupabase") return { useSupabase: () => ({ supabase: null }) };
            return require(name);
        },
    });
    return {
        tree() {
            index = 0;
            return exports.default();
        },
    };
}

function findButton(tree, label) {
    if (!tree || typeof tree !== "object") return null;
    if (tree.type === "button" && tree.props.children === label) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) {
        const found = findButton(child, label);
        if (found) return found;
    }
    return null;
}

test("Review opens structured CSP exceptions with their domain and escaped reason", () => {
    const ui = mountReview({
        "connect-src": [
            { domain: "https://api.example.test", exceptionReason: "Fetch records\n<script>unsafe()</script>" },
            "https://legacy.example.test",
        ],
        "img-src": [{ domain: "https://images.example.test", exceptionReason: "Load tool icons" }],
    });
    assert.doesNotMatch(renderToStaticMarkup(ui.tree()), /CSP Exceptions Requested/);
    findButton(ui.tree(), "Review").props.onClick();
    const html = renderToStaticMarkup(ui.tree());
    for (const text of ["CSP Exceptions Requested:", "connect-src:", "img-src:", "https://api.example.test", "https://legacy.example.test", "https://images.example.test", "Load tool icons", "Reason:"]) {
        assert.ok(html.includes(text), text);
    }
    assert.match(html, /Fetch records\n&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    findButton(ui.tree(), "Close").props.onClick();
    assert.doesNotMatch(renderToStaticMarkup(ui.tree()), /CSP Exceptions Requested/);
});

test("Review preserves legacy string exceptions and handles absent or empty exceptions", () => {
    for (const exceptions of [{ "script-src": ["https://scripts.example.test"] }, null, {}]) {
        const ui = mountReview(exceptions);
        findButton(ui.tree(), "Review").props.onClick();
        const html = renderToStaticMarkup(ui.tree());
        assert.match(html, /Review Actions/);
        if (exceptions?.["script-src"]) {
            assert.match(html, /https:\/\/scripts\.example\.test/);
            assert.doesNotMatch(html, /Reason:/);
        } else {
            assert.doesNotMatch(html, /CSP Exceptions Requested/);
        }
    }
});
