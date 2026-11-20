import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/metadata.ts", import.meta.url), "utf8");
const exports = {};
vm.runInNewContext(
    ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
        exports,
        require: (name) => (name === "@/images/background-meta.png" ? { default: { src: "/meta.png", width: 1200, height: 630 } } : require(name)),
    },
);

test("formats marketplace tool page titles with the shared site name", () => {
    assert.equal(exports.formatSiteTitle("Dataverse Request Studio"), "Dataverse Request Studio | Power Platform ToolBox - PPTB");
    assert.equal(exports.formatSiteTitle("Reviews for Dataverse Request Studio"), "Reviews for Dataverse Request Studio | Power Platform ToolBox - PPTB");
});
