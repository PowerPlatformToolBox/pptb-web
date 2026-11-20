import { validatePackageJson, type ToolPackageJson } from "@pptb/validate";
import { extractVersionInfo, isValidSemver } from "@/lib/version-extraction";

type NpmManifest = ToolPackageJson & { dist?: { tarball?: string } };

export async function fetchIntakeManifest(packageName: string, version = "latest") {
    if (version !== "latest" && !isValidSemver(version)) throw new Error("Select an exact npm version.");
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Could not load ${packageName}@${version} from npm (HTTP ${response.status}).`);

    const manifest: NpmManifest = await response.json();
    if (manifest.name !== packageName || !isValidSemver(manifest.version) || (version !== "latest" && manifest.version !== version)) {
        throw new Error("npm returned a different package or version.");
    }
    return manifest;
}

export async function validateIntakeVersion(packageName: string, version: string) {
    const { dist, name, displayName, description, license, icon, configurations, features, contributors, cspExceptions } = await fetchIntakeManifest(packageName, version);
    const validation = await validatePackageJson({ name, version, displayName, description, license, icon, configurations, features, contributors, cspExceptions });
    if (!validation.valid) return { error: validation.errors.join("; ") || "Package validation failed." };
    const info = validation.packageInfo as ToolPackageJson;

    if (!dist?.tarball) return { error: "The selected npm version has no tarball." };
    const tarball = new URL(dist.tarball);
    if (tarball.origin !== "https://registry.npmjs.org" || tarball.username || tarball.password) return { error: "Invalid npm tarball URL." };
    const extracted = await extractVersionInfo(packageName, { version, tarballUrl: tarball.href });
    if (!extracted.success) return { error: extracted.validation?.errors.join("; ") || extracted.error };

    const warnings = [...validation.warnings, ...extracted.data.warnings];
    return {
        values: {
            version,
            display_name: info.displayName,
            description: info.description,
            license: info.license,
            icon: info.icon || null,
            csp_exceptions: info.cspExceptions || null,
            configurations: info.configurations,
            features: info.features || null,
            min_api: extracted.data.minAPI,
            mcp_enabled: extracted.data.mcpEnabled,
            validation_warnings: warnings.length ? warnings : null,
        },
        contributors: info.contributors || [],
    };
}
