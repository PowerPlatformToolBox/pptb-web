// Version extraction utilities for tool packages
// Reads minAPI from package.json features

import { fetchNpmPackageMetadata } from "@pptb/validate/npm";

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/;

export interface VersionInfo {
    minAPI: string | null;
}

/**
 * Validates that a string is a valid semantic version
 */
export function isValidSemver(version: string): boolean {
    return SEMVER_REGEX.test(version);
}

/**
 * Extracts minAPI version information from an npm package tarball.
 * - minAPI: from package.json → features.minAPI
 *
 * The value may be null if not present or not a valid semver string.
 */
export async function extractVersionInfo(packageName: string): Promise<{ success: true; data: VersionInfo } | { success: false; error: string }> {
    try {
        // Fetch package metadata (tarball URL) via shared helper
        const metadataResult = await fetchNpmPackageMetadata(packageName);

        if (!metadataResult.success) {
            return { success: false, error: metadataResult.error };
        }

        const { tarballUrl } = metadataResult.data;

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

            return {
                success: true,
                data: {
                    minAPI,
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
