import { useState } from 'react';
import type { Device } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';
import { Server, Globe, Power, Plus, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { maskToPrefix, isValidIp } from '@/lib/ip';

interface ServicesTabProps {
  device: Device;
}

export function ServicesTab({ device }: ServicesTabProps) {
  const [dhcpName, setDhcpName] = useState('');
  const [dhcpNetwork, setDhcpNetwork] = useState('');
  const [dhcpMask, setDhcpMask] = useState('255.255.255.0');
  const [dhcpGw, setDhcpGw] = useState('');

  const [dnsHost, setDnsHost] = useState('');
  const [dnsIp, setDnsIp] = useState('');

  const { pushHistorySnapshot } = useProjectStore();

  const handleToggleDhcp = () => {
    device.services.dhcpEnabled = !device.services.dhcpEnabled;
    pushHistorySnapshot();
  };

  const handleToggleDns = () => {
    device.services.dnsEnabled = !device.services.dnsEnabled;
    pushHistorySnapshot();
  };

  const handleAddDhcpPool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dhcpName || !dhcpNetwork || !dhcpGw) return;
    try {
      const prefix = maskToPrefix(dhcpMask);
      device.services.dhcpPools.push({
        id: generateId('pool'),
        name: dhcpName,
        network: dhcpNetwork,
        prefixLength: prefix,
        defaultGateway: dhcpGw,
        dnsServer: '8.8.8.8',
        leaseTime: 86400,
        excludedAddresses: [],
      });
      pushHistorySnapshot();
      setDhcpName('');
      setDhcpNetwork('');
      setDhcpGw('');
    } catch {
      alert('Invalid subnet mask');
    }
  };

  const handleAddDnsRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dnsHost || !dnsIp) return;
    if (!isValidIp(dnsIp)) {
      alert('Invalid IP address');
      return;
    }

    device.services.dnsRecords.push({
      hostname: dnsHost.trim(),
      ip: dnsIp.trim(),
      type: 'A',
    });
    pushHistorySnapshot();
    setDnsHost('');
    setDnsIp('');
  };

  return (
    <div className="space-y-4 p-3 text-xs text-[#e6edf3]">
      {/* DHCP Server Section */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <Server className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>DHCP Server Service</span>
          </div>
          <button
            onClick={handleToggleDhcp}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
              device.services.dhcpEnabled
                ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40'
                : 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{device.services.dhcpEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        {device.services.dhcpEnabled && (
          <form onSubmit={handleAddDhcpPool} className="space-y-2 pt-2 border-t border-[#21262d]">
            <div className="text-[10px] uppercase font-semibold text-[#8b949e]">Create DHCP Address Pool</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Pool Name (e.g. LAN-POOL)"
                value={dhcpName}
                onChange={(e) => setDhcpName(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] outline-none"
              />
              <input
                type="text"
                placeholder="Network (e.g. 192.168.1.0)"
                value={dhcpNetwork}
                onChange={(e) => setDhcpNetwork(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Subnet Mask"
                value={dhcpMask}
                onChange={(e) => setDhcpMask(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono outline-none"
              />
              <input
                type="text"
                placeholder="Default Gateway"
                value={dhcpGw}
                onChange={(e) => setDhcpGw(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1 px-3 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add DHCP Pool</span>
            </button>
          </form>
        )}
      </div>

      {/* DNS Service Section */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <Globe className="w-3.5 h-3.5 text-[#39d0d8]" />
            <span>DNS Server Service</span>
          </div>
          <button
            onClick={handleToggleDns}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
              device.services.dnsEnabled
                ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40'
                : 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{device.services.dnsEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        {device.services.dnsEnabled && (
          <form onSubmit={handleAddDnsRecord} className="space-y-2 pt-2 border-t border-[#21262d]">
            <div className="text-[10px] uppercase font-semibold text-[#8b949e]">Add DNS A-Record</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Hostname (nexalab.local)"
                value={dnsHost}
                onChange={(e) => setDnsHost(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] outline-none"
              />
              <input
                type="text"
                placeholder="Target IPv4 Address"
                value={dnsIp}
                onChange={(e) => setDnsIp(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1 px-3 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
