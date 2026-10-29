import { describe, it, expect } from 'vitest';
import { SwitchingEngine } from '@/engine/switching/SwitchingEngine';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { applyEgressVlanPolicy, getIngressVlan, EtherType } from '@/engine/protocols/ethernet';

describe('Layer 2 Switching & VLAN Engine', () => {
  it('learns source MAC addresses dynamically into forwarding table', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch');

    const srcMac = '02:4e:4c:11:22:33';
    SwitchingEngine.learnMac(sw, srcMac, 'fa0_1', 1);

    expect(sw.macTable.length).toBe(1);
    expect(sw.macTable[0].mac).toBe(srcMac);
    expect(sw.macTable[0].interface).toBe('fa0_1');
    expect(sw.macTable[0].vlan).toBe(1);
  });

  it('floods broadcast frames to all active interfaces in the same VLAN', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch');

    // Bring 3 ports up
    model.updateInterface(sw.id, 'fa0_1', { operState: 'up' });
    model.updateInterface(sw.id, 'fa0_2', { operState: 'up' });
    model.updateInterface(sw.id, 'fa0_3', { operState: 'up' });

    const decision = SwitchingEngine.processFrame(sw, 'fa0_1', {
      srcMac: '02:4e:4c:00:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: EtherType.ARP,
      payload: null,
    });

    // Should flood to fa0_2 and fa0_3 (not ingress fa0_1)
    const outIfs = decision.outInterfaces.map((i) => i.interfaceId);
    expect(outIfs).toContain('fa0_2');
    expect(outIfs).toContain('fa0_3');
    expect(outIfs).not.toContain('fa0_1');
  });

  it('enforces VLAN isolation between distinct access ports', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch');

    model.addVlan(sw.id, { id: 10, name: 'VLAN10', active: true });
    model.addVlan(sw.id, { id: 20, name: 'VLAN20', active: true });

    // Port 1 in VLAN 10, Port 2 in VLAN 20
    model.updateInterface(sw.id, 'fa0_1', { accessVlan: 10, operState: 'up' });
    model.updateInterface(sw.id, 'fa0_2', { accessVlan: 20, operState: 'up' });
    model.updateInterface(sw.id, 'fa0_3', { accessVlan: 10, operState: 'up' });

    const decision = SwitchingEngine.processFrame(sw, 'fa0_1', {
      srcMac: '02:4e:4c:00:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: EtherType.ARP,
      payload: null,
    });

    const outIfs = decision.outInterfaces.map((i) => i.interfaceId);
    // Port 3 is in VLAN 10 (allowed), Port 2 is in VLAN 20 (isolated!)
    expect(outIfs).toContain('fa0_3');
    expect(outIfs).not.toContain('fa0_2');
  });

  it('applies 802.1Q trunk tagging and native VLAN egress behavior', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch');
    const trunkIf = model.updateInterface(sw.id, 'gi0_1', {
      vlanMode: 'trunk',
      nativeVlan: 1,
      trunkAllowedVlans: [1, 10, 20],
      operState: 'up',
    })!;

    // Frame in non-native VLAN 10 should be tagged
    const taggedFrame = applyEgressVlanPolicy(
      { srcMac: '02:00:00:00:00:01', dstMac: '02:00:00:00:00:02', etherType: EtherType.IPv4, payload: null },
      trunkIf,
      10
    );
    expect(taggedFrame?.vlanTag).toBe(10);

    // Frame in native VLAN 1 should NOT be tagged
    const untaggedFrame = applyEgressVlanPolicy(
      { srcMac: '02:00:00:00:00:01', dstMac: '02:00:00:00:00:02', etherType: EtherType.IPv4, payload: null },
      trunkIf,
      1
    );
    expect(untaggedFrame?.vlanTag).toBeUndefined();
  });
});

