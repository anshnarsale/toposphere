import type {
  Device,
  DeviceType,
  DeviceVendor,
  Interface,
  Link,
  NetworkTopology,
  StaticRoute,
  Vlan,
  AdminState,
  InterfaceMode,
} from '@/types/network';
import { generateMac } from '@/lib/mac';
import { generateId } from '@/lib/utils';
import { RoutingEngine } from '@/engine/routing/RoutingEngine';
import { TypedEventEmitter } from './EventEmitter';

export type NetworkModelEvents = {
  'device-added': Device;
  'device-removed': string;
  'link-added': Link;
  'link-removed': string;
  'interface-updated': { deviceId: string; interfaceId: string; iface: Interface };
  'topology-changed': NetworkTopology;
};

export class NetworkModel extends TypedEventEmitter<NetworkModelEvents> {
  private topology: NetworkTopology = {
    devices: {},
    links: {},
  };

  private deviceCounters: Record<string, number> = {};

  constructor(initialTopology?: NetworkTopology) {
    super();
    if (initialTopology) {
      this.topology = JSON.parse(JSON.stringify(initialTopology));
    }
  }

  public getTopology(): NetworkTopology {
    return this.topology;
  }

  public setTopology(topology: NetworkTopology): void {
    this.topology = JSON.parse(JSON.stringify(topology));
    this.emit('topology-changed', this.topology);
  }

  public getDevice(deviceId: string): Device | undefined {
    return this.topology.devices[deviceId];
  }

  public getLink(linkId: string): Link | undefined {
    return this.topology.links[linkId];
  }

  public getConnectedLink(deviceId: string, interfaceId: string): Link | undefined {
    return Object.values(this.topology.links).find(
      (link) =>
        (link.sourceDeviceId === deviceId && link.sourceInterfaceId === interfaceId) ||
        (link.targetDeviceId === deviceId && link.targetInterfaceId === interfaceId)
    );
  }

  public getNeighbor(
    deviceId: string,
    interfaceId: string
  ): { device: Device; iface: Interface; link: Link } | null {
    const link = this.getConnectedLink(deviceId, interfaceId);
    if (!link) return null;

    const isSource = link.sourceDeviceId === deviceId && link.sourceInterfaceId === interfaceId;
    const neighborDevId = isSource ? link.targetDeviceId : link.sourceDeviceId;
    const neighborIfId = isSource ? link.targetInterfaceId : link.sourceInterfaceId;

    const neighborDev = this.getDevice(neighborDevId);
    const neighborIf = neighborDev?.interfaces[neighborIfId];

    if (!neighborDev || !neighborIf) return null;
    return { device: neighborDev, iface: neighborIf, link };
  }

  private generateDefaultHostname(type: DeviceType): string {
    const prefixMap: Record<DeviceType, string> = {
      pc: 'PC',
      laptop: 'Laptop',
      server: 'Server',
      printer: 'Printer',
      router: 'Router',
      switch: 'Switch',
      'switch-l3': 'Switch-L3',
      'access-point': 'AP',
      'wireless-client': 'Client',
      firewall: 'Firewall',
      cloud: 'Cloud',
      'packet-generator': 'Probe',
    };

    const prefix = prefixMap[type] || 'Device';
    this.deviceCounters[prefix] = (this.deviceCounters[prefix] || 0) + 1;
    return `${prefix}-${this.deviceCounters[prefix]}`;
  }

  private createInterface(
    id: string,
    name: string,
    shortName: string,
    vlanMode: InterfaceMode,
    defaultAdminState: AdminState = 'up'
  ): Interface {
    return {
      id,
      name,
      shortName,
      mac: generateMac(),
      speed: '1000',
      duplex: 'full',
      adminState: defaultAdminState,
      operState: 'down',
      vlanMode,
      accessVlan: 1,
      trunkAllowedVlans: [],
      nativeVlan: 1,
      description: '',
      counters: {
        rxPackets: 0,
        txPackets: 0,
        rxBytes: 0,
        txBytes: 0,
        rxErrors: 0,
        txErrors: 0,
      },
    };
  }

  public addDevice(
    type: DeviceType,
    customHostname?: string,
    vendor: DeviceVendor = 'cisco',
    customModel?: string
  ): Device {
    const id = generateId('dev');
    const hostname = customHostname || this.generateDefaultHostname(type);
    const interfaces: Record<string, Interface> = {};
    const vlans: Record<number, Vlan> = {
      1: { id: 1, name: 'default', active: true },
    };

    let model = customModel || 'Generic';

    if (vendor === 'juniper') {
      if (type === 'router') {
        model = customModel || 'Juniper MX204 Edge Router';
        interfaces['ge-0_0_0'] = this.createInterface('ge-0_0_0', 'ge-0/0/0', 'ge-0/0/0', 'routed', 'down');
        interfaces['ge-0_0_1'] = this.createInterface('ge-0_0_1', 'ge-0/0/1', 'ge-0/0/1', 'routed', 'down');
        interfaces['xe-0_0_0'] = this.createInterface('xe-0_0_0', 'xe-0/0/0', 'xe-0/0/0', 'routed', 'down');
      } else if (type === 'switch' || type === 'switch-l3') {
        model = customModel || 'Juniper EX2300-24T Switch';
        for (let i = 0; i < 6; i++) {
          const ifId = `ge-0_0_${i}`;
          interfaces[ifId] = this.createInterface(ifId, `ge-0/0/${i}`, `ge-0/0/${i}`, 'access');
        }
        interfaces['xe-0_1_0'] = this.createInterface('xe-0_1_0', 'xe-0/1/0', 'xe-0/1/0', 'access');
      } else if (type === 'firewall') {
        model = customModel || 'Juniper SRX300 Services Gateway';
        interfaces['ge-0_0_0'] = this.createInterface('ge-0_0_0', 'ge-0/0/0 (Untrust)', 'ge-0/0/0', 'routed');
        interfaces['ge-0_0_1'] = this.createInterface('ge-0_0_1', 'ge-0/0/1 (Trust)', 'ge-0/0/1', 'routed');
        interfaces['ge-0_0_2'] = this.createInterface('ge-0_0_2', 'ge-0/0/2 (DMZ)', 'ge-0/0/2', 'routed');
      }
    } else if (vendor === 'arista') {
      if (type === 'switch' || type === 'switch-l3') {
        model = customModel || 'Arista 7050X3 Leaf Switch';
        for (let i = 1; i <= 6; i++) {
          const ifId = `Et${i}`;
          interfaces[ifId] = this.createInterface(ifId, `Ethernet${i}`, `Et${i}`, 'access');
        }
        interfaces['Ma1'] = this.createInterface('Ma1', 'Management1', 'Ma1', 'routed');
      }
    } else if (vendor === 'mikrotik') {
      if (type === 'router') {
        model = customModel || 'MikroTik CCR2004-16G-2S+';
        for (let i = 1; i <= 4; i++) {
          const ifId = `ether${i}`;
          interfaces[ifId] = this.createInterface(ifId, `ether${i}`, `ether${i}`, 'routed', 'down');
        }
        interfaces['sfp-plus1'] = this.createInterface('sfp-plus1', 'sfp-plus1', 'sfp-plus1', 'routed', 'down');
      } else if (type === 'switch') {
        model = customModel || 'MikroTik CRS326-24G-2S+';
        for (let i = 1; i <= 6; i++) {
          const ifId = `ether${i}`;
          interfaces[ifId] = this.createInterface(ifId, `ether${i}`, `ether${i}`, 'access');
        }
      }
    } else if (vendor === 'fortinet') {
      if (type === 'firewall') {
        model = customModel || 'FortiGate 60F Security Fabric';
        interfaces['wan1'] = this.createInterface('wan1', 'wan1 (Internet)', 'wan1', 'routed');
        interfaces['wan2'] = this.createInterface('wan2', 'wan2 (Backup)', 'wan2', 'routed');
        interfaces['internal1'] = this.createInterface('internal1', 'internal1', 'int1', 'routed');
        interfaces['internal2'] = this.createInterface('internal2', 'internal2', 'int2', 'routed');
        interfaces['dmz'] = this.createInterface('dmz', 'dmz', 'dmz', 'routed');
      }
    } else if (vendor === 'linux') {
      if (type === 'router') {
        model = customModel || 'VyOS 1.4 Software Router';
        interfaces['eth0'] = this.createInterface('eth0', 'eth0', 'eth0', 'routed', 'down');
        interfaces['eth1'] = this.createInterface('eth1', 'eth1', 'eth1', 'routed', 'down');
        interfaces['eth2'] = this.createInterface('eth2', 'eth2', 'eth2', 'routed', 'down');
      } else if (type === 'server') {
        model = customModel || 'Ubuntu Linux Server 22.04 LTS';
        interfaces['eth0'] = this.createInterface('eth0', 'eth0', 'eth0', 'routed');
        interfaces['eth1'] = this.createInterface('eth1', 'eth1', 'eth1', 'routed');
      }
    }

    // Default fallback if vendor did not populate
    if (Object.keys(interfaces).length === 0) {
      switch (type) {
        case 'pc':
        case 'laptop':
        case 'printer':
        case 'wireless-client': {
          model = type === 'pc' ? 'Standard Workstation' : 'Client Device';
          interfaces['eth0'] = this.createInterface('eth0', 'FastEthernet0/0', 'Fa0/0', 'routed');
          break;
        }

        case 'server': {
          model = 'Enterprise Server 1U';
          interfaces['eth0'] = this.createInterface('eth0', 'GigabitEthernet0/0', 'Gi0/0', 'routed');
          interfaces['eth1'] = this.createInterface('eth1', 'GigabitEthernet0/1', 'Gi0/1', 'routed');
          break;
        }

        case 'router': {
          model = 'Cisco ISR 4331 Router';
          interfaces['gi0_0'] = this.createInterface('gi0_0', 'GigabitEthernet0/0/0', 'Gi0/0/0', 'routed', 'down');
          interfaces['gi0_1'] = this.createInterface('gi0_1', 'GigabitEthernet0/0/1', 'Gi0/0/1', 'routed', 'down');
          interfaces['gi0_2'] = this.createInterface('gi0_2', 'GigabitEthernet0/0/2', 'Gi0/0/2', 'routed', 'down');
          break;
        }

        case 'switch': {
          model = 'Catalyst 2960-24TT';
          for (let i = 1; i <= 8; i++) {
            const ifId = `fa0_${i}`;
            interfaces[ifId] = this.createInterface(ifId, `FastEthernet0/${i}`, `Fa0/${i}`, 'access');
          }
          interfaces['gi0_1'] = this.createInterface('gi0_1', 'GigabitEthernet0/1', 'Gi0/1', 'access');
          interfaces['gi0_2'] = this.createInterface('gi0_2', 'GigabitEthernet0/2', 'Gi0/2', 'access');
          break;
        }

        case 'switch-l3': {
          model = 'Catalyst 3650-24PD L3';
          for (let i = 1; i <= 8; i++) {
            const ifId = `fa0_${i}`;
            interfaces[ifId] = this.createInterface(ifId, `FastEthernet0/${i}`, `Fa0/${i}`, 'access');
          }
          interfaces['gi0_1'] = this.createInterface('gi0_1', 'GigabitEthernet0/1', 'Gi0/1', 'routed');
          interfaces['gi0_2'] = this.createInterface('gi0_2', 'GigabitEthernet0/2', 'Gi0/2', 'routed');
          break;
        }

        case 'firewall': {
          model = 'Cisco ASA 5506-X';
          interfaces['inside'] = this.createInterface('inside', 'GigabitEthernet1/1 (Inside)', 'Gi1/1', 'routed');
          interfaces['outside'] = this.createInterface('outside', 'GigabitEthernet1/2 (Outside)', 'Gi1/2', 'routed');
          interfaces['dmz'] = this.createInterface('dmz', 'GigabitEthernet1/3 (DMZ)', 'Gi1/3', 'routed');
          break;
        }

        case 'access-point': {
          model = 'Aironet 2802I AP';
          interfaces['eth0'] = this.createInterface('eth0', 'GigabitEthernet0/0', 'Gi0/0', 'access');
          break;
        }

        case 'cloud': {
          model = 'WAN Cloud Gateway';
          interfaces['eth0'] = this.createInterface('eth0', 'Ethernet0', 'Eth0', 'routed');
          interfaces['eth1'] = this.createInterface('eth1', 'Ethernet1', 'Eth1', 'routed');
          break;
        }

        case 'packet-generator': {
          model = 'TopoSphere Traffic Probe';
          interfaces['eth0'] = this.createInterface('eth0', 'GigabitEthernet0/0', 'Gi0/0', 'routed');
          break;
        }
      }
    }

    const device: Device = {
      id,
      type,
      vendor,
      hostname,
      model,
      interfaces,
      vlans,
      arpTable: [],
      macTable: [],
      routingTable: [],
      staticRoutes: [],
      services: {
        dhcpEnabled: false,
        dhcpPools: [],
        dhcpLeases: [],
        dnsEnabled: false,
        dnsRecords: [],
        httpEnabled: false,
        ftpEnabled: false,
      },
      logs: [
        {
          id: generateId('log'),
          timestamp: Date.now(),
          level: 'info',
          message: `Device ${hostname} initialized successfully (${model}).`,
        },
      ],
    };

    this.topology.devices[id] = device;
    this.rebuildRoutingTable(id);
    this.emit('device-added', device);
    this.emit('topology-changed', this.topology);

    return device;
  }

  public removeDevice(deviceId: string): void {
    const device = this.topology.devices[deviceId];
    if (!device) return;

    // Disconnect and remove all attached links
    const attachedLinks = Object.values(this.topology.links).filter(
      (link) => link.sourceDeviceId === deviceId || link.targetDeviceId === deviceId
    );
    for (const link of attachedLinks) {
      this.removeLink(link.id);
    }

    delete this.topology.devices[deviceId];
    this.emit('device-removed', deviceId);
    this.emit('topology-changed', this.topology);
  }

  public addLink(
    sourceDeviceId: string,
    sourceInterfaceId: string,
    targetDeviceId: string,
    targetInterfaceId: string
  ): Link | null {
    if (sourceDeviceId === targetDeviceId) return null;

    const sourceDev = this.getDevice(sourceDeviceId);
    const targetDev = this.getDevice(targetDeviceId);
    if (!sourceDev || !targetDev) return null;

    const sourceIf = sourceDev.interfaces[sourceInterfaceId];
    const targetIf = targetDev.interfaces[targetInterfaceId];
    if (!sourceIf || !targetIf) return null;

    // Check if either interface is already connected
    if (this.getConnectedLink(sourceDeviceId, sourceInterfaceId) || this.getConnectedLink(targetDeviceId, targetInterfaceId)) {
      return null;
    }

    const linkId = generateId('link');
    const link: Link = {
      id: linkId,
      type: 'ethernet',
      sourceDeviceId,
      sourceInterfaceId,
      targetDeviceId,
      targetInterfaceId,
      bandwidth: 1000,
      latency: 1,
      packetLoss: 0,
      operState: sourceIf.adminState === 'up' && targetIf.adminState === 'up' ? 'up' : 'down',
    };

    sourceIf.linkedTo = linkId;
    targetIf.linkedTo = linkId;
    sourceIf.operState = link.operState;
    targetIf.operState = link.operState;

    this.topology.links[linkId] = link;

    this.rebuildRoutingTable(sourceDeviceId);
    this.rebuildRoutingTable(targetDeviceId);

    this.emit('link-added', link);
    this.emit('topology-changed', this.topology);
    return link;
  }

  public removeLink(linkId: string): void {
    const link = this.topology.links[linkId];
    if (!link) return;

    const sourceDev = this.getDevice(link.sourceDeviceId);
    const targetDev = this.getDevice(link.targetDeviceId);

    if (sourceDev && sourceDev.interfaces[link.sourceInterfaceId]) {
      const iface = sourceDev.interfaces[link.sourceInterfaceId];
      delete iface.linkedTo;
      iface.operState = 'down';
      this.rebuildRoutingTable(sourceDev.id);
    }

    if (targetDev && targetDev.interfaces[link.targetInterfaceId]) {
      const iface = targetDev.interfaces[link.targetInterfaceId];
      delete iface.linkedTo;
      iface.operState = 'down';
      this.rebuildRoutingTable(targetDev.id);
    }

    delete this.topology.links[linkId];
    this.emit('link-removed', linkId);
    this.emit('topology-changed', this.topology);
  }

  public updateInterface(
    deviceId: string,
    interfaceId: string,
    patch: Partial<Interface>
  ): Interface | null {
    const device = this.getDevice(deviceId);
    if (!device) return null;

    const iface = device.interfaces[interfaceId];
    if (!iface) return null;

    Object.assign(iface, patch);

    // If admin state changed, update link operState
    if (patch.adminState !== undefined) {
      const link = this.getConnectedLink(deviceId, interfaceId);
      if (link) {
        const neighbor = this.getNeighbor(deviceId, interfaceId);
        if (patch.adminState === 'up' && neighbor?.iface.adminState === 'up') {
          link.operState = 'up';
          iface.operState = 'up';
          neighbor.iface.operState = 'up';
        } else {
          link.operState = 'down';
          iface.operState = 'down';
          if (neighbor) neighbor.iface.operState = 'down';
        }
      } else if (patch.operState === undefined) {
        iface.operState = 'down';
      }
    }

    this.rebuildRoutingTable(deviceId);
    this.emit('interface-updated', { deviceId, interfaceId, iface });
    this.emit('topology-changed', this.topology);
    return iface;
  }

  public setInterfaceAdminState(deviceId: string, interfaceId: string, state: AdminState): void {
    this.updateInterface(deviceId, interfaceId, { adminState: state });
  }

  public addStaticRoute(deviceId: string, route: Omit<StaticRoute, 'id'>): StaticRoute | null {
    const device = this.getDevice(deviceId);
    if (!device) return null;

    const id = generateId('sr');
    const newRoute: StaticRoute = { ...route, id };
    device.staticRoutes.push(newRoute);
    this.rebuildRoutingTable(deviceId);
    this.emit('topology-changed', this.topology);
    return newRoute;
  }

  public removeStaticRoute(deviceId: string, routeId: string): void {
    const device = this.getDevice(deviceId);
    if (!device) return;

    device.staticRoutes = device.staticRoutes.filter((r) => r.id !== routeId);
    this.rebuildRoutingTable(deviceId);
    this.emit('topology-changed', this.topology);
  }

  public updateHostname(deviceId: string, hostname: string): void {
    const device = this.getDevice(deviceId);
    if (!device) return;

    device.hostname = hostname;
    this.emit('topology-changed', this.topology);
  }

  public addVlan(deviceId: string, vlan: Vlan): void {
    const device = this.getDevice(deviceId);
    if (!device) return;

    device.vlans[vlan.id] = vlan;
    this.emit('topology-changed', this.topology);
  }

  public removeVlan(deviceId: string, vlanId: number): void {
    const device = this.getDevice(deviceId);
    if (!device || vlanId === 1) return; // VLAN 1 cannot be deleted

    delete device.vlans[vlanId];

    // Reset any interface using this VLAN back to VLAN 1
    for (const iface of Object.values(device.interfaces)) {
      if (iface.accessVlan === vlanId) {
        iface.accessVlan = 1;
      }
      if (iface.trunkAllowedVlans.includes(vlanId)) {
        iface.trunkAllowedVlans = iface.trunkAllowedVlans.filter((id) => id !== vlanId);
      }
    }

    this.emit('topology-changed', this.topology);
  }

  public rebuildRoutingTable(deviceId: string): void {
    const device = this.getDevice(deviceId);
    if (!device) return;

    device.routingTable = RoutingEngine.rebuildRoutingTable(device);
  }
}
