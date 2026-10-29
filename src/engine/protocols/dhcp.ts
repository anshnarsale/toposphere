import type { Device, DhcpPool, DhcpLease } from '@/types/network';
import { getNetworkAddress, getHostRange, ipToInt, intToIp } from '@/lib/ip';

export interface DhcpMessage {
  op: 'discover' | 'offer' | 'request' | 'ack' | 'nak' | 'release';
  clientMac: string;
  clientHostname: string;
  offeredIp?: string;
  requestedIp?: string;
  serverIp?: string;
  options: {
    subnetMask?: string;
    router?: string;
    dns?: string;
    leaseTime?: number;
  };
}

/** Find a DHCP pool that covers the given network segment */
export function findPoolForNetwork(device: Device, network: string, prefix: number): DhcpPool | null {
  return device.services.dhcpPools.find(p =>
    getNetworkAddress(p.network, p.prefixLength) === network && p.prefixLength === prefix
  ) ?? null;
}

/** Allocate the next available IP from a DHCP pool */
export function allocateDhcpIp(pool: DhcpPool, leases: DhcpLease[], clientMac: string): string | null {
  // Check for existing lease
  const existing = leases.find(l => l.mac === clientMac && l.poolId === pool.id);
  if (existing) return existing.ip;

  const range = getHostRange(pool.network, pool.prefixLength);
  const usedIps = new Set(leases.filter(l => l.poolId === pool.id).map(l => l.ip));
  const excluded = new Set([...pool.excludedAddresses, pool.defaultGateway]);

  const firstInt = ipToInt(range.first);
  const lastInt = ipToInt(range.last);

  for (let i = firstInt; i <= lastInt; i++) {
    const ip = intToIp(i);
    if (!usedIps.has(ip) && !excluded.has(ip)) {
      return ip;
    }
  }
  return null; // pool exhausted
}

/** Create a DHCP offer message */
export function createDhcpOffer(
  clientMac: string,
  offeredIp: string,
  serverIp: string,
  pool: DhcpPool
): DhcpMessage {
  return {
    op: 'offer',
    clientMac,
    clientHostname: '',
    offeredIp,
    serverIp,
    options: {
      router: pool.defaultGateway,
      dns: pool.dnsServer,
      leaseTime: pool.leaseTime,
    },
  };
}

/** Create a DHCP ACK message */
export function createDhcpAck(
  clientMac: string,
  clientHostname: string,
  assignedIp: string,
  serverIp: string,
  pool: DhcpPool
): DhcpMessage {
  return {
    op: 'ack',
    clientMac,
    clientHostname,
    offeredIp: assignedIp,
    serverIp,
    options: {
      router: pool.defaultGateway,
      dns: pool.dnsServer,
      leaseTime: pool.leaseTime,
    },
  };
}

/** Create a DHCP NAK message */
export function createDhcpNak(clientMac: string, serverIp: string): DhcpMessage {
  return {
    op: 'nak',
    clientMac,
    clientHostname: '',
    serverIp,
    options: {},
  };
}
