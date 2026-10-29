import { describe, it, expect } from 'vitest';
import { NetworkModel } from '@/engine/core/NetworkModel';
import { addArpEntry, lookupArp, createArpRequest, createArpReply } from '@/engine/protocols/arp';

describe('Address Resolution Protocol (ARP) Simulation', () => {
  it('creates ARP requests and replies with accurate packet structure', () => {
    const req = createArpRequest('02:4e:4c:00:00:01', '192.168.1.10', '192.168.1.1');
    expect(req.op).toBe('request');
    expect(req.senderIp).toBe('192.168.1.10');
    expect(req.targetIp).toBe('192.168.1.1');
    expect(req.targetMac).toBe('00:00:00:00:00:00');

    const rep = createArpReply('02:4e:4c:00:00:02', '192.168.1.1', '02:4e:4c:00:00:01', '192.168.1.10');
    expect(rep.op).toBe('reply');
    expect(rep.senderMac).toBe('02:4e:4c:00:00:02');
  });

  it('manages device ARP caches dynamically', () => {
    const model = new NetworkModel();
    const pc = model.addDevice('pc');

    expect(lookupArp(pc, '192.168.1.1')).toBeNull();

    addArpEntry(pc, '192.168.1.1', '02:4e:4c:99:99:99', 'eth0');
    const entry = lookupArp(pc, '192.168.1.1');
    expect(entry).not.toBeNull();
    expect(entry?.mac).toBe('02:4e:4c:99:99:99');
    expect(entry?.dynamic).toBe(true);
  });
});

