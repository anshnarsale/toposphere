import { useSimulationStore } from '@/store/simulationStore';
import { useNetworkStore } from '@/store/networkStore';
import { Send, ArrowRight } from 'lucide-react';

export function PacketList() {
  const { events } = useSimulationStore();
  const { topology } = useNetworkStore();

  // Group events by packetId
  const packetGroups = new Map<string, typeof events>();
  for (const evt of events) {
    if (!packetGroups.has(evt.packetId)) {
      packetGroups.set(evt.packetId, []);
    }
    packetGroups.get(evt.packetId)!.push(evt);
  }

  const flows = Array.from(packetGroups.entries()).map(([pktId, evts]) => {
    const first = evts[0];
    const last = evts[evts.length - 1];
    const srcDev = topology.devices[first.deviceId]?.hostname || first.deviceId;
    const dstDev = topology.devices[last.deviceId]?.hostname || last.deviceId;
    const isDropped = evts.some((e) => e.type === 'dropped' || e.type === 'no-route' || e.type === 'ttl-expired');

    return {
      packetId: pktId,
      srcDev,
      dstDev,
      srcIp: first.headers.srcIp || 'N/A',
      dstIp: first.headers.dstIp || 'N/A',
      hops: evts.length,
      protocol: first.headers.etherType === '0x0806' ? 'ARP' : 'ICMP/IPv4',
      status: isDropped ? 'Dropped' : 'Delivered',
      duration: last.timestamp - first.timestamp,
    };
  });

  if (flows.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8b949e]">
        <div className="text-xs font-semibold text-[#e6edf3]">No Packet Flows Captured</div>
        <div className="text-[11px] mt-1">Transmitted packets will display hop-by-hop journeys here.</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold uppercase text-[#8b949e] px-2">
        <div>Flow ID</div>
        <div>Source</div>
        <div>Destination</div>
        <div>Protocol</div>
        <div>Hops</div>
        <div>Status</div>
      </div>

      {flows.map((flow) => (
        <div
          key={flow.packetId}
          className="grid grid-cols-6 gap-2 items-center p-2 rounded bg-[#161b22] border border-[#21262d] text-xs font-mono"
        >
          <div className="text-[#8b949e] truncate">{flow.packetId}</div>
          <div className="text-[#e6edf3] font-semibold truncate">{flow.srcDev} ({flow.srcIp})</div>
          <div className="text-[#e6edf3] font-semibold truncate">{flow.dstDev} ({flow.dstIp})</div>
          <div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1f6feb]/20 text-[#58a6ff]">
              {flow.protocol}
            </span>
          </div>
          <div className="text-[#8b949e]">{flow.hops} hops (+{flow.duration}ms)</div>
          <div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                flow.status === 'Delivered'
                  ? 'bg-[#238636]/20 text-[#3fb950]'
                  : 'bg-[#da3633]/20 text-[#f85149]'
              }`}
            >
              {flow.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

