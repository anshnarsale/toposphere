import { useState } from 'react';
import type { Device } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';
import { Plus, Trash2, Route } from 'lucide-react';
import { maskToPrefix, isValidIp } from '@/lib/ip';
import { RoutingEngine } from '@/engine/routing/RoutingEngine';

interface RoutingTabProps {
  device: Device;
}

export function RoutingTab({ device }: RoutingTabProps) {
  const [network, setNetwork] = useState('');
  const [mask, setMask] = useState('255.255.255.0');
  const [nextHop, setNextHop] = useState('');

  const { addStaticRoute, removeStaticRoute } = useNetworkStore();
  const { pushHistorySnapshot } = useProjectStore();

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!network || !mask || !nextHop) return;

    if (!isValidIp(network) || !isValidIp(nextHop)) {
      alert('Invalid IP or Next-Hop address');
      return;
    }

    try {
      const prefixLength = maskToPrefix(mask);
      addStaticRoute(device.id, {
        network,
        prefixLength,
        nextHop,
        adminDistance: 1,
        metric: 0,
      });
      pushHistorySnapshot();
      setNetwork('');
      setNextHop('');
    } catch {
      alert('Invalid Subnet Mask');
    }
  };

  return (
    <div className="space-y-4 p-3 text-xs text-[#e6edf3]">
      {/* Add Static Route Form */}
      <form onSubmit={handleAddRoute} className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2.5">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e] flex items-center gap-1.5">
          <Route className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span>Add Static Route</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#8b949e] block mb-1">Destination Network</label>
            <input
              type="text"
              placeholder="10.0.0.0"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8b949e] block mb-1">Subnet Mask</label>
            <input
              type="text"
              placeholder="255.255.255.0"
              value={mask}
              onChange={(e) => setMask(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-[#8b949e] block mb-1">Next-Hop Gateway IP</label>
          <input
            type="text"
            placeholder="192.168.1.1"
            value={nextHop}
            onChange={(e) => setNextHop(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Static Route</span>
        </button>
      </form>

      {/* Static Routes List */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e]">Configured Static Routes</div>
        {device.staticRoutes.length === 0 ? (
          <div className="text-[#8b949e] text-[11px] italic">No static routes configured.</div>
        ) : (
          <div className="space-y-1.5">
            {device.staticRoutes.map((sr) => (
              <div
                key={sr.id}
                className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#21262d] font-mono text-[11px]"
              >
                <div>
                  <span className="text-[#58a6ff] font-semibold">{sr.network}/{sr.prefixLength}</span>
                  <span className="text-[#8b949e] ml-2">via {sr.nextHop}</span>
                </div>
                <button
                  onClick={() => {
                    removeStaticRoute(device.id, sr.id);
                    pushHistorySnapshot();
                  }}
                  className="text-[#8b949e] hover:text-[#f85149] p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Routing Table View */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e]">Active IP Routing Table</div>
        <pre className="p-2.5 rounded bg-[#0d1117] border border-[#21262d] font-mono text-[10px] text-[#8b949e] leading-relaxed whitespace-pre-wrap overflow-x-auto">
          {RoutingEngine.formatRoutingTable(device)}
        </pre>
      </div>
    </div>
  );
}

