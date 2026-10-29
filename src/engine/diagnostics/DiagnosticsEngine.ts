import type { NetworkTopology } from '@/types/network';
import { sameSubnet, isValidIp, getNetworkAddress } from '@/lib/ip';
import { generateId } from '@/lib/utils';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticFinding {
  id: string;
  severity: DiagnosticSeverity;
  deviceId: string;
  interfaceId?: string;
  title: string;
  description: string;
  evidence: string;
  suggestion: string;
  category: 'ip' | 'vlan' | 'routing' | 'link' | 'service' | 'configuration';
}

export class DiagnosticsEngine {
  static analyze(topology: NetworkTopology): DiagnosticFinding[] {
    const findings: DiagnosticFinding[] = [];

    // 1. Check for duplicate IPs across the entire topology
    const ipRegistry = new Map<string, { deviceId: string; ifId: string; hostname: string; ifName: string }>();

    for (const [devId, dev] of Object.entries(topology.devices)) {
      for (const [ifId, iface] of Object.entries(dev.interfaces)) {
        if (iface.ipv4?.address) {
          const ip = iface.ipv4.address;
          const existing = ipRegistry.get(ip);
          if (existing) {
            findings.push({
              id: generateId('diag'),
              severity: 'error',
              deviceId: devId,
              interfaceId: ifId,
              title: 'Duplicate IP Address Detected',
              description: `IP address ${ip} is configured on multiple devices simultaneously, causing address collisions and ARP poisoning.`,
              evidence: `${dev.hostname} (${iface.name}) conflicts with ${existing.hostname} (${existing.ifName})`,
              suggestion: `Assign a unique host IP address to ${iface.name} on ${dev.hostname}.`,
              category: 'ip',
            });
          } else {
            ipRegistry.set(ip, {
              deviceId: devId,
              ifId,
              hostname: dev.hostname,
              ifName: iface.name,
            });
          }
        }
      }
    }

    // 2. Check individual devices for IP, gateway, and routing configuration
    for (const [devId, device] of Object.entries(topology.devices)) {
      // Missing default gateway on end hosts
      if (['pc', 'laptop', 'server', 'printer'].includes(device.type)) {
        for (const [ifId, iface] of Object.entries(device.interfaces)) {
          if (iface.ipv4?.address && !iface.ipv4.gateway) {
            findings.push({
              id: generateId('diag'),
              severity: 'warning',
              deviceId: devId,
              interfaceId: ifId,
              title: 'Missing Default Gateway',
              description: `${device.hostname} has an IPv4 address configured on ${iface.name} but lacks a default gateway, preventing traffic to other subnets.`,
              evidence: `IP: ${iface.ipv4.address}/${iface.ipv4.prefixLength}, Gateway: (None)`,
              suggestion: 'Configure a default gateway pointing to the router interface on this subnet.',
              category: 'routing',
            });
          } else if (iface.ipv4?.address && iface.ipv4.gateway) {
            // Verify default gateway is in the same subnet
            if (!sameSubnet(iface.ipv4.address, iface.ipv4.gateway, iface.ipv4.prefixLength)) {
              findings.push({
                id: generateId('diag'),
                severity: 'error',
                deviceId: devId,
                interfaceId: ifId,
                title: 'Gateway Subnet Mismatch',
                description: `Default gateway ${iface.ipv4.gateway} is not within the local subnet of interface ${iface.name}.`,
                evidence: `IP: ${iface.ipv4.address}/${iface.ipv4.prefixLength}, Gateway: ${iface.ipv4.gateway}`,
                suggestion: `Change gateway to an IP address in subnet ${getNetworkAddress(iface.ipv4.address, iface.ipv4.prefixLength)}/${iface.ipv4.prefixLength}.`,
                category: 'routing',
              });
            }
          }
        }
      }

      // 3. Admin up interface with operational down
      for (const [ifId, iface] of Object.entries(device.interfaces)) {
        if (iface.adminState === 'up' && iface.operState === 'down' && iface.ipv4?.address) {
          findings.push({
            id: generateId('diag'),
            severity: 'warning',
            deviceId: devId,
            interfaceId: ifId,
            title: 'Configured Interface is Down',
            description: `Interface ${iface.name} on ${device.hostname} has IP ${iface.ipv4.address} configured, but the physical link is down.`,
            evidence: `Status: Admin Up / Oper Down`,
            suggestion: 'Connect this interface with an Ethernet link to another active device.',
            category: 'link',
          });
        }
      }

      // 4. Validate static routes
      for (const sr of device.staticRoutes) {
        if (!isValidIp(sr.nextHop)) {
          findings.push({
            id: generateId('diag'),
            severity: 'error',
            deviceId: devId,
            title: 'Invalid Static Route Next-Hop',
            description: `Static route destination ${sr.network}/${sr.prefixLength} specifies an invalid next-hop address.`,
            evidence: `Next-hop: ${sr.nextHop}`,
            suggestion: 'Enter a valid dotted-decimal IPv4 address for next-hop.',
            category: 'routing',
          });
        }
      }

      // 5. DHCP service validation
      if (device.services.dhcpEnabled) {
        for (const pool of device.services.dhcpPools) {
          const leasedCount = device.services.dhcpLeases.filter((l) => l.poolId === pool.id).length;
          const totalUsable = Math.max(1, Math.pow(2, 32 - pool.prefixLength) - 2 - pool.excludedAddresses.length);
          if (leasedCount >= totalUsable) {
            findings.push({
              id: generateId('diag'),
              severity: 'error',
              deviceId: devId,
              title: 'DHCP Pool Exhausted',
              description: `DHCP pool "${pool.name}" on ${device.hostname} has no remaining free addresses to lease.`,
              evidence: `Leased: ${leasedCount}/${totalUsable} addresses`,
              suggestion: 'Increase pool network size or remove unnecessary exclusions.',
              category: 'service',
            });
          }
        }
      }
    }

    // 6. Link inspection (Access/Trunk mismatch, VLAN consistency)
    for (const link of Object.values(topology.links)) {
      const srcDev = topology.devices[link.sourceDeviceId];
      const tgtDev = topology.devices[link.targetDeviceId];
      if (!srcDev || !tgtDev) continue;

      const srcIf = srcDev.interfaces[link.sourceInterfaceId];
      const tgtIf = tgtDev.interfaces[link.targetInterfaceId];
      if (!srcIf || !tgtIf) continue;

      // Access vs Trunk mismatch
      if (
        (srcIf.vlanMode === 'trunk' && tgtIf.vlanMode === 'access') ||
        (srcIf.vlanMode === 'access' && tgtIf.vlanMode === 'trunk')
      ) {
        findings.push({
          id: generateId('diag'),
          severity: 'error',
          deviceId: link.sourceDeviceId,
          interfaceId: link.sourceInterfaceId,
          title: 'VLAN Trunk/Access Mode Mismatch',
          description: `Link connecting ${srcDev.hostname} (${srcIf.name}) and ${tgtDev.hostname} (${tgtIf.name}) has conflicting switchport modes.`,
          evidence: `${srcDev.hostname}:${srcIf.name} is ${srcIf.vlanMode}, but ${tgtDev.hostname}:${tgtIf.name} is ${tgtIf.vlanMode}`,
          suggestion: 'Set both interface modes to trunk for switch-to-switch interlinks, or both to access.',
          category: 'vlan',
        });
      }

      // Access ports with different VLAN IDs on switch-to-switch link
      if (
        (srcDev.type === 'switch' || srcDev.type === 'switch-l3') &&
        (tgtDev.type === 'switch' || tgtDev.type === 'switch-l3') &&
        srcIf.vlanMode === 'access' &&
        tgtIf.vlanMode === 'access' &&
        srcIf.accessVlan !== tgtIf.accessVlan
      ) {
        findings.push({
          id: generateId('diag'),
          severity: 'warning',
          deviceId: link.sourceDeviceId,
          interfaceId: link.sourceInterfaceId,
          title: 'Cross-VLAN Access Link Connection',
          description: `Switch-to-switch link is joining VLAN ${srcIf.accessVlan} on ${srcDev.hostname} with VLAN ${tgtIf.accessVlan} on ${tgtDev.hostname}.`,
          evidence: `VLAN ${srcIf.accessVlan} <---> VLAN ${tgtIf.accessVlan}`,
          suggestion: 'Ensure access ports belong to the same VLAN, or configure both as 802.1Q trunk ports.',
          category: 'vlan',
        });
      }

      // Direct routed subnet mismatch
      if (srcIf.ipv4?.address && tgtIf.ipv4?.address) {
        if (!sameSubnet(srcIf.ipv4.address, tgtIf.ipv4.address, srcIf.ipv4.prefixLength)) {
          findings.push({
            id: generateId('diag'),
            severity: 'error',
            deviceId: link.sourceDeviceId,
            interfaceId: link.sourceInterfaceId,
            title: 'Point-to-Point Subnet Mismatch',
            description: `Directly connected interfaces ${srcIf.name} and ${tgtIf.name} have IP addresses in different subnets.`,
            evidence: `${srcDev.hostname}:${srcIf.ipv4.address}/${srcIf.ipv4.prefixLength} <---> ${tgtDev.hostname}:${tgtIf.ipv4.address}/${tgtIf.ipv4.prefixLength}`,
            suggestion: 'Configure both interfaces with IP addresses in the same subnet.',
            category: 'ip',
          });
        }
      }
    }

    return findings;
  }
}

