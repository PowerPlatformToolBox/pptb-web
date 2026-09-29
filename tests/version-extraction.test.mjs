import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { create } from "tar";

import { extractVersionInfo, validateToolConfig } from "../lib/version-extraction.ts";

test("config without agents is optional and MCP disabled", () => {
    assert.deepEqual(validateToolConfig("{}"), { valid: true, mcpEnabled: false, warnings: [] });
});

test("headless true enables MCP and false does not", () => {
    assert.equal(validateToolConfig('{"agents":{"version":"1.0.0","headless":true}}').mcpEnabled, true);
    assert.equal(validateToolConfig('{"agents":{"version":"1.0.0","headless":false}}').mcpEnabled, false);
});

test("agents without headless fails with the validator's error", () => {
    const result = validateToolConfig('{"agents":{"version":"1.0.0"}}');
    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, ["agents.headless is required"]);
});

test("other validator errors also fail", () => {
    const result = validateToolConfig('{"agents":{"version":"1.0.0","headless":true,"modes":["invalid"]}}');
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /agents\.modes/);
});

test("invalid JSON fails before validation", () => {
    const result = validateToolConfig("{");
    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, ["pptb.config.json must contain valid JSON"]);
});

test("tarball config enables MCP and rejects agents without headless", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "pptb-config-test-"));
    const originalFetch = globalThis.fetch;
    try {
        const packageFolder = path.join(folder, "package");
        await mkdir(packageFolder);
        await writeFile(path.join(packageFolder, "package.json"), JSON.stringify({ features: { minAPI: "1.2.3" } }));
        const configPath = path.join(packageFolder, "pptb.config.json");
        const tarballPath = path.join(folder, "package.tgz");
        globalThis.fetch = async (input) => {
            if (String(input).startsWith("https://registry.npmjs.org/")) {
                return Response.json({
                    "dist-tags": { latest: "1.0.0" },
                    versions: { "1.0.0": { dist: { tarball: "https://example.test/package.tgz" } } },
                });
            }
            return new Response(await readFile(tarballPath));
        };

        await writeFile(configPath, JSON.stringify({ agents: { version: "1.0.0", headless: true } }));
        await create({ cwd: folder, file: tarballPath, gzip: true }, ["package"]);
        assert.deepEqual(await extractVersionInfo("test-tool"), {
            success: true,
            data: { minAPI: "1.2.3", mcpEnabled: true, warnings: [] },
        });

        await writeFile(configPath, JSON.stringify({ agents: { version: "1.0.0" } }));
        await create({ cwd: folder, file: tarballPath, gzip: true }, ["package"]);
        assert.deepEqual(await extractVersionInfo("test-tool"), {
            success: false,
            error: "pptb.config.json validation failed",
            validation: { errors: ["agents.headless is required"], warnings: [] },
        });

        await writeFile(configPath, "{");
        await create({ cwd: folder, file: tarballPath, gzip: true }, ["package"]);
        assert.deepEqual(await extractVersionInfo("test-tool"), {
            success: false,
            error: "pptb.config.json validation failed",
            validation: { errors: ["pptb.config.json must contain valid JSON"], warnings: [] },
        });

        await rm(configPath);
        await create({ cwd: folder, file: tarballPath, gzip: true }, ["package"]);
        assert.deepEqual(await extractVersionInfo("test-tool"), {
            success: true,
            data: { minAPI: "1.2.3", mcpEnabled: false, warnings: [] },
        });
    } finally {
        globalThis.fetch = originalFetch;
        await rm(folder, { recursive: true, force: true });
    }
});
