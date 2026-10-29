import { useUiStore } from '@/store/uiStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useNetworkStore } from '@/store/networkStore';
import { X, Search, ChevronLeft, ChevronRight, Layers, ArrowRight, AlertCircle, CheckCircle2, Cpu } from 'lucide-react';

export function PacketInspectorModal() {
  const { isPacketInspectorOpen, setPacketInspectorOpen } = useUiStore();
  const { events, selectedEventId, setSelectedEventId } = useSimulationStore();
  const { topology } = useNetworkStore();

  if (!isPacketInspectorOpen) return null;

  const currentIdx = events.findIndex((e) => e.id === selectedEventId);
  const activeIdx = currentIdx >= 0 ? currentIdx : events.length - 1;
  const event = events[activeIdx] || events[events.length - 1];

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

  const handlePrevHop = () => {
    if (activeIdx > 0) {
      setSelectedEventId(events[activeIdx - 1].id);
    }
  };

  const handleNextHop = () => {
    if (activeIdx < events.length - 1) {
      setSelectedEventId(events[activeIdx + 1].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
        {/* Header & Step-Through Traversal */}
        <div className="p-3 border-b border-[#21262d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#58a6ff]" />
            <span className="font-bold text-[#e6edf3]">
              Packet Journey Inspector
            </span>
          </div>

          {/* Hop Stepper Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevHop}
              disabled={activeIdx <= 0}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30 disabled:pointer-events-none text-xs text-[#e6edf3] cursor-pointer"
              title="Previous packet hop"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Hop</span>
            </button>
            <span className="px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[11px] font-bold text-[#58a6ff]">
              Hop {activeIdx + 1} of {events.length}
            </span>
            <button
              onClick={handleNextHop}
              disabled={activeIdx >= events.length - 1}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30 disabled:pointer-events-none text-xs text-[#e6edf3] cursor-pointer"
              title="Next packet hop"
            >
              <span>Next Hop</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPacketInspectorOpen(false)}
              className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Processing Node & Decision */}
        <div className={`p-3.5 border-b border-[#21262d] ${isDrop ? 'bg-[#da3633]/10' : 'bg-[#161b22]'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#58a6ff]" />
              <span className="font-bold text-sm text-[#e6edf3]">{dev?.hostname || event.deviceId}</span>
              <span className="text-[11px] text-[#8b949e]">({dev?.model || 'Device'})</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                isDrop ? 'bg-[#da3633]/20 text-[#f85149]' : 'bg-[#238636]/20 text-[#3fb950]'
              }`}
            >
              {event.type}
            </span>
          </div>

          <div className="text-xs text-[#e6edf3] font-sans mt-2 flex items-start gap-2 bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
            {isDrop ? (
              <AlertCircle className="w-4 h-4 text-[#f85149] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-[#8b949e] font-semibold">Forwarding Decision: </span>
              <span className="text-[#e6edf3] font-medium leading-relaxed">
                {event.decision || event.dropReason || event.details || 'Packet processed and forwarded.'}
              </span>
            </div>
          </div>
        </div>

        {/* OSI 7-Layer Breakdown */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#0d1117] max-h-[420px]">
          {/* Layer 1: Physical Interface Port */}
          <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#8b949e]">OSI Layer 1 — Physical Port</span>
              <span className="text-[10px] text-[#3fb950] font-semibold">1000BASE-T Full-Duplex</span>
            </div>
            <div className="p-2.5 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#8b949e] block text-[10px]">Ingress Port:</span>
                <span className="text-[#e6edf3] font-semibold">{event.interfaceId || 'Fa0/1'}</span>
              </div>
              <div>
                <span className="text-[#8b949e] block text-[10px]">Physical Medium:</span>
                <span className="text-[#e6edf3]">Copper Straight-Through (UTP)</span>
              </div>
            </div>
          </div>

          {/* Layer 2: Ethernet Frame Header */}
          <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#58a6ff]">OSI Layer 2 — Ethernet II Frame</span>
              <span className="text-[10px] text-[#8b949e]">EtherType: {headers.etherType}</span>
            </div>
            <div className="p-2.5 grid grid-cols-2 gap-2 text-[11px]">
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
                <span className="font-bold text-[11px] text-[#3fb950]">OSI Layer 3 — IPv4 Header</span>
                <span className="text-[10px] text-[#8b949e]">TTL: {headers.ttl ?? 64} • Protocol: {headers.arpOp ? 'ARP' : 'ICMP (1)'}</span>
              </div>
              <div className="p-2.5 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[#8b949e] block text-[10px]">Source IP:</span>
                  <span className="text-[#e6edf3] font-semibold">{headers.srcIp}</span>
                </div>
                <div>
                  <span className="text-[#8b949e] block text-[10px]">Destination IP:</span>
                  <span className="text-[#e6edf3] font-semibold">{headers.dstIp}</span>
                </div>
              </div>
            </div>
          )}

          {/* Layer 4: Protocol Payload */}
          {headers.arpOp ? (
            <div className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#d29922]">OSI Layer 3/4 — ARP Resolution Message</span>
                <span className="text-[10px] text-[#8b949e] uppercase font-bold">{headers.arpOp}</span>
              </div>
              <div className="p-2.5 grid grid-cols-2 gap-2 text-[11px]">
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
                <span className="font-bold text-[11px] text-[#39d0d8]">OSI Layer 4 — ICMP Echo Request / Reply</span>
                <span className="text-[10px] text-[#8b949e]">Sequence: #{event.sequence}</span>
              </div>
              <div className="p-2.5 text-[11px] text-[#8b949e]">
                Payload Size: 32 bytes • Round-Trip Verification Active
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#21262d] flex items-center justify-between">
          <span className="text-[11px] text-[#8b949e]">
            Timestamp: {event.timestamp ? `${event.timestamp}ms` : '0ms'}
          </span>
          <button
            onClick={() => setPacketInspectorOpen(false)}
            className="px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-[#e6edf3] cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
