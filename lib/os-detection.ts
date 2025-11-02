export type OperatingSystem = 'windows' | 'mac' | 'linux' | 'unknown';

export function detectOS(): OperatingSystem {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  
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
