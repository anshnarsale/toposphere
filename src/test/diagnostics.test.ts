import { describe, it, expect } from 'vitest';
import { DiagnosticsEngine } from '@/engine/diagnostics/DiagnosticsEngine';
import { NetworkModel } from '@/engine/core/NetworkModel';

describe('Automatic Network Diagnostics Engine', () => {
  it('detects duplicate IP addresses across devices in topology', () => {
    const model = new NetworkModel();
    const pc1 = model.addDevice('pc', 'PC-1');
    const pc2 = model.addDevice('pc', 'PC-2');

    model.updateInterface(pc1.id, 'eth0', {
      ipv4: { address: '192.168.1.100', prefixLength: 24 },
    });
    model.updateInterface(pc2.id, 'eth0', {
      ipv4: { address: '192.168.1.100', prefixLength: 24 },
    });

    const findings = DiagnosticsEngine.analyze(model.getTopology());
    const dupIssue = findings.find((f) => f.title.includes('Duplicate IP'));

    expect(dupIssue).toBeDefined();
    expect(dupIssue?.severity).toBe('error');
    expect(dupIssue?.evidence).toContain('PC-1');
    expect(dupIssue?.evidence).toContain('PC-2');
  });

  it('detects missing default gateway on configured end hosts', () => {
    const model = new NetworkModel();
    const pc = model.addDevice('pc', 'PC-Client');

    model.updateInterface(pc.id, 'eth0', {
      ipv4: { address: '10.0.0.10', prefixLength: 24 },
    });

    const findings = DiagnosticsEngine.analyze(model.getTopology());
    const gwIssue = findings.find((f) => f.title.includes('Missing Default Gateway'));

    expect(gwIssue).toBeDefined();
    expect(gwIssue?.severity).toBe('warning');
  });

  it('detects switchport access vs trunk mode mismatches on connected links', () => {
    const model = new NetworkModel();
    const sw1 = model.addDevice('switch', 'SW-1');
    const sw2 = model.addDevice('switch', 'SW-2');

    model.addLink(sw1.id, 'gi0_1', sw2.id, 'gi0_1');

    // Mismatched configuration: sw1 is trunk, sw2 is access
    model.updateInterface(sw1.id, 'gi0_1', { vlanMode: 'trunk' });
    model.updateInterface(sw2.id, 'gi0_1', { vlanMode: 'access' });

    const findings = DiagnosticsEngine.analyze(model.getTopology());
    const mismatch = findings.find((f) => f.title.includes('Mismatch'));

    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('error');
  });
});

