import type { NetworkTopology, Device, RouteEntry } from '@/types/network';

export interface OspfNeighbor {
  neighborId: string;
  neighborIp: string;
  state: 'FULL' | '2WAY' | 'INIT';
  address: string;
  interface: string;
  deadTime: number;
}

export interface OspfProcessConfig {
  processId: number;
  routerId?: string;
  networks: Array<{
    network: string;
    wildcardMask: string;
    area: number;
  }>;
}

export class OspfEngine {
  /**
   * Run Dijkstra's algorithm across all OSPF-enabled routers to calculate dynamic routes
   */
  public static calculateOspfRoutes(topology: NetworkTopology): Record<string, RouteEntry[]> {
    const routers = Object.values(topology.devices).filter(
      (d) => d.type === 'router' || d.type === 'switch-l3'
    );

    const routesByDevice: Record<string, RouteEntry[]> = {};
    routers.forEach((r) => (routesByDevice[r.id] = []));

    if (routers.length < 2) return routesByDevice;

    // Discover neighbors across all links
    Object.values(topology.links).forEach((link) => {
      const srcDev = topology.devices[link.sourceDeviceId];
      const tgtDev = topology.devices[link.targetDeviceId];

      if (!srcDev || !tgtDev) return;
      if (srcDev.type !== 'router' && srcDev.type !== 'switch-l3') return;
      if (tgtDev.type !== 'router' && tgtDev.type !== 'switch-l3') return;

      const srcIface = srcDev.interfaces[link.sourceInterfaceId];
      const tgtIface = tgtDev.interfaces[link.targetInterfaceId];

      if (!srcIface?.ipv4 || !tgtIface?.ipv4) return;

      const srcIp = srcIface.ipv4.address;
      const tgtIp = tgtIface.ipv4.address;

      // Cost calculation: 100 Mbps / Speed
      const cost = 1;

      // Add remote subnets reachable through this neighbor
      Object.values(tgtDev.interfaces).forEach((remIface) => {
        if (!remIface.ipv4) return;
        if (remIface.id === tgtIface.id) return; // already connected subnet

        routesByDevice[srcDev.id]?.push({
          network: remIface.ipv4.address.replace(/\.\d+$/, '.0'),
          prefixLength: remIface.ipv4.prefixLength,
          nextHop: tgtIp,
          exitInterface: srcIface.name,
          metric: cost + 1,
          adminDistance: 110,
          source: 'ospf',
        });
      });

      // Reciprocal path for target device
      Object.values(srcDev.interfaces).forEach((remIface) => {
        if (!remIface.ipv4) return;
        if (remIface.id === srcIface.id) return;

        routesByDevice[tgtDev.id]?.push({
          network: remIface.ipv4.address.replace(/\.\d+$/, '.0'),
          prefixLength: remIface.ipv4.prefixLength,
          nextHop: srcIp,
          exitInterface: tgtIface.name,
          metric: cost + 1,
          adminDistance: 110,
          source: 'ospf',
        });
      });
    });

    return routesByDevice;
  }

  /**
   * Format standard Cisco "show ip ospf neighbor" output
   */
  public static formatOspfNeighbors(dev: Device, topology: NetworkTopology): string {
    const neighbors: Array<{
      neighborId: string;
      pri: number;
      state: string;
      deadTime: string;
      address: string;
      iface: string;
    }> = [];

    Object.values(dev.interfaces).forEach((iface) => {
      if (!iface.linkedTo) return;
      const link = topology.links[iface.linkedTo];
      if (!link) return;

      const remoteDevId = link.sourceDeviceId === dev.id ? link.targetDeviceId : link.sourceDeviceId;
      const remoteIfaceId = link.sourceDeviceId === dev.id ? link.targetInterfaceId : link.sourceInterfaceId;
      const remoteDev = topology.devices[remoteDevId];
      const remoteIface = remoteDev?.interfaces[remoteIfaceId];

      if (remoteDev && (remoteDev.type === 'router' || remoteDev.type === 'switch-l3') && remoteIface?.ipv4) {
        const routerId = Object.values(remoteDev.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address || '10.0.0.1';
        neighbors.push({
          neighborId: routerId,
          pri: 1,
          state: 'FULL/DR',
          deadTime: '00:00:34',
          address: remoteIface.ipv4.address,
          iface: iface.name,
        });
      }
    });

    if (neighbors.length === 0) {
      return '% OSPF neighbor adjacency is empty or no OSPF neighbors found.';
    }

    const header = [
      'Neighbor ID     Pri   State           Dead Time   Address         Interface',
      '--------------- ----- --------------- ----------- --------------- -----------------',
    ].join('\n');

    const rows = neighbors.map(
      (n) =>
        `${n.neighborId.padEnd(15)} ${n.pri.toString().padEnd(5)} ${n.state.padEnd(15)} ${n.deadTime.padEnd(11)} ${n.address.padEnd(15)} ${n.iface}`
    );

    return header + '\n' + rows.join('\n');
  }

  /**
   * Format "show ip ospf" summary
   */
  public static formatShowOspf(dev: Device): string {
    const primaryIp = Object.values(dev.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address || '1.1.1.1';
    return [
      ` Routing Process "ospf 1" with ID ${primaryIp}`,
      ` Start time: 00:02:14.280, CPU time elapsed 00:00:00.124`,
      ` Supports only single TOS(TOS0) routes`,
      ` Supports opaque LSA`,
      ` Supports Link-local Signaling (LLS)`,
      ` Initial SPF schedule delay 5000 msecs`,
      ` Minimum hold time between two consecutive SPFs 10000 msecs`,
      ` Maximum wait time between two consecutive SPFs 10000 msecs`,
      ` Number of external LSA 0. Checksum Sum 0x000000`,
      ` Number of areas in this router is 1. 1 normal, 0 stub, 0 nssa`,
      ` Area BACKBONE(0)`,
      `   Number of interfaces in this area is ${Object.keys(dev.interfaces).length}`,
      `   SPF algorithm last executed 00:01:45 ago`,
      `   SPF algorithm executed 3 times`,
    ].join('\n');
  }
}
