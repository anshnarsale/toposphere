import { useState } from 'react';
import type { Device, Interface, InterfaceMode } from '@/types/network';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { ChevronDown, ChevronRight, Power, Network, Save } from 'lucide-react';
import { isValidIp, isValidPrefix, prefixToMask } from '@/lib/ip';

interface InterfacesTabProps {
  device: Device;
}

export function InterfacesTab({ device }: InterfacesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    Object.keys(device.interfaces)[0] || null
  );

  const { updateInterface, setInterfaceAdminState } = useNetworkStore();
  const { pushHistorySnapshot } = useProjectStore();
  const { addToast } = useUiStore();

  const isSwitch = device.type === 'switch' || device.type === 'switch-l3';
  const isHost = ['pc', 'laptop', 'server', 'printer'].includes(device.type);

  return (
    <div className="space-y-2 p-3 text-xs text-[#e6edf3]">
      {Object.values(device.interfaces).map((iface) => {
        const isExpanded = expandedId === iface.id;

        return (
          <div
            key={iface.id}
            className="rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden"
          >
            {/* Interface Item Header */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : iface.id)}
              className="flex items-center justify-between p-2.5 hover:bg-[#21262d] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8b949e]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8b949e]" />
                )}
                <div>
                  <div className="font-semibold text-[#e6edf3]">{iface.name}</div>
                  <div className="text-[10px] text-[#8b949e] font-mono">
                    {iface.ipv4?.address ? `${iface.ipv4.address}/${iface.ipv4.prefixLength}` : iface.mac}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                    iface.operState === 'up'
                      ? 'bg-[#238636]/20 text-[#3fb950]'
                      : 'bg-[#484f58]/20 text-[#8b949e]'
                  }`}
                >
                  {iface.adminState === 'down' ? 'SHUT' : iface.operState}
                </span>
              </div>
            </div>

            {/* Expanded Config Form */}
            {isExpanded && (
              <InterfaceForm
                device={device}
                iface={iface}
                isSwitch={isSwitch}
                isHost={isHost}
                onSave={(patch) => {
                  updateInterface(device.id, iface.id, patch);
                  pushHistorySnapshot();
                  addToast({
                    type: 'success',
                    title: `${iface.name} Configured`,
                    message: 'Interface settings applied successfully.',
                  });
                }}
                onToggleAdmin={() => {
                  const nextState = iface.adminState === 'up' ? 'down' : 'up';
                  setInterfaceAdminState(device.id, iface.id, nextState);
                  pushHistorySnapshot();
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface InterfaceFormProps {
  device: Device;
  iface: Interface;
  isSwitch: boolean;
  isHost: boolean;
  onSave: (patch: Partial<Interface>) => void;
  onToggleAdmin: () => void;
}

function InterfaceForm({ iface, isSwitch, isHost, onSave, onToggleAdmin, device }: InterfaceFormProps) {
  const [ip, setIp] = useState(iface.ipv4?.address || '');
  const [prefix, setPrefix] = useState(iface.ipv4?.prefixLength?.toString() || '24');
  const [gateway, setGateway] = useState(iface.ipv4?.gateway || '');
  const [vlanMode, setVlanMode] = useState<InterfaceMode>(iface.vlanMode);
  const [accessVlan, setAccessVlan] = useState(iface.accessVlan.toString());

  const { model, updateInterface } = useNetworkStore();
  const { pushHistorySnapshot } = useProjectStore();
  const { addToast } = useUiStore();

  const neighbor = model.getNeighbor(device.id, iface.id);
  const isConnectedToSwitch =
    isHost &&
    neighbor &&
    (neighbor.device.type === 'switch' || neighbor.device.type === 'switch-l3');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    const patch: Partial<Interface> = {
      vlanMode,
      accessVlan: parseInt(accessVlan, 10) || 1,
    };

    if (ip.trim()) {
      if (!isValidIp(ip.trim())) {
        alert('Please enter a valid IPv4 address (e.g. 192.168.1.10)');
        return;
      }
      const prefixNum = parseInt(prefix, 10);
      if (!isValidPrefix(prefixNum)) {
        alert('Please enter a valid CIDR prefix (0-32)');
        return;
      }

      patch.ipv4 = {
        address: ip.trim(),
        prefixLength: prefixNum,
        gateway: gateway.trim() || undefined,
      };
    } else {
      patch.ipv4 = undefined;
    }

    onSave(patch);
  };

  return (
    <form onSubmit={handleApply} className="p-3 border-t border-[#21262d] bg-[#0d1117] space-y-3">
      {/* Admin State Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#8b949e]">Administrative State:</span>
        <button
          type="button"
          onClick={onToggleAdmin}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border ${
            iface.adminState === 'up'
              ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40 hover:bg-[#238636]/30'
              : 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40 hover:bg-[#da3633]/30'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{iface.adminState === 'up' ? 'No Shutdown (Active)' : 'Shutdown (Disabled)'}</span>
        </button>
      </div>

      {/* IPv4 Configuration */}
      <div className="space-y-2 pt-1 border-t border-[#21262d]">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e]">IPv4 Configuration</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="text-[10px] text-[#8b949e] block mb-1">IP Address</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.10"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8b949e] block mb-1">Prefix (/)</label>
            <input
              type="number"
              min="0"
              max="32"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </div>

        {isHost && (
          <div>
            <label className="text-[10px] text-[#8b949e] block mb-1">Default Gateway</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.1"
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        )}

        {/* Connected Switchport & VLAN Control for End Devices */}
        {isConnectedToSwitch && neighbor && (
          <div className="p-2.5 bg-[#00f0ff]/10 border-2 border-black rounded space-y-1.5 shadow-[2px_2px_0px_#000] mt-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[var(--text-secondary)]">Connected Switch:</span>
              <span className="font-mono font-bold text-black dark:text-white">
                {neighbor.device.hostname} ({neighbor.iface.shortName})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/15">
              <span className="font-black uppercase text-[10px] text-black dark:text-white">Switchport VLAN:</span>
              <select
                value={neighbor.iface.accessVlan}
                onChange={(e) => {
                  const newVlan = parseInt(e.target.value, 10);
                  updateInterface(neighbor.device.id, neighbor.iface.id, {
                    accessVlan: newVlan,
                    vlanMode: 'access',
                  });
                  pushHistorySnapshot();
                  addToast({
                    type: 'success',
                    title: 'PC Assigned to VLAN',
                    message: `${device.hostname} on ${neighbor.device.hostname} (${neighbor.iface.shortName}) assigned to VLAN ${newVlan}`,
                  });
                }}
                className="bg-[#ffe600] text-black border border-black font-mono font-black px-2 py-0.5 text-xs cursor-pointer hover:bg-[#ffea33]"
              >
                {Object.values(neighbor.device.vlans).map((v) => (
                  <option key={v.id} value={v.id}>
                    VLAN {v.id} ({v.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Switchport VLAN Configuration */}
      {isSwitch && (
        <div className="space-y-2 pt-1 border-t border-[#21262d]">
          <div className="text-[10px] uppercase font-semibold text-[#8b949e]">Switchport Mode & VLAN</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#8b949e] block mb-1">Mode</label>
              <select
                value={vlanMode}
                onChange={(e) => setVlanMode(e.target.value as InterfaceMode)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="access">Access</option>
                <option value="trunk">Trunk (802.1Q)</option>
                <option value="routed">Routed L3</option>
              </select>
            </div>
            {vlanMode === 'access' && (
              <div>
                <label className="text-[10px] text-[#8b949e] block mb-1">Access VLAN</label>
                <input
                  type="number"
                  min="1"
                  max="4094"
                  value={accessVlan}
                  onChange={(e) => setAccessVlan(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traffic Counters */}
      <div className="pt-2 border-t border-[#21262d] flex justify-between text-[10px] font-mono text-[#8b949e]">
        <span>Rx: {iface.counters.rxPackets} pkts</span>
        <span>Tx: {iface.counters.txPackets} pkts</span>
        <span>MAC: {iface.mac}</span>
      </div>

      {/* Apply Button */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
      >
        <Save className="w-3.5 h-3.5" />
        <span>Apply Interface Configuration</span>
      </button>
    </form>
  );
}

