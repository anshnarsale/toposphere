import type { Device } from '@/types/network';
import type { EthernetFrame } from '../protocols/ethernet';
import { getIngressVlan, applyEgressVlanPolicy } from '../protocols/ethernet';
import { isBroadcastMac } from '@/lib/mac';

export interface SwitchForwardDecision {
  outInterfaces: Array<{ interfaceId: string; frame: EthernetFrame }>;
  macLearned?: { mac: string; interfaceId: string; vlan: number };
  reason: string;
}

export class SwitchingEngine {
  /** Process an incoming frame on a switch device */
  static processFrame(
    device: Device,
    ingressInterfaceId: string,
    frame: EthernetFrame
  ): SwitchForwardDecision {
    const ingressIface = device.interfaces[ingressInterfaceId];
    if (!ingressIface || ingressIface.adminState !== 'up') {
      return { outInterfaces: [], reason: 'Ingress interface is down or not found' };
    }

    const ingressVlan = getIngressVlan(frame, ingressIface);

    // Learn source MAC
    const macLearned = { mac: frame.srcMac, interfaceId: ingressInterfaceId, vlan: ingressVlan };
    this.learnMac(device, frame.srcMac, ingressInterfaceId, ingressVlan);

    // Lookup destination MAC
    const outInterfaces: Array<{ interfaceId: string; frame: EthernetFrame }> = [];

    if (isBroadcastMac(frame.dstMac)) {
      // Flood to all interfaces in the same VLAN except ingress
      for (const [ifId, iface] of Object.entries(device.interfaces)) {
        if (ifId === ingressInterfaceId) continue;
        if (iface.adminState !== 'up' || iface.operState !== 'up') continue;
        const egressFrame = applyEgressVlanPolicy(frame, iface, ingressVlan);
        if (egressFrame) outInterfaces.push({ interfaceId: ifId, frame: egressFrame });
      }
      return { outInterfaces, macLearned, reason: 'Broadcast flood' };
    }

    // Unicast lookup
    const entry = device.macTable.find(e => e.mac === frame.dstMac && e.vlan === ingressVlan);
    if (entry) {
      const egressIface = device.interfaces[entry.interface];
      if (egressIface && egressIface.adminState === 'up') {
        const egressFrame = applyEgressVlanPolicy(frame, egressIface, ingressVlan);
        if (egressFrame) {
          outInterfaces.push({ interfaceId: entry.interface, frame: egressFrame });
          return {
            outInterfaces,
            macLearned,
            reason: `MAC table hit: ${frame.dstMac} → ${egressIface.name}`,
          };
        }
      }
    }

    // Unknown unicast: flood
    for (const [ifId, iface] of Object.entries(device.interfaces)) {
      if (ifId === ingressInterfaceId) continue;
      if (iface.adminState !== 'up' || iface.operState !== 'up') continue;
      const egressFrame = applyEgressVlanPolicy(frame, iface, ingressVlan);
      if (egressFrame) outInterfaces.push({ interfaceId: ifId, frame: egressFrame });
    }

    return { outInterfaces, macLearned, reason: 'Unknown unicast flood' };
  }

  static learnMac(device: Device, mac: string, interfaceId: string, vlan: number): void {
    const existing = device.macTable.findIndex(e => e.mac === mac && e.vlan === vlan);
    const entry = { mac, vlan, interface: interfaceId, dynamic: true, age: 0 };
    if (existing >= 0) {
      device.macTable[existing] = entry;
    } else {
      device.macTable.push(entry);
    }
  }
}
