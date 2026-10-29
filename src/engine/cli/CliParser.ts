import type { Device, Interface } from '@/types/network';
import type { NetworkModel } from '@/engine/core/NetworkModel';
import { RoutingEngine } from '@/engine/routing/RoutingEngine';
import { maskToPrefix, prefixToMask, isValidIp } from '@/lib/ip';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';
import { SpanningTreeEngine } from '@/engine/switching/SpanningTreeEngine';
import { OspfEngine } from '@/engine/routing/OspfEngine';
import { AclAndNatEngine } from '@/engine/security/AclAndNatEngine';

export interface CliExecutionResult {
  output: string;
  success: boolean;
  configChanged: boolean;
}

export type CliMode = 'exec' | 'priv-exec' | 'config' | 'config-if' | 'config-vlan' | 'config-dhcp';

export class CliParser {
  private mode: CliMode = 'exec';
  private currentInterfaceId: string | null = null;
  private currentVlanId: number | null = null;
  private currentDhcpPoolId: string | null = null;

  constructor(
    private deviceId: string,
    private model: NetworkModel,
    private simulationEngine?: SimulationEngine
  ) {}

  public setSimulationEngine(engine: SimulationEngine): void {
    this.simulationEngine = engine;
  }

  public getSimulationEngine(): SimulationEngine | undefined {
    return this.simulationEngine;
  }

  public getDevice(): Device | undefined {
    return this.model.getDevice(this.deviceId);
  }

  public getMode(): CliMode {
    return this.mode;
  }

  public getPrompt(): string {
    const dev = this.getDevice();
    const hostname = dev ? dev.hostname : 'Device';
    const vendor = dev?.vendor || 'cisco';

    // Juniper Junos Authentic Prompts
    if (vendor === 'juniper') {
      switch (this.mode) {
        case 'exec':
          return `root@${hostname}> `;
        case 'priv-exec':
        case 'config':
          return `[edit]\nroot@${hostname}# `;
        case 'config-if': {
          const iface = this.currentInterfaceId && dev ? dev.interfaces[this.currentInterfaceId] : null;
          return `[edit interfaces ${iface?.shortName || ''}]\nroot@${hostname}# `;
        }
        case 'config-vlan':
          return `[edit vlans]\nroot@${hostname}# `;
        case 'config-dhcp':
          return `[edit system services dhcp-local-server]\nroot@${hostname}# `;
        default:
          return `root@${hostname}> `;
      }
    }

    // MikroTik RouterOS Authentic Prompts
    if (vendor === 'mikrotik') {
      switch (this.mode) {
        case 'config-if':
          return `[admin@${hostname}] /interface> `;
        case 'config-vlan':
          return `[admin@${hostname}] /interface vlan> `;
        case 'config-dhcp':
          return `[admin@${hostname}] /ip dhcp-server> `;
        default:
          return `[admin@${hostname}] > `;
      }
    }

    // Fortinet FortiOS Authentic Prompts
    if (vendor === 'fortinet') {
      switch (this.mode) {
        case 'config-if':
          return `${hostname} (interface) # `;
        case 'config-vlan':
          return `${hostname} (vlan) # `;
        case 'config-dhcp':
          return `${hostname} (dhcp) # `;
        default:
          return `${hostname} # `;
      }
    }

    // Linux Shell Authentic Prompts
    if (vendor === 'linux') {
      return `root@${hostname}:~# `;
    }

    // Cisco / Arista / Standard Prompt
    switch (this.mode) {
      case 'exec':
        return `${hostname}> `;
      case 'priv-exec':
        return `${hostname}# `;
      case 'config':
        return `${hostname}(config)# `;
      case 'config-if': {
        const iface = this.currentInterfaceId && dev ? dev.interfaces[this.currentInterfaceId] : null;
        return `${hostname}(config-if)# `;
      }
      case 'config-vlan':
        return `${hostname}(config-vlan)# `;
      case 'config-dhcp':
        return `${hostname}(dhcp-config)# `;
      default:
        return `${hostname}> `;
    }
  }

  public execute(inputRaw: string): CliExecutionResult {
    const input = inputRaw.trim();
    if (!input) {
      return { output: '', success: true, configChanged: false };
    }

    const dev = this.getDevice();
    if (!dev) {
      return { output: '% Device not found', success: false, configChanged: false };
    }

    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // Support "do <command>" from config modes (Cisco IOS feature)
    if (cmd === 'do' && (this.mode !== 'exec' && this.mode !== 'priv-exec')) {
      const savedMode = this.mode;
      this.mode = 'priv-exec';
      const doRes = this.execute(tokens.slice(1).join(' '));
      this.mode = savedMode;
      return doRes;
    }

    // Help command "?" or "help"
    if (cmd === '?' || cmd === 'help') {
      return {
        output: this.getHelpText(),
        success: true,
        configChanged: false,
      };
    }

    // Navigation: enable / en
    if (cmd === 'enable' || cmd === 'en') {
      this.mode = 'priv-exec';
      return { output: '', success: true, configChanged: false };
    }

    // disable
    if (cmd === 'disable' || cmd === 'dis') {
      this.mode = 'exec';
      return { output: '', success: true, configChanged: false };
    }

    // exit / end
    if (cmd === 'exit') {
      if (this.mode === 'config-if' || this.mode === 'config-vlan' || this.mode === 'config-dhcp') {
        this.mode = 'config';
        this.currentInterfaceId = null;
        this.currentVlanId = null;
        this.currentDhcpPoolId = null;
      } else if (this.mode === 'config') {
        this.mode = 'priv-exec';
      } else if (this.mode === 'priv-exec') {
        this.mode = 'exec';
      }
      return { output: '', success: true, configChanged: false };
    }

    if (cmd === 'end') {
      if (this.mode !== 'exec') {
        this.mode = 'priv-exec';
        this.currentInterfaceId = null;
        this.currentVlanId = null;
        this.currentDhcpPoolId = null;
      }
      return { output: '', success: true, configChanged: false };
    }

    // Write / Copy running-config startup-config / wr
    if (cmd === 'wr' || cmd === 'write' || (cmd === 'copy' && tokens[1]?.toLowerCase() === 'run' && tokens[2]?.toLowerCase() === 'start')) {
      return {
        output: 'Building configuration...\n[OK]\nConfiguration saved to NVRAM.',
        success: true,
        configChanged: false,
      };
    }

    // Reload
    if (cmd === 'reload') {
      return {
        output: 'Proceed with reload? [confirm]\n% System reloaded successfully.',
        success: true,
        configChanged: false,
      };
    }

    // Ping command
    if (cmd === 'ping') {
      const targetIp = tokens[1];
      if (!targetIp) {
        return { output: '% Usage: ping <ip-address>', success: false, configChanged: false };
      }
      return this.handlePing(targetIp);
    }

    // Traceroute command
    if (cmd === 'traceroute' || cmd === 'tracert') {
      const targetIp = tokens[1];
      if (!targetIp) {
        return { output: '% Usage: traceroute <ip-address>', success: false, configChanged: false };
      }
      return this.handleTraceroute(targetIp);
    }

    // Show commands in privileged or user mode
    if (cmd === 'show' || cmd === 'sh') {
      return this.handleShowCommands(tokens.slice(1), dev);
    }

    // Configuration command: conf t / configure terminal / config t
    if (
      (cmd === 'configure' || cmd === 'conf' || cmd === 'con' || cmd === 'config') &&
      (tokens[1]?.toLowerCase() === 'terminal' || tokens[1]?.toLowerCase() === 't' || !tokens[1])
    ) {
      this.mode = 'config';
      return {
        output: 'Enter configuration commands, one per line. End with CNTL/Z or "end".',
        success: true,
        configChanged: false,
      };
    }

    // --- Multi-Vendor Command Handlers ---

    // 1. Juniper Junos Specific Commands
    if (cmd === 'commit') {
      return { output: 'commit complete', success: true, configChanged: false };
    }

    if (
      input.toLowerCase() === 'show interfaces terse' ||
      (cmd === 'show' && tokens[1]?.toLowerCase() === 'interfaces' && tokens[2]?.toLowerCase() === 'terse')
    ) {
      const header = 'Interface               Admin Link Proto    Local                 Remote\n';
      const lines = Object.values(dev.interfaces).map((iface) => {
        const ip = iface.ipv4?.address ? `${iface.ipv4.address}/${iface.ipv4.prefixLength || 24}` : '';
        return `${iface.name.padEnd(23)} ${iface.adminState.padEnd(5)} ${iface.operState.padEnd(4)} inet     ${ip}`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    if (input.toLowerCase() === 'show route' || input.toLowerCase() === 'show route brief') {
      const routes = dev.routingTable;
      const header = `inet.0: ${routes.length} destinations, ${routes.length} routes (active, 0 holddown, 0 hidden)\n+ = Active Route, - = Last Active, * = Both\n\n`;
      const lines = routes.map((r) => {
        const proto = r.source === 'connected' ? 'Direct/0' : r.source === 'ospf' ? 'OSPF/10' : 'Static/5';
        return `*${r.network}/${r.prefixLength}    [${proto}] 00:05:12\n                    via ${r.exitInterface || r.nextHop || 'discard'}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    if (cmd === 'set' && tokens[1]?.toLowerCase() === 'interfaces') {
      const ifaceName = tokens[2];
      const addrIdx = tokens.findIndex((t) => t.toLowerCase() === 'address');
      const addrToken = addrIdx !== -1 ? tokens[addrIdx + 1] : undefined;
      if (ifaceName && addrToken) {
        const targetIface = this.resolveInterface(dev, ifaceName);
        if (targetIface) {
          const [ip, pfx] = addrToken.split('/');
          const prefix = parseInt(pfx || '24', 10);
          if (isValidIp(ip)) {
            this.model.updateInterface(this.deviceId, targetIface.id, {
              ipv4: {
                address: ip,
                prefixLength: prefix,
              },
              adminState: 'up',
              operState: 'up',
            });
            return { output: `[edit]\nset interfaces ${targetIface.shortName} unit 0 family inet address ${addrToken}`, success: true, configChanged: true };
          }
        }
      }
      return { output: '% Syntax: set interfaces <interface> unit 0 family inet address <ip/prefix>', success: false, configChanged: false };
    }

    // 2. Linux Commands
    if (input.toLowerCase() === 'ip addr' || input.toLowerCase() === 'ip a' || input.toLowerCase() === 'ifconfig') {
      let out = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n`;
      let idx = 2;
      for (const iface of Object.values(dev.interfaces)) {
        const pfx = iface.ipv4?.prefixLength || 24;
        const ipStr = iface.ipv4?.address ? `\n    inet ${iface.ipv4.address}/${pfx} scope global ${iface.shortName}` : '';
        out += `${idx}: ${iface.shortName}: <BROADCAST,MULTICAST,${iface.operState === 'up' ? 'UP' : 'DOWN'}> mtu 1500 qdisc mq state ${iface.operState.toUpperCase()} group default\n    link/ether ${iface.mac} brd ff:ff:ff:ff:ff:ff${ipStr}\n`;
        idx++;
      }
      return { output: out.trimEnd(), success: true, configChanged: false };
    }

    if (input.toLowerCase() === 'ip route' || input.toLowerCase() === 'ip r' || input.toLowerCase() === 'route -n') {
      const routes = dev.routingTable;
      const lines = routes.map((r) => {
        if (r.network === '0.0.0.0' && r.prefixLength === 0) {
          return `default via ${r.nextHop || '192.168.1.1'} dev ${r.exitInterface || 'eth0'} proto static metric 100`;
        }
        return `${r.network}/${r.prefixLength} dev ${r.exitInterface || 'eth0'} proto ${r.source} scope link src ${r.nextHop || 'local'}`;
      });
      return { output: lines.join('\n') || 'no routes in kernel table', success: true, configChanged: false };
    }

    if (cmd === 'uname') {
      return { output: `Linux ${dev.hostname} 5.15.0-generic #1 SMP PREEMPT x86_64 GNU/Linux`, success: true, configChanged: false };
    }

    if (input.toLowerCase().startsWith('cat') && input.includes('os-release')) {
      return {
        output: `NAME="VyOS / Ubuntu Linux"\nVERSION="22.04 LTS (Jammy Jellyfish)"\nID=ubuntu\nID_LIKE=debian\nPRETTY_NAME="Ubuntu 22.04 LTS"`,
        success: true,
        configChanged: false,
      };
    }

    // 3. MikroTik RouterOS Commands
    if (input.includes('interface print') || input.includes('interface pr')) {
      const header = 'Flags: D - DYNAMIC; X - DISABLED, R - RUNNING\n #     NAME                                TYPE       ACTUAL-MTU\n';
      const lines = Object.values(dev.interfaces).map((iface, i) => {
        const flag = iface.operState === 'up' ? ' R ' : iface.adminState === 'down' ? ' X ' : '   ';
        return ` ${i}  ${flag} ${iface.shortName.padEnd(35)} ether            1500`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    if (input.includes('address print') || input.includes('address pr') || input.includes('addr print')) {
      const header = 'Flags: X - DISABLED, I - INVALID, D - DYNAMIC\n #   ADDRESS            NETWORK         INTERFACE\n';
      const lines = Object.values(dev.interfaces)
        .filter((i) => i.ipv4?.address)
        .map((iface, i) => {
          const pfx = iface.ipv4?.prefixLength || 24;
          return ` ${i}   ${(iface.ipv4!.address + '/' + pfx).padEnd(18)} ${(iface.ipv4!.address).padEnd(15)} ${iface.shortName}`;
        });
      return { output: header + (lines.join('\n') || ' (no addresses configured)'), success: true, configChanged: false };
    }

    if (input.includes('route print') || input.includes('route pr')) {
      const routes = dev.routingTable;
      const header = 'Flags: X - DISABLED, A - ACTIVE, D - DYNAMIC, C - CONNECTED, S - STATIC, O - OSPF\n #     DST-ADDRESS        PREF-SRC        GATEWAY         DISTANCE\n';
      const lines = routes.map((r, i) => {
        const code = r.source === 'connected' ? 'ADC' : r.source === 'ospf' ? 'ADO' : 'AS ';
        return ` ${i}  ${code} ${(r.network + '/' + r.prefixLength).padEnd(18)}                 ${(r.nextHop || r.exitInterface || '').padEnd(15)} ${r.metric}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    // 4. Fortinet FortiOS Commands
    if (input.toLowerCase() === 'get system status') {
      return {
        output: `Version: FortiGate-60F v7.2.4,build1396,230308 (GA.M)\nVirus-DB: 91.08234(2023-03-08 10:00)\nSerial-Number: FG60FT1234567890\nLicense Status: Valid\nHostname: ${dev.hostname}\nOperation Mode: NAT`,
        success: true,
        configChanged: false,
      };
    }

    if (input.toLowerCase().includes('routing-table')) {
      const routes = dev.routingTable;
      const header = `Codes: K - kernel, C - connected, S - static, R - RIP, B - BGP\n       O - OSPF, IA - OSPF inter area\n\n`;
      const lines = routes.map((r) => {
        const code = r.source === 'connected' ? 'C' : r.source === 'ospf' ? 'O' : 'S';
        return `${code}*      ${r.network}/${r.prefixLength} [${r.adminDistance}/${r.metric}] via ${r.nextHop || 'direct'}, ${r.exitInterface || 'port1'}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    // Mode-specific handling
    if (this.mode === 'exec' || this.mode === 'priv-exec') {
      return {
        output: `% Invalid command "${input}". Type "?" for available commands.`,
        success: false,
        configChanged: false,
      };
    }

    return this.handleConfigCommands(tokens, dev);
  }

  private handleShowCommands(args: string[], dev: Device): CliExecutionResult {
    const sub = args.join(' ').toLowerCase();

    // Juniper Junos: show interfaces terse
    if (sub === 'interfaces terse' || sub === 'int terse') {
      const header = 'Interface               Admin Link Proto    Local                 Remote\n';
      const lines = Object.values(dev.interfaces).map((iface) => {
        const ip = iface.ipv4?.address ? `${iface.ipv4.address}/${iface.ipv4.prefixLength || 24}` : '';
        return `${iface.name.padEnd(23)} ${iface.adminState.padEnd(5)} ${iface.operState.padEnd(4)} inet     ${ip}`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    // Juniper Junos: show route / show route brief
    if ((sub === 'route' || sub === 'route brief') && dev.vendor === 'juniper') {
      const routes = dev.routingTable;
      const header = `inet.0: ${routes.length} destinations, ${routes.length} routes (active, 0 holddown, 0 hidden)\n+ = Active Route, - = Last Active, * = Both\n\n`;
      const lines = routes.map((r) => {
        const proto = r.source === 'connected' ? 'Direct/0' : r.source === 'ospf' ? 'OSPF/10' : 'Static/5';
        return `*${r.network}/${r.prefixLength}    [${proto}] 00:05:12\n                    via ${r.exitInterface || r.nextHop || 'discard'}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    // show ip interface brief / sh ip int br
    if (sub.startsWith('ip int') || sub.startsWith('ip interface') || sub === 'ip int br' || sub === 'ip int brief') {
      const header = 'Interface              IP-Address      OK? Method Status                Protocol\n';
      const lines = Object.values(dev.interfaces).map((iface) => {
        const ip = iface.ipv4?.address || 'unassigned';
        const status = iface.adminState === 'down' ? 'administratively down' : 'up';
        const proto = iface.operState === 'up' ? 'up' : 'down';
        return `${iface.name.padEnd(22)} ${ip.padEnd(15)} YES manual ${status.padEnd(21)} ${proto}`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    // show interfaces / sh int
    if (sub === 'interfaces' || sub === 'int' || sub.startsWith('int ')) {
      const output = Object.values(dev.interfaces)
        .map((iface) => {
          return `${iface.name} is ${iface.adminState === 'up' ? 'up' : 'administratively down'}, line protocol is ${iface.operState}\n` +
            `  Hardware is Ethernet, address is ${iface.mac}\n` +
            (iface.ipv4 ? `  Internet address is ${iface.ipv4.address}/${iface.ipv4.prefixLength}\n` : '  Internet protocol processing disabled\n') +
            `  MTU 1500 bytes, BW ${iface.speed}000 Kbit/sec, DLY 10 usec\n` +
            `  Full-duplex, ${iface.speed}Mb/s\n` +
            `  ${iface.counters.rxPackets} packets input, ${iface.counters.rxBytes} bytes\n` +
            `  ${iface.counters.txPackets} packets output, ${iface.counters.txBytes} bytes`;
        })
        .join('\n\n');
      return { output, success: true, configChanged: false };
    }

    // show mac address-table / sh mac
    if (sub.startsWith('mac') || sub.startsWith('mac-address-table')) {
      const header = '          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n';
      const rows = dev.macTable.map((e) => {
        const iface = dev.interfaces[e.interface];
        const portName = iface ? iface.shortName : e.interface;
        return `${e.vlan.toString().padEnd(7)} ${e.mac.padEnd(17)} ${e.dynamic ? 'DYNAMIC' : 'STATIC '}     ${portName}`;
      });
      return { output: header + (rows.length ? rows.join('\n') : 'Total Mac Addresses for this criterion: 0'), success: true, configChanged: false };
    }

    // show vlan brief / sh vlan
    if (sub === 'vlan brief' || sub === 'vlan' || sub === 'vlan br') {
      const header = 'VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n';
      const rows = Object.values(dev.vlans).map((v) => {
        const ports = Object.values(dev.interfaces)
          .filter((i) => i.accessVlan === v.id)
          .map((i) => i.shortName)
          .join(', ');
        return `${v.id.toString().padEnd(4)} ${v.name.padEnd(32)} ${v.active ? 'active   ' : 'suspended'} ${ports}`;
      });
      return { output: header + rows.join('\n'), success: true, configChanged: false };
    }

    // show ip route / sh ip ro
    if (sub === 'ip route' || sub === 'ip ro' || sub === 'route') {
      return { output: RoutingEngine.formatRoutingTable(dev), success: true, configChanged: false };
    }

    // show arp / sh arp
    if (sub === 'arp') {
      const header = 'Protocol  Address          Age (min)  Hardware Addr   Type   Interface\n';
      const rows = dev.arpTable.map((e) => {
        return `Internet  ${e.ip.padEnd(16)} ${e.age.toString().padEnd(10)} ${e.mac}            ARPA   ${e.interface}`;
      });
      return { output: header + rows.join('\n'), success: true, configChanged: false };
    }

    // show version / sh ver
    if (sub === 'version' || sub === 'ver') {
      return {
        output: [
          `TopoSphere Virtual IOS Software (TS-SIM-K9), Version 15.6(2)T`,
          `Technical Support: https://github.com/toposphere/toposphere`,
          `Device Hostname: ${dev.hostname}`,
          `Hardware: ${dev.model} with ${Object.keys(dev.interfaces).length} interfaces`,
          `System image file is "flash:toposphere-sim-k9.bin"`,
          `Processor board ID TS8834921`,
        ].join('\n'),
        success: true,
        configChanged: false,
      };
    }

    // show clock
    if (sub === 'clock') {
      return {
        output: `${new Date().toUTCString()}`,
        success: true,
        configChanged: false,
      };
    }

    // show cdp neighbors / sh cdp nei
    if (sub.startsWith('cdp nei') || sub.startsWith('cdp neighbor')) {
      const isDetail = sub.includes('detail') || sub.includes('det');
      const top = this.model.getTopology();
      const neighbors: Array<{
        localIface: string;
        remoteDev: Device;
        remoteIface: string;
        capability: string;
      }> = [];

      for (const iface of Object.values(dev.interfaces)) {
        if (!iface.linkedTo) continue;
        const link = top.links[iface.linkedTo];
        if (!link) continue;
        const remoteDevId = link.sourceDeviceId === this.deviceId ? link.targetDeviceId : link.sourceDeviceId;
        const remoteIfaceId = link.sourceDeviceId === this.deviceId ? link.targetInterfaceId : link.sourceInterfaceId;
        const remoteDev = top.devices[remoteDevId];
        const remoteIface = remoteDev?.interfaces[remoteIfaceId];
        if (remoteDev && remoteIface) {
          let cap = 'H';
          if (remoteDev.type === 'router') cap = 'R';
          else if (remoteDev.type === 'switch' || remoteDev.type === 'switch-l3') cap = 'S';
          else if (remoteDev.type === 'firewall') cap = 'R';
          else if (remoteDev.type === 'access-point') cap = 'W';

          neighbors.push({
            localIface: iface.shortName,
            remoteDev,
            remoteIface: remoteIface.shortName,
            capability: cap,
          });
        }
      }

      if (isDetail) {
        if (neighbors.length === 0) return { output: '% No CDP neighbors found', success: true, configChanged: false };
        const blocks = neighbors.map((n) => {
          const ip = Object.values(n.remoteDev.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address || 'unassigned';
          return [
            `-------------------------`,
            `Device ID: ${n.remoteDev.hostname}`,
            `Entry address(es):`,
            `  IP address: ${ip}`,
            `Platform: ${n.remoteDev.model},  Capabilities: ${n.capability === 'R' ? 'Router' : n.capability === 'S' ? 'Switch' : 'Host'}`,
            `Interface: ${n.localIface},  Port ID (outgoing port): ${n.remoteIface}`,
            `Holdtime : 142 sec`,
            `Version :`,
            `TopoSphere Virtual IOS Software (TS-SIM-K9), Version 15.6(2)T`,
          ].join('\n');
        });
        return { output: blocks.join('\n\n'), success: true, configChanged: false };
      }

      const header = [
        'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge',
        '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone',
        '',
        'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID',
      ].join('\n');

      const rows = neighbors.map((n) => {
        return `${n.remoteDev.hostname.padEnd(16)} ${n.localIface.padEnd(17)} 142        ${n.capability.padEnd(11)} ${n.remoteDev.model.slice(0, 9).padEnd(9)} ${n.remoteIface}`;
      });

      return {
        output: header + '\n' + (rows.length ? rows.join('\n') : 'Total entries displayed: 0'),
        success: true,
        configChanged: false,
      };
    }

    // show ip dhcp binding
    if (sub.startsWith('ip dhcp b') || sub.startsWith('ip dhcp bind')) {
      const header = 'IP address       Client-ID/              Lease expiration        Type\n                 Hardware address\n';
      const leases = dev.services.dhcpLeases || [];
      const rows = leases.map((l) => `${l.ip.padEnd(16)} ${l.mac.padEnd(23)} ${new Date(l.leaseExpiry).toLocaleTimeString().padEnd(23)} Automatic`);
      return { output: header + (rows.length ? rows.join('\n') : 'Total entries: 0'), success: true, configChanged: false };
    }

    // show ip dhcp pool
    if (sub.startsWith('ip dhcp p') || sub.startsWith('ip dhcp pool')) {
      const pools = dev.services.dhcpPools || [];
      if (pools.length === 0) return { output: '% No DHCP pools configured', success: true, configChanged: false };
      const output = pools.map((p) => [
        `Pool ${p.name} :`,
        ` Utilization mark (high/low)    : 100 / 0`,
        ` Subnet size (Total/Allocated) : 254 / 0`,
        ` Total addresses               : 254`,
        ` Leased addresses              : 0`,
        ` Excluded addresses            : ${p.excludedAddresses?.length || 0}`,
        ` Subnet                        : ${p.network} / ${p.prefixLength}`,
        ` Default router                : ${p.defaultGateway || 'none'}`,
        ` DNS server                    : ${p.dnsServer || 'none'}`,
      ].join('\n')).join('\n\n');
      return { output, success: true, configChanged: false };
    }

    // show spanning-tree / sh span
    if (sub.startsWith('spanning-tree') || sub.startsWith('span')) {
      return {
        output: SpanningTreeEngine.formatShowSpanningTree(dev, this.model.getTopology()),
        success: true,
        configChanged: false,
      };
    }

    // show ip ospf neighbor / sh ip ospf nei
    if (sub.startsWith('ip ospf n') || sub.startsWith('ip ospf nei')) {
      return {
        output: OspfEngine.formatOspfNeighbors(dev, this.model.getTopology()),
        success: true,
        configChanged: false,
      };
    }

    // show ip ospf
    if (sub === 'ip ospf' || sub.startsWith('ip ospf ')) {
      return {
        output: OspfEngine.formatShowOspf(dev),
        success: true,
        configChanged: false,
      };
    }

    // show ip nat translations / sh ip nat trans
    if (sub.startsWith('ip nat tr') || sub.startsWith('ip nat trans')) {
      return {
        output: AclAndNatEngine.formatShowNatTranslations(dev),
        success: true,
        configChanged: false,
      };
    }

    // show ip nat statistics / sh ip nat stat
    if (sub.startsWith('ip nat st') || sub.startsWith('ip nat stat')) {
      return {
        output: AclAndNatEngine.formatShowNatStatistics(dev),
        success: true,
        configChanged: false,
      };
    }

    // show access-lists / sh access / show ip access-lists
    if (sub.startsWith('access-list') || sub.startsWith('access') || sub.startsWith('ip access')) {
      return {
        output: AclAndNatEngine.formatShowAcl(dev),
        success: true,
        configChanged: false,
      };
    }

    // show running-config / sh run
    if (sub === 'running-config' || sub === 'run' || sub === 'run-config') {
      const lines: string[] = [
        'Building configuration...',
        'Current configuration : 1024 bytes',
        '!',
        `hostname ${dev.hostname}`,
        '!',
      ];

      for (const v of Object.values(dev.vlans)) {
        if (v.id !== 1) {
          lines.push(`vlan ${v.id}`, ` name ${v.name}`, '!');
        }
      }

      for (const iface of Object.values(dev.interfaces)) {
        lines.push(`interface ${iface.name}`);
        if (iface.description) lines.push(` description ${iface.description}`);
        if (iface.ipv4) {
          lines.push(` ip address ${iface.ipv4.address} ${prefixToMask(iface.ipv4.prefixLength)}`);
        }
        if (iface.vlanMode === 'trunk') {
          lines.push(' switchport mode trunk');
        } else if (iface.vlanMode === 'access') {
          lines.push(' switchport mode access');
          if (iface.accessVlan !== 1) {
            lines.push(` switchport access vlan ${iface.accessVlan}`);
          }
        }
        if (iface.adminState === 'down') {
          lines.push(' shutdown');
        } else {
          lines.push(' no shutdown');
        }
        lines.push('!');
      }

      for (const sr of dev.staticRoutes) {
        lines.push(`ip route ${sr.network} ${prefixToMask(sr.prefixLength)} ${sr.nextHop}`);
      }
      lines.push('end');

      return { output: lines.join('\n'), success: true, configChanged: false };
    }

    return { output: `% Unrecognized show command "${sub}"`, success: false, configChanged: false };
  }

  private resolveInterface(dev: Device, query: string): Interface | undefined {
    const clean = query.toLowerCase().replace(/[\s\/-]+/g, '');
    const match = Object.values(dev.interfaces).find((i) => {
      const iName = i.name.toLowerCase().replace(/[\s\/-]+/g, '');
      const iShort = i.shortName.toLowerCase().replace(/[\s\/-]+/g, '');
      return (
        iName === clean ||
        iShort === clean ||
        iName.startsWith(clean) ||
        iShort.startsWith(clean)
      );
    });
    if (match) return match;

    // Expand common Cisco port prefixes: f -> fastethernet, g -> gigabitethernet, e -> ethernet, se -> serial, lo -> loopback
    let expanded = clean;
    if (/^f\d/.test(clean)) expanded = clean.replace(/^f/, 'fastethernet');
    else if (/^fa\d/.test(clean)) expanded = clean.replace(/^fa/, 'fastethernet');
    else if (/^g\d/.test(clean)) expanded = clean.replace(/^g/, 'gigabitethernet');
    else if (/^gi\d/.test(clean)) expanded = clean.replace(/^gi/, 'gigabitethernet');
    else if (/^gig\d/.test(clean)) expanded = clean.replace(/^gig/, 'gigabitethernet');
    else if (/^e\d/.test(clean)) expanded = clean.replace(/^e/, 'ethernet');
    else if (/^eth\d/.test(clean)) expanded = clean.replace(/^eth/, 'ethernet');

    return Object.values(dev.interfaces).find((i) => {
      const iName = i.name.toLowerCase().replace(/[\s\/-]+/g, '');
      return iName === expanded || iName.startsWith(expanded);
    });
  }

  private handleConfigCommands(tokens: string[], dev: Device): CliExecutionResult {
    const cmd = tokens[0].toLowerCase();

    // hostname <name>
    if (this.mode === 'config' && cmd === 'hostname') {
      const name = tokens[1];
      if (!name) return { output: '% Incomplete command: hostname <name>', success: false, configChanged: false };
      this.model.updateHostname(this.deviceId, name);
      return { output: '', success: true, configChanged: true };
    }

    // interface / int <name>
    if ((this.mode === 'config' || this.mode === 'config-if') && (cmd === 'interface' || cmd === 'int')) {
      const ifQuery = tokens.slice(1).join('');
      if (!ifQuery) {
        return { output: '% Incomplete command: interface <name>', success: false, configChanged: false };
      }

      const match = this.resolveInterface(dev, ifQuery);
      if (!match) {
        return {
          output: `% Invalid interface "${tokens.slice(1).join(' ')}". Available: ${Object.values(dev.interfaces).map((i) => i.shortName).join(', ')}`,
          success: false,
          configChanged: false,
        };
      }

      this.mode = 'config-if';
      this.currentInterfaceId = match.id;
      return { output: '', success: true, configChanged: false };
    }

    // vlan <id>
    if (this.mode === 'config' && cmd === 'vlan') {
      const vid = parseInt(tokens[1], 10);
      if (isNaN(vid) || vid < 1 || vid > 4094) {
        return { output: '% Invalid VLAN ID (1-4094)', success: false, configChanged: false };
      }
      if (!dev.vlans[vid]) {
        this.model.addVlan(this.deviceId, { id: vid, name: `VLAN${vid.toString().padStart(4, '0')}`, active: true });
      }
      this.mode = 'config-vlan';
      this.currentVlanId = vid;
      return { output: '', success: true, configChanged: true };
    }

    // no vlan <id>
    if (this.mode === 'config' && cmd === 'no' && tokens[1]?.toLowerCase() === 'vlan') {
      const vid = parseInt(tokens[2], 10);
      if (isNaN(vid) || vid <= 1) {
        return { output: '% Cannot delete default VLAN 1', success: false, configChanged: false };
      }
      this.model.removeVlan(this.deviceId, vid);
      return { output: '', success: true, configChanged: true };
    }

    // VLAN config mode: name <name>
    if (this.mode === 'config-vlan' && cmd === 'name' && this.currentVlanId) {
      const name = tokens.slice(1).join(' ');
      if (dev.vlans[this.currentVlanId]) {
        dev.vlans[this.currentVlanId].name = name;
        return { output: '', success: true, configChanged: true };
      }
    }

    // ip default-gateway <ip>
    if (this.mode === 'config' && cmd === 'ip' && (tokens[1]?.toLowerCase() === 'default-gateway' || tokens[1]?.toLowerCase() === 'def')) {
      const gw = tokens[2];
      if (!gw || !isValidIp(gw)) {
        return { output: '% Usage: ip default-gateway <ip-address>', success: false, configChanged: false };
      }
      // Set gateway on primary interface
      const primaryIf = Object.values(dev.interfaces)[0];
      if (primaryIf && primaryIf.ipv4) {
        primaryIf.ipv4.gateway = gw;
        return { output: '', success: true, configChanged: true };
      }
    }

    // ip route <network> <mask|prefix> <next-hop>
    if (this.mode === 'config' && cmd === 'ip' && tokens[1]?.toLowerCase() === 'route') {
      const net = tokens[2];
      const maskOrPrefix = tokens[3];
      const nextHop = tokens[4];

      if (!net || !maskOrPrefix || !nextHop) {
        return { output: '% Usage: ip route <network> <netmask> <next-hop>', success: false, configChanged: false };
      }

      try {
        const prefix = maskOrPrefix.includes('.') ? maskToPrefix(maskOrPrefix) : parseInt(maskOrPrefix, 10);
        this.model.addStaticRoute(this.deviceId, {
          network: net,
          prefixLength: prefix,
          nextHop,
          adminDistance: 1,
          metric: 0,
        });
        return { output: '', success: true, configChanged: true };
      } catch (err: unknown) {
        return { output: `% Invalid route parameters: ${err instanceof Error ? err.message : String(err)}`, success: false, configChanged: false };
      }
    }

    // Interface config mode commands
    if (this.mode === 'config-if' && this.currentInterfaceId) {
      const iface = dev.interfaces[this.currentInterfaceId];
      if (!iface) return { output: '% Interface not found', success: false, configChanged: false };

      // description <text>
      if (cmd === 'description' || cmd === 'desc') {
        const desc = tokens.slice(1).join(' ');
        this.model.updateInterface(this.deviceId, iface.id, { description: desc });
        return { output: '', success: true, configChanged: true };
      }

      // ip address / ip add <ip> <mask|prefix>
      if (cmd === 'ip' && (tokens[1]?.toLowerCase() === 'address' || tokens[1]?.toLowerCase() === 'add')) {
        const ip = tokens[2];
        const mask = tokens[3];
        if (!ip || !mask) {
          return { output: '% Usage: ip address <ip> <subnet-mask>', success: false, configChanged: false };
        }
        try {
          const prefix = mask.includes('.') ? maskToPrefix(mask) : parseInt(mask, 10);
          this.model.updateInterface(this.deviceId, iface.id, {
            ipv4: {
              address: ip,
              prefixLength: prefix,
              gateway: iface.ipv4?.gateway,
            },
          });
          return { output: '', success: true, configChanged: true };
        } catch {
          return { output: '% Invalid IP address or subnet mask', success: false, configChanged: false };
        }
      }

      // no ip address / no ip add
      if (cmd === 'no' && tokens[1]?.toLowerCase() === 'ip' && (tokens[2]?.toLowerCase() === 'address' || tokens[2]?.toLowerCase() === 'add')) {
        this.model.updateInterface(this.deviceId, iface.id, { ipv4: undefined });
        return { output: '', success: true, configChanged: true };
      }

      // shutdown / shut
      if (cmd === 'shutdown' || cmd === 'shut') {
        this.model.setInterfaceAdminState(this.deviceId, iface.id, 'down');
        return {
          output: `%LINK-5-CHANGED: Interface ${iface.name}, changed state to administratively down`,
          success: true,
          configChanged: true,
        };
      }

      // no shutdown / no shut
      if (cmd === 'no' && (tokens[1]?.toLowerCase() === 'shutdown' || tokens[1]?.toLowerCase() === 'shut')) {
        this.model.setInterfaceAdminState(this.deviceId, iface.id, 'up');
        return {
          output: `%LINK-5-CHANGED: Interface ${iface.name}, changed state to up`,
          success: true,
          configChanged: true,
        };
      }

      // switchport mode access / trunk / sw mode acc / sw mode tr
      if ((cmd === 'switchport' || cmd === 'sw') && (tokens[1]?.toLowerCase() === 'mode' || tokens[1]?.toLowerCase() === 'm')) {
        const modeArg = tokens[2]?.toLowerCase();
        if (modeArg?.startsWith('acc')) {
          this.model.updateInterface(this.deviceId, iface.id, { vlanMode: 'access' });
          return { output: '', success: true, configChanged: true };
        }
        if (modeArg?.startsWith('tr')) {
          this.model.updateInterface(this.deviceId, iface.id, { vlanMode: 'trunk' });
          return { output: '', success: true, configChanged: true };
        }
        return { output: '% Usage: switchport mode [access | trunk]', success: false, configChanged: false };
      }

      // switchport access vlan <id> / sw acc vl <id>
      if (
        (cmd === 'switchport' || cmd === 'sw') &&
        (tokens[1]?.toLowerCase() === 'access' || tokens[1]?.toLowerCase() === 'acc') &&
        (tokens[2]?.toLowerCase() === 'vlan' || tokens[2]?.toLowerCase() === 'vl')
      ) {
        const vid = parseInt(tokens[3], 10);
        if (isNaN(vid) || vid < 1 || vid > 4094) {
          return { output: '% Invalid VLAN ID (1-4094)', success: false, configChanged: false };
        }
        this.model.updateInterface(this.deviceId, iface.id, { accessVlan: vid });
        return { output: '', success: true, configChanged: true };
      }

      // switchport trunk allowed vlan ...
      if (
        (cmd === 'switchport' || cmd === 'sw') &&
        tokens[1]?.toLowerCase() === 'trunk' &&
        tokens[2]?.toLowerCase() === 'allowed' &&
        tokens[3]?.toLowerCase() === 'vlan'
      ) {
        const action = tokens[4]?.toLowerCase();
        if (action === 'all') {
          this.model.updateInterface(this.deviceId, iface.id, { trunkAllowedVlans: [] });
          return { output: '', success: true, configChanged: true };
        }
        if (action === 'none') {
          this.model.updateInterface(this.deviceId, iface.id, { trunkAllowedVlans: [4095] });
          return { output: '', success: true, configChanged: true };
        }
        const vlanList = tokens[action === 'add' || action === 'remove' ? 5 : 4]
          ?.split(',')
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v));

        if (vlanList && vlanList.length > 0) {
          this.model.updateInterface(this.deviceId, iface.id, { trunkAllowedVlans: vlanList });
          return { output: '', success: true, configChanged: true };
        }
      }
    }

    // ip dhcp pool <name>
    if (this.mode === 'config' && cmd === 'ip' && tokens[1]?.toLowerCase() === 'dhcp' && tokens[2]?.toLowerCase() === 'pool') {
      const poolName = tokens[3];
      if (!poolName) return { output: '% Usage: ip dhcp pool <name>', success: false, configChanged: false };
      this.mode = 'config-dhcp';
      this.currentDhcpPoolId = poolName;
      if (!dev.services) {
        dev.services = {
          dhcpEnabled: true,
          dhcpPools: [],
          dhcpLeases: [],
          dnsEnabled: false,
          dnsRecords: [],
          httpEnabled: false,
          ftpEnabled: false,
        };
      }
      dev.services.dhcpEnabled = true;
      let pool = dev.services.dhcpPools.find((p) => p.name === poolName);
      if (!pool) {
        pool = {
          id: `pool-${Date.now()}`,
          name: poolName,
          network: '192.168.1.0',
          prefixLength: 24,
          defaultGateway: '192.168.1.1',
          dnsServer: '8.8.8.8',
          leaseTime: 86400,
          excludedAddresses: [],
        };
        dev.services.dhcpPools.push(pool);
      }
      return { output: '', success: true, configChanged: true };
    }

    // DHCP pool subcommands: network, default-router, dns-server
    if (this.mode === 'config-dhcp' && this.currentDhcpPoolId) {
      const pool = dev.services?.dhcpPools?.find((p) => p.name === this.currentDhcpPoolId);
      if (cmd === 'network') {
        const net = tokens[1];
        const mask = tokens[2];
        if (net && mask && pool) {
          pool.network = net;
          pool.prefixLength = mask.includes('.') ? maskToPrefix(mask) : parseInt(mask, 10);
          return { output: '', success: true, configChanged: true };
        }
        return { output: '% Usage: network <ip-address> <subnet-mask>', success: false, configChanged: false };
      }
      if (cmd === 'default-router') {
        const gw = tokens[1];
        if (gw && pool) {
          pool.defaultGateway = gw;
          return { output: '', success: true, configChanged: true };
        }
        return { output: '% Usage: default-router <ip-address>', success: false, configChanged: false };
      }
      if (cmd === 'dns-server') {
        const dns = tokens.slice(1).find((t) => isValidIp(t));
        if (dns && pool) {
          pool.dnsServer = dns;
          return { output: '', success: true, configChanged: true };
        }
        return { output: '% Usage: dns-server <ip-address>', success: false, configChanged: false };
      }
      if (cmd === 'domain-name' || cmd === 'lease') {
        return { output: '', success: true, configChanged: true };
      }
    }

    // ip dhcp excluded-address <low> [high]
    if (this.mode === 'config' && cmd === 'ip' && tokens[1]?.toLowerCase() === 'dhcp' && tokens[2]?.toLowerCase() === 'excluded-address') {
      return { output: '', success: true, configChanged: true };
    }

    // Standard Cisco Management & Security Commands (CCNA Lab staples)
    if (this.mode === 'config') {
      // banner motd
      if (cmd === 'banner' && tokens[1]?.toLowerCase() === 'motd') {
        return { output: '', success: true, configChanged: true };
      }
      // line console 0 / line vty 0 4
      if (cmd === 'line') {
        return { output: '', success: true, configChanged: false };
      }
      // password / login / transport input
      if (cmd === 'password' || cmd === 'login' || (cmd === 'transport' && tokens[1]?.toLowerCase() === 'input')) {
        return { output: '', success: true, configChanged: true };
      }
      // enable secret / enable password
      if (cmd === 'enable' && (tokens[1]?.toLowerCase() === 'secret' || tokens[1]?.toLowerCase() === 'password')) {
        return { output: '', success: true, configChanged: true };
      }
      // service password-encryption
      if (cmd === 'service' && tokens[1]?.toLowerCase() === 'password-encryption') {
        return { output: '', success: true, configChanged: true };
      }
      // no ip domain-lookup
      if (cmd === 'no' && tokens[1]?.toLowerCase() === 'ip' && tokens[2]?.toLowerCase() === 'domain-lookup') {
        return { output: '', success: true, configChanged: true };
      }
      // ip domain-name
      if (cmd === 'ip' && (tokens[1]?.toLowerCase() === 'domain-name' || tokens[1]?.toLowerCase() === 'domain')) {
        return { output: '', success: true, configChanged: true };
      }
      // crypto key generate rsa
      if (cmd === 'crypto' && tokens[1]?.toLowerCase() === 'key') {
        return {
          output: `The name for the keys will be: ${dev.hostname}\nHow many bits in the modulus [512]: 1024\n% Generating 1024 bit RSA keys, keys will be non-exportable...\n[OK]`,
          success: true,
          configChanged: true,
        };
      }
      // router ospf <process-id>
      if (cmd === 'router' && tokens[1]?.toLowerCase() === 'ospf') {
        return { output: '', success: true, configChanged: true };
      }
      // network <net> <wildcard> area <area> (OSPF network statement)
      if (cmd === 'network' && tokens.length >= 4) {
        return { output: '', success: true, configChanged: true };
      }
      // access-list <1-199> permit/deny ...
      if (cmd === 'access-list') {
        return { output: '', success: true, configChanged: true };
      }
      // ip nat inside source list <num> interface <iface> overload
      if (cmd === 'ip' && tokens[1]?.toLowerCase() === 'nat') {
        return { output: '', success: true, configChanged: true };
      }
      // spanning-tree vlan <id> priority <prio>
      if (cmd === 'spanning-tree') {
        return { output: '', success: true, configChanged: true };
      }
    }

    // Interface mode security commands
    if (this.mode === 'config-if') {
      // ip access-group <num> in|out
      if (cmd === 'ip' && tokens[1]?.toLowerCase() === 'access-group') {
        return { output: '', success: true, configChanged: true };
      }
      // ip nat inside / outside
      if (cmd === 'ip' && tokens[1]?.toLowerCase() === 'nat' && (tokens[2]?.toLowerCase() === 'inside' || tokens[2]?.toLowerCase() === 'outside')) {
        return { output: '', success: true, configChanged: true };
      }
    }

    return {
      output: `% Unrecognized command "${tokens.join(' ')}" in current mode`,
      success: false,
      configChanged: false,
    };
  }

  private handlePing(targetIp: string): CliExecutionResult {
    if (!isValidIp(targetIp)) {
      return { output: '% Invalid IP address', success: false, configChanged: false };
    }

    if (this.simulationEngine) {
      const pingRes = this.simulationEngine.runPing(this.deviceId, targetIp);
      const outputLines = [
        `Type escape sequence to abort.`,
        `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
        pingRes.success ? '!!!!!' : '.....',
        `Success rate is ${pingRes.success ? '100 percent (5/5)' : '0 percent (0/5)'}` +
          (pingRes.rtt && pingRes.rtt.length > 0
            ? `, round-trip min/avg/max = 1/2/4 ms`
            : pingRes.errorMessage
            ? ` (${pingRes.errorMessage})`
            : ''),
      ];
      return { output: outputLines.join('\n'), success: pingRes.success, configChanged: false };
    }

    return {
      output: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5)`,
      success: true,
      configChanged: false,
    };
  }

  private handleTraceroute(targetIp: string): CliExecutionResult {
    if (!isValidIp(targetIp)) {
      return { output: '% Invalid IP address', success: false, configChanged: false };
    }

    return {
      output: `Tracing the route to ${targetIp}\n  1  192.168.1.1 2 msec 1 msec 1 msec\n  2  ${targetIp} 3 msec 2 msec 2 msec`,
      success: true,
      configChanged: false,
    };
  }

  private getHelpText(): string {
    return [
      'Exec Mode Commands:',
      '  enable / en                    Enter privileged EXEC mode',
      '  disable                        Exit privileged EXEC mode',
      '  ping <ip>                      Send ICMP Echo requests to destination',
      '  traceroute <ip>                Trace path to destination',
      '  show ip interface brief        Display summary of interface IP status',
      '  show interfaces                Display full interface hardware and counters',
      '  show mac address-table         Display Layer 2 forwarding table',
      '  show vlan brief                Display VLAN database and port memberships',
      '  show ip route                  Display IP routing table',
      '  show arp                       Display ARP cache table',
      '  show running-config            Display current active configuration',
      '  show version                   Display device software and hardware specifications',
      '  write memory / wr              Save running configuration to NVRAM',
      '',
      'Global Configuration Mode (type "conf t" in privileged mode):',
      '  hostname <name>                Set system name',
      '  interface <name> / int <name>  Select an interface (e.g. "int fa0/1", "int gi0/0")',
      '  ip route <net> <mask> <nh>     Add a static IPv4 route',
      '  vlan <id>                      Create or edit a VLAN',
      '  no vlan <id>                   Delete a VLAN',
      '  do <command>                   Execute EXEC command from configuration mode',
      '  exit                           Exit configuration mode',
      '',
      'Interface Configuration Mode (e.g. "int fa0/1"):',
      '  ip address <ip> <mask>         Assign IPv4 address to interface',
      '  no ip address                  Remove IPv4 address from interface',
      '  no shutdown / no shut          Enable interface administrative state',
      '  shutdown / shut                Disable interface administrative state',
      '  switchport mode [access|trunk] Set switchport mode',
      '  switchport access vlan <id>    Assign access VLAN to interface',
      '  switchport trunk allowed vlan  Set allowed VLANs on trunk',
      '  description <text>             Set interface description',
      '  exit                           Exit interface mode',
    ].join('\n');
  }
}
