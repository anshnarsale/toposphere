import { useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { DeviceIcon } from '../device-library/DeviceIcon';
import {
  X,
  Shield,
  Activity,
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Cpu,
  Server,
  Lock,
  ArrowRight,
  RefreshCw,
  Sliders,
  Radio,
} from 'lucide-react';
import type { FirewallPolicyRule } from '@/types/network';

export function FirewallGuiModal() {
  const { activeFirewallGuiDeviceId, setActiveFirewallGuiDevice, addToast } = useUiStore();
  const { topology, updateInterface, addFirewallPolicy, updateFirewallPolicy, deleteFirewallPolicy, addStaticRoute } = useNetworkStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'interfaces' | 'policies' | 'routes' | 'logs'>('policies');
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);

  // Form state for new policy
  const [newPolName, setNewPolName] = useState('');
  const [newPolSrcIf, setNewPolSrcIf] = useState('');
  const [newPolDstIf, setNewPolDstIf] = useState('');
  const [newPolSrcSub, setNewPolSrcSub] = useState('192.168.1.0/24');
  const [newPolDstSub, setNewPolDstSub] = useState('all');
  const [newPolService, setNewPolService] = useState<'ALL' | 'HTTP' | 'HTTPS' | 'DNS' | 'ICMP' | 'SSH'>('ALL');
  const [newPolAction, setNewPolAction] = useState<'accept' | 'deny'>('accept');
  const [newPolNat, setNewPolNat] = useState(true);

  // Form state for editing interface IP
  const [editingIfId, setEditingIfId] = useState<string | null>(null);
  const [editIp, setEditIp] = useState('');
  const [editMask, setEditMask] = useState('24');

  if (!activeFirewallGuiDeviceId) return null;

  const device = topology.devices[activeFirewallGuiDeviceId];
  if (!device) return null;

  const vendor = device.vendor || 'fortinet';
  const interfaces = Object.values(device.interfaces);
  const policies = device.firewallPolicies || [];

  // Theme styling based on vendor
  let vendorName = 'Fortinet FortiOS 7.4';
  let vendorThemeBg = 'bg-[#ee3124]';
  let vendorBorderColor = 'border-[#ee3124]/40';
  let headerTitle = `FortiGate Web Admin Console — ${device.hostname}`;

  if (vendor === 'paloalto') {
    vendorName = 'Palo Alto PAN-OS 11.1';
    vendorThemeBg = 'bg-[#0284c7]';
    vendorBorderColor = 'border-[#0284c7]/40';
    headerTitle = `PAN-OS Web Management GUI — ${device.hostname}`;
  } else if (vendor === 'pfsense') {
    vendorName = 'pfSense 2.7.2 WebConfigurator';
    vendorThemeBg = 'bg-[#b91c1c]';
    vendorBorderColor = 'border-[#b91c1c]/40';
    headerTitle = `pfSense WebConfigurator — ${device.hostname}`;
  } else if (vendor === 'checkpoint') {
    vendorName = 'Check Point Gaia Portal R81.20';
    vendorThemeBg = 'bg-[#d946ef]';
    vendorBorderColor = 'border-[#d946ef]/40';
    headerTitle = `Check Point Gaia Portal — ${device.hostname}`;
  } else if (vendor === 'cisco') {
    vendorName = 'Cisco Firepower / ASDM';
    vendorThemeBg = 'bg-[#049fd9]';
    vendorBorderColor = 'border-[#049fd9]/40';
    headerTitle = `Cisco Firepower Device Manager — ${device.hostname}`;
  }

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolName.trim()) return;

    const srcIf = newPolSrcIf || interfaces[0]?.id || 'internal1';
    const dstIf = newPolDstIf || interfaces[1]?.id || 'wan1';

    addFirewallPolicy(device.id, {
      name: newPolName.trim(),
      srcInterface: srcIf,
      dstInterface: dstIf,
      srcSubnet: newPolSrcSub.trim() || 'all',
      dstSubnet: newPolDstSub.trim() || 'all',
      service: newPolService,
      action: newPolAction,
      nat: newPolNat,
      status: 'enabled',
      hits: 0,
    });

    addToast({
      type: 'success',
      title: 'Firewall Policy Created',
      message: `Rule "${newPolName}" successfully committed to active security policy.`,
    });

    setIsCreatingPolicy(false);
    setNewPolName('');
  };

  const handleSaveInterfaceIp = (ifId: string) => {
    if (!editIp) return;
    const pfx = parseInt(editMask, 10) || 24;
    updateInterface(device.id, ifId, {
      ipv4: {
        address: editIp,
        prefixLength: pfx,
      },
      adminState: 'up',
      operState: 'up',
    });

    addToast({
      type: 'success',
      title: 'Interface Configured',
      message: `Updated IP to ${editIp}/${pfx}`,
    });

    setEditingIfId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-5xl h-[88vh] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans text-xs">
        {/* Top Web Management Header */}
        <div className="p-3 border-b border-[#21262d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className={`px-2 py-1 rounded text-white text-[10px] font-black tracking-wider uppercase ${vendorThemeBg}`}>
              {vendor}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#e6edf3]">{headerTitle}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-[#3fb950] bg-[#3fb950]/10 border border-[#3fb950]/30">
                  SYSTEM ONLINE
                </span>
              </div>
              <div className="text-[10px] text-[#8b949e] font-mono">
                {vendorName} | Hardware: {device.model} | Admin: root (HTTPS)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                addToast({ type: 'info', title: 'Config Saved', message: 'Firewall running state synchronized with NVRAM.' });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] cursor-pointer text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Save & Apply</span>
            </button>
            <button
              onClick={() => setActiveFirewallGuiDevice(null)}
              className="text-[#8b949e] hover:text-[#e6edf3] p-1.5 rounded hover:bg-[#21262d] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main GUI Body: Sidebar Nav + Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="w-52 border-r border-[#21262d] bg-[#0d1117] p-2 flex flex-col gap-1 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#484f58] px-2 py-1">
              Configuration Menu
            </div>

            <button
              onClick={() => setActiveTab('policies')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'policies'
                  ? 'bg-[#1f6feb] text-white shadow-xs'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#f85149]" />
              <span>Firewall Policies</span>
            </button>

            <button
              onClick={() => setActiveTab('interfaces')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'interfaces'
                  ? 'bg-[#1f6feb] text-white shadow-xs'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
              }`}
            >
              <Globe className="w-4 h-4 text-[#58a6ff]" />
              <span>Network Interfaces</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-[#1f6feb] text-white shadow-xs'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
              }`}
            >
              <Activity className="w-4 h-4 text-[#3fb950]" />
              <span>System Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'routes'
                  ? 'bg-[#1f6feb] text-white shadow-xs'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
              }`}
            >
              <Sliders className="w-4 h-4 text-[#d29922]" />
              <span>Static Routes</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'logs'
                  ? 'bg-[#1f6feb] text-white shadow-xs'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'
              }`}
            >
              <Lock className="w-4 h-4 text-[#a371f7]" />
              <span>Live Traffic Logs</span>
            </button>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 overflow-y-auto bg-[#161b22] p-5">
            {/* TAB: FIREWALL POLICIES */}
            {activeTab === 'policies' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                  <div>
                    <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                      <span>Security Policy & Inspection Rules</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                        {policies.length} Rules Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#8b949e] mt-0.5">
                      Stateful packet inspection, access control, and NAT translation policies.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsCreatingPolicy(!isCreatingPolicy)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold cursor-pointer shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Policy</span>
                  </button>
                </div>

                {/* Inline Policy Creator Form */}
                {isCreatingPolicy && (
                  <form onSubmit={handleCreatePolicy} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3 shadow-lg">
                    <div className="text-xs font-bold text-[#e6edf3] flex items-center justify-between">
                      <span>Add Firewall Security Rule</span>
                      <button type="button" onClick={() => setIsCreatingPolicy(false)} className="text-[#8b949e] hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Policy Name</label>
                        <input
                          type="text"
                          required
                          value={newPolName}
                          onChange={(e) => setNewPolName(e.target.value)}
                          placeholder="e.g. Allow_Sales_Web"
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Incoming Interface</label>
                        <select
                          value={newPolSrcIf}
                          onChange={(e) => setNewPolSrcIf(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        >
                          {interfaces.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.shortName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Outgoing Interface</label>
                        <select
                          value={newPolDstIf}
                          onChange={(e) => setNewPolDstIf(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        >
                          {interfaces.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.shortName})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Source Subnet</label>
                        <input
                          type="text"
                          value={newPolSrcSub}
                          onChange={(e) => setNewPolSrcSub(e.target.value)}
                          placeholder="192.168.1.0/24 or all"
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Destination Subnet</label>
                        <input
                          type="text"
                          value={newPolDstSub}
                          onChange={(e) => setNewPolDstSub(e.target.value)}
                          placeholder="all or 0.0.0.0/0"
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Service Protocol</label>
                        <select
                          value={newPolService}
                          onChange={(e) => setNewPolService(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        >
                          <option value="ALL">ALL Traffic</option>
                          <option value="HTTPS">HTTPS (TCP/443)</option>
                          <option value="HTTP">HTTP (TCP/80)</option>
                          <option value="DNS">DNS (UDP/53)</option>
                          <option value="ICMP">ICMP Echo (Ping)</option>
                          <option value="SSH">SSH (TCP/22)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8b949e] mb-1">Action</label>
                        <select
                          value={newPolAction}
                          onChange={(e) => setNewPolAction(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-white text-xs"
                        >
                          <option value="accept">ACCEPT (Permit)</option>
                          <option value="deny">DENY (Drop)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs text-[#e6edf3] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPolNat}
                          onChange={(e) => setNewPolNat(e.target.checked)}
                          className="rounded text-[#1f6feb]"
                        />
                        <span>Enable NAT (Source Network Address Translation / PAT)</span>
                      </label>

                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white font-semibold text-xs cursor-pointer shadow-sm"
                      >
                        Save Policy
                      </button>
                    </div>
                  </form>
                )}

                {/* Policies Table */}
                <div className="rounded-xl border border-[#21262d] overflow-hidden bg-[#0d1117]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#21262d] bg-[#161b22] text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Name / ID</th>
                        <th className="py-2.5 px-3">From / To</th>
                        <th className="py-2.5 px-3">Source IP</th>
                        <th className="py-2.5 px-3">Destination IP</th>
                        <th className="py-2.5 px-3">Service</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">NAT</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Hits</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-mono text-[11px]">
                      {policies.map((p, idx) => {
                        const isAccepted = p.action === 'accept';
                        const isEnabled = p.status === 'enabled';
                        return (
                          <tr key={p.id} className="hover:bg-[#161b22]/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-[#e6edf3] font-sans">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#8b949e] text-[10px]">#{idx + 1}</span>
                                <span>{p.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#8b949e]">
                              <div className="flex items-center gap-1">
                                <span className="text-[#58a6ff]">{device.interfaces[p.srcInterface]?.shortName || p.srcInterface}</span>
                                <ArrowRight className="w-3 h-3 text-[#484f58]" />
                                <span className="text-[#3fb950]">{device.interfaces[p.dstInterface]?.shortName || p.dstInterface}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#e6edf3]">{p.srcSubnet}</td>
                            <td className="py-2.5 px-3 text-[#e6edf3]">{p.dstSubnet}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-[#e6edf3] border border-[#30363d]">
                                {p.service}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                  isAccepted ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40' : 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/40'
                                }`}
                              >
                                {p.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[#8b949e]">
                              {p.nat ? <span className="text-[#58a6ff]">Enabled</span> : 'Disabled'}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() => updateFirewallPolicy(device.id, p.id, { status: isEnabled ? 'disabled' : 'enabled' })}
                                className="cursor-pointer"
                              >
                                {isEnabled ? (
                                  <span className="text-[#3fb950] flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Active</span>
                                  </span>
                                ) : (
                                  <span className="text-[#8b949e] flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Disabled</span>
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-[#d29922]">{p.hits.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => deleteFirewallPolicy(device.id, p.id)}
                                className="text-[#8b949e] hover:text-[#f85149] p-1 rounded hover:bg-[#21262d] cursor-pointer"
                                title="Delete policy rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: NETWORK INTERFACES */}
            {activeTab === 'interfaces' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#21262d]">
                  <h3 className="text-sm font-bold text-[#e6edf3]">Firewall Network Interfaces</h3>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Physical and logical interfaces, IPv4 assignment, and zone bindings.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {interfaces.map((iface) => {
                    const isEditing = editingIfId === iface.id;
                    const isUp = iface.operState === 'up';

                    return (
                      <div key={iface.id} className="p-3 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isUp ? 'bg-[#3fb950] shadow-sm shadow-[#3fb950]' : 'bg-[#8b949e]'}`} />
                            <span className="text-xs font-bold text-[#e6edf3]">{iface.name}</span>
                            <span className="text-[10px] text-[#8b949e] font-mono">({iface.shortName})</span>
                          </div>

                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#21262d] text-[#58a6ff]">
                            {iface.speed} Mbps
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editIp}
                                onChange={(e) => setEditIp(e.target.value)}
                                placeholder="192.168.1.1"
                                className="flex-1 px-2 py-1 rounded bg-[#161b22] border border-[#30363d] text-white font-mono text-xs"
                              />
                              <span className="text-[#8b949e]">/</span>
                              <input
                                type="text"
                                value={editMask}
                                onChange={(e) => setEditMask(e.target.value)}
                                placeholder="24"
                                className="w-12 px-2 py-1 rounded bg-[#161b22] border border-[#30363d] text-white font-mono text-xs text-center"
                              />
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => setEditingIfId(null)}
                                className="px-2 py-1 rounded text-[#8b949e] hover:text-white text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveInterfaceIp(iface.id)}
                                className="px-3 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-xs cursor-pointer"
                              >
                                Apply IP
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <div className="text-[10px] text-[#8b949e]">IPv4 Address:</div>
                              <div className="text-xs font-mono font-bold text-[#e6edf3]">
                                {iface.ipv4?.address ? `${iface.ipv4.address}/${iface.ipv4.prefixLength || 24}` : 'Unassigned (DHCP Client)'}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setEditingIfId(iface.id);
                                setEditIp(iface.ipv4?.address || '');
                                setEditMask(String(iface.ipv4?.prefixLength || 24));
                              }}
                              className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] text-[11px] font-semibold cursor-pointer"
                            >
                              Edit IP
                            </button>
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
                          <span>MAC: {iface.mac}</span>
                          <span>Rx: {iface.counters.rxPackets} | Tx: {iface.counters.txPackets}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: SYSTEM DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                      <span>CPU Utilization</span>
                      <span className="font-mono text-[#3fb950]">14%</span>
                    </div>
                    <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3fb950] rounded-full w-[14%]" />
                    </div>
                    <div className="text-[10px] text-[#484f58] font-mono">Quad-Core NP6Lite Network Processor</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                      <span>Memory (RAM)</span>
                      <span className="font-mono text-[#58a6ff]">38%</span>
                    </div>
                    <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-[#58a6ff] rounded-full w-[38%]" />
                    </div>
                    <div className="text-[10px] text-[#484f58] font-mono">1.52 GB used of 4.00 GB DDR4</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                      <span>Active Sessions</span>
                      <span className="font-mono text-[#d29922]">1,248</span>
                    </div>
                    <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-[#d29922] rounded-full w-[25%]" />
                    </div>
                    <div className="text-[10px] text-[#484f58] font-mono">Max Capacity: 300,000 Concurrent</div>
                  </div>
                </div>

                {/* System Information Card */}
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-3">
                  <h4 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider">Device Hardware Profile</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div className="text-[#8b949e]">Hostname:</div>
                    <div className="font-mono text-white font-bold">{device.hostname}</div>
                    <div className="text-[#8b949e]">Operating System:</div>
                    <div className="font-mono text-[#58a6ff]">{vendorName}</div>
                    <div className="text-[#8b949e]">Serial Number:</div>
                    <div className="font-mono text-[#e6edf3]">FG60FT{device.id.slice(0, 10).toUpperCase()}</div>
                    <div className="text-[#8b949e]">License & Support:</div>
                    <div className="text-[#3fb950] font-bold">Valid & Active (Security Fabric Entitled)</div>
                    <div className="text-[#8b949e]">System Uptime:</div>
                    <div className="font-mono text-[#e6edf3]">14 days, 6 hours, 22 mins</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STATIC ROUTES */}
            {activeTab === 'routes' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#21262d]">
                  <h3 className="text-sm font-bold text-[#e6edf3]">Firewall Routing Table</h3>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">Static routes and default gateway forwarding rules.</p>
                </div>

                <div className="rounded-xl border border-[#21262d] overflow-hidden bg-[#0d1117]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#21262d] bg-[#161b22] text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Destination Subnet</th>
                        <th className="py-2.5 px-3">Gateway Next Hop</th>
                        <th className="py-2.5 px-3">Interface</th>
                        <th className="py-2.5 px-3">Distance / Metric</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-mono text-[11px]">
                      {device.routingTable.map((r, i) => (
                        <tr key={i} className="hover:bg-[#161b22]/70">
                          <td className="py-2.5 px-3 text-[#e6edf3] font-bold">{r.network}/{r.prefixLength}</td>
                          <td className="py-2.5 px-3 text-[#58a6ff]">{r.nextHop}</td>
                          <td className="py-2.5 px-3 text-[#3fb950]">{r.exitInterface}</td>
                          <td className="py-2.5 px-3 text-[#8b949e]">{r.adminDistance}/{r.metric}</td>
                          <td className="py-2.5 px-3 text-[#3fb950]">Active</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: LIVE LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#21262d]">
                  <h3 className="text-sm font-bold text-[#e6edf3]">Security Event & Traffic Logs</h3>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">Real-time firewall packet inspection audit trail.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#0d1117] border border-[#21262d] font-mono text-[11px] space-y-2">
                  <div className="text-[#3fb950]">[ALLOW] src=192.168.1.10:52412 dst=8.8.8.8:53 proto=UDP policy="LAN_to_WAN_Internet" nat=snat</div>
                  <div className="text-[#3fb950]">[ALLOW] src=192.168.1.10:54120 dst=1.1.1.1:443 proto=TCP policy="LAN_to_WAN_Internet" nat=snat</div>
                  <div className="text-[#f85149]">[DROP] src=203.0.113.88:44812 dst=192.168.1.10:22 proto=TCP policy="Deny_Untrusted_WAN_Access" reason="Implicit Deny"</div>
                  <div className="text-[#3fb950]">[ALLOW] src=192.168.1.12:48122 dst=10.0.10.50:443 proto=TCP policy="Inbound_Web_DMZ"</div>
                  <div className="text-[#8b949e]">[SYSTEM] FortiOS security signatures updated successfully (AV: 91.08234, IPS: 6.00741)</div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

