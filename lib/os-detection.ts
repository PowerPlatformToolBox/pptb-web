export type OperatingSystem = 'windows' | 'mac' | 'linux' | 'unknown';
export type Architecture = 'x64' | 'arm64' | 'unknown';

export interface PlatformInfo {
  os: OperatingSystem;
  arch: Architecture;
  osVersion?: string;
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

  // Check for ARM64 indicators first (ARM64 is less common, so check it first)
  if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
    return 'arm64';
  }

  // Check for x64 indicators
  // WOW64 indicates 64-bit Windows (x64 architecture)
  // Note: WOW64 means "Windows 32-bit on Windows 64-bit" - the presence of WOW64 indicates 64-bit Windows
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

export function detectOSVersion(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const userAgent = window.navigator.userAgent;
  const os = detectOS();

  if (os === 'windows') {
    // Detect Windows version
    if (userAgent.includes('Windows NT 10.0')) {
      // Windows 10 or 11 - check build number if available
      const buildMatch = userAgent.match(/Windows NT 10\.0[^)]*Build (\d+)/);
      if (buildMatch) {
        const buildNumber = parseInt(buildMatch[1]);
        if (buildNumber >= 22000) {
          return 'Windows 11';
        }
      }
      return 'Windows 10';
    } else if (userAgent.includes('Windows NT 6.3')) {
      return 'Windows 8.1';
    } else if (userAgent.includes('Windows NT 6.2')) {
      return 'Windows 8';
    } else if (userAgent.includes('Windows NT 6.1')) {
      return 'Windows 7';
    }
    return 'Windows';
  } else if (os === 'mac') {
    // Detect macOS version
    const versionMatch = userAgent.match(/Mac OS X (\d+)[_.](\d+)([_.](\d+))?/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      
      // macOS version names (as of January 2026)
      // Note: This mapping should be updated as new macOS versions are released
      const versionNames: { [key: string]: string } = {
        '15': 'Sequoia',
        '14': 'Sonoma',
        '13': 'Ventura',
        '12': 'Monterey',
        '11': 'Big Sur',
        '10.15': 'Catalina',
        '10.14': 'Mojave',
        '10.13': 'High Sierra',
      };
      
      const versionKey = major >= 11 ? major.toString() : `${major}.${minor}`;
      const versionName = versionNames[versionKey];
      
      if (versionName) {
        return `macOS ${versionName}`;
      }
      return `macOS ${major}.${minor}`;
    }
    return 'macOS';
  } else if (os === 'linux') {
    // Try to detect Linux distribution from user agent
    // Note: Most browsers don't include distribution info in user agent,
    // so this will often fall back to generic "Linux"
    if (userAgent.includes('Ubuntu')) {
      return 'Linux Ubuntu';
    } else if (userAgent.includes('Fedora')) {
      return 'Linux Fedora';
    } else if (userAgent.includes('Debian')) {
      return 'Linux Debian';
    } else if (userAgent.includes('CentOS')) {
      return 'Linux CentOS';
    } else if (userAgent.includes('Red Hat')) {
      return 'Linux Red Hat';
    }
    return 'Linux';
  }

  return undefined;
}

export function detectPlatform(): PlatformInfo {
  return {
    os: detectOS(),
    arch: detectArchitecture(),
    osVersion: detectOSVersion(),
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

export function getArchitectureDisplayName(arch: Architecture): string {
  switch (arch) {
    case 'x64':
      return 'x64';
    case 'arm64':
      return 'ARM64';
    default:
      return 'Unknown';
  }
}
