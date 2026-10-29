/**
 * IPv4 address utilities for NexaLab.
 * All addresses are in dotted-decimal string form unless noted.
 */

/** Convert dotted-decimal IP to a 32-bit unsigned integer */
export function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IP address: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** Convert a 32-bit unsigned integer to dotted-decimal */
export function intToIp(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>>  8) & 0xff,
    (n       ) & 0xff,
  ].join('.');
}

/** Convert a prefix length (0-32) to a dotted-decimal subnet mask */
export function prefixToMask(prefix: number): string {
  if (prefix < 0 || prefix > 32) throw new Error(`Invalid prefix: ${prefix}`);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

/** Convert a dotted-decimal mask to prefix length */
export function maskToPrefix(mask: string): number {
  const n = ipToInt(mask);
  // count leading ones
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((n >>> i) & 1) count++;
    else break;
  }
  return count;
}

/** Get the network address for an IP/prefix */
export function getNetworkAddress(ip: string, prefix: number): string {
  const ipInt = ipToInt(ip);
  const mask = prefixToMask(prefix);
  const maskInt = ipToInt(mask);
  return intToIp((ipInt & maskInt) >>> 0);
}

/** Get the broadcast address for a network/prefix */
export function getBroadcastAddress(network: string, prefix: number): string {
  const netInt = ipToInt(network);
  const hostBits = 32 - prefix;
  const broadcast = (netInt | ((1 << hostBits) - 1)) >>> 0;
  return intToIp(broadcast);
}

/** Check if two IPs are in the same subnet */
export function sameSubnet(ip1: string, ip2: string, prefix: number): boolean {
  return getNetworkAddress(ip1, prefix) === getNetworkAddress(ip2, prefix);
}

/** Check if an IP is in a given network */
export function isInNetwork(ip: string, network: string, prefix: number): boolean {
  return getNetworkAddress(ip, prefix) === network;
}

/** Validate a dotted-decimal IP address */
export function isValidIp(ip: string): boolean {
  try {
    ipToInt(ip);
    return true;
  } catch {
    return false;
  }
}

/** Validate a prefix length */
export function isValidPrefix(prefix: number): boolean {
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
}

/** Check if an IP is a network address (host bits all zero) */
export function isNetworkAddress(ip: string, prefix: number): boolean {
  return ip === getNetworkAddress(ip, prefix);
}

/** Check if an IP is a broadcast address */
export function isBroadcastAddress(ip: string, prefix: number): boolean {
  return ip === getBroadcastAddress(getNetworkAddress(ip, prefix), prefix);
}

/** Check if an IP is a valid host address (not network/broadcast/loopback) */
export function isHostAddress(ip: string, prefix: number): boolean {
  if (prefix >= 31) return true; // /31 and /32 are special
  return !isNetworkAddress(ip, prefix) && !isBroadcastAddress(ip, prefix);
}

/** Get usable host range for a network */
export function getHostRange(network: string, prefix: number): { first: string; last: string; count: number } {
  if (prefix >= 31) {
    return { first: network, last: getBroadcastAddress(network, prefix), count: prefix === 32 ? 1 : 2 };
  }
  const netInt = ipToInt(network);
  const broadcastInt = ipToInt(getBroadcastAddress(network, prefix));
  return {
    first: intToIp(netInt + 1),
    last: intToIp(broadcastInt - 1),
    count: broadcastInt - netInt - 1,
  };
}

/** Longest prefix match: find the best route */
export function longestPrefixMatch(
  destinationIp: string,
  routes: Array<{ network: string; prefixLength: number }>
): { network: string; prefixLength: number } | null {
  let best: { network: string; prefixLength: number } | null = null;
  for (const route of routes) {
    if (isInNetwork(destinationIp, route.network, route.prefixLength)) {
      if (!best || route.prefixLength > best.prefixLength) {
        best = route;
      }
    }
  }
  return best;
}

/** Increment an IP by n (for DHCP pool iteration) */
export function incrementIp(ip: string, n: number = 1): string {
  return intToIp((ipToInt(ip) + n) >>> 0);
}

/** Generate a list of host IPs in a network */
export function getNetworkHosts(network: string, prefix: number): string[] {
  const range = getHostRange(network, prefix);
  const first = ipToInt(range.first);
  const last = ipToInt(range.last);
  const hosts: string[] = [];
  for (let i = first; i <= last; i++) {
    hosts.push(intToIp(i));
  }
  return hosts;
}

/** Check if an IP is a loopback address */
export function isLoopback(ip: string): boolean {
  try {
    const n = ipToInt(ip);
    return (n >>> 24) === 127;
  } catch {
    return false;
  }
}

/** Check if an IP is a multicast address */
export function isMulticast(ip: string): boolean {
  try {
    const n = ipToInt(ip);
    return (n >>> 28) === 0xe;
  } catch {
    return false;
  }
}

/** Parse CIDR notation "10.0.0.1/24" into parts */
export function parseCidr(cidr: string): { ip: string; prefix: number } {
  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (!isValidIp(ip) || !isValidPrefix(prefix)) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  return { ip, prefix };
}
