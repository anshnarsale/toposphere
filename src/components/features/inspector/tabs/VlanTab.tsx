import { useState } from 'react';
import type { Device, InterfaceMode } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { Plus, Trash2, Layers, Network, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface VlanTabProps {
  device: Device;
}

export function VlanTab({ device }: VlanTabProps) {
  const [vlanId, setVlanId] = useState('');
  const [vlanName, setVlanName] = useState('');

  const { addVlan, removeVlan, updateInterface, model } = useNetworkStore();
  const { pushHistorySnapshot } = useProjectStore();
  const { addToast } = useUiStore();

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

    addToast({
      type: 'success',
      title: `VLAN ${id} Created`,
      message: `Created ${vlanName.trim() || `VLAN${id}`} in ${device.hostname}'s database`,
    });

    setVlanId('');
    setVlanName('');
  };

  const handlePortVlanChange = (ifaceId: string, newVlanId: number) => {
    updateInterface(device.id, ifaceId, {
      accessVlan: newVlanId,
      vlanMode: 'access',
    });
    pushHistorySnapshot();

    const targetVlan = device.vlans[newVlanId]?.name || `VLAN ${newVlanId}`;
    const portName = device.interfaces[ifaceId]?.shortName || ifaceId;

    addToast({
      type: 'success',
      title: 'Port VLAN Updated',
      message: `${portName} assigned to VLAN ${newVlanId} (${targetVlan})`,
    });
  };

  const handlePortModeChange = (ifaceId: string, mode: InterfaceMode) => {
    updateInterface(device.id, ifaceId, { vlanMode: mode });
    pushHistorySnapshot();
    const portName = device.interfaces[ifaceId]?.shortName || ifaceId;
    addToast({
      type: 'info',
      title: 'Switchport Mode Changed',
      message: `${portName} set to ${mode.toUpperCase()} mode`,
    });
  };

  const vlanList = Object.values(device.vlans).sort((a, b) => a.id - b.id);
  const switchInterfaces = Object.values(device.interfaces);

  return (
    <div className="space-y-4 p-3 text-xs text-[var(--text-primary)]">
      {/* Create VLAN Form */}
      <form onSubmit={handleCreateVlan} className="p-3 bg-[var(--bg-secondary)] border-2 border-black shadow-[3px_3px_0px_#000] space-y-2.5">
        <div className="text-[11px] uppercase font-black flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>Create New VLAN</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[var(--text-muted)] font-bold block mb-1">VLAN ID</label>
            <input
              type="number"
              min="2"
              max="4094"
              placeholder="10"
              value={vlanId}
              onChange={(e) => setVlanId(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border-2 border-black px-2 py-1 text-xs font-mono font-bold focus:outline-none focus:bg-[#ffe600]/10"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-[var(--text-muted)] font-bold block mb-1">VLAN Name</label>
            <input
              type="text"
              placeholder="e.g. Sales, HR, Engineering"
              value={vlanName}
              onChange={(e) => setVlanName(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border-2 border-black px-2 py-1 text-xs font-bold focus:outline-none focus:bg-[#ffe600]/10"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 brutal-btn bg-[#ffe600] text-black text-xs font-black uppercase cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add to VLAN Database</span>
        </button>
      </form>

      {/* Interactive Switchport Port Assignment Table */}
      <div className="p-3 bg-[var(--bg-secondary)] border-2 border-black shadow-[3px_3px_0px_#000] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase font-black flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#ffe600]" />
            <span>Port VLAN Assignment (Assign PCs)</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {switchInterfaces.length} Ports
          </span>
        </div>

        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {switchInterfaces.map((iface) => {
            const neighbor = model.getNeighbor(device.id, iface.id);
            const neighborDev = neighbor?.device;
            const neighborIface = neighbor?.iface;
            const isTrunk = iface.vlanMode === 'trunk';

            return (
              <div
                key={iface.id}
                className="p-2 bg-[var(--bg-primary)] border border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-black text-xs text-black dark:text-white shrink-0">
                    {iface.shortName}
                  </span>
                  <div className="truncate text-[11px]">
                    {neighborDev ? (
                      <span className="font-medium text-[var(--text-secondary)]">
                        → <strong className="text-black dark:text-white underline">{neighborDev.hostname}</strong> ({neighborIface?.shortName || ''})
                        {neighborIface?.ipv4?.address && (
                          <span className="text-[10px] text-[var(--text-muted)] ml-1 font-mono">
                            [{neighborIface.ipv4.address}]
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)] italic">Unconnected</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Mode Selector */}
                  <select
                    value={iface.vlanMode}
                    onChange={(e) => handlePortModeChange(iface.id, e.target.value as InterfaceMode)}
                    className="bg-white dark:bg-black border border-black text-[10px] font-bold px-1.5 py-0.5 cursor-pointer"
                  >
                    <option value="access">Access</option>
                    <option value="trunk">Trunk</option>
                  </select>

                  {/* VLAN Selector (for Access ports) */}
                  {!isTrunk ? (
                    <select
                      value={iface.accessVlan}
                      onChange={(e) => handlePortVlanChange(iface.id, parseInt(e.target.value, 10))}
                      className="bg-[#ffe600] text-black border border-black font-mono font-black text-[11px] px-2 py-0.5 cursor-pointer hover:bg-[#ffea33]"
                    >
                      {vlanList.map((v) => (
                        <option key={v.id} value={v.id}>
                          VLAN {v.id} ({v.name})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#00f0ff] text-black text-[10px] font-black font-mono border border-black">
                      802.1Q TRUNK
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VLAN Database List with Port Badges */}
      <div className="p-3 bg-[var(--bg-secondary)] border-2 border-black shadow-[3px_3px_0px_#000] space-y-2">
        <div className="text-[11px] uppercase font-black text-[var(--text-primary)]">
          VLAN Database &amp; Member Ports
        </div>
        <div className="space-y-2">
          {vlanList.map((v) => {
            const memberPorts = switchInterfaces.filter((i) => i.accessVlan === v.id && i.vlanMode !== 'trunk');

            return (
              <div
                key={v.id}
                className="p-2.5 bg-[var(--bg-primary)] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs px-2 py-0.5 bg-[#00f0ff] text-black border border-black">
                      VLAN {v.id}
                    </span>
                    <span className="font-bold text-xs text-black dark:text-white">{v.name}</span>
                    {v.id === 1 && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">(Default Native)</span>
                    )}
                  </div>

                  {v.id !== 1 && (
                    <button
                      onClick={() => {
                        removeVlan(device.id, v.id);
                        pushHistorySnapshot();
                        addToast({
                          type: 'warning',
                          title: `VLAN ${v.id} Removed`,
                          message: `VLAN ${v.id} deleted. Member ports returned to default VLAN 1.`,
                        });
                      }}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      title="Delete VLAN"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Member Ports Pills */}
                <div className="text-[11px] pt-1 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Members:</span>
                  {memberPorts.length > 0 ? (
                    memberPorts.map((mp) => {
                      const nb = model.getNeighbor(device.id, mp.id);
                      return (
                        <span
                          key={mp.id}
                          className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-black font-mono text-[10px] font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#00ff66]" />
                          <span>{mp.shortName}</span>
                          {nb?.device && <span className="text-[var(--text-muted)] font-normal">({nb.device.hostname})</span>}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] italic">No access ports assigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
