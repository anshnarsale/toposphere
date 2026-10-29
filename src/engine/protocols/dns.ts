import type { Device, DnsRecord } from '@/types/network';

export interface DnsQuery {
  hostname: string;
  type: 'A' | 'PTR';
}

export interface DnsResponse {
  success: boolean;
  hostname?: string;
  ip?: string;
  errorReason?: string;
}

export function resolveDns(device: Device, query: DnsQuery): DnsResponse {
  if (!device.services.dnsEnabled) {
    return { success: false, errorReason: 'DNS service not enabled on this device' };
  }

  const records = device.services.dnsRecords;

  if (query.type === 'A') {
    const record = records.find(
      r => r.hostname.toLowerCase() === query.hostname.toLowerCase() && r.type === 'A'
    );
    if (record) return { success: true, hostname: record.hostname, ip: record.ip };
    return { success: false, errorReason: `No A record found for ${query.hostname}` };
  }

  if (query.type === 'PTR') {
    const record = records.find(r => r.ip === query.hostname && r.type === 'PTR');
    if (record) return { success: true, hostname: record.hostname, ip: record.ip };
    return { success: false, errorReason: `No PTR record found for ${query.hostname}` };
  }

  return { success: false, errorReason: 'Unsupported query type' };
}
