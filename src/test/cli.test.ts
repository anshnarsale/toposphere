import { describe, it, expect } from 'vitest';
import { CliParser } from '@/engine/cli/CliParser';
import { NetworkModel } from '@/engine/core/NetworkModel';

describe('Cisco-Like Terminal CLI Engine', () => {
  it('navigates modes (exec, priv-exec, config, config-if) with accurate prompts', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router', 'R1');
    const cli = new CliParser(router.id, model);

    expect(cli.getPrompt()).toBe('R1> ');

    cli.execute('enable');
    expect(cli.getPrompt()).toBe('R1# ');

    cli.execute('configure terminal');
    expect(cli.getPrompt()).toBe('R1(config)# ');

    cli.execute('interface GigabitEthernet0/0/0');
    expect(cli.getPrompt()).toContain('R1(config-if');

    cli.execute('exit');
    expect(cli.getPrompt()).toBe('R1(config)# ');

    cli.execute('end');
    expect(cli.getPrompt()).toBe('R1# ');
  });

  it('updates interface IP address and admin state directly via CLI commands', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router', 'R1');
    const cli = new CliParser(router.id, model);

    cli.execute('enable');
    cli.execute('conf t');
    cli.execute('interface GigabitEthernet0/0/0');

    // Assign IP
    const ipRes = cli.execute('ip address 192.168.10.1 255.255.255.0');
    expect(ipRes.success).toBe(true);
    expect(ipRes.configChanged).toBe(true);

    const iface = router.interfaces['gi0_0'];
    expect(iface.ipv4?.address).toBe('192.168.10.1');
    expect(iface.ipv4?.prefixLength).toBe(24);

    // Bring interface up
    const noShutRes = cli.execute('no shutdown');
    expect(noShutRes.success).toBe(true);
    expect(iface.adminState).toBe('up');
  });

  it('executes show ip interface brief with tabular output', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router', 'R1');
    const cli = new CliParser(router.id, model);

    const res = cli.execute('show ip interface brief');
    expect(res.success).toBe(true);
    expect(res.output).toContain('Interface');
    expect(res.output).toContain('GigabitEthernet0/0/0');
  });

  it('allows conf t directly from exec mode and handles interface abbreviations', () => {
    const model = new NetworkModel();
    const sw = model.addDevice('switch', 'Switch-1');
    const cli = new CliParser(sw.id, model);

    // Direct conf t without explicit enable
    const confRes = cli.execute('conf t');
    expect(confRes.success).toBe(true);
    expect(cli.getPrompt()).toBe('Switch-1(config)# ');

    // Abbreviated interface selection: int fa0/1 and int f0/2
    const intRes = cli.execute('int fa0/1');
    expect(intRes.success).toBe(true);
    expect(cli.getPrompt()).toBe('Switch-1(config-if)# ');

    // switchport mode access
    const swRes = cli.execute('switchport mode access');
    expect(swRes.success).toBe(true);

    // switchport access vlan 10
    const vlanRes = cli.execute('switchport access vlan 10');
    expect(vlanRes.success).toBe(true);

    // do command from config-if mode
    const doRes = cli.execute('do sh ip int br');
    expect(doRes.success).toBe(true);
    expect(doRes.output).toContain('Interface');
  });

  it('configures DHCP pool and executes show cdp neighbors', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router', 'R1');
    const sw = model.addDevice('switch', 'SW1');
    model.addLink(router.id, 'gi0_0', sw.id, 'fa0_1');

    const cli = new CliParser(router.id, model);
    cli.execute('en');
    cli.execute('conf t');

    // DHCP pool configuration
    cli.execute('ip dhcp pool CCNA-LAN');
    expect(cli.getPrompt()).toBe('R1(dhcp-config)# ');

    cli.execute('network 192.168.1.0 255.255.255.0');
    cli.execute('default-router 192.168.1.1');
    cli.execute('dns-server 8.8.8.8');
    cli.execute('exit');
    expect(cli.getPrompt()).toBe('R1(config)# ');

    // CDP neighbor check
    cli.execute('end');
    const cdpRes = cli.execute('show cdp neighbors');
    expect(cdpRes.success).toBe(true);
    expect(cdpRes.output).toContain('SW1');
  });

  it('PC Windows CLI correctly parses ping flags such as ping -t 192.168.1.1 and handles loopback', () => {
    const model = new NetworkModel();
    const pc = model.addDevice('pc', 'PC-2');
    const cli = new CliParser(pc.id, model);

    expect(cli.getPrompt()).toBe('C:\\Users\\Admin> ');

    // ping -t 127.0.0.1 (continuous loopback ping)
    const pingRes = cli.execute('ping -t 127.0.0.1');
    expect(pingRes.output).toContain('Pinging 127.0.0.1 with 32 bytes of data:');
    expect(pingRes.output).toContain('Reply from 127.0.0.1: bytes=32');
    expect(pingRes.output).not.toContain('Pinging -t');
    expect(pingRes.output).toContain('Control-C');

    // ipconfig shows assigned IP and gateway
    const ipRes = cli.execute('ipconfig');
    expect(ipRes.output).toContain('Windows IP Configuration');
    expect(ipRes.output).toContain('IPv4 Address');
    expect(ipRes.output).toContain('Default Gateway');
  });

  it('accurately auto-completes commands when pressing Tab like real Cisco & Windows devices', () => {
    const model = new NetworkModel();
    const router = model.addDevice('router', 'R1');
    const cli = new CliParser(router.id, model);

    // Cisco user exec -> enable
    expect(cli.autocomplete('en')).toBe('enable ');
    expect(cli.autocomplete('sh ip int b')).toBe('show ip interface brief ');
    expect(cli.autocomplete('sh ip r')).toBe('show ip route ');

    // Priv-exec mode -> configure terminal
    cli.execute('enable');
    expect(cli.autocomplete('conf t')).toBe('configure terminal ');
    expect(cli.autocomplete('copy r s')).toBe('copy running-config startup-config ');
    expect(cli.autocomplete('sh run')).toBe('show running-config ');

    // Config mode -> interface & vlan
    cli.execute('conf t');
    expect(cli.autocomplete('int')).toBe('interface ');
    expect(cli.autocomplete('no sh')).toBe('no shutdown ');

    // Config-if mode
    cli.execute('interface GigabitEthernet0/0/0');
    expect(cli.autocomplete('ip add')).toBe('ip address ');
    expect(cli.autocomplete('no sh')).toBe('no shutdown ');

    // Windows PC auto-completion
    const pc = model.addDevice('pc', 'PC-1');
    const pcCli = new CliParser(pc.id, model);
    expect(pcCli.autocomplete('ipc')).toBe('ipconfig ');
    expect(pcCli.autocomplete('ipconfig /a')).toBe('ipconfig /all ');
    expect(pcCli.autocomplete('pi')).toBe('ping ');
    expect(pcCli.autocomplete('tra')).toBe('tracert ');
  });
});

