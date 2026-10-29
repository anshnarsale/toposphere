import { useSimulationStore } from '@/store/simulationStore';
import { useNetworkStore } from '@/store/networkStore';
import { Terminal } from 'lucide-react';

export function ConsoleOutput() {
  const { events } = useSimulationStore();
  const { topology } = useNetworkStore();

  return (
    <div className="h-full overflow-y-auto p-3 font-mono text-xs bg-[#0d1117] text-[#e6edf3] space-y-1">
      <div className="text-[10px] text-[#484f58] border-b border-[#21262d] pb-1 mb-2">
        NexaLab Kernel Engine Output Stream — Real-time event log
      </div>

      {events.length === 0 ? (
        <div className="text-[#8b949e] italic text-center py-6">
          Engine online. Waiting for network traffic generation...
        </div>
      ) : (
        events.map((evt) => {
          const dev = topology.devices[evt.deviceId];
          const time = new Date(evt.wallTime).toLocaleTimeString();

          return (
            <div key={evt.id} className="leading-relaxed">
              <span className="text-[#484f58]">[{time}]</span>{' '}
              <span className="text-[#58a6ff] font-bold">{dev?.hostname || evt.deviceId}:</span>{' '}
              <span className="text-[#bc8cff] uppercase">[{evt.type}]</span>{' '}
              <span className="text-[#e6edf3]">{evt.decision || evt.dropReason || 'Event processed'}</span>
              {evt.headers.srcIp && (
                <span className="text-[#8b949e] ml-2">
                  (Src: {evt.headers.srcIp} &rarr; Dst: {evt.headers.dstIp})
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

