import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { t } from "tar";

const MAX_TARBALL_BYTES = 25 * 1024 * 1024;
const MAX_ICON_BYTES = 256 * 1024;

export function isValidPackageName(name: string): boolean {
    return name.length <= 214 && /^(@[a-z0-9-~_][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.exec(name)?.[0] === name;
}

async function readEntry(archive: Buffer, entryPath: string, maxBytes: number): Promise<string> {
    let content: Buffer | undefined;
    let error: Error | undefined;
    let expandedBytes = 0;
    await pipeline(
        Readable.from([archive]),
        createGunzip(),
        new Transform({
            transform(chunk: Buffer, _encoding, callback) {
                expandedBytes += chunk.length;
                callback(expandedBytes > 100 * 1024 * 1024 ? new Error("Expanded package exceeds the 100 MB icon preview limit") : null, chunk);
            },
        }),
        t({
            strict: true,
            onReadEntry(entry) {
                if (entry.path !== entryPath) {
                    entry.resume();
                    return;
                }
                if (content || entry.type !== "File" || entry.size > maxBytes) {
                    error = new Error(`Package entry ${entryPath} must be a regular file of at most ${maxBytes} bytes`);
                    entry.resume();
                    return;
                }
                const chunks: Buffer[] = [];
                entry.on("data", (chunk: Buffer) => chunks.push(chunk));
                entry.on("end", () => {
                    content = Buffer.concat(chunks);
                });
            },
        }),
    );
    if (error) throw error;
    if (!content) throw new Error(`Package does not contain ${entryPath}`);
    return content.toString("utf8");
}

export async function extractPackageIcon(packageName: string, version?: string): Promise<{ displayName: string; version: string; iconPath: string; svg: string }> {
    if (!isValidPackageName(packageName)) throw new Error("Invalid npm package name");
    const signal = AbortSignal.timeout(30_000);
    const metadataResponse = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version || "latest")}`, {
        signal,
        redirect: "error",
        cache: "no-store",
    });
    if (!metadataResponse.ok) throw new Error(`Failed to load npm package: HTTP ${metadataResponse.status}`);
    const metadata = await metadataResponse.json();
    if (typeof metadata.version !== "string" || (version && metadata.version !== version)) throw new Error("npm returned an unexpected package version");
    const tarballUrl = new URL(metadata.dist?.tarball);
    if (tarballUrl.protocol !== "https:" || tarballUrl.hostname !== "registry.npmjs.org" || tarballUrl.port || tarballUrl.username || tarballUrl.password) {
        throw new Error("Package tarball must be hosted on the npm registry");
    }
    const response = await fetch(tarballUrl, { signal, redirect: "error" });
    if (!response.ok || !response.body) throw new Error(`Failed to download package: HTTP ${response.status}`);
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_TARBALL_BYTES) {
                await reader.cancel();
                throw new Error("Package exceeds the 25 MB icon preview limit");
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    const archive = Buffer.concat(chunks);
    const packageJson = JSON.parse(await readEntry(archive, "package/package.json", MAX_ICON_BYTES));
    const iconPath: unknown = packageJson.icon;
    if (typeof iconPath !== "string" || !iconPath.toLowerCase().endsWith(".svg")) throw new Error("Package must declare an SVG icon in package.json");
    const parts = iconPath
        .replace(/^\.\//, "")
        .replace(/^dist\//, "")
        .split("/");
    if (parts.some((part) => !part || part === "." || part === "..") || iconPath.includes("\\") || iconPath.includes("\0")) {
        throw new Error("Icon path must point to a file inside the package");
    }
    const svg = await readEntry(archive, `package/dist/${parts.join("/")}`, MAX_ICON_BYTES);
    if (!/<svg(?:\s|\/?>)/i.test(svg)) throw new Error("The declared icon is not an SVG");
    const displayName = typeof packageJson.displayName === "string" && packageJson.displayName.trim() ? packageJson.displayName : packageName;
    return { displayName, version: metadata.version, iconPath, svg };
}
