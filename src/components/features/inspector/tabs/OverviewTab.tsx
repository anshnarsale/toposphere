import { useState } from 'react';
import type { Device } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import { Terminal, Activity, Edit2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface OverviewTabProps {
  device: Device;
}

export function OverviewTab({ device }: OverviewTabProps) {
  const [editingHostname, setEditingHostname] = useState(false);
  const [hostnameInput, setHostnameInput] = useState(device.hostname);

  const { updateHostname } = useNetworkStore();
  const { setActiveTerminalDevice, setDiagnosticsOpen } = useUiStore();

  const handleSaveHostname = () => {
    if (hostnameInput.trim()) {
      updateHostname(device.id, hostnameInput.trim());
    }
    setEditingHostname(false);
  };

  const interfaces = Object.values(device.interfaces);
  const upCount = interfaces.filter((i) => i.operState === 'up').length;
  const configuredCount = interfaces.filter((i) => i.ipv4).length;

  return (
    <div className="space-y-4 p-3 text-xs text-[#e6edf3]">
      {/* Device Hostname & Edit */}
      <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
        <div className="text-[10px] text-[#8b949e] uppercase font-semibold mb-1">Hostname</div>
        {editingHostname ? (
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              value={hostnameInput}
              onChange={(e) => setHostnameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveHostname()}
              className="flex-1 bg-[#0d1117] border border-[#58a6ff] rounded px-2 py-1 text-xs text-[#e6edf3] outline-none"
              autoFocus
            />
            <button
              onClick={handleSaveHostname}
              className="p-1 text-[#3fb950] hover:bg-[#21262d] rounded cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{device.hostname}</span>
            <button
              onClick={() => {
                setHostnameInput(device.hostname);
                setEditingHostname(true);
              }}
              className="text-[#8b949e] hover:text-[#58a6ff] p-1 rounded cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hardware Profile */}
      <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2">
        <div className="text-[10px] text-[#8b949e] uppercase font-semibold">Hardware Specification</div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[#8b949e]">Device Type:</span>
            <div className="capitalize font-medium">{device.type}</div>
          </div>
          <div>
            <span className="text-[#8b949e]">Model:</span>
            <div className="font-medium truncate">{device.model}</div>
          </div>
          <div>
            <span className="text-[#8b949e]">Total Interfaces:</span>
            <div className="font-medium">{interfaces.length}</div>
          </div>
          <div>
            <span className="text-[#8b949e]">Active Links:</span>
            <div className="font-medium text-[#3fb950]">{upCount} Up</div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => setActiveTerminalDevice(device.id)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] text-xs font-medium text-[#e6edf3] cursor-pointer transition-colors"
        >
          <Terminal className="w-4 h-4 text-[#58a6ff]" />
          <span>Open Interactive CLI Terminal</span>
        </button>

        <button
          onClick={() => setDiagnosticsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] text-xs font-medium text-[#e6edf3] cursor-pointer transition-colors"
        >
          <Activity className="w-4 h-4 text-[#d29922]" />
          <span>Run Configuration Diagnostics</span>
        </button>
      </div>

      {/* Configured Addresses List */}
      <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
        <div className="text-[10px] text-[#8b949e] uppercase font-semibold mb-2">Configured IPv4 Addresses</div>
        {configuredCount === 0 ? (
          <div className="text-[#8b949e] text-[11px] italic">No IP addresses assigned yet.</div>
        ) : (
          <div className="space-y-1.5 font-mono text-[11px]">
            {interfaces
              .filter((i) => i.ipv4)
              .map((i) => (
                <div key={i.id} className="flex items-center justify-between">
                  <span className="text-[#8b949e]">{i.shortName}:</span>
                  <span className="text-[#58a6ff]">
                    {i.ipv4?.address}/{i.ipv4?.prefixLength}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

