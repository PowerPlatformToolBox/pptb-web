"use client";

import { fetchLatestRelease, findAssetForOS, formatFileSize, type GitHubAsset } from "@/lib/github-api";
import { detectOS, getOSDisplayName, type OperatingSystem } from "@/lib/os-detection";
import { useEffect, useState } from "react";

export default function DownloadButton() {
    const [os, setOS] = useState<OperatingSystem>("unknown");
    const [asset, setAsset] = useState<GitHubAsset | null>(null);
    const [version, setVersion] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReleaseAndDetectOS = async () => {
            const detectedOS = detectOS();
            setOS(detectedOS);

            const release = await fetchLatestRelease();
            if (release) {
                setVersion(release.tag_name);
                const matchedAsset = findAssetForOS(release.assets, detectedOS);
                setAsset(matchedAsset);
            }
            setLoading(false);
        };

        loadReleaseAndDetectOS();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center">
                <div className="btn-primary animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="text-center">
                <a href="https://github.com/PowerPlatformToolBox/desktop-app/releases" target="_blank" rel="noopener noreferrer" className="btn-primary inline-block">
                    View Releases on GitHub
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6">
            <a href={asset.browser_download_url} className="btn-primary inline-flex items-center gap-3 text-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download for {getOSDisplayName(os)}
            </a>
            <div className="text-sm text-light">
                {version && (
                    <span className="mr-4 font-medium">
                        Version: <span className="text-dark">{version}</span>
                    </span>
                )}
                {asset.size && (
                    <span className="font-medium">
                        Size: <span className="text-dark">{formatFileSize(asset.size)}</span>
                    </span>
                )}
            </div>
            {os === "mac" && (
                <div className="card max-w-2xl mt-2 bg-amber-50 border-2 border-amber-200">
                    <p className="mb-3 text-dark">
                        <strong className="text-amber-700">⚠️ macOS Users:</strong> If you see a &apos;damaged&apos; or &apos;unidentified developer&apos; warning after installation, run the following
                        command in Terminal:
                    </p>
                    <code
                        className="block bg-surface p-3 rounded-lg border border-slate-200 font-mono text-xs break-all text-dark shadow-card"
                        aria-label="Terminal command to remove quarantine attribute"
                    >
                        xattr -cr &quot;/Applications/Power Platform Tool Box.app&quot;
                    </code>
                </div>
            )}
            <div className="text-sm">
                <a
                    href="https://github.com/PowerPlatformToolBox/desktop-app/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue hover:text-purple font-medium transition-colors underline decoration-2 underline-offset-4"
                >
                    View all platforms and versions →
                </a>
            </div>
        </div>
    );
}
