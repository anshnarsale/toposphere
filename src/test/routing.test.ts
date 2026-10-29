import { describe, it, expect } from 'vitest';
import { RoutingEngine } from '@/engine/routing/RoutingEngine';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { lookupRoute } from '@/engine/protocols/ipv4';

describe('IPv4 Routing & Table Calculation Engine', () => {
  it('generates connected and local /32 routes automatically upon interface configuration', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router');

    model.updateInterface(router.id, 'gi0_0', {
      adminState: 'up',
      operState: 'up',
      ipv4: {
        address: '192.168.1.1',
        prefixLength: 24,
      },
    });

    const routes = router.routingTable;
    // Connected route 192.168.1.0/24
    const connected = routes.find((r) => r.network === '192.168.1.0' && r.source === 'connected');
    expect(connected).toBeDefined();
    expect(connected?.nextHop).toBe('connected');

    // Local route 192.168.1.1/32
    const local = routes.find((r) => r.network === '192.168.1.1' && r.prefixLength === 32);
    expect(local).toBeDefined();
    expect(local?.source).toBe('local');
  });

  it('correctly incorporates static routes and resolves next-hop forwarding', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router');

    model.updateInterface(router.id, 'gi0_0', {
      adminState: 'up',
      operState: 'up',
      ipv4: { address: '10.0.0.1', prefixLength: 24 },
    });

    model.addStaticRoute(router.id, {
      network: '172.16.0.0',
      prefixLength: 16,
      nextHop: '10.0.0.2',
      adminDistance: 1,
      metric: 0,
    });

    const lookup = lookupRoute(router, '172.16.50.1');
    expect(lookup.found).toBe(true);
    expect(lookup.route?.network).toBe('172.16.0.0');
    expect(lookup.nextHop).toBe('10.0.0.2');
  });

  it('returns not found when no matching route or default gateway exists', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router');

    const lookup = lookupRoute(router, '8.8.8.8');
    expect(lookup.found).toBe(false);
    expect(lookup.reason).toContain('No route');
  });
});
