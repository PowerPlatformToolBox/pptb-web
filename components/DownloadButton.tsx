"use client";

import { fetchLatestRelease, findAssetForOS, formatFileSize, type GitHubAsset } from "@/lib/github-api";
import { detectPlatform, getOSDisplayName, getArchitectureDisplayName, type OperatingSystem, type PlatformInfo } from "@/lib/os-detection";
import { useEffect, useState } from "react";

const COMMAND = 'xattr -cr "/Applications/Power Platform ToolBox.app"';

export default function DownloadButton() {
    const [platform, setPlatform] = useState<PlatformInfo>({ os: "unknown", arch: "unknown" });
    const [asset, setAsset] = useState<GitHubAsset | null>(null);
    const [version, setVersion] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReleaseAndDetectOS = async () => {
            const detectedPlatform = detectPlatform();
            setPlatform(detectedPlatform);

            const release = await fetchLatestRelease();
            if (release) {
                setVersion(release.tag_name);
                const matchedAsset = findAssetForOS(release.assets, detectedPlatform.os, detectedPlatform.arch);
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

    // Render OS-specific icon
    const renderOSIcon = () => {
        switch (platform.os) {
            case "windows":
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" role="img" aria-label="Windows">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                    </svg>
                );
            case "mac":
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" role="img" aria-label="Apple">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                );
            case "linux":
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" role="img" aria-label="Linux">
                        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.705-.127 2.528.283.823 1.002 1.607 1.918 2.013 1.832.812 3.951-.13 4.69-1.856.738-1.726.201-4.022-.54-5.75-.74-1.728-1.857-2.64-1.857-2.64s.857-.64 1.857-.64c1 0 1.857.64 1.857.64s-1.117.912-1.857 2.64c-.741 1.728-1.278 4.024-.54 5.75.739 1.726 2.858 2.668 4.69 1.856.916-.406 1.635-1.19 1.918-2.013.283-.823.151-1.688-.127-2.528-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021zm-.005 2.024c.075 0 .15.002.225.008 1.846.144 2.002 1.509 2.053 2.973.051 1.464.397 2.679 1.461 4.134.53.725 1.538 2.16 2.048 3.665.255.753.335 1.497-.127 2.013-.462.516-1.335.516-2.048 0-.713-.516-1.538-2.013-1.538-2.013s-.825 1.497-1.538 2.013c-.713.516-1.586.516-2.048 0-.462-.516-.382-1.26-.127-2.013.51-1.505 1.518-2.94 2.048-3.665 1.064-1.455 1.41-2.67 1.461-4.134.051-1.464.207-2.829 2.053-2.973.075-.006.15-.008.225-.008z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Render GitHub icon for releases page link
    const renderGitHubIcon = () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" role="img" aria-label="GitHub">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
        </svg>
    );

    if (!asset || platform.os === "unknown") {
        return (
            <div className="text-center">
                <a href="https://github.com/PowerPlatformToolBox/desktop-app/releases" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-3 text-lg">
                    {renderGitHubIcon()}
                    View Releases on GitHub
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6">
            <a href={asset.browser_download_url} className="btn-primary inline-flex items-center gap-3 text-lg">
                {renderOSIcon()}
                Download for {getOSDisplayName(platform.os)}
            </a>
            <div className="text-xs text-light opacity-70">
                Detected: {platform.osVersion || getOSDisplayName(platform.os)} {getArchitectureDisplayName(platform.arch)}
            </div>
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
            {platform.os === "mac" && (
                <div className="card max-w-2xl mt-2 bg-amber-50 border-2 border-amber-200">
                    <p className="mb-3 text-dark">
                        <strong className="text-amber-700">⚠️ macOS Users:</strong> If you see a &apos;damaged&apos; or &apos;unidentified developer&apos; warning after installation, run the following
                        command in Terminal:
                    </p>
                    <div className="flex gap-2">
                        <code
                            className="flex-1 bg-surface p-3 rounded-lg border border-slate-200 font-mono text-xs break-all text-dark shadow-card"
                            aria-label="Terminal command to remove quarantine attribute"
                        >
                            xattr -cr &quot;/Applications/Power Platform ToolBox.app&quot;
                        </code>
                        <button
                            onClick={() => navigator.clipboard.writeText(COMMAND)}
                            className="px-3 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                            title="Copy command to clipboard"
                        >
                            Copy
                        </button>
                    </div>
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
