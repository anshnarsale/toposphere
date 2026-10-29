import { describe, it, expect } from 'vitest';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';

describe('End-to-End Network Topology Integration Scenario', () => {
  /**
   * Acceptance Test:
   * PC-A (192.168.1.10/24) -> Switch-1 -> Router-1 -> Switch-2 -> PC-B (192.168.2.20/24)
   */
  it('simulates end-to-end communication across 5 devices with switching, routing, and route removal/restoration', () => {
    const model = new NetworkModel();
    const simEngine = new SimulationEngine(model);

    // 1. Create devices
    const pcA = model.addDevice('pc', 'PC-A');
    const sw1 = model.addDevice('switch', 'Switch-1');
    const r1 = model.addDevice('router', 'Router-1');
    const sw2 = model.addDevice('switch', 'Switch-2');
    const pcB = model.addDevice('pc', 'PC-B');

    // 2. Connect links
    // PC-A <-> Switch-1
    model.addLink(pcA.id, 'eth0', sw1.id, 'fa0_1');
    // Switch-1 <-> Router-1
    model.addLink(sw1.id, 'gi0_1', r1.id, 'gi0_0');
    // Router-1 <-> Switch-2
    model.addLink(r1.id, 'gi0_1', sw2.id, 'gi0_1');
    // Switch-2 <-> PC-B
    model.addLink(sw2.id, 'fa0_1', pcB.id, 'eth0');

    // 3. Configure IP addresses & gateways
    // PC-A
    model.updateInterface(pcA.id, 'eth0', {
      adminState: 'up',
      ipv4: {
        address: '192.168.1.10',
        prefixLength: 24,
        gateway: '192.168.1.1',
      },
    });

    // Router-1 Gi0/0/0 (faces PC-A)
    model.updateInterface(r1.id, 'gi0_0', {
      adminState: 'up',
      ipv4: {
        address: '192.168.1.1',
        prefixLength: 24,
      },
    });

    // Router-1 Gi0/0/1 (faces PC-B)
    model.updateInterface(r1.id, 'gi0_1', {
      adminState: 'up',
      ipv4: {
        address: '192.168.2.1',
        prefixLength: 24,
      },
    });

    // PC-B
    model.updateInterface(pcB.id, 'eth0', {
      adminState: 'up',
      ipv4: {
        address: '192.168.2.20',
        prefixLength: 24,
        gateway: '192.168.2.1',
      },
    });

    // Verification Step A: PC-A can reach its default gateway (192.168.1.1)
    const gwPing = simEngine.runPing(pcA.id, '192.168.1.1');
    expect(gwPing.success).toBe(true);
    expect(gwPing.received).toBe(5);

    // Verification Step B: PC-A can reach PC-B (192.168.2.20) across both switches and the router
    simEngine.clearEvents();
    const e2ePing = simEngine.runPing(pcA.id, '192.168.2.20');
    expect(e2ePing.success).toBe(true);
    expect(e2ePing.received).toBe(5);

    // Verification Step C: Events show the correct hop-by-hop traversal and processing decisions
    const recordedEvents = simEngine.getEvents();
    const visitedDeviceIds = recordedEvents.map((e) => e.deviceId);

    expect(visitedDeviceIds).toContain(pcA.id);
    expect(visitedDeviceIds).toContain(sw1.id);
    expect(visitedDeviceIds).toContain(r1.id);
    expect(visitedDeviceIds).toContain(sw2.id);
    expect(visitedDeviceIds).toContain(pcB.id);

    // Verify MAC learning occurred on Switch-1 and Switch-2
    expect(recordedEvents.some((e) => e.type === 'mac-learned')).toBe(true);

    // Verification Step D: Shutting down the router exit interface to PC-B causes communication to fail
    model.setInterfaceAdminState(r1.id, 'gi0_1', 'down');
    simEngine.clearEvents();
    const failedPing = simEngine.runPing(pcA.id, '192.168.2.20');
    expect(failedPing.success).toBe(false);
    expect(failedPing.errorMessage).toBeDefined();

    // Verification Step E: Restoring the interface allows end-to-end communication again
    model.setInterfaceAdminState(r1.id, 'gi0_1', 'up');
    simEngine.clearEvents();
    const restoredPing = simEngine.runPing(pcA.id, '192.168.2.20');
    expect(restoredPing.success).toBe(true);
    expect(restoredPing.received).toBe(5);
  });
});

