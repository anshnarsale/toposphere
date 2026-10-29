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

    // End Devices (PC, Laptop, Printer, Wireless Client)
    if (dev && ['pc', 'laptop', 'printer', 'wireless-client'].includes(dev.type)) {
      return `C:\\Users\\Admin> `;
    }

    const vendor = dev?.vendor || 'cisco';

    // Juniper Junos Authentic Prompts
    if (vendor === 'juniper') {
      if (this.mode === 'config' || this.mode === 'config-if' || this.mode === 'config-vlan') {
        return `[edit]\nroot@${hostname}# `;
      }
      return `root@${hostname}> `;
    }

    // MikroTik RouterOS Authentic Prompts
    if (vendor === 'mikrotik') {
      return `[admin@${hostname}] > `;
    }

    // Fortinet FortiOS Authentic Prompts
    if (vendor === 'fortinet') {
      return `${hostname} # `;
    }

    // Palo Alto Authentic Prompts
    if (vendor === 'paloalto') {
      if (this.mode === 'config') {
        return `admin@${hostname}# `;
      }
      return `admin@${hostname}> `;
    }

    // pfSense Authentic Prompts
    if (vendor === 'pfsense') {
      return `[root@${hostname}]/root: `;
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

    // 1. End Devices (PC, Laptop, Printer, Wireless Client) strictly run Windows Command Prompt
    if (['pc', 'laptop', 'printer', 'wireless-client'].includes(dev.type)) {
      return this.executeWindowsCmd(input, dev);
    }

    const vendor = dev.vendor || 'cisco';

    // 2. Linux machines strictly run Linux Bash
    if (vendor === 'linux') {
      return this.executeLinuxBash(input, dev);
    }

    // 3. Juniper machines strictly run Junos CLI
    if (vendor === 'juniper') {
      return this.executeJunosCli(input, dev);
    }

    // 4. MikroTik machines strictly run RouterOS CLI
    if (vendor === 'mikrotik') {
      return this.executeMikrotikCli(input, dev);
    }

    // 5. Fortinet machines strictly run FortiOS CLI
    if (vendor === 'fortinet') {
      return this.executeFortinetCli(input, dev);
    }

    // 6. Palo Alto machines strictly run PAN-OS CLI
    if (vendor === 'paloalto') {
      return this.executePaloAltoCli(input, dev);
    }

    // 7. Cisco IOS / Arista EOS (Routers, Switches, Cisco ASA)
    return this.executeCiscoIos(input, dev);
  }

  // --- 1. Windows Command Prompt (PC & End Devices) ---
  private executeWindowsCmd(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // ipconfig
    if (cmd === 'ipconfig') {
      const flag = tokens[1]?.toLowerCase();
      if (flag === '/all') {
        let out = `Windows IP Configuration\n\n   Host Name . . . . . . . . . . . . : ${dev.hostname}\n   Primary Dns Suffix  . . . . . . . : \n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . . : No\n   WINS Proxy Enabled. . . . . . . . : No\n`;
        for (const iface of Object.values(dev.interfaces)) {
          const ip = iface.ipv4?.address || '0.0.0.0';
          const pfx = iface.ipv4?.prefixLength || 24;
          out += `\nEthernet adapter ${iface.name}:\n   Description . . . . . . . . . . . : Gigabit Ethernet Controller\n   Physical Address. . . . . . . . . : ${iface.mac.toUpperCase()}\n   DHCP Enabled. . . . . . . . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${ip}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${prefixToMask(pfx)}\n   Default Gateway . . . . . . . . . : ${iface.ipv4?.gateway || '192.168.1.1'}\n   DNS Servers . . . . . . . . . . . : 8.8.8.8\n`;
        }
        return { output: out.trimEnd(), success: true, configChanged: false };
      }

      if (flag === '/release') {
        for (const iface of Object.values(dev.interfaces)) {
          this.model.updateInterface(dev.id, iface.id, { ipv4: undefined });
        }
        return {
          output: 'Windows IP Configuration\n\nEthernet adapter Ethernet:\n   IP Address. . . . . . . . . . . . : 0.0.0.0\n   Subnet Mask . . . . . . . . . . . : 0.0.0.0',
          success: true,
          configChanged: true,
        };
      }

      if (flag === '/renew') {
        const primaryIf = Object.values(dev.interfaces)[0];
        if (primaryIf) {
          this.model.updateInterface(dev.id, primaryIf.id, {
            ipv4: {
              address: '192.168.1.100',
              prefixLength: 24,
              gateway: '192.168.1.1',
            },
            adminState: 'up',
            operState: 'up',
          });
        }
        return {
          output: 'Windows IP Configuration\n\nEthernet adapter Ethernet:\n   Connection-specific DNS Suffix  . :\n   IPv4 Address. . . . . . . . . . . : 192.168.1.100\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1',
          success: true,
          configChanged: true,
        };
      }

      // Default ipconfig
      let out = `Windows IP Configuration\n`;
      for (const iface of Object.values(dev.interfaces)) {
        const ip = iface.ipv4?.address || '0.0.0.0';
        const pfx = iface.ipv4?.prefixLength || 24;
        out += `\nEthernet adapter ${iface.name}:\n   Connection-specific DNS Suffix  . :\n   IPv4 Address. . . . . . . . . . . : ${ip}\n   Subnet Mask . . . . . . . . . . . : ${prefixToMask(pfx)}\n   Default Gateway . . . . . . . . . : ${iface.ipv4?.gateway || '192.168.1.1'}\n`;
      }
      return { output: out.trimEnd(), success: true, configChanged: false };
    }

    // ping
    if (cmd === 'ping') {
      const isContinuous = tokens.includes('-t');
      // Extract target IP/host: skip option flags like -t, -n 4, etc.
      const target = tokens.slice(1).find((t) => !t.startsWith('-'));
      if (!target) return { output: 'Usage: ping [-t] [-n count] [-l size] target_name', success: false, configChanged: false };

      const simRes = this.handlePing(target);
      const isReachable = simRes.success;
      const count = isContinuous ? 8 : 4;

      let replies = '';
      if (!isReachable) {
        for (let i = 0; i < count; i++) {
          replies += 'Request timed out.\n';
        }
        if (isContinuous) replies += 'Control-C\n';
        return {
          output: `Pinging ${target} with 32 bytes of data:\n${replies}\nPing statistics for ${target}:\n    Packets: Sent = ${count}, Received = 0, Lost = ${count} (100% loss),`,
          success: false,
          configChanged: false,
        };
      }

      for (let i = 0; i < count; i++) {
        replies += `Reply from ${target}: bytes=32 time=1ms TTL=64\n`;
      }
      if (isContinuous) replies += 'Control-C\n';

      return {
        output: `Pinging ${target} with 32 bytes of data:\n${replies}\nPing statistics for ${target}:\n    Packets: Sent = ${count}, Received = ${count}, Lost = 0 (0% loss),\nApproximate round trip times in milli-seconds:\n    Minimum = 1ms, Maximum = 1ms, Average = 1ms`,
        success: true,
        configChanged: false,
      };
    }

    // tracert
    if (cmd === 'tracert') {
      const target = tokens.slice(1).find((t) => !t.startsWith('-'));
      if (!target) return { output: 'Usage: tracert [-d] [-h maximum_hops] target_name', success: false, configChanged: false };
      return {
        output: `Tracing route to ${target} over a maximum of 30 hops\n\n  1     1 ms     1 ms     1 ms  ${target}\n\nTrace complete.`,
        success: true,
        configChanged: false,
      };
    }

    // arp -a
    if (cmd === 'arp') {
      const primaryIf = Object.values(dev.interfaces)[0];
      const ip = primaryIf?.ipv4?.address || '192.168.1.10';
      let out = `Interface: ${ip} --- 0x2\n  Internet Address      Physical Address      Type\n`;
      for (const e of dev.arpTable) {
        out += `  ${e.ip.padEnd(21)} ${e.mac.replace(/:/g, '-').padEnd(21)} dynamic\n`;
      }
      if (dev.arpTable.length === 0) {
        out += `  192.168.1.1           00-11-22-33-44-55     dynamic\n`;
      }
      return { output: out.trimEnd(), success: true, configChanged: false };
    }

    // route print
    if (cmd === 'route' && tokens[1]?.toLowerCase() === 'print') {
      return {
        output: `===========================================================================\nInterface List\n 11...${Object.values(dev.interfaces)[0]?.mac || '00 1a 2b 3c 4d 5e'} ......Gigabit Ethernet Adapter\n===========================================================================\nIPv4 Route Table\n===========================================================================\nActive Routes:\nNetwork Destination        Netmask          Gateway       Interface  Metric\n          0.0.0.0          0.0.0.0      192.168.1.1     192.168.1.10     25\n        127.0.0.1  255.255.255.255         On-link         127.0.0.1    331\n      192.168.1.0    255.255.255.0         On-link      192.168.1.10    281\n===========================================================================`,
        success: true,
        configChanged: false,
      };
    }

    // nslookup
    if (cmd === 'nslookup') {
      const domain = tokens[1] || 'google.com';
      return {
        output: `Server:  dns.google\nAddress:  8.8.8.8\n\nNon-authoritative answer:\nName:    ${domain}\nAddress:  142.250.190.46`,
        success: true,
        configChanged: false,
      };
    }

    // netstat
    if (cmd === 'netstat') {
      return {
        output: `Active Connections\n\n  Proto  Local Address          Foreign Address        State\n  TCP    192.168.1.10:49215     142.250.190.46:443     ESTABLISHED\n  TCP    192.168.1.10:49216     1.1.1.1:443            ESTABLISHED`,
        success: true,
        configChanged: false,
      };
    }

    // cls / clear
    if (cmd === 'cls' || cmd === 'clear') {
      return { output: '', success: true, configChanged: false };
    }

    // help
    if (cmd === 'help' || cmd === '?') {
      return {
        output: `For more information on a specific command, type HELP command-name\nARP        Displays and modifies the IP-to-Physical address translation tables.\nCLS        Clears the screen.\nIPCONFIG   Displays all current TCP/IP network configuration values.\nNETSTAT    Displays protocol statistics and current TCP/IP network connections.\nNSLOOKUP   Queries DNS infrastructure for hostname resolution.\nPING       Verifies connectivity to another TCP/IP computer.\nROUTE      Manipulates network routing tables.\nTRACERT    Determines the path that a packet takes to reach a destination.`,
        success: true,
        configChanged: false,
      };
    }

    // Strict rejection of commands belonging to other operating systems (e.g. Cisco/Junos/Linux)
    return {
      output: `'${tokens[0]}' is not recognized as an internal or external command,\noperable program or batch file.`,
      success: false,
      configChanged: false,
    };
  }

  // --- 2. Linux Bash (VyOS & Linux Servers) ---
  private executeLinuxBash(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // ip addr / ip a / ifconfig
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

    // ip route / ip r / route -n
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

    // ping
    if (cmd === 'ping') {
      const target = tokens.find((t) => isValidIp(t)) || tokens[1];
      if (!target) return { output: 'Usage: ping [-c count] destination', success: false, configChanged: false };
      const sim = this.handlePing(target);
      if (!sim.success) {
        return {
          output: `PING ${target} (${target}) 56(84) bytes of data.\nFrom ${dev.hostname} icmp_seq=1 Destination Host Unreachable\n\n--- ${target} ping statistics ---\n4 packets transmitted, 0 received, 100% packet loss`,
          success: false,
          configChanged: false,
        };
      }
      return {
        output: `PING ${target} (${target}) 56(84) bytes of data.\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=1.02 ms\n64 bytes from ${target}: icmp_seq=2 ttl=64 time=1.15 ms\n64 bytes from ${target}: icmp_seq=3 ttl=64 time=0.98 ms\n64 bytes from ${target}: icmp_seq=4 ttl=64 time=1.08 ms\n\n--- ${target} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss, time 3004ms\nrtt min/avg/max/mdev = 0.981/1.057/1.152/0.063 ms`,
        success: true,
        configChanged: false,
      };
    }

    // traceroute
    if (cmd === 'traceroute') {
      const target = tokens[1];
      if (!target) return { output: 'Usage: traceroute host', success: false, configChanged: false };
      return {
        output: `traceroute to ${target} (${target}), 30 hops max, 60 byte packets\n 1  ${target} (${target})  1.121 ms  1.084 ms  1.050 ms`,
        success: true,
        configChanged: false,
      };
    }

    // arp -n / ip neigh
    if (input.toLowerCase() === 'arp -n' || input.toLowerCase() === 'ip neigh' || input.toLowerCase() === 'arp') {
      const header = 'Address                  HWtype  HWaddress           Flags Mask            Iface\n';
      const lines = dev.arpTable.map((e) => `${e.ip.padEnd(24)} ether   ${e.mac.padEnd(19)} C                     eth0`);
      return { output: header + (lines.join('\n') || '192.168.1.1             ether   00:11:22:33:44:55   C                     eth0'), success: true, configChanged: false };
    }

    // uname -a
    if (cmd === 'uname') {
      return { output: `Linux ${dev.hostname} 5.15.0-generic #1 SMP PREEMPT x86_64 GNU/Linux`, success: true, configChanged: false };
    }

    // cat /etc/os-release
    if (input.toLowerCase().startsWith('cat') && (input.includes('os-release') || input.includes('issue'))) {
      return {
        output: `NAME="Ubuntu Linux / VyOS"\nVERSION="22.04 LTS (Jammy Jellyfish)"\nID=ubuntu\nID_LIKE=debian\nPRETTY_NAME="Ubuntu 22.04 LTS"`,
        success: true,
        configChanged: false,
      };
    }

    // uptime
    if (cmd === 'uptime') {
      return { output: ` 23:28:14 up 14 days,  6:28,  1 user,  load average: 0.08, 0.03, 0.01`, success: true, configChanged: false };
    }

    // hostname
    if (cmd === 'hostname') {
      if (tokens[1]) {
        this.model.updateHostname(dev.id, tokens[1]);
        return { output: '', success: true, configChanged: true };
      }
      return { output: dev.hostname, success: true, configChanged: false };
    }

    // iptables -L
    if (input.toLowerCase().startsWith('iptables')) {
      return {
        output: `Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination`,
        success: true,
        configChanged: false,
      };
    }

    // clear
    if (cmd === 'clear') {
      return { output: '', success: true, configChanged: false };
    }

    // help
    if (cmd === 'help') {
      return {
        output: `GNU bash, version 5.1.16(1)-release (x86_64-pc-linux-gnu)\nSupported commands: ip addr, ip route, ping, traceroute, arp -n, iptables, hostname, uname, uptime, cat /etc/os-release`,
        success: true,
        configChanged: false,
      };
    }

    // Strict rejection of commands belonging to other operating systems
    return {
      output: `bash: ${tokens[0]}: command not found`,
      success: false,
      configChanged: false,
    };
  }

  // --- 3. Juniper Junos CLI ---
  private executeJunosCli(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // Configuration mode commands
    if (this.mode === 'config') {
      if (cmd === 'exit' || cmd === 'quit' || cmd === 'top') {
        this.mode = 'exec';
        return { output: 'Exiting configuration mode', success: true, configChanged: false };
      }

      if (cmd === 'commit') {
        return { output: 'commit complete', success: true, configChanged: false };
      }

      if (cmd === 'rollback') {
        return { output: 'load complete', success: true, configChanged: false };
      }

      if (cmd === 'show' || cmd === 'show configuration') {
        const lines: string[] = ['interfaces {'];
        for (const iface of Object.values(dev.interfaces)) {
          lines.push(`    ${iface.shortName} {`);
          lines.push(`        unit 0 {`);
          if (iface.ipv4) {
            lines.push(`            family inet {`);
            lines.push(`                address ${iface.ipv4.address}/${iface.ipv4.prefixLength || 24};`);
            lines.push(`            }`);
          }
          lines.push(`        }`);
          lines.push(`    }`);
        }
        lines.push('}');
        return { output: lines.join('\n'), success: true, configChanged: false };
      }

      // set interfaces <iface> unit 0 family inet address <ip/pfx>
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
        return { output: '% Syntax error: set interfaces <interface> unit 0 family inet address <ip/prefix>', success: false, configChanged: false };
      }

      // set system host-name <name>
      if (cmd === 'set' && tokens[1]?.toLowerCase() === 'system' && (tokens[2]?.toLowerCase() === 'host-name' || tokens[2]?.toLowerCase() === 'hostname')) {
        const name = tokens[3];
        if (name) {
          this.model.updateHostname(dev.id, name);
          return { output: `[edit]\nset system host-name ${name}`, success: true, configChanged: true };
        }
      }

      return {
        output: `syntax error, expecting <command>: "${tokens[0]}". In Junos configuration mode, use "set interfaces ...", "commit", or "exit".`,
        success: false,
        configChanged: false,
      };
    }

    // Operational mode commands
    if (cmd === 'configure' || cmd === 'edit') {
      this.mode = 'config';
      return { output: 'Entering configuration mode\n[edit]', success: true, configChanged: false };
    }

    // show interfaces terse
    if (input.toLowerCase() === 'show interfaces terse' || (cmd === 'show' && tokens[1]?.toLowerCase() === 'interfaces' && tokens[2]?.toLowerCase() === 'terse')) {
      const header = 'Interface               Admin Link Proto    Local                 Remote\n';
      const lines = Object.values(dev.interfaces).map((iface) => {
        const ip = iface.ipv4?.address ? `${iface.ipv4.address}/${iface.ipv4.prefixLength || 24}` : '';
        return `${iface.name.padEnd(23)} ${iface.adminState.padEnd(5)} ${iface.operState.padEnd(4)} inet     ${ip}`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    // show route
    if (input.toLowerCase() === 'show route' || input.toLowerCase() === 'show route brief') {
      const routes = dev.routingTable;
      const header = `inet.0: ${routes.length} destinations, ${routes.length} routes (active, 0 holddown, 0 hidden)\n+ = Active Route, - = Last Active, * = Both\n\n`;
      const lines = routes.map((r) => {
        const proto = r.source === 'connected' ? 'Direct/0' : r.source === 'ospf' ? 'OSPF/10' : 'Static/5';
        return `*${r.network}/${r.prefixLength}    [${proto}] 00:05:12\n                    via ${r.exitInterface || r.nextHop || 'discard'}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    // show arp
    if (input.toLowerCase() === 'show arp') {
      const header = 'MAC Address       Address         Name                      Interface     Flags\n';
      const lines = dev.arpTable.map((e) => `${e.mac.padEnd(17)} ${e.ip.padEnd(15)} ${e.ip.padEnd(25)} ge-0/0/0.0    none`);
      return { output: header + (lines.join('\n') || 'Total entries: 0'), success: true, configChanged: false };
    }

    // ping
    if (cmd === 'ping') {
      const target = tokens[1];
      if (!target) return { output: 'Usage: ping destination', success: false, configChanged: false };
      return {
        output: `PING ${target} (${target}): 56 data bytes\n64 bytes from ${target}: icmp_seq=0 ttl=64 time=1.214 ms\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=1.109 ms\n\n--- ${target} ping statistics ---\n2 packets transmitted, 2 packets received, 0% packet loss, round-trip min/avg/max = 1.109/1.161/1.214 ms`,
        success: true,
        configChanged: false,
      };
    }

    if (cmd === 'exit' || cmd === 'quit') {
      return { output: '', success: true, configChanged: false };
    }

    if (cmd === 'help' || cmd === '?') {
      return {
        output: `Junos CLI command reference:\n  configure                  Enter configuration mode\n  show interfaces terse      View interface link and IP states\n  show route                 Display active inet.0 route table\n  show arp                   Display ARP cache entries\n  ping <ip>                  Send ICMP echo requests\n  traceroute <ip>            Trace path to host`,
        success: true,
        configChanged: false,
      };
    }

    // Specific Junos error on Cisco commands
    if (cmd === 'enable') {
      return { output: 'unknown command: "enable". User root operates with full super-user privileges.', success: false, configChanged: false };
    }
    if (cmd === 'conf' || cmd === 'conf t') {
      return { output: 'unknown command: "conf t". In Junos, type "configure" to enter configuration mode.', success: false, configChanged: false };
    }
    if (cmd === 'show' && tokens[1]?.startsWith('ip')) {
      return { output: 'syntax error, expecting <command>: "show ip". In Junos, use "show interfaces terse" or "show route".', success: false, configChanged: false };
    }

    return {
      output: `unknown command: "${tokens[0]}". Type "configure" to enter configuration mode, or "show interfaces terse" to view interfaces.`,
      success: false,
      configChanged: false,
    };
  }

  // --- 4. MikroTik RouterOS CLI ---
  private executeMikrotikCli(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // /interface print
    if (input.includes('interface print') || input.includes('interface pr')) {
      const header = 'Flags: D - DYNAMIC; X - DISABLED, R - RUNNING\n #     NAME                                TYPE       ACTUAL-MTU\n';
      const lines = Object.values(dev.interfaces).map((iface, i) => {
        const flag = iface.operState === 'up' ? ' R ' : iface.adminState === 'down' ? ' X ' : '   ';
        return ` ${i}  ${flag} ${iface.shortName.padEnd(35)} ether            1500`;
      });
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    // /ip address print
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

    // /ip address add address=<ip/pfx> interface=<if>
    if (input.includes('address add')) {
      const addrMatch = input.match(/address=([^\s]+)/);
      const ifMatch = input.match(/interface=([^\s]+)/);
      if (addrMatch && ifMatch) {
        const [ip, pfx] = addrMatch[1].split('/');
        const prefix = parseInt(pfx || '24', 10);
        const targetIface = this.resolveInterface(dev, ifMatch[1]);
        if (targetIface && isValidIp(ip)) {
          this.model.updateInterface(dev.id, targetIface.id, {
            ipv4: { address: ip, prefixLength: prefix },
            adminState: 'up',
            operState: 'up',
          });
          return { output: '', success: true, configChanged: true };
        }
      }
      return { output: 'syntax: /ip address add address=<ip/prefix> interface=<name>', success: false, configChanged: false };
    }

    // /ip route print
    if (input.includes('route print') || input.includes('route pr')) {
      const routes = dev.routingTable;
      const header = 'Flags: X - DISABLED, A - ACTIVE, D - DYNAMIC, C - CONNECTED, S - STATIC, O - OSPF\n #     DST-ADDRESS        PREF-SRC        GATEWAY         DISTANCE\n';
      const lines = routes.map((r, i) => {
        const code = r.source === 'connected' ? 'ADC' : r.source === 'ospf' ? 'ADO' : 'AS ';
        return ` ${i}  ${code} ${(r.network + '/' + r.prefixLength).padEnd(18)}                 ${(r.nextHop || r.exitInterface || '').padEnd(15)} ${r.metric}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    // /system identity
    if (input.includes('system identity print')) {
      return { output: `name: "${dev.hostname}"`, success: true, configChanged: false };
    }

    // /system resource print
    if (input.includes('resource print')) {
      return {
        output: `                   uptime: 14d6h22m\n                  version: 7.10 (stable)\n              free-memory: 3.2GiB\n             total-memory: 4.0GiB\n                      cpu: tile\n                cpu-count: 4\n                 cpu-load: 8%`,
        success: true,
        configChanged: false,
      };
    }

    // ping
    if (cmd === 'ping' || cmd === '/ping') {
      const target = tokens[1];
      if (!target) return { output: 'syntax error', success: false, configChanged: false };
      return {
        output: `  SEQ HOST                                     SIZE TTL TIME  STATUS\n    0 ${target.padEnd(40)} 56  64 1ms\n    1 ${target.padEnd(40)} 56  64 1ms\n    sent=2 received=2 packet-loss=0% min-rtt=1ms avg-rtt=1ms max-rtt=1ms`,
        success: true,
        configChanged: false,
      };
    }

    // Strict rejection of Cisco/Windows/Linux commands
    return {
      output: `bad command name ${tokens[0]} (line 1 column 1)`,
      success: false,
      configChanged: false,
    };
  }

  // --- 5. Fortinet FortiOS CLI ---
  private executeFortinetCli(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // get system status
    if (input.toLowerCase() === 'get system status') {
      return {
        output: `Version: FortiGate-60F v7.4.2,build1396,231012 (GA)\nVirus-DB: 91.08234(2023-10-12 10:00)\nExtended DB: 91.00000(2023-10-12 10:00)\nIPS-DB: 6.00741(2023-10-12 10:00)\nFortiClient application signature package: 6.567\nSerial-Number: FG60FT${dev.id.slice(0, 10).toUpperCase()}\nLicense Status: Valid\nHostname: ${dev.hostname}\nOperation Mode: NAT`,
        success: true,
        configChanged: false,
      };
    }

    // get system interface physical / show system interface
    if (input.includes('interface physical') || input.includes('system interface')) {
      let out = '== [physical interface table] ==\n\n';
      for (const iface of Object.values(dev.interfaces)) {
        const ip = iface.ipv4?.address ? `${iface.ipv4.address} ${prefixToMask(iface.ipv4.prefixLength || 24)}` : '0.0.0.0 0.0.0.0';
        out += `==[${iface.shortName}]==\n    status: ${iface.adminState}\n    link: ${iface.operState}\n    ip: ${ip}\n    speed: ${iface.speed}Mbps-full\n\n`;
      }
      return { output: out.trimEnd(), success: true, configChanged: false };
    }

    // config firewall policy
    if (input.toLowerCase().includes('firewall policy')) {
      const pols = dev.firewallPolicies || [];
      let out = 'config firewall policy\n';
      pols.forEach((p, idx) => {
        out += `    edit ${idx + 1}\n        set name "${p.name}"\n        set srcintf "${p.srcInterface}"\n        set dstintf "${p.dstInterface}"\n        set action ${p.action}\n        set status ${p.status}\n    next\n`;
      });
      out += 'end';
      return { output: out, success: true, configChanged: false };
    }

    // get router info routing-table all
    if (input.toLowerCase().includes('routing-table')) {
      const routes = dev.routingTable;
      const header = `Codes: K - kernel, C - connected, S - static, R - RIP, B - BGP\n       O - OSPF, IA - OSPF inter area\n\n`;
      const lines = routes.map((r) => {
        const code = r.source === 'connected' ? 'C' : r.source === 'ospf' ? 'O' : 'S';
        return `${code}*      ${r.network}/${r.prefixLength} [${r.adminDistance}/${r.metric}] via ${r.nextHop || 'direct'}, ${r.exitInterface || 'port1'}`;
      });
      return { output: header + (lines.join('\n') || 'no routes'), success: true, configChanged: false };
    }

    // execute ping
    if (cmd === 'ping' || cmd === 'execute') {
      const target = tokens.find((t) => isValidIp(t)) || tokens[1];
      if (!target) return { output: 'command parse error: execute ping <ip>', success: false, configChanged: false };
      return {
        output: `PING ${target} (${target}): 56 data bytes\n64 bytes from ${target}: icmp_seq=0 ttl=64 time=1.2 ms\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=1.1 ms\n\n--- ${target} ping statistics ---\n2 packets transmitted, 2 packets received, 0% packet loss`,
        success: true,
        configChanged: false,
      };
    }

    // diagnose sys arp list
    if (input.toLowerCase().includes('arp list')) {
      const header = 'index=0 dev=21 proto=0806 arp_type=ether\n';
      const lines = dev.arpTable.map((e) => `IP=${e.ip} mac=${e.mac} state=00000002 use=1`);
      return { output: header + lines.join('\n'), success: true, configChanged: false };
    }

    // Strict rejection of other OS commands
    return {
      output: `command parse error before '${tokens[0]}'`,
      success: false,
      configChanged: false,
    };
  }

  // --- 6. Palo Alto PAN-OS CLI ---
  private executePaloAltoCli(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // show system info
    if (input.toLowerCase().includes('system info')) {
      return {
        output: `hostname: ${dev.hostname}\nip-address: 192.168.1.1\nnetmask: 255.255.255.0\ndefault-gateway: 192.168.1.254\nmac-address: 00:1b:17:00:01:00\ntime: Thu Oct 29 23:28:00 2026\nuptime: 14 days, 6:28:11\nfamily: 400\nmodel: PA-440\nsw-version: 11.1.0\napp-version: 8710-7912\nav-version: 4321-4820\nthreat-version: 8710-7912`,
        success: true,
        configChanged: false,
      };
    }

    // show interface all
    if (input.toLowerCase().includes('interface all') || input.toLowerCase().includes('interfaces')) {
      let out = 'total configured hardware interfaces: 4\n\nname                    id    speed/duplex/state        tag      mode\n--------------------------------------------------------------------------------\n';
      for (const iface of Object.values(dev.interfaces)) {
        out += `${iface.shortName.padEnd(23)} ${iface.id.padEnd(5)} ${iface.speed}/full/${iface.operState.padEnd(16)} 0        layer3\n`;
      }
      return { output: out.trimEnd(), success: true, configChanged: false };
    }

    // configure
    if (cmd === 'configure') {
      this.mode = 'config';
      return { output: 'Entering configuration mode\n[edit]', success: true, configChanged: false };
    }

    if (this.mode === 'config') {
      if (cmd === 'exit' || cmd === 'quit') {
        this.mode = 'exec';
        return { output: '', success: true, configChanged: false };
      }
      if (cmd === 'commit') {
        return { output: 'Configuration committed successfully', success: true, configChanged: false };
      }
    }

    // ping
    if (cmd === 'ping') {
      const target = tokens.find((t) => isValidIp(t)) || tokens[1];
      if (!target) return { output: 'Server error : host is missing', success: false, configChanged: false };
      return {
        output: `PING ${target} (${target}) 56(84) bytes of data.\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=1.12 ms\n64 bytes from ${target}: icmp_seq=2 ttl=64 time=1.05 ms\n\n--- ${target} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`,
        success: true,
        configChanged: false,
      };
    }

    return {
      output: `Server error : command not recognized`,
      success: false,
      configChanged: false,
    };
  }

  // --- 7. Cisco IOS & Arista EOS (Standard Network OS) ---
  private executeCiscoIos(input: string, dev: Device): CliExecutionResult {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // Support "do <command>" from config modes (Cisco IOS feature)
    if (cmd === 'do' && (this.mode !== 'exec' && this.mode !== 'priv-exec')) {
      const savedMode = this.mode;
      this.mode = 'priv-exec';
      const doRes = this.executeCiscoIos(tokens.slice(1).join(' '), dev);
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
