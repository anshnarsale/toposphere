import { describe, it, expect } from 'vitest';
import {
  ipToInt,
  intToIp,
  prefixToMask,
  maskToPrefix,
  getNetworkAddress,
  getBroadcastAddress,
  sameSubnet,
  isInNetwork,
  isValidIp,
  isValidPrefix,
  getHostRange,
  longestPrefixMatch,
} from '@/lib/ip';

describe('IPv4 Address & Subnetting Engine', () => {
  it('converts IP to 32-bit unsigned integer and back', () => {
    const ip = '192.168.1.10';
    const intVal = ipToInt(ip);
    expect(intVal).toBe(3232235786);
    expect(intToIp(intVal)).toBe(ip);
  });

  it('converts prefix length to subnet mask and vice-versa', () => {
    expect(prefixToMask(24)).toBe('255.255.255.0');
    expect(prefixToMask(16)).toBe('255.255.0.0');
    expect(prefixToMask(30)).toBe('255.255.255.252');
    expect(prefixToMask(8)).toBe('255.0.0.0');

    expect(maskToPrefix('255.255.255.0')).toBe(24);
    expect(maskToPrefix('255.255.0.0')).toBe(16);
    expect(maskToPrefix('255.255.255.252')).toBe(30);
  });

  it('calculates network and broadcast addresses correctly', () => {
    expect(getNetworkAddress('192.168.1.55', 24)).toBe('192.168.1.0');
    expect(getBroadcastAddress('192.168.1.0', 24)).toBe('192.168.1.255');

    expect(getNetworkAddress('10.20.30.40', 16)).toBe('10.20.0.0');
    expect(getBroadcastAddress('10.20.0.0', 16)).toBe('10.20.255.255');
  });

  it('detects if two hosts reside in the same subnet', () => {
    expect(sameSubnet('192.168.1.10', '192.168.1.50', 24)).toBe(true);
    expect(sameSubnet('192.168.1.10', '192.168.2.10', 24)).toBe(false);
    expect(sameSubnet('10.0.1.1', '10.0.2.1', 16)).toBe(true);
  });

  it('validates IP address syntax and prefix bounds', () => {
    expect(isValidIp('192.168.1.1')).toBe(true);
    expect(isValidIp('256.0.0.1')).toBe(false);
    expect(isValidIp('not-an-ip')).toBe(false);

    expect(isValidPrefix(24)).toBe(true);
    expect(isValidPrefix(33)).toBe(false);
    expect(isValidPrefix(-1)).toBe(false);
  });

  it('calculates usable host address range', () => {
    const range = getHostRange('192.168.1.0', 24);
    expect(range.first).toBe('192.168.1.1');
    expect(range.last).toBe('192.168.1.254');
    expect(range.count).toBe(254);
  });

  it('performs longest prefix match accurately', () => {
    const routes = [
      { network: '0.0.0.0', prefixLength: 0 },
      { network: '10.0.0.0', prefixLength: 8 },
      { network: '10.1.0.0', prefixLength: 16 },
      { network: '10.1.2.0', prefixLength: 24 },
    ];

    const match = longestPrefixMatch('10.1.2.55', routes);
    expect(match).not.toBeNull();
    expect(match?.network).toBe('10.1.2.0');
    expect(match?.prefixLength).toBe(24);

    const defaultMatch = longestPrefixMatch('172.16.1.1', routes);
    expect(defaultMatch?.network).toBe('0.0.0.0');
  });
});

