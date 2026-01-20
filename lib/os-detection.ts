export type OperatingSystem = 'windows' | 'mac' | 'linux' | 'unknown';
export type Architecture = 'x64' | 'arm64' | 'unknown';

export interface PlatformInfo {
  os: OperatingSystem;
  arch: Architecture;
}

export function detectOS(): OperatingSystem {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Exclude mobile devices (iPhone, iPad) from macOS detection
  const isMobile = /iphone|ipod|ipad|android/.test(userAgent);
  if (isMobile) {
    return 'unknown';
  }
  
  // Check userAgentData first (modern approach)
  if ('userAgentData' in window.navigator && window.navigator.userAgentData) {
    const platform = (window.navigator.userAgentData as { platform?: string }).platform?.toLowerCase();
    if (platform) {
      if (platform.includes('win')) return 'windows';
      if (platform.includes('mac')) return 'mac';
      if (platform.includes('linux')) return 'linux';
    }
  }
  
  // Fallback to userAgent for broader compatibility
  if (userAgent.indexOf('win') !== -1) {
    return 'windows';
  }
  
  if (userAgent.indexOf('mac') !== -1) {
    return 'mac';
  }
  
  if (userAgent.indexOf('linux') !== -1) {
    return 'linux';
  }

  return 'unknown';
}

export function detectArchitecture(): Architecture {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  // Check for ARM64 indicators
  // WOW64 indicates x64 Windows, ARM64 indicates ARM Windows
  if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
    return 'arm64';
  }

  // Check platform from userAgentData if available
  if ('userAgentData' in window.navigator && window.navigator.userAgentData) {
    const uaData = window.navigator.userAgentData as any;
    // Check if getHighEntropyValues is available
    if (uaData.getHighEntropyValues) {
      // Note: This is async, but we need sync detection
      // Fall through to other checks
    }
  }

  // Check for x64 indicators
  if (userAgent.includes('x64') || userAgent.includes('x86_64') || userAgent.includes('amd64') || userAgent.includes('win64') || userAgent.includes('wow64')) {
    return 'x64';
  }

  // Default to x64 for Windows/Mac/Linux desktop (most common)
  const os = detectOS();
  if (os === 'windows' || os === 'mac' || os === 'linux') {
    return 'x64';
  }

  return 'unknown';
}

export function detectPlatform(): PlatformInfo {
  return {
    os: detectOS(),
    arch: detectArchitecture(),
  };
}

export function getOSDisplayName(os: OperatingSystem): string {
  switch (os) {
    case 'windows':
      return 'Windows';
    case 'mac':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Your Platform';
  }
}
