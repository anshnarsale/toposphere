/**
 * MAC address utilities for NexaLab
 */

let macCounter = 0;
const MAC_PREFIX = '02:4e:4c'; // NexaLab OUI prefix (locally administered)

/** Generate a unique simulated MAC address */
export function generateMac(): string {
  macCounter++;
  const hex = macCounter.toString(16).padStart(6, '0');
  return `${MAC_PREFIX}:${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}`;
}

/** Reset MAC counter (for testing) */
export function resetMacCounter(): void {
  macCounter = 0;
}

/** Validate a MAC address (colon or hyphen separated) */
export function isValidMac(mac: string): boolean {
  return /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/.test(mac);
}

/** Normalize MAC to lowercase colon-separated */
export function normalizeMac(mac: string): string {
  return mac.toLowerCase().replace(/-/g, ':');
}

/** Check if MAC is broadcast */
export function isBroadcastMac(mac: string): boolean {
  return normalizeMac(mac) === 'ff:ff:ff:ff:ff:ff';
}

/** Check if MAC is multicast */
export function isMulticastMac(mac: string): boolean {
  const parts = normalizeMac(mac).split(':');
  return (parseInt(parts[0], 16) & 0x01) === 1;
}

export const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';
export const ZERO_MAC = '00:00:00:00:00:00';
