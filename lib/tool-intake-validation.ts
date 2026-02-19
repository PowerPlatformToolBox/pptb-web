// Tool intake validation utilities
// Mirrors the validation logic from .github/workflows/intake-validation.yml

export interface Contributor {
    name: string;
    url?: string;
}

export interface IconPaths {
    dark: string;
    light: string;
}

export interface CspExceptions {
    "connect-src"?: string[];
    "script-src"?: string[];
    "style-src"?: string[];
    "img-src"?: string[];
    "font-src"?: string[];
    "frame-src"?: string[];
}

export interface Configurations {
    repository?: string;
    website?: string;
    funding?: string;
    iconUrl?: string;
    readmeUrl?: string;
}

export interface Features {
    multiConnection?: "required" | "optional" | "none";
}

export interface ToolPackageJson {
    name: string;
    version: string;
    displayName?: string;
    description?: string;
    contributors?: Contributor[];
    cspExceptions?: CspExceptions;
    license?: string;
    icon?: IconPaths;
    configurations?: Configurations;
    features?: Features;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    packageInfo?: {
        name: string;
        version: string;
        displayName: string;
        description: string;
        license: string;
        contributors: Contributor[];
        cspExceptions?: CspExceptions;
        icon?: string;
        configurations: Configurations;
        features?: Features;
    };
}

// List of approved open source licenses (from intake-validation.yml)
const APPROVED_LICENSES = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "GPL-2.0", "GPL-3.0", "LGPL-3.0", "ISC", "AGPL-3.0-only"];

// List of valid multiConnection values
const VALID_MULTI_CONNECTION_VALUES = ["required", "optional", "none"] as const;
type MultiConnectionValue = (typeof VALID_MULTI_CONNECTION_VALUES)[number];

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates an icon path string against common rules
 */
function validateIconPath(fieldName: string, path: string, errors: string[]): void {
    // Check if it's an HTTP(S) URL (not allowed)
    if (path.startsWith("http://") || path.startsWith("https://")) {
        errors.push(`${fieldName} cannot be an HTTP(S) URL - icons must be bundled under dist`);
        return;
    }

    // Check if it's an absolute path (not allowed)
    if (path.startsWith("/")) {
        errors.push(`${fieldName} must be a relative path (e.g., 'icon.svg' or 'icons/icon.svg')`);
        return;
    }

    // Check for path traversal attempts
    if (path.includes("..")) {
        errors.push(`${fieldName} cannot contain '..' (path traversal not allowed)`);
        return;
    }

    // Check if it ends with .svg
    if (!path.toLowerCase().endsWith(".svg")) {
        errors.push(`${fieldName} must be an SVG file with .svg extension`);
    }
}

/**
 * Checks if a URL is accessible by making a HEAD request
 * @param url - The URL to check
 * @returns Promise that resolves to true if URL is accessible (returns 200-399 status)
 */
async function isUrlAccessible(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: "HEAD", redirect: "follow" });
        return response.ok || (response.status >= 200 && response.status < 400);
    } catch {
        return false;
    }
}

/**
 * Validates that iconUrl has a .png or .jpg extension
 * @param url - The icon URL to validate
 * @returns true if the URL ends with .png or .jpg
 */
function hasValidImageExtension(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        return pathname.endsWith(".png") || pathname.endsWith(".jpg") || pathname.endsWith(".jpeg");
    } catch {
        return false;
    }
}

function isGithubDomain(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname === "github.com" || hostname.endsWith(".github.com");
    } catch {
        return false;
    }
}

export async function validatePackageJson(packageJson: ToolPackageJson): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!packageJson.name || typeof packageJson.name !== "string") {
        errors.push("Package name is required and must be a string");
    }

    if (!packageJson.version || typeof packageJson.version !== "string") {
        errors.push("Package version is required and must be a string");
    }

    if (!packageJson.displayName || typeof packageJson.displayName !== "string") {
        errors.push("displayName is required and must be a string");
    }

    if (!packageJson.description || typeof packageJson.description !== "string") {
        errors.push("description is required and must be a string");
    }

    // License validation
    if (!packageJson.license) {
        errors.push("license is required");
    } else if (!APPROVED_LICENSES.includes(packageJson.license)) {
        errors.push(`License "${packageJson.license}" is not in the approved list. Approved licenses: ${APPROVED_LICENSES.join(", ")}`);
    }

    // Icon validation (bundled SVG) - REQUIRED
    if (!packageJson.icon || typeof packageJson.icon !== "object" || Array.isArray(packageJson.icon)) {
        errors.push("icon is required and must be an object with 'dark' and 'light' properties");
    } else {
        const icon = packageJson.icon as Record<string, unknown>;
        
        // Validate dark icon
        if (!icon.dark || typeof icon.dark !== "string") {
            errors.push("icon.dark is required and must be a string (relative path to bundled SVG under dist)");
        } else {
            validateIconPath("icon.dark", icon.dark as string, errors);
        }
        
        // Validate light icon
        if (!icon.light || typeof icon.light !== "string") {
            errors.push("icon.light is required and must be a string (relative path to bundled SVG under dist)");
        } else {
            validateIconPath("icon.light", icon.light as string, errors);
        }
    }

    // Contributors validation
    if (!packageJson.contributors || !Array.isArray(packageJson.contributors)) {
        errors.push("contributors is required and must be an array");
    } else if (packageJson.contributors.length === 0) {
        errors.push("At least one contributor is required");
    } else {
        packageJson.contributors.forEach((contributor, index) => {
            if (!contributor.name || typeof contributor.name !== "string") {
                errors.push(`Contributor at index ${index} must have a name`);
            }
            if (contributor.url && !isValidUrl(contributor.url)) {
                warnings.push(`Contributor "${contributor.name}" has an invalid URL`);
            }
        });
    }

    // Configurations validation (repository, iconUrl, readmeUrl are required)
    if (!packageJson.configurations || typeof packageJson.configurations !== "object") {
        errors.push("configurations is required and must include repository, iconUrl, and readmeUrl");
    } else {
        const configs = packageJson.configurations;

        // Repository validation
        if (!configs.repository || typeof configs.repository !== "string") {
            errors.push("configurations.repository is required and must be a URL");
        } else if (!isValidUrl(configs.repository)) {
            errors.push("configurations.repository has an invalid URL format");
        } else {
            // Check if repository URL is accessible
            const isAccessible = await isUrlAccessible(configs.repository);
            if (!isAccessible) {
                errors.push("configurations.repository URL is not accessible");
            }
        }

        // Website validation (optional)
        if (configs.website) {
            if (!isValidUrl(configs.website)) {
                warnings.push("configurations.website has an invalid URL format");
            } else {
                const isAccessible = await isUrlAccessible(configs.website);
                if (!isAccessible) {
                    warnings.push("configurations.website URL is not accessible");
                }
            }
        }

        // Funding validation (optional)
        if (configs.funding) {
            if (!isValidUrl(configs.funding)) {
                warnings.push("configurations.funding has an invalid URL format");
            } else {
                const isAccessible = await isUrlAccessible(configs.funding);
                if (!isAccessible) {
                    warnings.push("configurations.funding URL is not accessible");
                }
            }
        }

        // IconUrl validation
        if (configs.iconUrl) {
            if (typeof configs.iconUrl !== "string") {
                errors.push("configurations.iconUrl must be a URL");
            } else if (!isValidUrl(configs.iconUrl)) {
                errors.push("configurations.iconUrl has an invalid URL format");
            } else {
                try {
                    const iconHostname = new URL(configs.iconUrl).hostname.toLowerCase();
                    if (iconHostname !== "raw.githubusercontent.com") {
                        errors.push("configurations.iconUrl must be hosted on raw.githubusercontent.com");
                    }
                } catch {
                    errors.push("configurations.iconUrl has an invalid URL format");
                }

                // Check image extension
                if (!hasValidImageExtension(configs.iconUrl)) {
                    errors.push("configurations.iconUrl must have a .png, .jpg, or .jpeg extension");
                }

                // Check if icon URL is accessible
                const isAccessible = await isUrlAccessible(configs.iconUrl);
                if (!isAccessible) {
                    errors.push("configurations.iconUrl is not accessible");
                }
            }
        }

        // ReadmeUrl validation
        if (!configs.readmeUrl || typeof configs.readmeUrl !== "string") {
            errors.push("configurations.readmeUrl is required and must be a URL");
        } else if (!isValidUrl(configs.readmeUrl)) {
            errors.push("configurations.readmeUrl has an invalid URL format");
        } else if (isGithubDomain(configs.readmeUrl)) {
            errors.push("configurations.readmeUrl cannot be hosted on github.com; use raw.githubusercontent.com or another domain");
        } else {
            // Check if readme URL is accessible
            const isAccessible = await isUrlAccessible(configs.readmeUrl);
            if (!isAccessible) {
                errors.push("configurations.readmeUrl is not accessible");
            }
        }
    }

    // CSP Exceptions validation (optional but validated if present)
    if (packageJson.cspExceptions) {
        const validCspDirectives = ["connect-src", "script-src", "style-src", "img-src", "font-src", "frame-src"];

        // Check if cspExceptions is empty
        const hasAnyDirectives = Object.keys(packageJson.cspExceptions).length > 0;
        if (!hasAnyDirectives) {
            errors.push("cspExceptions cannot be empty. If CSP exceptions are not needed, remove the cspExceptions field");
        }

        Object.keys(packageJson.cspExceptions).forEach((directive) => {
            if (!validCspDirectives.includes(directive)) {
                warnings.push(`Unknown CSP directive: ${directive}`);
            }

            const values = packageJson.cspExceptions?.[directive as keyof CspExceptions];
            if (values && !Array.isArray(values)) {
                errors.push(`CSP directive "${directive}" must be an array of strings`);
            } else if (values && values.length === 0) {
                errors.push(`CSP directive "${directive}" cannot be an empty array`);
            }
        });
    }

    // Features validation (optional but validated if present)
    if (packageJson.features) {
        // Check if features object has only multiConnection property
        const featureKeys = Object.keys(packageJson.features);
        const invalidKeys = featureKeys.filter((key) => key !== "multiConnection");

        if (invalidKeys.length > 0) {
            errors.push(`features can only contain 'multiConnection' property. Invalid properties: ${invalidKeys.join(", ")}`);
        }

        // multiConnection must be present if features is provided
        if (packageJson.features.multiConnection === undefined) {
            errors.push("features.multiConnection is required when features object is provided");
        } else {
            const isValidValue = (value: string): value is MultiConnectionValue => {
                return VALID_MULTI_CONNECTION_VALUES.includes(value as MultiConnectionValue);
            };

            if (!isValidValue(packageJson.features.multiConnection)) {
                errors.push(`features.multiConnection must be one of: ${VALID_MULTI_CONNECTION_VALUES.join(", ")}`);
            }
        }
    }

    const valid = errors.length === 0;

    return {
        valid,
        errors,
        warnings,
        packageInfo: valid
            ? {
                  name: packageJson.name,
                  version: packageJson.version,
                  displayName: packageJson.displayName!,
                  description: packageJson.description!,
                  license: packageJson.license!,
                  contributors: packageJson.contributors!,
                  cspExceptions: packageJson.cspExceptions,
                  icon: packageJson.icon,
                  configurations: packageJson.configurations!,
                  features: packageJson.features,
              }
            : undefined,
    };
}

export interface NpmPackageInfo {
    name: string;
    version: string;
    description?: string;
    license?: string;
    displayName?: string;
    contributors?: Contributor[];
    cspExceptions?: CspExceptions;
    icon?: IconPaths;
    configurations?: Configurations;
    features?: Features;
}

interface NpmRegistryVersionData {
    name: string;
    version: string;
    description?: string;
    license?: string;
    displayName?: string;
    contributors?: Contributor[];
    cspExceptions?: CspExceptions;
    icon?: IconPaths;
    configurations?: Configurations;
    features?: Features;
    dist: {
        tarball: string;
    };
}

/**
 * Fetches package metadata and tarball URL from npm registry
 * @param packageName - The npm package name
 * @returns Package metadata including tarball URL or error
 */
async function fetchNpmPackageMetadata(
    packageName: string,
): Promise<{ success: true; data: { versionData: NpmRegistryVersionData; latestVersion: string; tarballUrl: string } } | { success: false; error: string }> {
    try {
        // Fetch package info from npm registry using base endpoint
        // This is more reliable than /latest for packages with pre-release versions
        const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: `Package "${packageName}" not found on npm` };
            }
            return { success: false, error: `Failed to fetch package: HTTP ${response.status}` };
        }

        const packageData = await response.json();

        // Get the latest version from dist-tags
        const latestVersion = packageData["dist-tags"]?.latest;
        if (!latestVersion) {
            return { success: false, error: `Package "${packageName}" has no latest version` };
        }

        // Get the version-specific data
        const versionData = packageData.versions?.[latestVersion];
        if (!versionData) {
            return { success: false, error: `Could not find version data for ${latestVersion}` };
        }

        const tarballUrl = versionData.dist?.tarball;
        if (!tarballUrl) {
            return { success: false, error: "Could not find tarball URL" };
        }

        return {
            success: true,
            data: {
                versionData,
                latestVersion,
                tarballUrl,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error fetching package metadata",
        };
    }
}

export async function fetchNpmPackageInfo(packageName: string): Promise<{ success: true; data: NpmPackageInfo } | { success: false; error: string }> {
    const metadataResult = await fetchNpmPackageMetadata(packageName);

    if (!metadataResult.success) {
        return { success: false, error: metadataResult.error };
    }

    const { versionData } = metadataResult.data;

    return {
        success: true,
        data: {
            name: versionData.name,
            version: versionData.version,
            description: versionData.description,
            license: versionData.license,
            displayName: versionData.displayName,
            contributors: versionData.contributors,
            cspExceptions: versionData.cspExceptions,
            icon: versionData.icon,
            configurations: versionData.configurations,
            features: versionData.features,
        },
    };
}

export interface PackageStructureCheck {
    hasNpmShrinkwrap: boolean;
    hasDistFolder: boolean;
    hasDistIndexHtml: boolean;
}

/**
 * Validates package structure by checking if npm-shrinkwrap.json and dist folder with index.html exist
 * This requires downloading and inspecting the package tarball
 */
export async function validatePackageStructure(packageName: string): Promise<{ success: true; data: PackageStructureCheck } | { success: false; error: string }> {
    try {
        // Fetch package metadata to get tarball URL using shared helper
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

        // Use the tar npm package to extract the tarball
        // Import dynamically to ensure this only runs on server
        const tar = await import("tar");
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");

        // Create a temporary directory for extraction
        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "npm-validation-"));

        try {
            // Write tarball to temp file
            const tarballPath = path.join(tmpDir, "package.tgz");
            await fs.promises.writeFile(tarballPath, Buffer.from(tarballBuffer));

            // Extract tarball
            const extractDir = path.join(tmpDir, "extracted");
            await fs.promises.mkdir(extractDir, { recursive: true });

            await tar.x({
                file: tarballPath,
                cwd: extractDir,
            });

            // Check for npm-shrinkwrap.json in the package directory
            const packageDir = path.join(extractDir, "package");
            const shrinkwrapPath = path.join(packageDir, "npm-shrinkwrap.json");
            const distPath = path.join(packageDir, "dist");
            const distIndexPath = path.join(distPath, "index.html");

            let hasNpmShrinkwrap = false;
            let hasDistFolder = false;
            let hasDistIndexHtml = false;

            try {
                await fs.promises.access(shrinkwrapPath);
                hasNpmShrinkwrap = true;
            } catch {
                hasNpmShrinkwrap = false;
            }

            try {
                const distStat = await fs.promises.stat(distPath);
                hasDistFolder = distStat.isDirectory();
            } catch {
                hasDistFolder = false;
            }

            // Check for index.html inside dist folder
            if (hasDistFolder) {
                try {
                    const indexStat = await fs.promises.stat(distIndexPath);
                    hasDistIndexHtml = indexStat.isFile();
                } catch {
                    hasDistIndexHtml = false;
                }
            }

            return {
                success: true,
                data: {
                    hasNpmShrinkwrap,
                    hasDistFolder,
                    hasDistIndexHtml,
                },
            };
        } finally {
            // Cleanup temp directory
            await fs.promises.rm(tmpDir, { recursive: true, force: true });
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error validating package structure",
        };
    }
}
