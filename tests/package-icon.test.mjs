import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { create } from "tar";
import { extractPackageIcon, isValidPackageName } from "../lib/package-icon.ts";

test("package names accept scoped npm packages but not URLs or traversal", () => {
    for (const name of ["tool", "@org/tool"]) assert.equal(isValidPackageName(name), true);
    for (const name of ["", "../tool", "https://example.test/tool", "tool\n", "a".repeat(215)]) assert.equal(isValidPackageName(name), false);
});

test("icon extraction reads the dist-relative SVG at the requested version and reports invalid packages", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "pptb-icon-test-"));
    const originalFetch = globalThis.fetch;
    const requests = [];
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><style>@media(prefers-color-scheme:dark){rect{fill:white}}</style><rect width="32" height="32"/></svg>';
    let tarballUrl = "https://registry.npmjs.org/@org/tool/-/tool-1.2.3.tgz";
    let version = "1.2.3";
    try {
        await mkdir(path.join(folder, "package/dist/icons"), { recursive: true });
        const packageJsonPath = path.join(folder, "package/package.json");
        const iconPath = path.join(folder, "package/dist/icons/tool.svg");
        const archive = path.join(folder, "package.tgz");
        await writeFile(packageJsonPath, JSON.stringify({ displayName: "Data Migrator", icon: "icons/tool.svg" }));
        await writeFile(iconPath, svg);
        await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
        globalThis.fetch = async (input) => {
            requests.push(String(input));
            if (String(input) === tarballUrl) return new Response(await readFile(archive));
            return Response.json({ version, dist: { tarball: tarballUrl } });
        };
        assert.deepEqual(await extractPackageIcon("@org/tool", "1.2.3"), { displayName: "Data Migrator", version: "1.2.3", iconPath: "icons/tool.svg", svg });
        assert.equal(requests[0], "https://registry.npmjs.org/%40org%2Ftool/1.2.3");
        requests.length = 0;
        await extractPackageIcon("@org/tool");
        assert.equal(requests[0], "https://registry.npmjs.org/%40org%2Ftool/latest");

        for (const icon of ["dist/icons/tool.svg", "./dist/icons/tool.svg", "./icons/tool.svg"]) {
            await writeFile(packageJsonPath, JSON.stringify({ icon }));
            await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
            assert.deepEqual(await extractPackageIcon("@org/tool", "1.2.3"), { displayName: "@org/tool", version: "1.2.3", iconPath: icon, svg });
        }

        version = "2.0.0";
        await assert.rejects(extractPackageIcon("@org/tool", "1.2.3"), /unexpected package version/);
        version = "1.2.3";
        tarballUrl = "https://localhost/private.tgz";
        await assert.rejects(extractPackageIcon("@org/tool"), /hosted on the npm registry/);
        tarballUrl = "https://registry.npmjs.org/@org/tool/-/tool-1.2.3.tgz";

        for (const [icon, message] of [
            ["../tool.svg", /inside the package/],
            ["/tool.svg", /inside the package/],
            ["icons\\tool.svg", /inside the package/],
            [undefined, /declare an SVG/],
            ["tool.png", /declare an SVG/],
            ["missing.svg", /does not contain/],
        ]) {
            await writeFile(packageJsonPath, JSON.stringify({ icon }));
            await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
            await assert.rejects(extractPackageIcon("@org/tool"), message);
        }
        await writeFile(packageJsonPath, JSON.stringify({ icon: "icons/tool.svg" }));
        await writeFile(iconPath, "not an svg");
        await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
        await assert.rejects(extractPackageIcon("@org/tool"), /not an SVG/);

        await writeFile(iconPath, svg.padEnd(256 * 1024, " "));
        await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
        assert.equal((await extractPackageIcon("@org/tool")).svg.length, 256 * 1024);
        await writeFile(iconPath, svg.padEnd(256 * 1024 + 1, " "));
        await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
        await assert.rejects(extractPackageIcon("@org/tool"), /at most 262144 bytes/);

        await rm(iconPath);
        await symlink("../../package.json", iconPath);
        await create({ cwd: folder, file: archive, gzip: true }, ["package"]);
        await assert.rejects(extractPackageIcon("@org/tool"), /regular file/);

        globalThis.fetch = async (input) => {
            if (String(input) === tarballUrl) return new Response(Buffer.alloc(25 * 1024 * 1024 + 1));
            return Response.json({ version, dist: { tarball: tarballUrl } });
        };
        await assert.rejects(extractPackageIcon("@org/tool"), /25 MB icon preview limit/);

        globalThis.fetch = async () => new Response(null, { status: 404 });
        await assert.rejects(extractPackageIcon("@org/tool"), /HTTP 404/);
    } finally {
        globalThis.fetch = originalFetch;
        await rm(folder, { recursive: true, force: true });
    }
});
