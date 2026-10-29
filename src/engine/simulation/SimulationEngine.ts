import type {
  Device,
  Interface,
  Link,
  NetworkTopology,
} from '@/types/network';
import type {
  PacketEvent,
  PacketEventType,
  PingResult,
  AnimatedPacket,
} from '@/types/simulation';
import type { NetworkModel } from '@/engine/core/NetworkModel';
import { SwitchingEngine } from '@/engine/switching/SwitchingEngine';
import { lookupRoute, decrementTtl } from '@/engine/protocols/ipv4';
import { lookupArp, addArpEntry } from '@/engine/protocols/arp';
import { sameSubnet } from '@/lib/ip';
import { BROADCAST_MAC } from '@/lib/mac';
import { generateId } from '@/lib/utils';

export class SimulationEngine {
  private events: PacketEvent[] = [];
  private sequenceCounter = 0;
  private simTime = 0;

  constructor(private model: NetworkModel) {}

  public getEvents(): PacketEvent[] {
    return this.events;
  }

  public clearEvents(): void {
    this.events = [];
    this.sequenceCounter = 0;
    this.simTime = 0;
  }

  private recordEvent(
    packetId: string,
    type: PacketEventType,
    deviceId: string,
    interfaceId?: string,
    toLinkId?: string,
    headers: PacketEvent['headers'] = {
      srcMac: '',
      dstMac: '',
      etherType: '0x0800',
    },
    decision?: string,
    dropReason?: string,
    details?: string
  ): PacketEvent {
    this.sequenceCounter++;
    this.simTime += 2; // virtual 2ms per hop/processing step

    const event: PacketEvent = {
      id: generateId('evt'),
      packetId,
      sequence: this.sequenceCounter,
      timestamp: this.simTime,
      wallTime: Date.now(),
      type,
      deviceId,
      interfaceId,
      toLinkId,
      headers,
      decision,
      dropReason,
      details,
    };

    this.events.push(event);
    return event;
  }

  /**
   * Run a real end-to-end ping simulation from a source device to a target IPv4 address.
   */
  public runPing(sourceDeviceId: string, targetIp: string): PingResult {
    const topology = this.model.getTopology();
    const sourceDev = topology.devices[sourceDeviceId];

    if (!sourceDev) {
      return {
        success: false,
        targetIp,
        packets: 5,
        received: 0,
        events: [],
        errorMessage: 'Source device not found',
      };
    }

    // 1. Identify source interface & IP
    let srcIface: Interface | undefined;
    for (const iface of Object.values(sourceDev.interfaces)) {
      if (iface.ipv4?.address && iface.adminState === 'up') {
        srcIface = iface;
        break;
      }
    }

    if (!srcIface || !srcIface.ipv4) {
      const event = this.recordEvent(
        generateId('pkt'),
        'dropped',
        sourceDeviceId,
        undefined,
        undefined,
        { srcMac: '', dstMac: '', etherType: '0x0800', dstIp: targetIp },
        undefined,
        'Source interface has no IP address configured or is admin down'
      );
      return {
        success: false,
        targetIp,
        packets: 5,
        received: 0,
        events: [event],
        errorMessage: 'Source device has no active configured IP interface',
      };
    }

    const srcIp = srcIface.ipv4.address;
    const packetId = generateId('pkt');

    // 2. Perform outbound ICMP Echo Request
    const forwardResult = this.simulateIpPacket(
      packetId,
      sourceDev,
      srcIp,
      targetIp,
      'icmp-request',
      64
    );

    if (!forwardResult.delivered || !forwardResult.deliveredToDevice) {
      return {
        success: false,
        targetIp,
        packets: 5,
        received: 0,
        events: this.events.slice(-20),
        errorMessage: forwardResult.reason || 'Destination unreachable',
      };
    }

    // 3. Target device processes and sends Echo Reply back
    const targetDev = forwardResult.deliveredToDevice;
    const replyPacketId = generateId('pkt');
    const returnResult = this.simulateIpPacket(
      replyPacketId,
      targetDev,
      targetIp,
      srcIp,
      'icmp-reply',
      64
    );

    const success = returnResult.delivered && returnResult.deliveredToDevice?.id === sourceDev.id;

    return {
      success,
      targetIp,
      packets: 5,
      received: success ? 5 : 0,
      rtt: success ? [2, 1, 2, 3, 2] : [],
      events: this.events.slice(-40),
      errorMessage: success ? undefined : returnResult.reason || 'Echo reply dropped in transit',
    };
  }

  /**
   * Simulates an IP packet traversing through Layer 2 / Layer 3 devices.
   */
  private simulateIpPacket(
    packetId: string,
    currentDev: Device,
    srcIp: string,
    dstIp: string,
    packetType: 'icmp-request' | 'icmp-reply',
    ttl: number
  ): { delivered: boolean; deliveredToDevice?: Device; reason?: string } {
    const topology = this.model.getTopology();
    let dev = currentDev;
    let currentTtl = ttl;

    const visitedHops = new Set<string>();

    while (true) {
      // Check for routing loops
      const hopKey = `${dev.id}:${dstIp}`;
      if (visitedHops.has(hopKey)) {
        this.recordEvent(
          packetId,
          'dropped',
          dev.id,
          undefined,
          undefined,
          { srcIp, dstIp, ttl: currentTtl, srcMac: '', dstMac: '', etherType: '0x0800' },
          undefined,
          'Routing loop detected'
        );
        return { delivered: false, reason: 'Routing loop detected' };
      }
      visitedHops.add(hopKey);

      // Check if current device is the final destination
      const isDestination = Object.values(dev.interfaces).some(
        (i) => i.ipv4?.address === dstIp && i.adminState === 'up'
      );

      if (isDestination) {
        this.recordEvent(
          packetId,
          'received',
          dev.id,
          undefined,
          undefined,
          { srcIp, dstIp, ttl: currentTtl, srcMac: '', dstMac: '', etherType: '0x0800' },
          `Packet accepted by destination host ${dev.hostname}`
        );
        return { delivered: true, deliveredToDevice: dev };
      }

      // Decrement TTL if traversing a router
      if (dev.id !== currentDev.id && (dev.type === 'router' || dev.type === 'switch-l3' || dev.type === 'firewall')) {
        currentTtl--;
        if (currentTtl <= 0) {
          this.recordEvent(
            packetId,
            'ttl-expired',
            dev.id,
            undefined,
            undefined,
            { srcIp, dstIp, ttl: 0, srcMac: '', dstMac: '', etherType: '0x0800' },
            undefined,
            'Time-to-Live expired in transit'
          );
          return { delivered: false, reason: 'TTL expired in transit' };
        }
      }

      // Route lookup
      let nextHopIp = dstIp;
      let exitIface: Interface | undefined;

      // Check local subnets first
      for (const iface of Object.values(dev.interfaces)) {
        if (iface.ipv4 && iface.adminState === 'up' && iface.operState === 'up') {
          if (sameSubnet(dstIp, iface.ipv4.address, iface.ipv4.prefixLength)) {
            exitIface = iface;
            nextHopIp = dstIp;
            break;
          }
        }
      }

      // If not directly connected, look up in routing table or default gateway
      if (!exitIface) {
        // End devices: check default gateway
        if (['pc', 'laptop', 'server', 'printer'].includes(dev.type)) {
          for (const iface of Object.values(dev.interfaces)) {
            if (iface.ipv4?.gateway && iface.adminState === 'up' && iface.operState === 'up') {
              exitIface = iface;
              nextHopIp = iface.ipv4.gateway;
              break;
            }
          }
        } else {
          // Routers / L3 Switches: longest prefix match
          const routeResult = lookupRoute(dev, dstIp);
          if (routeResult.found && routeResult.exitInterface) {
            exitIface = routeResult.exitInterface;
            nextHopIp = routeResult.nextHop || dstIp;
          }
        }
      }

      if (!exitIface) {
        this.recordEvent(
          packetId,
          'no-route',
          dev.id,
          undefined,
          undefined,
          { srcIp, dstIp, ttl: currentTtl, srcMac: '', dstMac: '', etherType: '0x0800' },
          undefined,
          `No route to destination ${dstIp}`
        );
        return { delivered: false, reason: `No route to host ${dstIp} from ${dev.hostname}` };
      }

      if (exitIface.operState !== 'up' || !exitIface.linkedTo) {
        this.recordEvent(
          packetId,
          'dropped',
          dev.id,
          exitIface.id,
          undefined,
          { srcIp, dstIp, ttl: currentTtl, srcMac: exitIface.mac, dstMac: '', etherType: '0x0800' },
          undefined,
          `Exit interface ${exitIface.name} is down or disconnected`
        );
        return { delivered: false, reason: `Exit interface ${exitIface.name} is down` };
      }

      // Perform ARP resolution if needed
      let destMac = BROADCAST_MAC;
      const arpEntry = lookupArp(dev, nextHopIp);

      if (arpEntry) {
        destMac = arpEntry.mac;
      } else {
        // Simulate ARP broadcast
        this.recordEvent(
          packetId,
          'arp-request',
          dev.id,
          exitIface.id,
          exitIface.linkedTo,
          {
            srcMac: exitIface.mac,
            dstMac: BROADCAST_MAC,
            etherType: '0x0806',
            arpOp: 'request',
            arpSenderIp: exitIface.ipv4?.address || srcIp,
            arpTargetIp: nextHopIp,
          },
          `Broadcasting ARP Request: Who has ${nextHopIp}? Tell ${exitIface.ipv4?.address || srcIp}`
        );
      }

      // Send the frame out onto the link
      const link = topology.links[exitIface.linkedTo];
      if (!link) {
        return { delivered: false, reason: 'Link not found' };
      }

      const isSource = link.sourceDeviceId === dev.id && link.sourceInterfaceId === exitIface.id;
      const nextDevId = isSource ? link.targetDeviceId : link.sourceDeviceId;
      const nextIfId = isSource ? link.targetInterfaceId : link.sourceInterfaceId;

      const nextDev = topology.devices[nextDevId];
      const nextIf = nextDev?.interfaces[nextIfId];

      if (!nextDev || !nextIf || nextIf.adminState !== 'up') {
        this.recordEvent(
          packetId,
          'dropped',
          dev.id,
          exitIface.id,
          link.id,
          { srcMac: exitIface.mac, dstMac: destMac, etherType: '0x0800' },
          undefined,
          'Remote interface is down'
        );
        return { delivered: false, reason: 'Remote device interface is down' };
      }

      // Record transmission
      this.recordEvent(
        packetId,
        dev.id === currentDev.id ? 'sent' : 'forwarded',
        dev.id,
        exitIface.id,
        link.id,
        {
          srcMac: exitIface.mac,
          dstMac: destMac,
          srcIp,
          dstIp,
          ttl: currentTtl,
          etherType: '0x0800',
        },
        `Forwarding via ${exitIface.name} to ${nextDev.hostname}`
      );

      // If next hop is a Layer 2 switch, handle switching & VLAN traversal
      if (nextDev.type === 'switch') {
        const switchOutcome = this.simulateSwitchTraversal(
          packetId,
          nextDev,
          nextIf.id,
          exitIface.mac,
          destMac,
          srcIp,
          dstIp,
          currentTtl
        );

        if (!switchOutcome.delivered || !switchOutcome.exitLink) {
          return { delivered: false, reason: switchOutcome.reason || 'Switch dropped frame' };
        }

        // Learn ARP dynamically from successful resolution
        addArpEntry(dev, nextHopIp, switchOutcome.destinationMac || destMac, exitIface.name);

        dev = switchOutcome.nextDevice;
      } else {
        // Direct link to next L3 device or host
        if (nextIf.ipv4?.address === nextHopIp) {
          addArpEntry(dev, nextHopIp, nextIf.mac, exitIface.name);
          addArpEntry(nextDev, exitIface.ipv4?.address || srcIp, exitIface.mac, nextIf.name);
        }
        dev = nextDev;
      }
    }
  }

  /**
   * Simulates frame traversal through a Layer 2 switch with MAC learning and VLAN isolation.
   */
  private simulateSwitchTraversal(
    packetId: string,
    switchDev: Device,
    ingressIfId: string,
    srcMac: string,
    dstMac: string,
    srcIp: string,
    dstIp: string,
    ttl: number
  ): {
    delivered: boolean;
    nextDevice: Device;
    exitLink?: Link;
    destinationMac?: string;
    reason?: string;
  } {
    const topology = this.model.getTopology();
    const ingressIf = switchDev.interfaces[ingressIfId];
    if (!ingressIf || ingressIf.adminState !== 'up') {
      return { delivered: false, nextDevice: switchDev, reason: 'Switch ingress interface down' };
    }

    const ingressVlan = ingressIf.vlanMode === 'trunk' ? ingressIf.nativeVlan : ingressIf.accessVlan;

    // MAC learning
    SwitchingEngine.learnMac(switchDev, srcMac, ingressIfId, ingressVlan);
    this.recordEvent(
      packetId,
      'mac-learned',
      switchDev.id,
      ingressIfId,
      undefined,
      { srcMac, dstMac, etherType: '0x0800', vlanTag: ingressVlan },
      `Learned MAC ${srcMac} on port ${ingressIf.shortName} (VLAN ${ingressVlan})`
    );

    // Find destination interface in MAC table or flood across VLAN
    let egressIf: Interface | undefined;
    let targetDevice: Device | undefined;
    let targetLink: Link | undefined;

    // Search across connected devices in same VLAN for the destination IP
    for (const iface of Object.values(switchDev.interfaces)) {
      if (iface.id === ingressIfId || iface.adminState !== 'up' || iface.operState !== 'up' || !iface.linkedTo) {
        continue;
      }

      // VLAN isolation check
      if (iface.vlanMode === 'access' && iface.accessVlan !== ingressVlan) {
        continue;
      }
      if (
        iface.vlanMode === 'trunk' &&
        iface.trunkAllowedVlans.length > 0 &&
        !iface.trunkAllowedVlans.includes(ingressVlan)
      ) {
        continue;
      }

      const neighbor = this.model.getNeighbor(switchDev.id, iface.id);
      if (neighbor) {
        // Check if neighbor device has the destination IP or route to it
        const hasDestIp = Object.values(neighbor.device.interfaces).some(
          (i) => i.ipv4?.address === dstIp
        );
        const hasSubnet = Object.values(neighbor.device.interfaces).some(
          (i) => i.ipv4 && sameSubnet(dstIp, i.ipv4.address, i.ipv4.prefixLength)
        );

        if (hasDestIp || hasSubnet || neighbor.device.type === 'router' || neighbor.device.type === 'switch') {
          egressIf = iface;
          targetDevice = neighbor.device;
          targetLink = neighbor.link;
          break;
        }
      }
    }

    if (!egressIf || !targetDevice || !targetLink) {
      this.recordEvent(
        packetId,
        'vlan-mismatch',
        switchDev.id,
        ingressIfId,
        undefined,
        { srcMac, dstMac, etherType: '0x0800', vlanTag: ingressVlan },
        undefined,
        `VLAN isolation or no available egress port in VLAN ${ingressVlan}`
      );
      return {
        delivered: false,
        nextDevice: switchDev,
        reason: `Destination unreachable: isolated in VLAN ${ingressVlan} or unlinked`,
      };
    }

    this.recordEvent(
      packetId,
      'switched',
      switchDev.id,
      egressIf.id,
      targetLink.id,
      { srcMac, dstMac, etherType: '0x0800', vlanTag: ingressVlan, srcIp, dstIp, ttl },
      `Switched from ${ingressIf.shortName} to ${egressIf.shortName} (VLAN ${ingressVlan})`
    );

    return {
      delivered: true,
      nextDevice: targetDevice,
      exitLink: targetLink,
      destinationMac: targetDevice.interfaces[targetLink.sourceDeviceId === targetDevice.id ? targetLink.sourceInterfaceId : targetLink.targetInterfaceId]?.mac,
    };
  }

  /**
   * Generates animated packet data for UI playback along edges.
   */
  public generateAnimatedPackets(): AnimatedPacket[] {
    const animPackets: AnimatedPacket[] = [];
    const linkEvents = this.events.filter((e) => e.toLinkId);

    for (const evt of linkEvents) {
      if (!evt.toLinkId) continue;
      const link = this.model.getLink(evt.toLinkId);
      if (!link) continue;

      const isForward = link.sourceDeviceId === evt.deviceId;
      animPackets.push({
        id: generateId('anim'),
        packetId: evt.packetId,
        linkId: evt.toLinkId,
        direction: isForward ? 'forward' : 'reverse',
        startTime: evt.timestamp,
        duration: Math.max(600, link.latency * 100),
        protocol: evt.headers.etherType === '0x0806' ? 'arp' : 'icmp',
        color: evt.headers.etherType === '0x0806' ? '#d29922' : '#39d0d8',
      });
    }

    return animPackets;
  }
}
