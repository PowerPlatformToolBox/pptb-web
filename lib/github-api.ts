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

const GITHUB_API_URL = 'https://api.github.com/repos/PowerPlatformToolBox/desktop-app/releases/latest';

export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      // Cache for 5 minutes in production
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      console.error('Failed to fetch release:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
}

export function findAssetForOS(assets: GitHubAsset[], os: string): GitHubAsset | null {
  if (!assets || assets.length === 0) {
    return null;
  }

  // Mapping of OS to file patterns
  const osPatterns: Record<string, string[]> = {
    windows: ['.exe', '-win', '-windows', 'win32', 'win64'],
    mac: ['.dmg', '-mac', '-macos', '-darwin', 'darwin'],
    linux: ['.appimage', '.deb', '.rpm', '-linux', 'linux'],
  };

  const patterns = osPatterns[os] || [];
  
  // Try to find a matching asset
  for (const pattern of patterns) {
    const asset = assets.find(a => a.name.toLowerCase().includes(pattern));
    if (asset) {
      return asset;
    }
  }

  // If no specific match, return the first asset as fallback
  return assets[0];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
