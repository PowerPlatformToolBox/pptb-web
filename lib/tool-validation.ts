import type { Configurations, Contributor, CspExceptions, Features, ToolPackageJson } from "@pptb/validate";
import { fetchNpmPackageMetadata } from "@pptb/validate/npm";

export type { Configurations, Contributor, CspExceptions, Features, ToolPackageJson };

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
