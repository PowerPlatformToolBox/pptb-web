// Tool intake validation utilities
// Mirrors the validation logic from .github/workflows/intake-validation.yml

export interface Contributor {
    name: string;
    url?: string;
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

function isGithubDomain(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname === "github.com" || hostname.endsWith(".github.com");
    } catch {
        return false;
    }
}

export function validatePackageJson(packageJson: ToolPackageJson): ValidationResult {
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

        if (!configs.repository || typeof configs.repository !== "string") {
            errors.push("configurations.repository is required and must be a URL");
        } else if (!isValidUrl(configs.repository)) {
            errors.push("configurations.repository has an invalid URL format");
        }

        if (configs.website && !isValidUrl(configs.website)) {
            warnings.push("configurations.website has an invalid URL format");
        }
        if (configs.funding && !isValidUrl(configs.funding)) {
            warnings.push("configurations.funding has an invalid URL format");
        }

        if (configs.iconUrl) {
            if (typeof configs.iconUrl !== "string") {
                errors.push("configurations.iconUrl must be a URL");
            } else if (!isValidUrl(configs.iconUrl)) {
                errors.push("configurations.iconUrl has an invalid URL format");
            } else if (isGithubDomain(configs.iconUrl)) {
                errors.push("configurations.iconUrl cannot be hosted on github.com; use raw.githubusercontent.com or another domain");
            }
        }

        if (!configs.readmeUrl || typeof configs.readmeUrl !== "string") {
            errors.push("configurations.readmeUrl is required and must be a URL");
        } else if (!isValidUrl(configs.readmeUrl)) {
            errors.push("configurations.readmeUrl has an invalid URL format");
        } else if (isGithubDomain(configs.readmeUrl)) {
            errors.push("configurations.readmeUrl cannot be hosted on github.com; use raw.githubusercontent.com or another domain");
        }
    }

    // CSP Exceptions validation (optional but validated if present)
    if (packageJson.cspExceptions) {
        const validCspDirectives = ["connect-src", "script-src", "style-src", "img-src", "font-src", "frame-src"];

        Object.keys(packageJson.cspExceptions).forEach((directive) => {
            if (!validCspDirectives.includes(directive)) {
                warnings.push(`Unknown CSP directive: ${directive}`);
            }

            const values = packageJson.cspExceptions?.[directive as keyof CspExceptions];
            if (values && !Array.isArray(values)) {
                errors.push(`CSP directive "${directive}" must be an array of strings`);
            }
        });
    }

    // Features validation (optional but validated if present)
    if (packageJson.features) {
        if (packageJson.features.multiConnection !== undefined) {
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
    configurations?: Configurations;
    features?: Features;
}

export async function fetchNpmPackageInfo(packageName: string): Promise<{ success: true; data: NpmPackageInfo } | { success: false; error: string }> {
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
                configurations: versionData.configurations,
                features: versionData.features,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error fetching package info",
        };
    }
}
