import { useSimulationStore } from '@/store/simulationStore';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import { ArrowRight, CheckCircle2, XCircle, Search, Radio, Network } from 'lucide-react';

export function EventTimeline() {
  const { events, selectedEventId, setSelectedEventId } = useSimulationStore();
  const { topology } = useNetworkStore();
  const { setPacketInspectorOpen } = useUiStore();

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8b949e]">
        <Radio className="w-8 h-8 text-[#484f58] mb-2 animate-pulse" />
        <div className="text-xs font-semibold text-[#e6edf3]">No Packet Simulation Events</div>
        <div className="text-[11px] max-w-sm mt-1">
          Open a device terminal and send traffic (e.g. <span className="font-mono text-[#58a6ff]">ping 192.168.1.20</span>) or run a simulated traffic flow to trace packet hops.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
      {events.map((evt) => {
        const dev = topology.devices[evt.deviceId];
        const isSelected = selectedEventId === evt.id;

        const badgeColor: Record<string, string> = {
          sent: 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40',
          forwarded: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40',
          switched: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40',
          routed: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40',
          received: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40',
          'arp-request': 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/40',
          'arp-reply': 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/40',
          'icmp-request': 'bg-[#39d0d8]/20 text-[#39d0d8] border-[#39d0d8]/40',
          'icmp-reply': 'bg-[#39d0d8]/20 text-[#39d0d8] border-[#39d0d8]/40',
          'mac-learned': 'bg-[#bc8cff]/20 text-[#bc8cff] border-[#bc8cff]/40',
          dropped: 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40',
          'no-route': 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40',
          'ttl-expired': 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40',
          'vlan-mismatch': 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40',
        };

        const colorClass = badgeColor[evt.type] || 'bg-[#21262d] text-[#8b949e] border-[#30363d]';

        return (
          <div
            key={evt.id}
            onClick={() => {
              setSelectedEventId(evt.id);
              setPacketInspectorOpen(true);
            }}
            className={`
              flex items-center gap-3 px-3 py-1.5 rounded border cursor-pointer transition-colors
              ${
                isSelected
                  ? 'bg-[#1f6feb]/15 border-[#58a6ff] text-[#e6edf3]'
                  : 'bg-[#161b22] border-[#21262d] hover:border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
              }
            `}
          >
            {/* Seq and Timestamp */}
            <span className="text-[#484f58] w-8">#{evt.sequence}</span>
            <span className="text-[#8b949e] w-14">+{evt.timestamp}ms</span>

            {/* Event Type Badge */}
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${colorClass}`}>
              {evt.type}
            </span>

            {/* Device and Interface */}
            <span className="text-[#e6edf3] font-semibold w-28 truncate">
              {dev?.hostname || evt.deviceId}
            </span>

            {/* Forwarding Decision / Details */}
            <span className="flex-1 truncate text-[#e6edf3]">
              {evt.decision || evt.dropReason || evt.details || 'Packet processed'}
            </span>

            {/* Inspect Button Pill */}
            <span className="text-[10px] text-[#58a6ff] hover:underline flex items-center gap-1 shrink-0">
              <Search className="w-3 h-3" />
              <span>Inspect</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
