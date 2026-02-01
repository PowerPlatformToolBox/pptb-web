"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import appleLogo from "@/images/logos/apple.svg";
import linuxLogo from "@/images/logos/linux.svg";
import windowsLogo from "@/images/logos/windows.svg";
import { fetchLatestRelease, findAssetForOS, formatFileSize, type GitHubAsset } from "@/lib/github-api";
import { detectPlatform, getArchitectureDisplayName, getOSDisplayName, type PlatformInfo } from "@/lib/os-detection";

const COMMAND = 'xattr -cr "/Applications/Power Platform ToolBox.app"';

export default function DownloadButton() {
    const [platform, setPlatform] = useState<PlatformInfo | null>(null);
    const [asset, setAsset] = useState<GitHubAsset | null>(null);
    const [version, setVersion] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReleaseAndDetectOS = async () => {
            const detectedPlatform = await detectPlatform();
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
        if (!platform) return null;

        switch (platform.os) {
            case "windows":
                return <Image src={windowsLogo} alt="Windows logo" className="h-6 w-6" />;
            case "mac":
                return <Image src={appleLogo} alt="Apple logo" className="h-6 w-6" />;
            case "linux":
                return <Image src={linuxLogo} alt="Linux logo" className="h-6 w-6" />;
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

    if (!asset || !platform || platform.os === "unknown") {
        return (
            <div className="text-center">
                <a href="https://github.com/PowerPlatformToolBox/desktop-app/releases" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-3 text-lg">
                    {renderGitHubIcon()}
                    View Releases on GitHub
                </a>
            </div>
        );
    }

    const osDisplay = platform?.osVersion || (platform ? getOSDisplayName(platform.os) : "Your Platform");
    const archDisplay = getArchitectureDisplayName(platform?.arch ?? "unknown");

    return (
        <div className="flex flex-col items-center gap-6">
            <a href={asset.browser_download_url} className="btn-primary inline-flex items-center gap-3 text-lg">
                {renderOSIcon()}
                Download for {getOSDisplayName(platform.os)}
            </a>
            <div className="text-xs text-light opacity-70">
                Detected: {osDisplay} {archDisplay}
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
                    href="/versions"
                    className="text-blue hover:text-purple font-medium transition-colors underline decoration-2 underline-offset-4"
                >
                    View all platforms and versions →
                </a>
            </div>
        </div>
    );
}
