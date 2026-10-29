import { useState } from 'react';
import type { Device } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';
import { Plus, Trash2, Layers } from 'lucide-react';

interface VlanTabProps {
  device: Device;
}

export function VlanTab({ device }: VlanTabProps) {
  const [vlanId, setVlanId] = useState('');
  const [vlanName, setVlanName] = useState('');

  const { addVlan, removeVlan } = useNetworkStore();
  const { pushHistorySnapshot } = useProjectStore();

  const handleCreateVlan = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(vlanId, 10);
    if (isNaN(id) || id < 1 || id > 4094) {
      alert('VLAN ID must be an integer between 1 and 4094');
      return;
    }

    addVlan(device.id, {
      id,
      name: vlanName.trim() || `VLAN${id.toString().padStart(4, '0')}`,
      active: true,
    });
    pushHistorySnapshot();
    setVlanId('');
    setVlanName('');
  };

  return (
    <div className="space-y-4 p-3 text-xs text-[#e6edf3]">
      {/* Add VLAN Form */}
      <form onSubmit={handleCreateVlan} className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2.5">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#3fb950]" />
          <span>Create VLAN</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[#8b949e] block mb-1">VLAN ID</label>
            <input
              type="number"
              min="2"
              max="4094"
              placeholder="10"
              value={vlanId}
              onChange={(e) => setVlanId(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-[#8b949e] block mb-1">VLAN Name</label>
            <input
              type="text"
              placeholder="e.g. Sales, Voice"
              value={vlanName}
              onChange={(e) => setVlanName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] focus:border-[#58a6ff] outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create VLAN</span>
        </button>
      </form>

      {/* VLAN Database List */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e]">VLAN Database</div>
        <div className="space-y-1.5">
          {Object.values(device.vlans).map((v) => {
            const memberPorts = Object.values(device.interfaces)
              .filter((i) => i.accessVlan === v.id)
              .map((i) => i.shortName);

            return (
              <div
                key={v.id}
                className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#21262d]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#58a6ff]">VLAN {v.id}</span>
                    <span className="text-[#e6edf3]">{v.name}</span>
                    {v.id === 1 && <span className="text-[10px] text-[#8b949e]">(Default)</span>}
                  </div>
                  <div className="text-[10px] text-[#8b949e] mt-0.5">
                    Ports: {memberPorts.length ? memberPorts.join(', ') : 'None'}
                  </div>
                </div>

                {v.id !== 1 && (
                  <button
                    onClick={() => {
                      removeVlan(device.id, v.id);
                      pushHistorySnapshot();
                    }}
                    className="text-[#8b949e] hover:text-[#f85149] p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

