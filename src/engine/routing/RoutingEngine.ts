import type { Device, RouteEntry } from '@/types/network';
import { getNetworkAddress } from '@/lib/ip';

export class RoutingEngine {
  /** Rebuild the routing table for a device from static routes + connected interfaces */
  static rebuildRoutingTable(device: Device): RouteEntry[] {
    const routes: RouteEntry[] = [];

    // Connected and local routes from interfaces
    for (const iface of Object.values(device.interfaces)) {
      if (!iface.ipv4 || iface.adminState !== 'up' || iface.operState !== 'up') continue;
      const { address, prefixLength } = iface.ipv4;
      const network = getNetworkAddress(address, prefixLength);

      // Connected route
      routes.push({
        network,
        prefixLength,
        nextHop: 'connected',
        exitInterface: iface.name,
        source: 'connected',
        adminDistance: 0,
        metric: 0,
      });

      // Local route (host route to own IP)
      routes.push({
        network: address,
        prefixLength: 32,
        nextHop: 'local',
        exitInterface: iface.name,
        source: 'local',
        adminDistance: 0,
        metric: 0,
      });
    }

    // Static routes
    for (const sr of device.staticRoutes) {
      routes.push({
        network: sr.network,
        prefixLength: sr.prefixLength,
        nextHop: sr.nextHop,
        exitInterface: '', // resolved at forwarding time
        source: 'static',
        adminDistance: sr.adminDistance,
        metric: sr.metric,
      });
    }

    return routes;
  }

  /** Format routing table as show ip route output */
  static formatRoutingTable(device: Device): string {
    const lines: string[] = ['Codes: C - connected, S - static, L - local', ''];
    for (const route of device.routingTable) {
      const code =
        route.source === 'connected' ? 'C' : route.source === 'local' ? 'L' : 'S';
      const nh =
        route.nextHop === 'connected' || route.nextHop === 'local'
          ? `directly connected, ${route.exitInterface}`
          : `via ${route.nextHop}, ${route.exitInterface}`;
      lines.push(
        `${code}    ${route.network}/${route.prefixLength} [${route.adminDistance}/${route.metric}] ${nh}`
      );
    }
    if (lines.length === 2) lines.push('(empty - no routes)');
    return lines.join('\n');
  }
}
