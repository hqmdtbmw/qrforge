import { UAParser } from 'ua-parser-js';

// The hash behind getDeviceId, kept separate so it can be tested on its own.
// Same input always gives the same short base36 string.
export function hashFingerprint(fingerprint: string): string {
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function getDeviceId(): Promise<string> {
  const parser = new UAParser();
  const result = parser.getResult();
  
  // Combine multiple signals to create a somewhat unique fingerprint
  const signals = [
    result.browser.name,
    result.browser.version,
    result.os.name,
    result.os.version,
    result.device.model,
    result.device.type,
    result.device.vendor,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.indexedDB,
    !!window.sessionStorage,
    !!window.localStorage,
  ];

  const fingerprint = signals.join('|');

  return hashFingerprint(fingerprint);
}

export function getPersistentDeviceId(): string {
  let id = localStorage.getItem('qrforge_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem('qrforge_device_id', id);
  }
  return id;
}
