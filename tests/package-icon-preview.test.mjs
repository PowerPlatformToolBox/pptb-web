import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../components/PackageIconPreview.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function renderPreview(svg) {
    const exports = {};
    let stateIndex = 0;
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "react")
                return {
                    useEffect() {},
                    useState(initial) {
                        return [stateIndex++ === 0 ? { svg, displayName: "Data Migrator", version: "1.1.0", iconPath: "icon.svg" } : initial, () => {}];
                    },
                };
            if (name === "@/lib/useSupabase") return { useSupabase: () => ({ supabase: null, error: null }) };
            return require(name);
        },
    });
    return renderToStaticMarkup(createElement(exports.PackageIconPreview, { packageName: "@org/tool" }));
}

test("compact cards preserve authored SVG colors for both multicolor and monochrome icons", () => {
    for (const svg of ['<svg xmlns="http://www.w3.org/2000/svg"><path fill="#ff0000"/><path fill="#0000ff"/></svg>', '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#123456"/></svg>']) {
        const html = renderPreview(svg);
        const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
        assert.equal(images.length, 2);
        for (const image of images) {
            assert.ok(image.includes(`src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"`));
            assert.match(image, /width="20" height="20"/);
            assert.match(image, /object-contain/);
        }
        assert.doesNotMatch(html, /mask-image|bg-current|<svg\b/);
        assert.match(html, /background-color:#ffffff/);
        assert.match(html, /background-color:#2d2d30/);
        assert.match(html, /color-scheme:light/);
        assert.match(html, /color-scheme:dark/);
        assert.equal((html.match(/>Data Migrator</g) || []).length, 2);
        assert.equal((html.match(/>v1\.1\.0</g) || []).length, 2);
    }
});
