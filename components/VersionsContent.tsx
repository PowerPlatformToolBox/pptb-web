"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useEffect, useState } from "react";

import { fetchAllReleases, filterDownloadableAssets, formatFileSize, isInsiderRelease, type GitHubRelease } from "@/lib/github-api";

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

    const tabBaseClasses = "px-6 py-3 text-lg font-semibold text-slate-700 border-b-2 border-transparent transition-colors";

    return (
        <TabGroup>
            <TabList className="flex gap-4 border-b border-slate-200 mb-8 justify-center">
                <Tab className={`${tabBaseClasses} hover:text-blue data-[selected]:border-blue data-[selected]:text-blue`}>
                    Stable Release
                </Tab>
                <Tab className={`${tabBaseClasses} hover:text-purple data-[selected]:border-purple data-[selected]:text-purple`}>
                    Insider Release
                </Tab>
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

    const releaseTypeDefinition =
        type === "stable"
            ? "Stable releases are thoroughly tested and recommended for production use. These versions provide reliable performance and are fully supported."
            : "Insider releases include the latest features and improvements before they reach stable. These builds may contain experimental features and are ideal for testing and early adoption.";

    return (
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 border-l-4 border-slate-300 rounded-lg">
                <p className="text-sm text-slate-700">{releaseTypeDefinition}</p>
            </div>
            {releases.map((release, index) => (
                <ReleaseCard key={release.tag_name} release={release} type={type} isLatest={index === 0} />
            ))}
        </div>
    );
}

function ReleaseCard({ release, type, isLatest }: { release: GitHubRelease; type: "stable" | "insider"; isLatest: boolean }) {
    const [expanded, setExpanded] = useState(isLatest);
    const downloadableAssets = filterDownloadableAssets(release.assets);

    const borderColor = type === "stable" ? "border-blue-200" : "border-purple-200";
    const badgeColor = type === "stable" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
    const buttonColor = type === "stable" ? "text-blue hover:text-blue-700" : "text-purple hover:text-purple-700";

    return (
        <div className={`border-2 ${borderColor} rounded-2xl p-6 bg-white shadow-card hover:shadow-fluent transition-shadow`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-slate-900">{release.name || release.tag_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>{type === "stable" ? "Stable" : "Insider"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="font-medium">{release.tag_name}</span>
                        <span>•</span>
                        <span>{formatDate(release.published_at)}</span>
                        <span>•</span>
                        <span>{downloadableAssets.length} download{downloadableAssets.length !== 1 ? "s" : ""}</span>
                    </div>
                </div>
            </div>

            {release.body && (
                <div className="mb-4">
                    <button onClick={() => setExpanded(!expanded)} className={`${buttonColor} font-medium text-sm transition-colors flex items-center gap-1`}>
                        {expanded ? "Hide" : "Show"} release notes
                        <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expanded && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{release.body}</div>
                    )}
                </div>
            )}

            <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Downloads</h4>
                <div className="grid gap-3">
                    {downloadableAssets.map((asset) => (
                        <a
                            key={asset.name}
                            href={asset.browser_download_url}
                            className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <div>
                                    <div className="font-medium text-slate-900 group-hover:text-slate-900">{asset.name}</div>
                                    <div className="text-xs text-slate-500">{formatFileSize(asset.size)}</div>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
