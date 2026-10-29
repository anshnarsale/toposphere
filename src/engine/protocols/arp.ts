import type { Device, ArpEntry } from '@/types/network';
import { BROADCAST_MAC } from '@/lib/mac';

export interface ArpPacket {
  op: 'request' | 'reply';
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
}

export function createArpRequest(senderMac: string, senderIp: string, targetIp: string): ArpPacket {
  return { op: 'request', senderMac, senderIp, targetMac: '00:00:00:00:00:00', targetIp };
}

export function createArpReply(senderMac: string, senderIp: string, targetMac: string, targetIp: string): ArpPacket {
  return { op: 'reply', senderMac, senderIp, targetMac, targetIp };
}

export function lookupArp(device: Device, ip: string): ArpEntry | null {
  return device.arpTable.find(e => e.ip === ip) ?? null;
}

export function addArpEntry(device: Device, ip: string, mac: string, iface: string): void {
  const existing = device.arpTable.findIndex(e => e.ip === ip);
  const entry: ArpEntry = { ip, mac, interface: iface, age: 0, dynamic: true };
  if (existing >= 0) {
    device.arpTable[existing] = entry;
  } else {
    device.arpTable.push(entry);
  }
}

// Re-export for convenience
export { BROADCAST_MAC };
