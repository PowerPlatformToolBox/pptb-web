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
    if (arch && arch !== 'unknown') {
        const archPatterns = arch === 'arm64' ? ['arm64', 'aarch64'] : ['x64', 'x86_64', 'amd64', 'win64'];
        
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
    // This prevents x64 systems from getting arm64 builds
    const wrongArchPatterns = arch === 'x64' ? ['arm64', 'aarch64'] : arch === 'arm64' ? ['x64', 'x86_64', 'amd64'] : [];
    
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
