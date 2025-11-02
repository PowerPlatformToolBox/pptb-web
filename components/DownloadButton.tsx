'use client';

import { useEffect, useState } from 'react';
import { detectOS, getOSDisplayName, type OperatingSystem } from '@/lib/os-detection';
import { fetchLatestRelease, findAssetForOS, formatFileSize, type GitHubAsset } from '@/lib/github-api';

export default function DownloadButton() {
  const [os, setOS] = useState<OperatingSystem>('unknown');
  const [asset, setAsset] = useState<GitHubAsset | null>(null);
  const [version, setVersion] = useState<string>('');
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
        <div className="animate-pulse bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center">
        <a
          href="https://github.com/PowerPlatformToolBox/desktop-app/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors"
        >
          View Releases on GitHub
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <a
        href={asset.browser_download_url}
        className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors text-lg shadow-lg hover:shadow-xl"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download for {getOSDisplayName(os)}
      </a>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {version && <span className="mr-3">Version: {version}</span>}
        {asset.size && <span>Size: {formatFileSize(asset.size)}</span>}
      </div>
      <div className="text-xs text-gray-500">
        <a
          href="https://github.com/PowerPlatformToolBox/desktop-app/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 underline"
        >
          Other platforms and versions
        </a>
      </div>
    </div>
  );
}
