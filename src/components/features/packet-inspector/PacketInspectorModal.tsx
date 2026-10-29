import { useUiStore } from '@/store/uiStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useNetworkStore } from '@/store/networkStore';
import { X, Search, Layers, Radio, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

export function PacketInspectorModal() {
  const { isPacketInspectorOpen, setPacketInspectorOpen } = useUiStore();
  const { events, selectedEventId } = useSimulationStore();
  const { topology } = useNetworkStore();

  if (!isPacketInspectorOpen) return null;

  const event = events.find((e) => e.id === selectedEventId) || events[events.length - 1];

  if (!event) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 text-center text-xs text-[#8b949e]">
          No packet event selected to inspect.
          <button
            onClick={() => setPacketInspectorOpen(false)}
            className="block mt-4 mx-auto px-3 py-1 rounded bg-[#21262d] text-[#e6edf3]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const dev = topology.devices[event.deviceId];
  const headers = event.headers;
  const isDrop = event.type === 'dropped' || event.type === 'no-route' || event.type === 'ttl-expired';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="p-3.5 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#58a6ff]" />
            <span className="font-bold text-[#e6edf3]">
              Protocol Frame Analyzer (Event #{event.sequence})
            </span>
          </div>
          <button
            onClick={() => setPacketInspectorOpen(false)}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Processing Node & Decision */}
        <div className={`p-4 border-b border-[#21262d] ${isDrop ? 'bg-[#da3633]/10' : 'bg-[#0d1117]'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#58a6ff]" />
              <span className="font-bold text-[#e6edf3]">{dev?.hostname || event.deviceId}</span>
              <span className="text-[10px] text-[#8b949e]">({dev?.model || 'Device'})</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isDrop ? 'bg-[#da3633]/20 text-[#f85149]' : 'bg-[#238636]/20 text-[#3fb950]'
              }`}
            >
              {event.type}
            </span>
          </div>

          <div className="text-xs text-[#e6edf3] font-sans mt-2">
            <span className="text-[#8b949e] font-semibold">Decision Engine: </span>
            {event.decision || event.dropReason || event.details || 'Packet processed successfully.'}
          </div>
        </div>

        {/* OSI Layer Headers Breakdown */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#0d1117]">
          {/* Layer 2: Ethernet Frame Header */}
          <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#58a6ff]">Layer 2 — Ethernet II Frame</span>
              <span className="text-[10px] text-[#8b949e]">EtherType: {headers.etherType}</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#8b949e] block text-[10px]">Source MAC:</span>
                <span className="text-[#e6edf3] font-semibold">{headers.srcMac || '00:00:00:00:00:00'}</span>
              </div>
              <div>
                <span className="text-[#8b949e] block text-[10px]">Destination MAC:</span>
                <span className="text-[#e6edf3] font-semibold">{headers.dstMac || 'ff:ff:ff:ff:ff:ff'}</span>
              </div>
              {headers.vlanTag !== undefined && (
                <div className="col-span-2 pt-1 border-t border-[#21262d]">
                  <span className="text-[#8b949e] block text-[10px]">802.1Q Virtual LAN Tag:</span>
                  <span className="text-[#bc8cff] font-bold">VLAN {headers.vlanTag}</span>
                </div>
              )}
            </div>
          </div>

          {/* Layer 3: IPv4 Packet Header */}
          {headers.srcIp && (
            <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#3fb950]">Layer 3 — Internet Protocol v4 (IPv4)</span>
                <span className="text-[10px] text-[#8b949e]">TTL: {headers.ttl ?? 64}</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[#8b949e] block text-[10px]">Source IPv4:</span>
                  <span className="text-[#e6edf3] font-semibold">{headers.srcIp}</span>
                </div>
                <div>
                  <span className="text-[#8b949e] block text-[10px]">Destination IPv4:</span>
                  <span className="text-[#e6edf3] font-semibold">{headers.dstIp}</span>
                </div>
              </div>
            </div>
          )}

          {/* Protocol Payload: ARP or ICMP */}
          {headers.arpOp ? (
            <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#d29922]">Address Resolution Protocol (ARP)</span>
                <span className="text-[10px] text-[#8b949e] uppercase font-bold">{headers.arpOp}</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[#8b949e] block text-[10px]">Sender IP:</span>
                  <span className="text-[#e6edf3]">{headers.arpSenderIp}</span>
                </div>
                <div>
                  <span className="text-[#8b949e] block text-[10px]">Target IP:</span>
                  <span className="text-[#e6edf3]">{headers.arpTargetIp}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#39d0d8]">Internet Control Message Protocol (ICMP)</span>
                <span className="text-[10px] text-[#8b949e]">Echo Request/Reply</span>
              </div>
              <div className="p-3 text-[11px] text-[#8b949e]">
                Payload Data: 32 bytes (abcdefghijklmnopqrstuvwabcdefghi)
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#21262d] flex justify-end">
          <button
            onClick={() => setPacketInspectorOpen(false)}
            className="px-4 py-1.5 rounded-md bg-[#21262d] hover:bg-[#2d333b] text-xs font-semibold text-[#e6edf3] cursor-pointer"
          >
            Close Frame Analyzer
          </button>
        </div>
      </div>
    </div>
  );
}

