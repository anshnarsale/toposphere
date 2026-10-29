import type { Device } from '@/types/network';

export interface AclRule {
  sequence: number;
  action: 'permit' | 'deny';
  protocol: 'ip' | 'icmp' | 'tcp' | 'udp';
  sourceIp: string;
  sourceWildcard: string;
  destIp?: string;
  destWildcard?: string;
  port?: number;
  matches: number;
}

export interface NatTranslation {
  protocol: 'tcp' | 'udp' | 'icmp';
  insideLocal: string;
  insideGlobal: string;
  outsideLocal: string;
  outsideGlobal: string;
}

export class AclAndNatEngine {
  /**
   * Evaluate packet against interface ACL rules
   */
  public static evaluateAcl(
    rules: AclRule[],
    packet: {
      srcIp: string;
      dstIp: string;
      protocol: 'ip' | 'icmp' | 'tcp' | 'udp';
      port?: number;
    }
  ): { permitted: boolean; matchedRule?: AclRule; reason: string } {
    if (!rules || rules.length === 0) {
      return { permitted: true, reason: 'No ACL rules configured on interface (Permitted by default)' };
    }

    for (const rule of rules) {
      const protoMatch = rule.protocol === 'ip' || rule.protocol === packet.protocol;
      if (!protoMatch) continue;

      const srcMatch = AclAndNatEngine.matchesWildcard(packet.srcIp, rule.sourceIp, rule.sourceWildcard);
      if (!srcMatch) continue;

      if (rule.destIp && rule.destWildcard) {
        const dstMatch = AclAndNatEngine.matchesWildcard(packet.dstIp, rule.destIp, rule.destWildcard);
        if (!dstMatch) continue;
      }

      if (rule.port !== undefined && packet.port !== undefined) {
        if (rule.port !== packet.port) continue;
      }

      rule.matches++;
      return {
        permitted: rule.action === 'permit',
        matchedRule: rule,
        reason: `${rule.action.toUpperCase()} rule #${rule.sequence} matched packet ${packet.srcIp} -> ${packet.dstIp}`,
      };
    }

    // Cisco IOS implicit deny at end of access list
    return {
      permitted: false,
      reason: 'Implicit Deny: Dropped by default at end of access list',
    };
  }

  private static matchesWildcard(ip: string, targetNet: string, wildcard: string): boolean {
    if (targetNet === 'any' || targetNet === '0.0.0.0') return true;
    if (targetNet === 'host' && wildcard) return ip === wildcard;

    const ipParts = ip.split('.').map(Number);
    const netParts = targetNet.split('.').map(Number);
    const wcParts = wildcard.split('.').map(Number);

    for (let i = 0; i < 4; i++) {
      const mask = 255 - wcParts[i];
      if ((ipParts[i] & mask) !== (netParts[i] & mask)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Format "show access-lists"
   */
  public static formatShowAcl(dev: Device): string {
    return [
      `Standard IP access list 10`,
      `    10 permit 192.168.1.0, wildcard bits 0.0.0.255 (15 matches)`,
      `    20 deny any (2 matches)`,
      `Extended IP access list 101`,
      `    10 permit tcp 192.168.1.0 0.0.0.255 any eq www (48 matches)`,
      `    20 permit icmp any any (12 matches)`,
      `    30 deny ip any any (5 matches)`,
    ].join('\n');
  }

  /**
   * Format "show ip nat translations"
   */
  public static formatShowNatTranslations(dev: Device): string {
    const primaryIp = Object.values(dev.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address || '203.0.113.1';
    const header = [
      `Pro  Inside global         Inside local          Outside local         Outside global`,
      `---  -------------------   -------------------   -------------------   -------------------`,
    ].join('\n');

    const rows = [
      `icmp ${primaryIp}:1         192.168.1.10:1        8.8.8.8:1             8.8.8.8:1`,
      `tcp  ${primaryIp}:49152     192.168.1.10:49152    93.184.216.34:80      93.184.216.34:80`,
      `udp  ${primaryIp}:53120     192.168.1.20:53120    8.8.4.4:53            8.8.4.4:53`,
    ];

    return header + '\n' + rows.join('\n');
  }

  /**
   * Format "show ip nat statistics"
   */
  public static formatShowNatStatistics(dev: Device): string {
    return [
      `Total active translations: 3 (0 static, 3 dynamic; 3 extended)`,
      `Outside interfaces:`,
      `  GigabitEthernet0/0/0`,
      `Inside interfaces:`,
      `  GigabitEthernet0/0/1, GigabitEthernet0/0/2`,
      `Hits: 124  Misses: 3`,
      `CEF Translated packets: 124, CEF Punted packets: 0`,
      `Expired translations: 18`,
      `Dynamic mappings:`,
      `-- Inside Source`,
      `[Id: 1] access-list 1 interface GigabitEthernet0/0/0 ref count 3`,
    ].join('\n');
  }
}
