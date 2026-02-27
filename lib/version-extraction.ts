// Version extraction utilities for tool packages
// Reads minAPI from package.json features and maxAPI from npm-shrinkwrap.json

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/;

export interface VersionInfo {
    minAPI: string | null;
    maxAPI: string | null;
}

/**
 * Validates that a string is a valid semantic version
 */
export function isValidSemver(version: string): boolean {
    return SEMVER_REGEX.test(version);
}

/**
 * Extracts minAPI and maxAPI version information from an npm package tarball.
 * - minAPI: from package.json → features.minAPI
 * - maxAPI: from npm-shrinkwrap.json → dependencies["@pptb/types"].version
 *
 * Either value may be null if not present or not a valid semver string.
 */
export async function extractVersionInfo(packageName: string): Promise<{ success: true; data: VersionInfo } | { success: false; error: string }> {
    try {
        // Fetch package metadata from npm registry to get tarball URL
        const registryResponse = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
            headers: { Accept: "application/json" },
        });

        if (!registryResponse.ok) {
            if (registryResponse.status === 404) {
                return { success: false, error: `Package "${packageName}" not found on npm` };
            }
            return { success: false, error: `Failed to fetch package metadata: HTTP ${registryResponse.status}` };
        }

        const packageData = await registryResponse.json();

        const latestVersion = packageData["dist-tags"]?.latest;
        if (!latestVersion) {
            return { success: false, error: `Package "${packageName}" has no latest version` };
        }

        const versionData = packageData.versions?.[latestVersion];
        if (!versionData) {
            return { success: false, error: `Could not find version data for ${latestVersion}` };
        }

        const tarballUrl = versionData.dist?.tarball;
        if (!tarballUrl) {
            return { success: false, error: "Could not find tarball URL" };
        }

        // Download the tarball
        const tarballResponse = await fetch(tarballUrl);
        if (!tarballResponse.ok) {
            return { success: false, error: `Failed to download tarball: HTTP ${tarballResponse.status}` };
        }

        const tarballBuffer = await tarballResponse.arrayBuffer();

        const tar = await import("tar");
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");

        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pptb-version-"));

        try {
            const tarballPath = path.join(tmpDir, "package.tgz");
            await fs.promises.writeFile(tarballPath, Buffer.from(tarballBuffer));

            const extractDir = path.join(tmpDir, "extracted");
            await fs.promises.mkdir(extractDir, { recursive: true });

            await tar.x({
                file: tarballPath,
                cwd: extractDir,
                filter: (filePath: string) => !filePath.split("/").some((part) => part === ".."),
            });

            const packageDir = path.join(extractDir, "package");

            // Read package.json → features.minAPI
            const packageJsonPath = path.join(packageDir, "package.json");
            let minAPI: string | null = null;
            try {
                const packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf-8");

                let parsedPackageJson: Record<string, unknown>;
                try {
                    parsedPackageJson = JSON.parse(packageJsonContent);
                } catch {
                    console.warn(`[version-extraction] Failed to parse package.json in ${packageName}; storing null for minAPI`);
                    parsedPackageJson = {};
                }

                const features = parsedPackageJson.features as Record<string, unknown> | undefined;
                const rawMinAPI = features?.minAPI;
                if (rawMinAPI && typeof rawMinAPI === "string" && isValidSemver(rawMinAPI)) {
                    minAPI = rawMinAPI;
                } else {
                    console.warn(`[version-extraction] features.minAPI is missing or invalid in ${packageName}; storing null`);
                }
            } catch {
                console.warn(`[version-extraction] package.json not found in ${packageName}; storing null for minAPI`);
            }

            // Read npm-shrinkwrap.json → dependencies["@pptb/types"].version
            const shrinkwrapPath = path.join(packageDir, "npm-shrinkwrap.json");
            let maxAPI: string | null = null;
            try {
                const shrinkwrapContent = await fs.promises.readFile(shrinkwrapPath, "utf-8");

                let parsedShrinkwrap: Record<string, unknown>;
                try {
                    parsedShrinkwrap = JSON.parse(shrinkwrapContent);
                } catch {
                    console.warn(`[version-extraction] Failed to parse npm-shrinkwrap.json in ${packageName}; storing null for maxAPI`);
                    parsedShrinkwrap = {};
                }

                const dependencies = parsedShrinkwrap.dependencies as Record<string, unknown> | undefined;
                const pptbTypesDep = dependencies?.["@pptb/types"];
                const pptbTypesVersion = pptbTypesDep && typeof pptbTypesDep === "object" ? (pptbTypesDep as Record<string, unknown>).version : undefined;

                if (pptbTypesVersion && typeof pptbTypesVersion === "string" && isValidSemver(pptbTypesVersion)) {
                    maxAPI = pptbTypesVersion;
                } else {
                    console.warn(`[version-extraction] @pptb/types version is missing or invalid in ${packageName}; storing null for maxAPI`);
                }
            } catch {
                console.warn(`[version-extraction] npm-shrinkwrap.json not found in ${packageName}; storing null for maxAPI`);
            }

            return {
                success: true,
                data: {
                    minAPI,
                    maxAPI,
                },
            };
        } finally {
            await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch((err) => {
                console.warn("[version-extraction] Failed to clean up temporary directory:", err);
            });
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error extracting version info",
        };
    }
}
