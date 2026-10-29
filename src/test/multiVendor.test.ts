import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { CliParser } from '@/engine/cli/CliParser';

describe('Multi-Vendor Architecture & CLI Simulation', () => {
  let model: NetworkModel;

  beforeEach(() => {
    model = new NetworkModel();
  });

  it('creates authentic hardware profiles and interface naming across all 6 vendors', () => {
    const ciscoRouter = model.addDevice('router', 'R-Cisco', 'cisco');
    expect(ciscoRouter.vendor).toBe('cisco');
    expect(ciscoRouter.interfaces['gi0_0']).toBeDefined();
    expect(ciscoRouter.interfaces['gi0_0'].shortName).toBe('Gi0/0/0');

    const juniperRouter = model.addDevice('router', 'R-Juniper', 'juniper');
    expect(juniperRouter.vendor).toBe('juniper');
    expect(juniperRouter.interfaces['ge-0_0_0']).toBeDefined();
    expect(juniperRouter.interfaces['ge-0_0_0'].name).toBe('ge-0/0/0');

    const aristaSwitch = model.addDevice('switch', 'SW-Arista', 'arista');
    expect(aristaSwitch.vendor).toBe('arista');
    expect(aristaSwitch.interfaces['Et1']).toBeDefined();
    expect(aristaSwitch.interfaces['Et1'].name).toBe('Ethernet1');

    const mikrotikRouter = model.addDevice('router', 'R-MikroTik', 'mikrotik');
    expect(mikrotikRouter.vendor).toBe('mikrotik');
    expect(mikrotikRouter.interfaces['ether1']).toBeDefined();

    const fortinetFw = model.addDevice('firewall', 'FW-FortiGate', 'fortinet');
    expect(fortinetFw.vendor).toBe('fortinet');
    expect(fortinetFw.interfaces['wan1']).toBeDefined();

    const linuxServer = model.addDevice('server', 'SRV-Ubuntu', 'linux');
    expect(linuxServer.vendor).toBe('linux');
    expect(linuxServer.interfaces['eth0']).toBeDefined();
  });

  it('provides authentic prompts and commands for Juniper Junos', () => {
    const jDev = model.addDevice('router', 'juniper-core', 'juniper');
    const parser = new CliParser(jDev.id, model);

    // Initial operational prompt
    expect(parser.getPrompt()).toBe('root@juniper-core> ');

    // Junos terse interfaces
    const terseRes = parser.execute('show interfaces terse');
    expect(terseRes.success).toBe(true);
    expect(terseRes.output).toContain('ge-0/0/0');

    // Junos configuration mode
    const confRes = parser.execute('configure');
    expect(confRes.success).toBe(true);
    expect(parser.getPrompt()).toContain('root@juniper-core# ');

    // Junos set interface IP
    const setRes = parser.execute('set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24');
    expect(setRes.success).toBe(true);
    expect(jDev.interfaces['ge-0_0_0'].ipv4?.address).toBe('10.0.0.1');

    // Junos commit
    const commitRes = parser.execute('commit');
    expect(commitRes.output).toBe('commit complete');
  });

  it('provides authentic prompts and commands for Linux / Ubuntu', () => {
    const lDev = model.addDevice('server', 'ubuntu-app', 'linux');
    const parser = new CliParser(lDev.id, model);

    expect(parser.getPrompt()).toBe('root@ubuntu-app:~# ');

    const ipAddrRes = parser.execute('ip addr');
    expect(ipAddrRes.success).toBe(true);
    expect(ipAddrRes.output).toContain('link/ether');

    const unameRes = parser.execute('uname -a');
    expect(unameRes.output).toContain('Linux');

    const osRes = parser.execute('cat /etc/os-release');
    expect(osRes.output).toContain('Ubuntu');
  });

  it('provides authentic commands for MikroTik RouterOS and Fortinet', () => {
    const mkDev = model.addDevice('router', 'mikrotik-edge', 'mikrotik');
    const mkParser = new CliParser(mkDev.id, model);
    expect(mkParser.getPrompt()).toBe('[admin@mikrotik-edge] > ');

    const ifPrintRes = mkParser.execute('/interface print');
    expect(ifPrintRes.success).toBe(true);
    expect(ifPrintRes.output).toContain('ether1');

    const fgDev = model.addDevice('firewall', 'fortigate-hq', 'fortinet');
    const fgParser = new CliParser(fgDev.id, model);
    expect(fgParser.getPrompt()).toBe('fortigate-hq # ');

    const fgStatus = fgParser.execute('get system status');
    expect(fgStatus.output).toContain('FortiGate');
  });
});
