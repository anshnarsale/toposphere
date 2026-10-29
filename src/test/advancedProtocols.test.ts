import { describe, it, expect } from 'vitest';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { SpanningTreeEngine } from '@/engine/switching/SpanningTreeEngine';
import { OspfEngine } from '@/engine/routing/OspfEngine';
import { AclAndNatEngine } from '@/engine/security/AclAndNatEngine';

describe('Advanced Cisco Protocols (STP, OSPF, ACL, NAT)', () => {
  it('elects root bridge and blocks redundant loop in Spanning Tree Protocol (STP)', () => {
    const model = new NetworkModel();
    const sw1 = model.addDevice('switch', 'SW1');
    const sw2 = model.addDevice('switch', 'SW2');
    const sw3 = model.addDevice('switch', 'SW3');

    // Create a triangle loop: SW1 <-> SW2 <-> SW3 <-> SW1
    model.addLink(sw1.id, 'fa0_1', sw2.id, 'fa0_1');
    model.addLink(sw2.id, 'fa0_2', sw3.id, 'fa0_1');
    model.addLink(sw3.id, 'fa0_2', sw1.id, 'fa0_2');

    const stpData = SpanningTreeEngine.calculate(model.getTopology());
    
    // Exactly 1 switch should be Root Bridge
    const rootBridges = Object.values(stpData).filter((b) => b.isRoot);
    expect(rootBridges.length).toBe(1);

    // Redundant link must have a blocked port to prevent loop
    const allPorts = Object.values(stpData).flatMap((b) => Object.values(b.ports));
    const blockedPorts = allPorts.filter((p) => p.isBlocked);
    expect(blockedPorts.length).toBeGreaterThanOrEqual(1);
    expect(blockedPorts[0].state).toBe('BLK');
  });

  it('calculates dynamic OSPF routes between connected routers', () => {
    const model = new NetworkModel();
    const r1 = model.addDevice('router', 'R1');
    const r2 = model.addDevice('router', 'R2');

    // Configure IP subnets
    model.updateInterface(r1.id, 'gi0_0', { ipv4: { address: '10.0.0.1', prefixLength: 30 } });
    model.updateInterface(r1.id, 'gi0_1', { ipv4: { address: '192.168.1.1', prefixLength: 24 } });
    model.updateInterface(r2.id, 'gi0_0', { ipv4: { address: '10.0.0.2', prefixLength: 30 } });
    model.updateInterface(r2.id, 'gi0_1', { ipv4: { address: '192.168.2.1', prefixLength: 24 } });

    model.addLink(r1.id, 'gi0_0', r2.id, 'gi0_0');

    const ospfRoutes = OspfEngine.calculateOspfRoutes(model.getTopology());
    
    // R1 should learn 192.168.2.0/24 through R2 (10.0.0.2) with AD 110
    const r1Routes = ospfRoutes[r1.id];
    expect(r1Routes).toBeDefined();
    expect(r1Routes.some((rt) => rt.network === '192.168.2.0' && rt.adminDistance === 110)).toBe(true);
  });

  it('correctly evaluates Access Control Lists (ACL) and enforces implicit deny', () => {
    const rules = [
      {
        sequence: 10,
        action: 'permit' as const,
        protocol: 'ip' as const,
        sourceIp: '192.168.1.0',
        sourceWildcard: '0.0.0.255',
        matches: 0,
      },
    ];

    // Permitted packet
    const resPermit = AclAndNatEngine.evaluateAcl(rules, {
      srcIp: '192.168.1.50',
      dstIp: '10.0.0.1',
      protocol: 'ip',
    });
    expect(resPermit.permitted).toBe(true);

    // Denied packet (implicit deny)
    const resDeny = AclAndNatEngine.evaluateAcl(rules, {
      srcIp: '172.16.0.5',
      dstIp: '10.0.0.1',
      protocol: 'ip',
    });
    expect(resDeny.permitted).toBe(false);
    expect(resDeny.reason).toContain('Implicit Deny');
  });
});
