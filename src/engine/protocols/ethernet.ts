import type { Interface } from '@/types/network';

export interface EthernetFrame {
  srcMac: string;
  dstMac: string;
  etherType: number; // 0x0800=IPv4, 0x0806=ARP, 0x8100=802.1Q
  vlanTag?: number;
  payload: unknown;
}

export const EtherType = {
  ARP: 0x0806,
  IPv4: 0x0800,
  IPv6: 0x86DD,
  VLAN: 0x8100,
} as const;

/** Determine if an egress interface should tag/untag the frame for a given VLAN */
export function applyEgressVlanPolicy(
  frame: EthernetFrame,
  interface_: Interface,
  ingressVlan: number
): EthernetFrame | null {
  if (interface_.adminState !== 'up') return null;

  if (interface_.vlanMode === 'access') {
    // Only forward if frame VLAN matches access VLAN
    if (ingressVlan !== interface_.accessVlan) return null;
    // Strip any tag on egress
    return { ...frame, vlanTag: undefined };
  }

  if (interface_.vlanMode === 'trunk') {
    const allowed = interface_.trunkAllowedVlans;
    const isAllowed = allowed.length === 0 || allowed.includes(ingressVlan);
    if (!isAllowed) return null;
    // Tag unless native VLAN
    if (ingressVlan === interface_.nativeVlan) {
      return { ...frame, vlanTag: undefined };
    }
    return { ...frame, vlanTag: ingressVlan };
  }

  return frame;
}

/** Determine ingress VLAN for a frame arriving on an interface */
export function getIngressVlan(frame: EthernetFrame, interface_: Interface): number {
  if (interface_.vlanMode === 'access') return interface_.accessVlan;
  if (interface_.vlanMode === 'trunk') {
    // Tagged: use tag; untagged: use native VLAN
    return frame.vlanTag ?? interface_.nativeVlan;
  }
  return 1; // routed interface, VLAN doesn't apply
}
