export interface GitHubAsset {
    name: string;
    browser_download_url: string;
    size: number;
    content_type: string;
}

export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    assets: GitHubAsset[];
}

const GITHUB_API_URL = "https://api.github.com/repos/PowerPlatformToolBox/desktop-app/releases/latest";
const GITHUB_RELEASES_API_URL = "https://api.github.com/repos/PowerPlatformToolBox/desktop-app/releases";

export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
            // Cache for 5 minutes in production
            next: { revalidate: 300 },
        });

        if (!response.ok) {
            console.error("Failed to fetch release:", response.status);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching latest release:", error);
        return null;
    }
}

export async function fetchAllReleases(): Promise<GitHubRelease[]> {
    try {
        const response = await fetch(GITHUB_RELEASES_API_URL, {
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
            // Cache for 5 minutes in production
            next: { revalidate: 300 },
        });

        if (!response.ok) {
            console.error("Failed to fetch releases:", response.status);
            return [];
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching releases:", error);
        return [];
    }
}

export function isInsiderRelease(release: GitHubRelease): boolean {
    const tag = release.tag_name.toLowerCase();
    const name = release.name.toLowerCase();
    return tag.includes("insider") || tag.includes("preview") || tag.includes("beta") || name.includes("insider") || name.includes("preview") || name.includes("beta");
}

export function filterDownloadableAssets(assets: GitHubAsset[]): GitHubAsset[] {
    return assets.filter((asset) => {
        const name = asset.name.toLowerCase();
        // Exclude yml files and GitHub-generated source code archives
        return !name.endsWith(".yml") && !name.endsWith(".yaml") && name !== "source code (zip)" && name !== "source code (tar.gz)";
    });
}

export function findAssetForOS(assets: GitHubAsset[], os: string, arch?: string): GitHubAsset | null {
    if (!assets || assets.length === 0) {
        return null;
    }

    // Mapping of OS to file patterns
    const osPatterns: Record<string, string[]> = {
        windows: [".exe", "-win", "-windows"],
        mac: [".dmg", "-mac", "-macos", "-darwin"],
        linux: [".appimage", ".deb", ".rpm", "-linux"],
    };

    const patterns = osPatterns[os] || [];

    // If architecture is provided, try to find OS + architecture match first
    if (arch && arch !== "unknown") {
        const archPatterns = arch === "arm64" ? ["arm64", "aarch64"] : ["x64", "x86_64", "amd64", "win64"];

        for (const osPattern of patterns) {
            for (const archPattern of archPatterns) {
                const asset = assets.find((a) => {
                    const name = a.name.toLowerCase();
                    return name.includes(osPattern) && name.includes(archPattern);
                });
                if (asset) {
                    return asset;
                }
            }
        }
    }

    // If no architecture-specific match, try OS-only match but exclude wrong architecture
    // This prevents x64 systems from getting arm64 builds and vice versa
    let wrongArchPatterns: string[] = [];
    if (arch === "x64") {
        wrongArchPatterns = ["arm64", "aarch64"];
    } else if (arch === "arm64") {
        wrongArchPatterns = ["x64", "x86_64", "amd64"];
    }

    for (const pattern of patterns) {
        const asset = assets.find((a) => {
            const name = a.name.toLowerCase();
            const hasOsPattern = name.includes(pattern);
            const hasWrongArch = wrongArchPatterns.some((wrongArch) => name.includes(wrongArch));
            return hasOsPattern && !hasWrongArch;
        });
        if (asset) {
            return asset;
        }
    }

    // If still no match, return null to indicate no suitable asset found
    return null;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// --- GitHub Actions helpers for convert-tool workflow ---

export interface ConvertWorkflowInputs {
    npm_package_name: string;
    display_name: string;
    description: string;
    icon_url?: string;
    icon?: string;
    readme_url: string;
    version: string;
    license: string;
    csp_exceptions?: string;
    submitted_by: string;
    features?: string;
    authors: string;
    repository?: string;
    website?: string;
}

export interface UpdateWorkflowInputs {
    tool_id: string;
    version: string;
    authors: string;
    repository?: string;
    website?: string;
}

async function ghFetch(url: string, token: string, init?: RequestInit) {
    const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
    } as Record<string, string>;
    const res = await fetch(url, { ...init, headers });
    return res;
}

export async function dispatchConvertToolWorkflow(params: { owner: string; repo: string; token: string; workflowFile: string; ref?: string; inputs: ConvertWorkflowInputs | UpdateWorkflowInputs }) {
    const { owner, repo, token, inputs, workflowFile } = params;
    const ref = params.ref ?? "main";
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;
    const res = await ghFetch(url, token, {
        method: "POST",
        body: JSON.stringify({ ref, inputs }),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Workflow dispatch failed: ${res.status} ${msg}`);
    }
}

export async function waitForWorkflowCompletion(params: {
    owner: string;
    repo: string;
    token: string;
    workflowFile: string; // default convert-tool.yml
    branch?: string; // default main
    timeoutMs?: number; // default 180000
    pollIntervalMs?: number; // default 5000
    dispatchedAt?: Date; // timestamp when workflow was dispatched
}) {
    const owner = params.owner;
    const repo = params.repo;
    const token = params.token;
    const workflowFile = params.workflowFile;
    const branch = params.branch ?? "main";
    const timeoutMs = params.timeoutMs ?? 180000;
    const pollIntervalMs = params.pollIntervalMs ?? 5000;
    const dispatchedAt = params.dispatchedAt ?? new Date();

    const start = Date.now();
    let foundRun = false;

    interface WorkflowRun {
        created_at: string;
        status: string;
        conclusion: string | null;
    }

    while (Date.now() - start < timeoutMs) {
        // First, look for in-progress or queued runs created after dispatch
        if (!foundRun) {
            const inProgressUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?branch=${encodeURIComponent(branch)}&per_page=5`;
            const res = await ghFetch(inProgressUrl, token);
            if (res.ok) {
                const json = await res.json();
                const recentRun = json.workflow_runs?.find((run: WorkflowRun) => {
                    const runCreated = new Date(run.created_at);
                    return runCreated >= dispatchedAt;
                });
                if (recentRun) {
                    foundRun = true;
                    // If already completed, return conclusion
                    if (recentRun.status === "completed") {
                        return recentRun.conclusion as string | null;
                    }
                }
            }
        } else {
            // Once found, check for completion
            const completedUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?branch=${encodeURIComponent(branch)}&status=completed&per_page=5`;
            const res = await ghFetch(completedUrl, token);
            if (res.ok) {
                const json = await res.json();
                const completedRun = json.workflow_runs?.find((run: WorkflowRun) => {
                    const runCreated = new Date(run.created_at);
                    return runCreated >= dispatchedAt;
                });
                if (completedRun) {
                    return completedRun.conclusion as string | null;
                }
            }
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    return null; // timed out
}

export async function runConvertToolWorkflow(params: { owner: string; repo: string; token: string; inputs: ConvertWorkflowInputs; ref?: string; timeoutMs?: number; pollIntervalMs?: number }) {
    const dispatchedAt = new Date();
    const workflowFile = "convert-tool.yml";
    await dispatchConvertToolWorkflow({ owner: params.owner, repo: params.repo, token: params.token, workflowFile: workflowFile, inputs: params.inputs, ref: params.ref });
    const conclusion = await waitForWorkflowCompletion({
        owner: params.owner,
        repo: params.repo,
        token: params.token,
        workflowFile: workflowFile,
        timeoutMs: params.timeoutMs,
        pollIntervalMs: params.pollIntervalMs,
        dispatchedAt,
    });
    return conclusion;
}

export async function runUpdateToolWorkflow(params: { owner: string; repo: string; token: string; inputs: UpdateWorkflowInputs; ref?: string; timeoutMs?: number; pollIntervalMs?: number }) {
    const dispatchedAt = new Date();
    const workflowFile = "update-convert-tool.yml";
    await dispatchConvertToolWorkflow({ owner: params.owner, repo: params.repo, token: params.token, workflowFile: workflowFile, inputs: params.inputs, ref: params.ref });
    const conclusion = await waitForWorkflowCompletion({
        owner: params.owner,
        repo: params.repo,
        token: params.token,
        workflowFile: workflowFile,
        timeoutMs: params.timeoutMs,
        pollIntervalMs: params.pollIntervalMs,
        dispatchedAt,
    });
    return conclusion;
}

// --- GitHub Sponsors API helpers ---

export interface GitHubSponsor {
    sponsorEntity: {
        login: string;
        name: string | null;
        avatarUrl: string;
        url: string;
    };
    tier: {
        name: string;
        monthlyPriceInDollars: number;
    } | null;
}

export interface SponsorData {
    name: string;
    login: string;
    avatarUrl: string;
    githubUrl: string;
    tier: string;
    monthlyAmount: number;
}

/**
 * Fetches the list of active GitHub sponsors for an organization using GraphQL API.
 *
 * @param organizationLogin - The GitHub organization login (e.g., "PowerPlatformToolBox")
 * @param token - GitHub personal access token with appropriate permissions
 * @returns Array of sponsor data sorted by monthly contribution amount (highest first)
 * @throws Error if the GraphQL query fails or returns errors
 */
export async function fetchGitHubSponsors(organizationLogin: string, token: string): Promise<SponsorData[]> {
    const query = `
        query($login: String!) {
            organization(login: $login) {
                sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
                    nodes {
                        sponsorEntity {
                            ... on User {
                                login
                                name
                                avatarUrl
                                url
                            }
                            ... on Organization {
                                login
                                name
                                avatarUrl
                                url
                            }
                        }
                        tier {
                            name
                            monthlyPriceInDollars
                        }
                    }
                }
            }
        }
    `;

    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            variables: { login: organizationLogin },
        }),
    });

    if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        console.error("GitHub GraphQL errors:", result.errors);
        throw new Error(result.errors[0]?.message || "GraphQL query failed");
    }

    const nodes = result.data?.organization?.sponsorshipsAsMaintainer?.nodes;

    if (!nodes || !Array.isArray(nodes)) {
        return [];
    }

    const sponsors: SponsorData[] = nodes
        .filter((node: GitHubSponsor) => node.sponsorEntity)
        .map((node: GitHubSponsor) => ({
            name: node.sponsorEntity.name || node.sponsorEntity.login,
            login: node.sponsorEntity.login,
            avatarUrl: node.sponsorEntity.avatarUrl,
            githubUrl: node.sponsorEntity.url,
            tier: node.tier?.name || "Sponsor",
            monthlyAmount: node.tier?.monthlyPriceInDollars || 0,
        }))
        .sort((a: SponsorData, b: SponsorData) => b.monthlyAmount - a.monthlyAmount);

    return sponsors;
}
