// Complete network model types for NexaLab

export type DeviceVendor = 'cisco' | 'juniper' | 'arista' | 'mikrotik' | 'fortinet' | 'linux';

export type DeviceType =
  | 'pc'
  | 'laptop'
  | 'server'
  | 'printer'
  | 'router'
  | 'switch'
  | 'switch-l3'
  | 'access-point'
  | 'wireless-client'
  | 'firewall'
  | 'cloud'
  | 'packet-generator';

export type LinkType = 'ethernet' | 'serial' | 'fiber' | 'wireless' | 'logical';

export type AdminState = 'up' | 'down';
export type OperState = 'up' | 'down' | 'err-disabled';
export type InterfaceMode = 'access' | 'trunk' | 'routed' | 'none';
export type DuplexMode = 'full' | 'half' | 'auto';
export type SpeedMode = '10' | '100' | '1000' | '10000' | 'auto';

export interface IPv4Config {
  address: string;       // dotted-decimal
  prefixLength: number;  // 0-32
  gateway?: string;
}

export interface Interface {
  id: string;
  name: string;              // e.g. "GigabitEthernet0/0", "FastEthernet0/1"
  shortName: string;         // e.g. "Gi0/0", "Fa0/1"
  mac: string;               // colon-separated hex, e.g. "aa:bb:cc:dd:ee:ff"
  speed: SpeedMode;
  duplex: DuplexMode;
  adminState: AdminState;
  operState: OperState;
  ipv4?: IPv4Config;
  vlanMode: InterfaceMode;
  accessVlan: number;        // 1-4094, default 1
  trunkAllowedVlans: number[]; // empty means all
  nativeVlan: number;        // default 1
  linkedTo?: string;         // link ID if connected
  counters: {
    rxPackets: number;
    txPackets: number;
    rxBytes: number;
    txBytes: number;
    rxErrors: number;
    txErrors: number;
  };
  description: string;
}

export interface Vlan {
  id: number;         // 1-4094
  name: string;
  active: boolean;
}

export interface StaticRoute {
  id: string;
  network: string;        // e.g. "10.0.0.0"
  prefixLength: number;
  nextHop: string;        // IP address
  adminDistance: number;  // default 1
  metric: number;
}

export interface RouteEntry {
  network: string;
  prefixLength: number;
  nextHop: string | 'connected' | 'local';
  exitInterface: string;
  source: 'connected' | 'static' | 'ospf' | 'local';
  adminDistance: number;
  metric: number;
}

export interface ArpEntry {
  ip: string;
  mac: string;
  interface: string;
  age: number; // seconds
  dynamic: boolean;
}

export interface MacTableEntry {
  mac: string;
  vlan: number;
  interface: string;
  dynamic: boolean;
  age: number;
}

export interface DhcpPool {
  id: string;
  name: string;
  network: string;
  prefixLength: number;
  defaultGateway: string;
  dnsServer: string;
  leaseTime: number; // seconds
  excludedAddresses: string[];
}

export interface DhcpLease {
  ip: string;
  mac: string;
  hostname: string;
  leaseExpiry: number; // timestamp
  poolId: string;
}

export interface DnsRecord {
  hostname: string;
  ip: string;
  type: 'A' | 'PTR';
}

export interface DeviceServices {
  dhcpEnabled: boolean;
  dhcpPools: DhcpPool[];
  dhcpLeases: DhcpLease[];
  dnsEnabled: boolean;
  dnsRecords: DnsRecord[];
  httpEnabled: boolean;
  ftpEnabled: boolean;
}

export interface Device {
  id: string;
  type: DeviceType;
  vendor?: DeviceVendor;
  hostname: string;
  model: string;
  interfaces: Record<string, Interface>; // keyed by interface id
  vlans: Record<number, Vlan>;
  arpTable: ArpEntry[];
  macTable: MacTableEntry[];
  routingTable: RouteEntry[];
  staticRoutes: StaticRoute[];
  services: DeviceServices;
  logs: DeviceLogEntry[];
  // Position is managed by the topology canvas, stored separately
}

export interface DeviceLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface Link {
  id: string;
  type: LinkType;
  sourceDeviceId: string;
  sourceInterfaceId: string;
  targetDeviceId: string;
  targetInterfaceId: string;
  bandwidth: number;  // Mbps
  latency: number;    // ms
  packetLoss: number; // 0-100 percent
  operState: OperState;
  label?: string;
}

export interface NetworkTopology {
  devices: Record<string, Device>;
  links: Record<string, Link>;
}
