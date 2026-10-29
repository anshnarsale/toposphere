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

  it('strictly isolates operating system commands per device type and vendor', () => {
    // 1. PC / End Device: Strictly runs Windows Command Prompt
    const pc = model.addDevice('pc', 'PC-Accounting');
    const pcCli = new CliParser(pc.id, model);
    expect(pcCli.getPrompt()).toBe('C:\\Users\\Admin> ');

    // Windows ipconfig works
    const ipcfgRes = pcCli.execute('ipconfig');
    expect(ipcfgRes.success).toBe(true);
    expect(ipcfgRes.output).toContain('Windows IP Configuration');

    // Cisco commands on PC are strictly rejected
    const pcCiscoRes = pcCli.execute('enable');
    expect(pcCiscoRes.success).toBe(false);
    expect(pcCiscoRes.output).toContain('is not recognized as an internal or external command');

    const pcConfRes = pcCli.execute('conf t');
    expect(pcConfRes.success).toBe(false);
    expect(pcConfRes.output).toContain('is not recognized as an internal or external command');

    // 2. Linux Server: Strictly runs Bash
    const srv = model.addDevice('server', 'Web-01', 'linux');
    const srvCli = new CliParser(srv.id, model);
    expect(srvCli.getPrompt()).toBe('root@Web-01:~# ');

    // Cisco commands on Linux are strictly rejected
    const srvEnable = srvCli.execute('enable');
    expect(srvEnable.success).toBe(false);
    expect(srvEnable.output).toBe('bash: enable: command not found');

    const srvConf = srvCli.execute('conf t');
    expect(srvConf.success).toBe(false);
    expect(srvConf.output).toBe('bash: conf: command not found');

    // 3. Juniper Junos: Strictly rejects Cisco commands
    const jDev = model.addDevice('router', 'MX-Core', 'juniper');
    const jCli = new CliParser(jDev.id, model);
    const jEnable = jCli.execute('enable');
    expect(jEnable.output).toContain('unknown command: "enable"');

    // 4. Fortinet: Strictly rejects Cisco commands
    const fg = model.addDevice('firewall', 'FG-Edge', 'fortinet');
    const fgCli = new CliParser(fg.id, model);
    const fgEnable = fgCli.execute('enable');
    expect(fgEnable.output).toContain("command parse error before 'enable'");
  });

  it('supports expanded Next-Gen Firewalls (Fortinet, Palo Alto, pfSense) and GUI policy management', () => {
    const pa = model.addDevice('firewall', 'PA-Branch', 'paloalto');
    expect(pa.vendor).toBe('paloalto');
    expect(pa.interfaces['eth1_1']).toBeDefined();
    expect(pa.firewallPolicies).toBeDefined();
    expect(pa.firewallPolicies!.length).toBeGreaterThan(0);

    const pfsense = model.addDevice('firewall', 'pfSense-HQ', 'pfsense');
    expect(pfsense.vendor).toBe('pfsense');
    expect(pfsense.interfaces['wan']).toBeDefined();
    expect(pfsense.interfaces['lan']).toBeDefined();

    // Policy CRUD test on firewall
    const newRule = model.addFirewallPolicy(pa.id, {
      name: 'Allow_Web_Admin',
      srcInterface: 'eth1_2',
      dstInterface: 'mgmt',
      srcSubnet: '10.0.0.0/24',
      dstSubnet: 'all',
      service: 'HTTPS',
      action: 'accept',
      nat: false,
      status: 'enabled',
      hits: 0,
    });
    expect(newRule).toBeDefined();
    expect(pa.firewallPolicies?.some((p) => p.name === 'Allow_Web_Admin')).toBe(true);

    // Update policy status
    model.updateFirewallPolicy(pa.id, newRule!.id, { status: 'disabled' });
    const updated = pa.firewallPolicies?.find((p) => p.id === newRule!.id);
    expect(updated?.status).toBe('disabled');

    // Delete policy
    model.deleteFirewallPolicy(pa.id, newRule!.id);
    expect(pa.firewallPolicies?.some((p) => p.id === newRule!.id)).toBe(false);
  });
});
