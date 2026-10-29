import type { LabDefinition } from '@/types/project';
import type { NetworkTopology } from '@/types/network';
import { sameSubnet } from '@/lib/ip';

export interface LabValidationResult {
  completed: boolean;
  progressPercent: number;
  objectiveResults: Array<{ id: string; description: string; passed: boolean; message: string }>;
}

export const LEARNING_LABS: LabDefinition[] = [
  {
    id: 'lab-1-lan',
    title: 'Lab 1: First Local Area Network (LAN)',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    description: 'Construct your very first local area network connecting two PCs through a Layer 2 switch and test bidirectional connectivity.',
    tags: ['Basic Networking', 'Switching', 'IPv4', 'ICMP'],
    instructions: [
      '1. Drag a Switch (Catalyst 2960) and two PCs (PC-1 and PC-2) onto the canvas.',
      '2. Connect PC-1 FastEthernet0/0 to Switch FastEthernet0/1.',
      '3. Connect PC-2 FastEthernet0/0 to Switch FastEthernet0/2.',
      '4. Select PC-1, navigate to Interfaces, and configure IP 192.168.1.10 with prefix /24 (255.255.255.0).',
      '5. Select PC-2, navigate to Interfaces, and configure IP 192.168.1.20 with prefix /24 (255.255.255.0).',
      '6. Open the PC-1 Terminal and run: ping 192.168.1.20.',
      '7. Observe the ARP broadcast and ICMP packet flow on the canvas and event timeline!',
    ],
    hints: [
      'Make sure both PCs have an IP in the 192.168.1.0/24 subnet.',
      'Check that interfaces on both PCs are enabled (no shutdown).',
      'You can verify IP configurations by typing "show ip interface brief" in each terminal.',
    ],
    objectives: [
      {
        id: 'obj-devices',
        description: 'Topology has at least 1 switch and 2 PCs connected',
        completed: false,
        validator: 'check_basic_lan_topology',
      },
      {
        id: 'obj-ips',
        description: 'PC-1 and PC-2 configured with valid IP addresses in the same /24 subnet',
        completed: false,
        validator: 'check_basic_lan_ips',
      },
    ],
  },
  {
    id: 'lab-2-vlans',
    title: 'Lab 2: VLAN Creation and Traffic Isolation',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    description: 'Segment network broadcast domains by creating VLAN 10 (Sales) and VLAN 20 (Engineering) on a Layer 2 switch, demonstrating traffic isolation.',
    tags: ['VLANs', '802.1Q', 'Layer 2 Security'],
    instructions: [
      '1. Connect PC-A and PC-B to a central switch.',
      '2. Create VLAN 10 and VLAN 20 on the switch.',
      '3. Assign PC-A access port to VLAN 10 and PC-B access port to VLAN 20.',
      '4. Try pinging between them; verify that VLAN isolation drops the broadcast and prevents communication.',
    ],
    hints: [
      'Use the Inspector VLANs tab or the CLI "vlan 10" and "vlan 20" commands.',
      'Set switchport mode to access and configure access VLAN.',
    ],
    objectives: [
      {
        id: 'obj-vlan-created',
        description: 'Switch has VLAN 10 and VLAN 20 configured in its database',
        completed: false,
        validator: 'check_vlans_exist',
      },
      {
        id: 'obj-ports-assigned',
        description: 'Access ports are assigned to distinct VLANs',
        completed: false,
        validator: 'check_vlan_ports',
      },
    ],
  },
  {
    id: 'lab-3-routing',
    title: 'Lab 3: Static Routing Across Networks',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    description: 'Interconnect two separate subnets using an Edge Router and configure static routes and default gateways.',
    tags: ['Routing', 'Default Gateway', 'Subnetting', 'CCNA'],
    instructions: [
      '1. Connect PC-1 (192.168.1.10/24) to Router Gi0/0/0 (192.168.1.1/24).',
      '2. Connect PC-2 (192.168.2.20/24) to Router Gi0/0/1 (192.168.2.1/24).',
      '3. Ensure router interfaces are enabled ("no shutdown").',
      '4. Configure Default Gateway 192.168.1.1 on PC-1, and 192.168.2.1 on PC-2.',
      '5. Ping from PC-1 to PC-2 across the router!',
    ],
    hints: [
      'Remember to bring router interfaces up with "no shutdown" or the interface toggle.',
      'Both PCs require their default gateway pointing to their respective router port IP.',
    ],
    objectives: [
      {
        id: 'obj-router-ips',
        description: 'Router interfaces configured with IP addresses and enabled',
        completed: false,
        validator: 'check_router_interfaces',
      },
      {
        id: 'obj-gateways',
        description: 'End hosts configured with matching default gateways',
        completed: false,
        validator: 'check_host_gateways',
      },
    ],
  },
];

export function validateLab(labId: string, topology: NetworkTopology): LabValidationResult {
  const lab = LEARNING_LABS.find((l) => l.id === labId);
  if (!lab) {
    return { completed: false, progressPercent: 0, objectiveResults: [] };
  }

  const results: Array<{ id: string; description: string; passed: boolean; message: string }> = [];

  for (const obj of lab.objectives) {
    let passed = false;
    let message = 'Objective incomplete';

    if (obj.validator === 'check_basic_lan_topology') {
      const switches = Object.values(topology.devices).filter((d) => d.type === 'switch');
      const pcs = Object.values(topology.devices).filter((d) => d.type === 'pc' || d.type === 'laptop');
      const links = Object.values(topology.links);

      if (switches.length >= 1 && pcs.length >= 2 && links.length >= 2) {
        passed = true;
        message = 'Switch and PCs connected successfully.';
      } else {
        message = `Found ${switches.length} switches, ${pcs.length} PCs, and ${links.length} links. Need 1 switch, 2 PCs, 2 links.`;
      }
    } else if (obj.validator === 'check_basic_lan_ips') {
      const pcsWithIp = Object.values(topology.devices).filter(
        (d) =>
          (d.type === 'pc' || d.type === 'laptop') &&
          Object.values(d.interfaces).some((i) => i.ipv4?.address)
      );

      if (pcsWithIp.length >= 2) {
        const ip1 = Object.values(pcsWithIp[0].interfaces).find((i) => i.ipv4)?.ipv4;
        const ip2 = Object.values(pcsWithIp[1].interfaces).find((i) => i.ipv4)?.ipv4;
        if (ip1 && ip2 && sameSubnet(ip1.address, ip2.address, ip1.prefixLength)) {
          passed = true;
          message = `Both PCs configured in subnet with IP addresses ${ip1.address} and ${ip2.address}.`;
        } else {
          message = 'PCs are not configured in the same subnet.';
        }
      } else {
        message = 'Both PCs must have configured IP addresses.';
      }
    } else if (obj.validator === 'check_vlans_exist') {
      const switchesWithVlans = Object.values(topology.devices).filter(
        (d) => (d.type === 'switch' || d.type === 'switch-l3') && (d.vlans[10] || d.vlans[20])
      );
      if (switchesWithVlans.length > 0) {
        passed = true;
        message = 'VLANs 10 and 20 successfully detected on switch.';
      } else {
        message = 'No switch found with VLAN 10 and VLAN 20 configured.';
      }
    } else if (obj.validator === 'check_vlan_ports') {
      const switchDev = Object.values(topology.devices).find(
        (d) => d.type === 'switch' || d.type === 'switch-l3'
      );
      if (switchDev) {
        const hasVlan10 = Object.values(switchDev.interfaces).some((i) => i.accessVlan === 10);
        const hasVlan20 = Object.values(switchDev.interfaces).some((i) => i.accessVlan === 20);
        if (hasVlan10 && hasVlan20) {
          passed = true;
          message = 'Ports assigned to separate VLANs.';
        } else {
          message = 'Assign at least one port to VLAN 10 and one port to VLAN 20.';
        }
      }
    } else if (obj.validator === 'check_router_interfaces') {
      const routers = Object.values(topology.devices).filter((d) => d.type === 'router');
      const activeIfs = routers.flatMap((r) =>
        Object.values(r.interfaces).filter((i) => i.ipv4?.address && i.adminState === 'up')
      );
      if (activeIfs.length >= 2) {
        passed = true;
        message = `Router has ${activeIfs.length} active configured IP interfaces.`;
      } else {
        message = 'Router must have at least 2 interfaces configured with IP addresses and set to "no shutdown".';
      }
    } else if (obj.validator === 'check_host_gateways') {
      const hosts = Object.values(topology.devices).filter((d) => ['pc', 'laptop', 'server'].includes(d.type));
      const hostsWithGw = hosts.filter((h) => Object.values(h.interfaces).some((i) => i.ipv4?.gateway));
      if (hostsWithGw.length >= 2) {
        passed = true;
        message = 'Hosts configured with default gateways.';
      } else {
        message = 'Configure default gateways on end devices.';
      }
    }

    results.push({
      id: obj.id,
      description: obj.description,
      passed,
      message,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const progressPercent = Math.round((passedCount / results.length) * 100);

  return {
    completed: passedCount === results.length && results.length > 0,
    progressPercent,
    objectiveResults: results,
  };
}

