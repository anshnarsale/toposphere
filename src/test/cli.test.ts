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
});
