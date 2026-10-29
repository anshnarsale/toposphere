export type SimulationMode = 'design' | 'simulation';
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'stepping';

export type PacketProtocol = 'ethernet' | 'arp' | 'ipv4' | 'icmp' | 'dhcp' | 'dns' | 'tcp' | 'udp';

export type PacketEventType =
  | 'sent'
  | 'received'
  | 'forwarded'
  | 'dropped'
  | 'arp-request'
  | 'arp-reply'
  | 'icmp-request'
  | 'icmp-reply'
  | 'dhcp-discover'
  | 'dhcp-offer'
  | 'dhcp-request'
  | 'dhcp-ack'
  | 'ttl-expired'
  | 'no-route'
  | 'host-unreachable'
  | 'vlan-mismatch'
  | 'mac-learned'
  | 'mac-lookup-miss'
  | 'routed'
  | 'switched';

export interface PacketHeaders {
  // Ethernet
  srcMac: string;
  dstMac: string;
  etherType: string; // hex, e.g. "0x0800"
  vlanTag?: number;
  // IPv4
  srcIp?: string;
  dstIp?: string;
  ttl?: number;
  protocol?: string; // e.g. "ICMP", "UDP", "TCP"
  // ICMP
  icmpType?: number;
  icmpCode?: number;
  icmpSequence?: number;
  // ARP
  arpOp?: 'request' | 'reply';
  arpSenderIp?: string;
  arpTargetIp?: string;
  arpSenderMac?: string;
  arpTargetMac?: string;
}

export interface PacketEvent {
  id: string;
  packetId: string;
  sequence: number;        // overall event sequence
  timestamp: number;       // sim-time ms
  wallTime: number;        // real Date.now()
  type: PacketEventType;
  deviceId: string;
  interfaceId?: string;
  toLinkId?: string;
  headers: PacketHeaders;
  decision?: string;       // human-readable forwarding decision
  dropReason?: string;     // why it was dropped
  details?: string;        // extra explanation
}

export interface AnimatedPacket {
  id: string;
  packetId: string;
  linkId: string;
  direction: 'forward' | 'reverse'; // source→target or target→source
  startTime: number;
  duration: number;       // ms
  protocol: PacketProtocol;
  color: string;
}

export interface SimulationState {
  mode: SimulationMode;
  status: SimulationStatus;
  speed: number;           // 1x, 2x, 0.5x etc.
  simTime: number;         // virtual ms elapsed
  events: PacketEvent[];
  animatedPackets: AnimatedPacket[];
  selectedEventId: string | null;
}

export interface PingResult {
  success: boolean;
  targetIp: string;
  packets: number;
  received: number;
  rtt?: number[]; // ms per successful reply
  events: PacketEvent[];
  errorMessage?: string;
}
