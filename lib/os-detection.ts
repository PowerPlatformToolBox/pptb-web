export type OperatingSystem = 'windows' | 'mac' | 'linux' | 'unknown';

export function detectOS(): OperatingSystem {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  if (userAgent.indexOf('win') !== -1 || platform.indexOf('win') !== -1) {
    return 'windows';
  }
  
  if (userAgent.indexOf('mac') !== -1 || platform.indexOf('mac') !== -1) {
    return 'mac';
  }
  
  if (userAgent.indexOf('linux') !== -1 || platform.indexOf('linux') !== -1) {
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
