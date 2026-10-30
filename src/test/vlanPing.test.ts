import { describe, it, expect } from 'vitest';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';

describe('VLAN Ping & Traffic Isolation Engine', () => {
  it('strictly isolates PCs in different VLANs on the same switch (ping dropped)', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch');
    const pc1 = model.addDevice('pc', 'PC-1');
    const pc2 = model.addDevice('pc', 'PC-2');

    // Configure PCs with IPs
    model.updateInterface(pc1.id, 'eth0', {
      ipv4: { address: '192.168.1.10', prefixLength: 24 },
      operState: 'up',
      adminState: 'up',
    });
    model.updateInterface(pc2.id, 'eth0', {
      ipv4: { address: '192.168.1.20', prefixLength: 24 },
      operState: 'up',
      adminState: 'up',
    });

    // Link PC1 -> SW fa0_1, PC2 -> SW fa0_2
    model.addLink(pc1.id, 'eth0', sw.id, 'fa0_1');
    model.addLink(pc2.id, 'eth0', sw.id, 'fa0_2');

    // Create VLANs
    model.addVlan(sw.id, { id: 10, name: 'Sales', active: true });
    model.addVlan(sw.id, { id: 20, name: 'HR', active: true });

    // Assign fa0_1 to VLAN 10, fa0_2 to VLAN 20
    model.updateInterface(sw.id, 'fa0_1', { vlanMode: 'access', accessVlan: 10 });
    model.updateInterface(sw.id, 'fa0_2', { vlanMode: 'access', accessVlan: 20 });

    const sim = new SimulationEngine(model);
    const result = sim.runPing(pc1.id, '192.168.1.20');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('isolated in VLAN 10');
  });

  it('permits communication between PCs assigned to the SAME VLAN', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch');
    const pc1 = model.addDevice('pc', 'PC-1');
    const pc2 = model.addDevice('pc', 'PC-2');

    // Configure PCs with IPs
    model.updateInterface(pc1.id, 'eth0', {
      ipv4: { address: '192.168.1.10', prefixLength: 24 },
      operState: 'up',
      adminState: 'up',
    });
    model.updateInterface(pc2.id, 'eth0', {
      ipv4: { address: '192.168.1.20', prefixLength: 24 },
      operState: 'up',
      adminState: 'up',
    });

    // Link PC1 -> SW fa0_1, PC2 -> SW fa0_2
    model.addLink(pc1.id, 'eth0', sw.id, 'fa0_1');
    model.addLink(pc2.id, 'eth0', sw.id, 'fa0_2');

    // Create VLAN 10 and assign BOTH to VLAN 10
    model.addVlan(sw.id, { id: 10, name: 'Sales', active: true });
    model.updateInterface(sw.id, 'fa0_1', { vlanMode: 'access', accessVlan: 10 });
    model.updateInterface(sw.id, 'fa0_2', { vlanMode: 'access', accessVlan: 10 });

    const sim = new SimulationEngine(model);
    const result = sim.runPing(pc1.id, '192.168.1.20');

    expect(result.success).toBe(true);
    expect(result.received).toBe(5);
  });
});
