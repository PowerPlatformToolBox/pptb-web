import { fetchNpmPackageMetadata } from "@pptb/validate/npm";

// Replace tool-validation.ts imports with:
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
    readmeUrl?: string;
}

export interface Features {
    multiConnection?: "required" | "optional" | "none";
    minAPI?: string;
}

export interface ToolPackageJson {
    name: string;
    version: string;
    displayName?: string;
    description?: string;
    contributors?: Contributor[];
    cspExceptions?: CspExceptions;
    license?: string;
    icon?: string;
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

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
export interface NpmPackageInfo {
    name: string;
    version: string;
    description?: string;
    license?: string;
    displayName?: string;
    contributors?: Contributor[];
    cspExceptions?: CspExceptions;
    icon?: string;
    configurations?: Configurations;
    features?: Features;
}

export async function fetchNpmPackageInfo(packageName: string): Promise<{ success: true; data: NpmPackageInfo } | { success: false; error: string }> {
    const metadataResult = await fetchNpmPackageMetadata(packageName);

    if (!metadataResult.success) {
        return { success: false, error: metadataResult.error };
    }

    const { packageInfo } = metadataResult.data;

    return {
        success: true,
        data: {
            name: packageInfo.name,
            version: packageInfo.version,
            description: packageInfo.description,
            license: packageInfo.license,
            displayName: packageInfo.displayName,
            contributors: packageInfo.contributors,
            cspExceptions: packageInfo.cspExceptions,
            icon: packageInfo.icon,
            configurations: packageInfo.configurations,
            features: packageInfo.features,
        },
    };
}

export interface PackageStructureCheck {
    hasNpmShrinkwrap: boolean;
    hasDistFolder: boolean;
    hasDistIndexHtml: boolean;
}
