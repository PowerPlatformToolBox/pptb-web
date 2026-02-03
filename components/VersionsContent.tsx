"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useEffect, useState } from "react";

import { fetchAllReleases, filterDownloadableAssets, formatFileSize, isInsiderRelease, type GitHubAsset, type GitHubRelease } from "@/lib/github-api";

type PlatformKey = "windows" | "macos" | "linux";
type ArchType = "arm64" | "x64" | "universal";

const PLATFORM_LABELS: Record<PlatformKey, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
};

const ARCH_LABELS: Record<ArchType, string> = {
    arm64: "ARM64",
    x64: "Intel / x64",
    universal: "Universal / Other",
};

const ARCH_ORDER: ArchType[] = ["arm64", "x64", "universal"];

// Utility function to format date strings
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function VersionsContent() {
    const [releases, setReleases] = useState<GitHubRelease[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReleases = async () => {
            const allReleases = await fetchAllReleases();
            setReleases(allReleases);
            setLoading(false);
        };

        loadReleases();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-lg text-slate-600 animate-pulse">Loading releases...</div>
            </div>
        );
    }

    const stableReleases = releases.filter((r) => !isInsiderRelease(r));
    const insiderReleases = releases.filter((r) => isInsiderRelease(r));

    const tabBaseClasses = "px-4 sm:px-6 py-3 text-base sm:text-lg font-semibold text-slate-700 border-b-2 border-transparent transition-colors whitespace-nowrap";

    return (
        <TabGroup>
            <TabList className="flex gap-2 sm:gap-4 border-b border-slate-200 mb-8 justify-center overflow-x-auto">
                <Tab className={`${tabBaseClasses} hover:text-blue data-[selected]:border-blue data-[selected]:text-blue`}>Stable Release</Tab>
                <Tab className={`${tabBaseClasses} hover:text-purple data-[selected]:border-purple data-[selected]:text-purple`}>Insider Release</Tab>
            </TabList>

            <TabPanels>
                <TabPanel>
                    <ReleasesList releases={stableReleases} type="stable" />
                </TabPanel>
                <TabPanel>
                    <ReleasesList releases={insiderReleases} type="insider" />
                </TabPanel>
            </TabPanels>
        </TabGroup>
    );
}

function ReleasesList({ releases, type }: { releases: GitHubRelease[]; type: "stable" | "insider" }) {
    if (releases.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-slate-600">No {type} releases available at this time.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {releases.map((release, index) => (
                <ReleaseCard key={release.tag_name} release={release} type={type} isLatest={index === 0} />
            ))}
        </div>
    );
}

// Helper function to get asset description based on file extension
function getAssetDescription(assetName: string): string {
    const name = assetName.toLowerCase();

    if (name.endsWith(".exe") || (name.includes("windows") && !name.endsWith(".zip") && !name.endsWith(".msi"))) {
        if (name.includes("arm64") || name.includes("aarch64")) {
            return "Executable for ARM64";
        }
        return "Executable for x64";
    } else if (name.endsWith(".msi")) {
        if (name.includes("arm64") || name.includes("aarch64")) {
            return "MSI installer for ARM64";
        }
        return "MSI installer for x64";
    } else if (name.endsWith(".zip")) {
        if (name.includes("win") || name.includes("windows") || name.includes("mac") || name.includes("darwin")) {
            if (name.includes("arm64") || name.includes("aarch64")) {
                return "Portable archive for ARM64 (extract and run)";
            }
            return "Portable archive (extract and run)";
        }
        return "Portable archive (extract and run)";
    } else if (name.endsWith(".dmg") || name.includes("macos") || name.includes("darwin")) {
        if (name.includes("arm64") || name.includes("aarch64")) {
            return "Apple Silicon (M1/M2/M3)";
        } else if (name.includes("x64") || name.includes("x86_64")) {
            return "Intel processors";
        }
        return "macOS installer";
    } else if (name.endsWith(".appimage")) {
        return "Portable app for all distributions";
    } else if (name.endsWith(".deb")) {
        return "Debian/Ubuntu package installer";
    } else if (name.endsWith(".rpm")) {
        return "RedHat/Fedora package installer";
    } else if (name.endsWith(".tar.gz")) {
        return "Compressed archive for Linux/Unix";
    }

    return "Download package";
}

// Helper function to categorize assets by platform and architecture
function categorizeAssets(assets: GitHubAsset[]): Record<PlatformKey, Record<ArchType, GitHubAsset[]>> {
    const createArchBuckets = (): Record<ArchType, GitHubAsset[]> => ({
        arm64: [],
        x64: [],
        universal: [],
    });

    const grouped: Record<PlatformKey, Record<ArchType, GitHubAsset[]>> = {
        windows: createArchBuckets(),
        macos: createArchBuckets(),
        linux: createArchBuckets(),
    };

    assets.forEach((asset) => {
        const platform = detectPlatform(asset.name);
        const arch = detectArchitecture(asset.name);
        grouped[platform][arch].push(asset);
    });

    return grouped;
}

function detectPlatform(name: string): PlatformKey {
    const lower = name.toLowerCase();

    if (lower.includes("win") || lower.includes("windows") || lower.endsWith(".exe") || lower.endsWith(".msi")) {
        return "windows";
    }

    if (lower.includes("mac") || lower.includes("darwin") || lower.endsWith(".dmg")) {
        return "macos";
    }

    if (lower.includes("linux") || lower.endsWith(".appimage") || lower.endsWith(".deb") || lower.endsWith(".rpm") || lower.endsWith(".tar.gz")) {
        return "linux";
    }

    return "linux"; // Default to Linux for unknown types
}

function detectArchitecture(name: string): ArchType {
    const lower = name.toLowerCase();

    const armHints = ["arm64", "aarch64", "apple-silicon", "apple_silicon", "m1", "m2", "m3"];
    if (armHints.some((hint) => lower.includes(hint))) {
        return "arm64";
    }

    const x64Hints = ["x64", "x86_64", "amd64", "win64", "intel", "x86"];
    if (x64Hints.some((hint) => lower.includes(hint))) {
        return "x64";
    }

    return "universal";
}

// Component for individual asset download link
function AssetDownloadLink({ asset }: { asset: GitHubAsset }) {
    return (
        <a
            href={asset.browser_download_url}
            className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group gap-2"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-sm sm:text-base text-slate-900 group-hover:text-slate-900 truncate">{asset.name}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{getAssetDescription(asset.name)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatFileSize(asset.size)}</div>
                </div>
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </a>
    );
}

function ReleaseCard({ release, type, isLatest }: { release: GitHubRelease; type: "stable" | "insider"; isLatest: boolean }) {
    const [expanded, setExpanded] = useState(isLatest);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const downloadableAssets = filterDownloadableAssets(release.assets);

    const borderColor = type === "stable" ? "border-blue-200" : "border-purple-200";
    const badgeColor = type === "stable" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
    const buttonColor = type === "stable" ? "text-blue hover:text-blue-700" : "text-purple hover:text-purple-700";

    return (
        <div className={`border-2 ${borderColor} rounded-2xl p-4 sm:p-6 bg-white shadow-card hover:shadow-fluent transition-shadow`}>
            <div
                className="flex items-start justify-between gap-2 sm:gap-4 mb-4 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(!expanded)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(!expanded);
                    }
                }}
                aria-expanded={expanded}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${release.name || release.tag_name}`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg sm:text-2xl font-bold text-slate-900 break-words">{release.name || release.tag_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor} self-start sm:self-auto whitespace-nowrap`}>{type === "stable" ? "Stable" : "Insider"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                        <span className="font-medium">{release.tag_name}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">{formatDate(release.published_at)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">
                            {downloadableAssets.length} asset{downloadableAssets.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
                <button className={`${buttonColor} font-medium text-xs sm:text-sm transition-all flex items-center gap-1 flex-shrink-0`} aria-hidden="true">
                    <span className="hidden sm:inline">{expanded ? "Collapse" : "Expand"}</span>
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {expanded && (
                <>
                    {release.body && (
                        <div className="mb-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNotesExpanded(!notesExpanded);
                                }}
                                className={`${buttonColor} font-medium text-sm transition-colors flex items-center gap-1`}
                            >
                                {notesExpanded ? "Hide" : "Show"} release notes
                                <svg className={`w-4 h-4 transition-transform ${notesExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {notesExpanded && <div className="mt-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{release.body}</div>}
                        </div>
                    )}

                    <div className="border-t border-slate-200 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Downloads</h4>
                        {(() => {
                            const grouped = categorizeAssets(downloadableAssets);
                            const platformSections = (Object.keys(PLATFORM_LABELS) as PlatformKey[])
                                .map((key) => ({ key, label: PLATFORM_LABELS[key], groups: grouped[key] }))
                                .filter((section) => ARCH_ORDER.some((arch) => section.groups[arch].length > 0));

                            if (platformSections.length === 0) {
                                return <p className="text-sm text-slate-500">No downloadable assets available for this release.</p>;
                            }

                            const hasMultiplePlatforms = platformSections.length > 1;

                            return (
                                <div className={hasMultiplePlatforms ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-5"}>
                                    {platformSections.map((section) => (
                                        <div key={section.key} className="space-y-4">
                                            <h5 className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">{section.label}</h5>
                                            {ARCH_ORDER.map((archKey) => {
                                                const archAssets = section.groups[archKey];
                                                if (archAssets.length === 0) {
                                                    return null;
                                                }

                                                return (
                                                    <div key={`${section.key}-${archKey}`}>
                                                        {/* <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{ARCH_LABELS[archKey]}</p> */}
                                                        <div className="space-y-2">
                                                            {archAssets.map((asset) => (
                                                                <AssetDownloadLink key={asset.name} asset={asset} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </>
            )}
        </div>
    );
}
