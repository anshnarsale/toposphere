import { describe, it, expect } from 'vitest';
import { allocateDhcpIp } from '@/engine/protocols/dhcp';
import { resolveDns } from '@/engine/protocols/dns';
import { NetworkModel } from '@/engine/core/NetworkModel';
import type { DhcpPool } from '@/types/network';

describe('Network Services (DHCP & DNS) Engine', () => {
  it('allocates sequential unique IP addresses from a DHCP pool', () => {
    const pool: DhcpPool = {
      id: 'pool-1',
      name: 'LAN-POOL',
      network: '192.168.1.0',
      prefixLength: 24,
      defaultGateway: '192.168.1.1',
      dnsServer: '8.8.8.8',
      leaseTime: 86400,
      excludedAddresses: ['192.168.1.1'],
    };

    const leases: any[] = [];
    const clientMac1 = '02:4e:4c:aa:bb:01';
    const clientMac2 = '02:4e:4c:aa:bb:02';

    // First allocation should skip 192.168.1.1 (gateway/excluded) and give 192.168.1.2
    const ip1 = allocateDhcpIp(pool, leases, clientMac1);
    expect(ip1).toBe('192.168.1.2');

    leases.push({ ip: ip1!, mac: clientMac1, poolId: pool.id, leaseExpiry: Date.now() + 10000 });

    // Second allocation gives 192.168.1.3
    const ip2 = allocateDhcpIp(pool, leases, clientMac2);
    expect(ip2).toBe('192.168.1.3');

    // Existing client requesting again should retain its leased IP
    const ip1Reacquire = allocateDhcpIp(pool, leases, clientMac1);
    expect(ip1Reacquire).toBe('192.168.1.2');
  });

  it('resolves DNS A-records and handles unknown domains properly', () => {
    const model = new NetworkModel();
    const server = model.addDevice('server');
    server.services.dnsEnabled = true;
    server.services.dnsRecords.push({
      hostname: 'nexalab.local',
      ip: '192.168.1.100',
      type: 'A',
    });

    const resValid = resolveDns(server, { hostname: 'nexalab.local', type: 'A' });
    expect(resValid.success).toBe(true);
    expect(resValid.ip).toBe('192.168.1.100');

    const resUnknown = resolveDns(server, { hostname: 'google.com', type: 'A' });
    expect(resUnknown.success).toBe(false);
    expect(resUnknown.errorReason).toContain('No A record');
  });
});
