import type { NetworkTopology, Device } from '@/types/network';
import type { NetworkModel } from '@/engine/core/NetworkModel';
import { RoutingEngine } from '@/engine/routing/RoutingEngine';
import { maskToPrefix, prefixToMask, isValidIp } from '@/lib/ip';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';

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

  public getDevice(): Device | undefined {
    return this.model.getDevice(this.deviceId);
  }

  public getPrompt(): string {
    const dev = this.getDevice();
    const hostname = dev ? dev.hostname : 'Device';

    switch (this.mode) {
      case 'exec':
        return `${hostname}> `;
      case 'priv-exec':
        return `${hostname}# `;
      case 'config':
        return `${hostname}(config)# `;
      case 'config-if': {
        const iface = this.currentInterfaceId && dev ? dev.interfaces[this.currentInterfaceId] : null;
        return `${hostname}(config-if#${iface ? iface.shortName : ''})# `;
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

    // Help command
    if (cmd === '?' || cmd === 'help') {
      return {
        output: this.getHelpText(),
        success: true,
        configChanged: false,
      };
    }

    // Navigation: enable, disable, exit, end
    if (cmd === 'enable' || cmd === 'en') {
      this.mode = 'priv-exec';
      return { output: '', success: true, configChanged: false };
    }

    if (cmd === 'disable') {
      this.mode = 'exec';
      return { output: '', success: true, configChanged: false };
    }

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

    // Mode-specific handling
    if (this.mode === 'exec' || this.mode === 'priv-exec') {
      return this.handleExecCommands(tokens, dev);
    }

    return this.handleConfigCommands(tokens, dev);
  }

  private handleExecCommands(tokens: string[], dev: Device): CliExecutionResult {
    const cmd = tokens[0].toLowerCase();

    if ((cmd === 'configure' || cmd === 'conf') && (tokens[1]?.toLowerCase() === 'terminal' || tokens[1]?.toLowerCase() === 't')) {
      if (this.mode !== 'priv-exec') {
        return { output: '% Access denied: Enter privileged exec mode first (type "enable")', success: false, configChanged: false };
      }
      this.mode = 'config';
      return {
        output: 'Enter configuration commands, one per line. End with CNTL/Z or "end".',
        success: true,
        configChanged: false,
      };
    }

    if (cmd === 'show' || cmd === 'sh') {
      return this.handleShowCommands(tokens.slice(1), dev);
    }

    return {
      output: `% Invalid command "${tokens.join(' ')}". Type "?" for available commands.`,
      success: false,
      configChanged: false,
    };
  }

  private handleShowCommands(args: string[], dev: Device): CliExecutionResult {
    const sub = args.join(' ').toLowerCase();

    // show ip interface brief
    if (sub === 'ip int brief' || sub === 'ip interface brief') {
      const header = 'Interface              IP-Address      OK? Method Status                Protocol\n';
      const lines = Object.values(dev.interfaces).map((iface) => {
        const ip = iface.ipv4?.address || 'unassigned';
        const status = iface.adminState === 'down' ? 'administratively down' : 'up';
        const proto = iface.operState === 'up' ? 'up' : 'down';
        return `${iface.name.padEnd(22)} ${ip.padEnd(15)} YES manual ${status.padEnd(21)} ${proto}`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    // show interfaces
    if (sub === 'interfaces' || sub === 'int') {
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

    // show mac address-table
    if (sub.startsWith('mac') || sub.startsWith('mac address-table')) {
      const header = '          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n';
      const rows = dev.macTable.map((e) => {
        const iface = dev.interfaces[e.interface];
        const portName = iface ? iface.shortName : e.interface;
        return `${e.vlan.toString().padEnd(7)} ${e.mac.padEnd(17)} ${e.dynamic ? 'DYNAMIC' : 'STATIC '}     ${portName}`;
      });
      return { output: header + (rows.length ? rows.join('\n') : 'Total Mac Addresses for this criterion: 0'), success: true, configChanged: false };
    }

    // show vlan brief
    if (sub === 'vlan brief' || sub === 'vlan') {
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

    // show ip route
    if (sub === 'ip route' || sub === 'route') {
      return { output: RoutingEngine.formatRoutingTable(dev), success: true, configChanged: false };
    }

    // show arp
    if (sub === 'arp') {
      const header = 'Protocol  Address          Age (min)  Hardware Addr   Type   Interface\n';
      const rows = dev.arpTable.map((e) => {
        return `Internet  ${e.ip.padEnd(16)} ${e.age.toString().padEnd(10)} ${e.mac}            ARPA   ${e.interface}`;
      });
      return { output: header + rows.join('\n'), success: true, configChanged: false };
    }

    // show running-config
    if (sub === 'running-config' || sub === 'run') {
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

  private handleConfigCommands(tokens: string[], dev: Device): CliExecutionResult {
    const cmd = tokens[0].toLowerCase();

    // Global config: hostname
    if (this.mode === 'config' && cmd === 'hostname') {
      const name = tokens[1];
      if (!name) return { output: '% Incomplete command', success: false, configChanged: false };
      this.model.updateHostname(this.deviceId, name);
      return { output: '', success: true, configChanged: true };
    }

    // Global config: interface
    if ((this.mode === 'config' || this.mode === 'config-if') && (cmd === 'interface' || cmd === 'int')) {
      const ifQuery = tokens.slice(1).join('').toLowerCase();
      const match = Object.values(dev.interfaces).find((i) => {
        const cleanName = i.name.toLowerCase().replace(/\s+/g, '');
        const cleanShort = i.shortName.toLowerCase().replace(/\s+/g, '');
        return cleanName === ifQuery || cleanShort === ifQuery || cleanName.includes(ifQuery);
      });

      if (!match) {
        return { output: `% Invalid interface name: ${tokens.slice(1).join(' ')}`, success: false, configChanged: false };
      }

      this.mode = 'config-if';
      this.currentInterfaceId = match.id;
      return { output: '', success: true, configChanged: false };
    }

    // Global config: vlan <id>
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

    // VLAN mode: name <name>
    if (this.mode === 'config-vlan' && cmd === 'name' && this.currentVlanId) {
      const name = tokens.slice(1).join(' ');
      if (dev.vlans[this.currentVlanId]) {
        dev.vlans[this.currentVlanId].name = name;
        return { output: '', success: true, configChanged: true };
      }
    }

    // Global config: ip route <network> <mask> <next-hop>
    if (this.mode === 'config' && cmd === 'ip' && tokens[1]?.toLowerCase() === 'route') {
      const net = tokens[2];
      const mask = tokens[3];
      const nextHop = tokens[4];

      if (!net || !mask || !nextHop) {
        return { output: '% Usage: ip route <network> <netmask> <next-hop>', success: false, configChanged: false };
      }

      try {
        const prefix = maskToPrefix(mask);
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

      // ip address <ip> <mask>
      if (cmd === 'ip' && tokens[1]?.toLowerCase() === 'address') {
        const ip = tokens[2];
        const mask = tokens[3];
        if (!ip || !mask) {
          return { output: '% Usage: ip address <ip> <subnet-mask>', success: false, configChanged: false };
        }
        try {
          const prefix = maskToPrefix(mask);
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

      // shutdown / no shutdown
      if (cmd === 'shutdown') {
        this.model.setInterfaceAdminState(this.deviceId, iface.id, 'down');
        return {
          output: `%LINK-5-CHANGED: Interface ${iface.name}, changed state to administratively down`,
          success: true,
          configChanged: true,
        };
      }

      if (cmd === 'no' && tokens[1]?.toLowerCase() === 'shutdown') {
        this.model.setInterfaceAdminState(this.deviceId, iface.id, 'up');
        return {
          output: `%LINK-5-CHANGED: Interface ${iface.name}, changed state to up`,
          success: true,
          configChanged: true,
        };
      }

      // switchport mode access / trunk
      if (cmd === 'switchport' && tokens[1]?.toLowerCase() === 'mode') {
        const mode = tokens[2]?.toLowerCase();
        if (mode === 'access' || mode === 'trunk') {
          this.model.updateInterface(this.deviceId, iface.id, { vlanMode: mode });
          return { output: '', success: true, configChanged: true };
        }
        return { output: '% Usage: switchport mode [access | trunk]', success: false, configChanged: false };
      }

      // switchport access vlan <id>
      if (cmd === 'switchport' && tokens[1]?.toLowerCase() === 'access' && tokens[2]?.toLowerCase() === 'vlan') {
        const vid = parseInt(tokens[3], 10);
        if (isNaN(vid) || vid < 1 || vid > 4094) {
          return { output: '% Invalid VLAN ID', success: false, configChanged: false };
        }
        this.model.updateInterface(this.deviceId, iface.id, { accessVlan: vid });
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
      output: `Tracing the route to ${targetIp}\n  1  10.0.0.1 2 msec 1 msec 1 msec\n  2  ${targetIp} 3 msec 2 msec 2 msec`,
      success: true,
      configChanged: false,
    };
  }

  private getHelpText(): string {
    return [
      'Exec Mode Commands:',
      '  enable                         Enter privileged EXEC mode',
      '  ping <ip>                      Send ICMP Echo requests to destination',
      '  traceroute <ip>                Trace path to destination',
      '  show ip interface brief        Display summary of interface IP status',
      '  show interfaces                Display full interface hardware and counters',
      '  show mac address-table         Display Layer 2 forwarding table',
      '  show vlan brief                Display VLAN database and port memberships',
      '  show ip route                  Display IP routing table',
      '  show arp                       Display ARP cache table',
      '  show running-config            Display current active configuration',
      '',
      'Configuration Mode Commands:',
      '  configure terminal             Enter global configuration mode',
      '  hostname <name>                Set system name',
      '  interface <name>               Select an interface to configure',
      '  ip route <net> <mask> <nh>     Add a static IPv4 route',
      '  vlan <id>                      Create or edit a VLAN',
      '',
      'Interface Configuration Commands:',
      '  ip address <ip> <mask>         Assign IPv4 address to interface',
      '  [no] shutdown                  Enable or disable interface administrative state',
      '  switchport mode [access|trunk] Set switchport mode',
      '  switchport access vlan <id>    Assign access VLAN to interface',
      '  exit                           Exit current configuration level',
    ].join('\n');
  }
}
