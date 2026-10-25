import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isValidPackageName } from "../lib/package-icon.ts";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/api/package-icon/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function preview({ authenticated = true, authorization = true, query = "packageName=%40org%2Ftool&version=1.2.3", fail = false } = {}) {
    const calls = [];
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        Error,
        require(name) {
            if (name === "@/lib/package-icon")
                return {
                    isValidPackageName,
                    extractPackageIcon: async (...args) => {
                        calls.push(args);
                        if (fail) throw new Error("Missing SVG");
                        return { displayName: "Data Migrator", version: "1.2.3", iconPath: "icon.svg", svg: "<svg/>" };
                    },
                };
            if (name === "@supabase/supabase-js")
                return {
                    createClient: () => ({
                        auth: { getUser: async () => ({ data: { user: authenticated ? { id: "user-id" } : null }, error: null }) },
                    }),
                };
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            return require(name);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
        console: { error() {} },
    });
    const response = await exports.GET({
        headers: new Headers(authorization ? { authorization: "Bearer test-token" } : {}),
        nextUrl: new URL(`https://example.test/api/package-icon?${query}`),
    });
    return { status: response.status, body: await response.json(), calls, headers: response.headers };
}

test("icon preview requires authentication before downloading a package", async () => {
    for (const options of [{ authenticated: false }, { authorization: false }]) {
        const result = await preview(options);
        assert.equal(result.status, 401);
        assert.equal(result.calls.length, 0);
    }
});

test("icon preview passes the exact submitted version and disables caching", async () => {
    const result = await preview();
    assert.equal(result.status, 200);
    assert.deepEqual(result.calls, [["@org/tool", "1.2.3"]]);
    assert.equal(result.headers.get("cache-control"), "private, no-store");
    assert.equal(result.body.svg, "<svg/>");
    assert.equal(result.body.displayName, "Data Migrator");
});

test("invalid names and version ranges are rejected before extraction", async () => {
    for (const query of ["packageName=../tool", "packageName=tool&version=latest", "packageName=tool&version=^1.0.0"]) {
        const result = await preview({ query });
        assert.equal(result.status, 400);
        assert.equal(result.calls.length, 0);
    }
});

test("icon extraction errors are visible to the caller", async () => {
    const result = await preview({ fail: true });
    assert.equal(result.status, 502);
    assert.equal(result.body.error, "Missing SVG");
});
