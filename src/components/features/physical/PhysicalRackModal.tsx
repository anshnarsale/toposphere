import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { DeviceIcon } from '../device-library/DeviceIcon';
import { X, Server, Power, Layers, Activity } from 'lucide-react';

export function PhysicalRackModal() {
  const { isPhysicalRackOpen, setPhysicalRackOpen, setSelectedDeviceIds, setActiveTerminalDevice } = useUiStore();
  const { topology } = useNetworkStore();

  if (!isPhysicalRackOpen) return null;

  const devices = Object.values(topology.devices);
  const rackDevices = devices.filter((d) => ['switch', 'switch-l3', 'router', 'server', 'firewall'].includes(d.type));
  const tableDevices = devices.filter((d) => ['pc', 'laptop', 'printer', 'wireless-client'].includes(d.type));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-5xl h-[85vh] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#3fb950]/20 text-[#3fb950]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">Physical Workspace View (19" Equipment Rack)</h2>
              <p className="text-xs text-[#8b949e]">Hardware rack-mount & desktop workstation visualization</p>
            </div>
          </div>

          <button
            onClick={() => setPhysicalRackOpen(false)}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden bg-[#0d1117] p-6 gap-6">
          {/* Left: 19-Inch Server Rack */}
          <div className="w-1/2 flex flex-col items-center">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8b949e] mb-2 flex items-center gap-1.5">
              <span>Main Telecom Rack 1</span>
              <span className="text-[10px] text-[#484f58]">(Standard 42U)</span>
            </div>

            {/* The Rack Enclosure */}
            <div className="w-full max-w-md flex-1 rounded-xl border-4 border-[#30363d] bg-[#090d13] p-3 flex flex-col gap-2 overflow-y-auto shadow-2xl relative">
              {/* Rack Side Rails */}
              <div className="absolute left-1 top-2 bottom-2 w-1 border-r border-dashed border-[#21262d]" />
              <div className="absolute right-1 top-2 bottom-2 w-1 border-l border-dashed border-[#21262d]" />

              {rackDevices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-[#484f58] p-6">
                  <Server className="w-12 h-12 mb-2 opacity-40" />
                  <div>No rack-mountable devices deployed</div>
                  <div className="text-[10px] mt-1">Add routers, switches, or servers to see them mounted here.</div>
                </div>
              ) : (
                rackDevices.map((dev, uIdx) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      setSelectedDeviceIds([dev.id]);
                      setActiveTerminalDevice(dev.id);
                      setPhysicalRackOpen(false);
                    }}
                    className="group relative flex items-center justify-between p-3 rounded-md bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] hover:bg-[#1c2128] transition-all cursor-pointer shadow-md"
                  >
                    {/* Unit Number Indicator */}
                    <span className="font-mono text-[9px] text-[#484f58] absolute left-1.5">
                      U{uIdx + 1}
                    </span>

                    <div className="flex items-center gap-3 pl-4">
                      <DeviceIcon type={dev.type} size={36} />
                      <div>
                        <div className="font-bold text-[#e6edf3] text-xs group-hover:text-[#58a6ff]">
                          {dev.hostname}
                        </div>
                        <div className="text-[10px] text-[#8b949e] font-mono">{dev.model}</div>
                      </div>
                    </div>

                    {/* Hardware LEDs & Port Counters */}
                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono text-[10px] text-[#8b949e]">
                        <div>{Object.values(dev.interfaces).filter((i) => i.operState === 'up').length} Links Up</div>
                        <div className="text-[#3fb950]">POWER ON</div>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3fb950] shadow-[0_0_8px_#3fb950]" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Workstation Desktops & End Devices */}
          <div className="w-1/2 flex flex-col items-center">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8b949e] mb-2 flex items-center gap-1.5">
              <span>Office Floor Workstations</span>
              <span className="text-[10px] text-[#484f58]">(Desktop Nodes)</span>
            </div>

            <div className="w-full max-w-md flex-1 rounded-xl border-2 border-[#21262d] bg-[#161b22] p-4 overflow-y-auto space-y-2.5 shadow-xl">
              {tableDevices.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#484f58] p-6">
                  <div>No desktop workstations deployed</div>
                  <div className="text-[10px] mt-1">Add PCs, laptops, or printers to see office endpoints.</div>
                </div>
              ) : (
                tableDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      setSelectedDeviceIds([dev.id]);
                      setActiveTerminalDevice(dev.id);
                      setPhysicalRackOpen(false);
                    }}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#21262d] hover:border-[#58a6ff] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <DeviceIcon type={dev.type} size={32} />
                      <div>
                        <div className="font-semibold text-[#e6edf3] text-xs">{dev.hostname}</div>
                        <div className="text-[10px] text-[#8b949e] font-mono">
                          {Object.values(dev.interfaces).find((i) => i.ipv4)?.ipv4?.address || 'DHCP Unassigned'}
                        </div>
                      </div>
                    </div>

                    <div className="w-2 h-2 rounded-full bg-[#3fb950]" title="Online" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#21262d] flex justify-between items-center">
          <span className="text-[11px] text-[#8b949e]">Click any mounted hardware to open its configuration or CLI.</span>
          <button
            onClick={() => setPhysicalRackOpen(false)}
            className="px-4 py-1.5 rounded-md bg-[#21262d] hover:bg-[#2d333b] text-xs font-semibold text-[#e6edf3] cursor-pointer"
          >
            Close Physical Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
