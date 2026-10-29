import type { Device, Interface, RouteEntry } from '@/types/network';
import { longestPrefixMatch, sameSubnet } from '@/lib/ip';

export interface IPv4Packet {
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: 'icmp' | 'tcp' | 'udp' | 'ospf';
  payload: unknown;
}

export interface RouteLookupResult {
  found: boolean;
  route?: RouteEntry;
  exitInterface?: Interface;
  nextHop?: string;
  reason?: string;
}

/** Look up the best route for a destination IP in a device's routing table */
export function lookupRoute(device: Device, dstIp: string): RouteLookupResult {
  const routes = device.routingTable;
  const match = longestPrefixMatch(dstIp, routes.map(r => ({ network: r.network, prefixLength: r.prefixLength })));
  if (!match) {
    return { found: false, reason: 'No route to host' };
  }
  const route = routes.find(r => r.network === match.network && r.prefixLength === match.prefixLength)!;
  const exitIface = Object.values(device.interfaces).find(
    i => i.name === route.exitInterface || i.shortName === route.exitInterface
  );
  return {
    found: true,
    route,
    exitInterface: exitIface,
    nextHop: route.nextHop === 'connected' || route.nextHop === 'local' ? dstIp : route.nextHop,
  };
}

/** Decrement TTL, return null if TTL expired */
export function decrementTtl(packet: IPv4Packet): IPv4Packet | null {
  if (packet.ttl <= 1) return null;
  return { ...packet, ttl: packet.ttl - 1 };
}

/** Determine if a destination is directly connected to a device */
export function isDirectlyConnected(device: Device, dstIp: string): { connected: boolean; iface?: Interface } {
  for (const iface of Object.values(device.interfaces)) {
    if (!iface.ipv4) continue;
    if (sameSubnet(dstIp, iface.ipv4.address, iface.ipv4.prefixLength)) {
      return { connected: true, iface };
    }
  }
  return { connected: false };
}

export function createIpv4Packet(srcIp: string, dstIp: string, protocol: IPv4Packet['protocol'], payload: unknown = null): IPv4Packet {
  return { srcIp, dstIp, ttl: 64, protocol, payload };
}
