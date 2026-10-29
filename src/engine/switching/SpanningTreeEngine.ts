import type { NetworkTopology, Device } from '@/types/network';

export interface StpPortInfo {
  interfaceId: string;
  interfaceName: string;
  role: 'Root' | 'Desg' | 'Altn';
  state: 'FWD' | 'BLK' | 'LRN';
  cost: number;
  priority: number;
  isBlocked: boolean;
}

export interface StpBridgeInfo {
  deviceId: string;
  hostname: string;
  bridgeId: string;
  priority: number;
  mac: string;
  isRoot: boolean;
  rootBridgeId: string;
  rootPathCost: number;
  ports: Record<string, StpPortInfo>;
}

export class SpanningTreeEngine {
  /**
   * Calculate 802.1D Spanning Tree for the entire network topology
   */
  public static calculate(topology: NetworkTopology): Record<string, StpBridgeInfo> {
    const switches = Object.values(topology.devices).filter(
      (d) => d.type === 'switch' || d.type === 'switch-l3'
    );

    const result: Record<string, StpBridgeInfo> = {};
    if (switches.length === 0) return result;

    // 1. Determine Bridge ID for each switch (Priority 32768 + lowest MAC)
    const bridgeDetails = switches.map((sw) => {
      const macs = Object.values(sw.interfaces).map((i) => i.mac).sort();
      const lowestMac = macs[0] || '00:00:00:00:00:00';
      const priority = 32768;
      const bridgeId = `${priority}.${lowestMac.replace(/:/g, '')}`;

      return {
        sw,
        priority,
        mac: lowestMac,
        bridgeId,
      };
    });

    // 2. Elect Root Bridge: Lowest Bridge ID (lowest priority, then lowest MAC)
    bridgeDetails.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.mac.localeCompare(b.mac);
    });

    const rootBridge = bridgeDetails[0];

    // Initialize all bridges
    bridgeDetails.forEach((b) => {
      const isRoot = b.sw.id === rootBridge.sw.id;
      result[b.sw.id] = {
        deviceId: b.sw.id,
        hostname: b.sw.hostname,
        bridgeId: b.bridgeId,
        priority: b.priority,
        mac: b.mac,
        isRoot,
        rootBridgeId: rootBridge.bridgeId,
        rootPathCost: isRoot ? 0 : 19, // Default FastEthernet cost = 19
        ports: {},
      };

      // Populate ports
      Object.values(b.sw.interfaces).forEach((iface) => {
        const cost = Number(iface.speed) >= 1000 ? 4 : 19;
        result[b.sw.id].ports[iface.id] = {
          interfaceId: iface.id,
          interfaceName: iface.shortName,
          role: isRoot ? 'Desg' : 'Desg',
          state: 'FWD',
          cost,
          priority: 128,
          isBlocked: false,
        };
      });
    });

    // 3. For non-root switches, calculate Root Port and detect loops between switches
    // Find switch-to-switch links
    const switchLinks = Object.values(topology.links).filter((link) => {
      const srcDev = topology.devices[link.sourceDeviceId];
      const tgtDev = topology.devices[link.targetDeviceId];
      return (
        (srcDev?.type === 'switch' || srcDev?.type === 'switch-l3') &&
        (tgtDev?.type === 'switch' || tgtDev?.type === 'switch-l3')
      );
    });

    // Track links connecting to root bridge
    const visitedLinks = new Set<string>();
    const treeLinks = new Set<string>();

    switchLinks.forEach((link) => {
      const isConnectedToRoot =
        link.sourceDeviceId === rootBridge.sw.id || link.targetDeviceId === rootBridge.sw.id;

      if (isConnectedToRoot) {
        treeLinks.add(link.id);
        const nonRootDevId = link.sourceDeviceId === rootBridge.sw.id ? link.targetDeviceId : link.sourceDeviceId;
        const nonRootIfaceId = link.sourceDeviceId === rootBridge.sw.id ? link.targetInterfaceId : link.sourceInterfaceId;

        if (result[nonRootDevId]?.ports[nonRootIfaceId]) {
          result[nonRootDevId].ports[nonRootIfaceId].role = 'Root';
          result[nonRootDevId].ports[nonRootIfaceId].state = 'FWD';
          result[nonRootDevId].ports[nonRootIfaceId].isBlocked = false;
        }
      }
    });

    // 4. Any redundant links between non-root switches get blocked to break loops!
    switchLinks.forEach((link) => {
      if (treeLinks.has(link.id)) return;

      // Redundant link detected: Block target interface
      const tgtDevId = link.targetDeviceId;
      const tgtIfaceId = link.targetInterfaceId;

      if (result[tgtDevId]?.ports[tgtIfaceId]) {
        result[tgtDevId].ports[tgtIfaceId].role = 'Altn';
        result[tgtDevId].ports[tgtIfaceId].state = 'BLK';
        result[tgtDevId].ports[tgtIfaceId].isBlocked = true;
      }
    });

    return result;
  }

  /**
   * Format standard Cisco IOS "show spanning-tree" output
   */
  public static formatShowSpanningTree(dev: Device, topology: NetworkTopology): string {
    const stpData = SpanningTreeEngine.calculate(topology);
    const bridge = stpData[dev.id];

    if (!bridge) {
      return '% Spanning tree is not enabled or not supported on this device type.';
    }

    const lines: string[] = [
      `VLAN0001`,
      `  Spanning tree enabled protocol ieee`,
      `  Root ID    Priority    ${bridge.isRoot ? bridge.priority + 1 : 32769}`,
      `             Address     ${bridge.isRoot ? bridge.mac : '0001.42a1.b201'}`,
      bridge.isRoot ? `             This bridge is the root` : `             Cost        ${bridge.rootPathCost}`,
      `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec`,
      ``,
      `  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)`,
      `             Address     ${bridge.mac}`,
      `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec`,
      `             Aging Time  300 sec`,
      ``,
      `Interface           Role Sts Cost      Prio.Nbr Type`,
      `------------------- ---- --- --------- -------- --------------------------------`,
    ];

    Object.values(dev.interfaces).forEach((iface) => {
      const portStp = bridge.ports[iface.id];
      if (!portStp) return;

      const role = portStp.role;
      const sts = portStp.state;
      const cost = portStp.cost;
      const prioNbr = `${portStp.priority}.1`;
      const type = 'P2p';

      lines.push(
        `${iface.name.padEnd(19)} ${role.padEnd(4)} ${sts.padEnd(3)} ${cost.toString().padEnd(9)} ${prioNbr.padEnd(8)} ${type}`
      );
    });

    return lines.join('\n');
  }
}
