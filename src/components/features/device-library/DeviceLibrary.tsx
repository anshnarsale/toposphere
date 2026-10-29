import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Layers, Cpu, Radio, Shield, Globe, Wrench, Zap, Cable } from 'lucide-react';
import { DeviceIcon } from './DeviceIcon';
import { CablesPalette } from '../cables/CablesPalette';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import type { DeviceType, DeviceVendor } from '@/types/network';

export interface DeviceItem {
  type: DeviceType;
  vendor: DeviceVendor;
  name: string;
  model: string;
  description: string;
  badgeColor: string;
}

interface CategoryGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: DeviceItem[];
}

const VENDOR_FILTERS: Array<{ id: 'all' | DeviceVendor; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'cisco', label: 'Cisco' },
  { id: 'juniper', label: 'Juniper' },
  { id: 'arista', label: 'Arista' },
  { id: 'mikrotik', label: 'MikroTik' },
  { id: 'fortinet', label: 'Fortinet' },
  { id: 'linux', label: 'Linux/Open' },
];

const CATEGORIES: CategoryGroup[] = [
  {
    id: 'network-routers',
    title: 'Routers & Gateways',
    icon: <Layers className="w-3.5 h-3.5 text-[#58a6ff]" />,
    items: [
      {
        type: 'router',
        vendor: 'cisco',
        name: 'Cisco ISR 4331',
        model: 'ISR 4331 Edge Router',
        description: 'Cisco enterprise router with 3x GE interfaces running IOS-XE',
        badgeColor: '#049fd9',
      },
      {
        type: 'router',
        vendor: 'juniper',
        name: 'Juniper MX204',
        model: 'MX204 3U Routing Platform',
        description: 'High-density edge router with ge-0/0/0 and 10G interfaces running Junos OS',
        badgeColor: '#84bd00',
      },
      {
        type: 'router',
        vendor: 'mikrotik',
        name: 'MikroTik CCR2004',
        model: 'CCR2004-16G-2S+',
        description: 'Cloud Core Router with ether1-ether4 running RouterOS v7',
        badgeColor: '#e05206',
      },
      {
        type: 'router',
        vendor: 'linux',
        name: 'VyOS Software Router',
        model: 'VyOS 1.4 Rolling',
        description: 'Open-source Debian-based universal network routing appliance',
        badgeColor: '#f5c211',
      },
    ],
  },
  {
    id: 'network-switches',
    title: 'Layer 2 & Layer 3 Switches',
    icon: <Layers className="w-3.5 h-3.5 text-[#3fb950]" />,
    items: [
      {
        type: 'switch',
        vendor: 'cisco',
        name: 'Cisco Catalyst 2960',
        model: 'Catalyst 2960-24TT',
        description: '24-port FastEthernet + 2x Gigabit Layer 2 switch',
        badgeColor: '#049fd9',
      },
      {
        type: 'switch-l3',
        vendor: 'cisco',
        name: 'Cisco Catalyst 3650',
        model: 'Catalyst 3650-24PD L3',
        description: 'Multilayer enterprise switch with IP routing, SVIs, and VLANs',
        badgeColor: '#049fd9',
      },
      {
        type: 'switch',
        vendor: 'juniper',
        name: 'Juniper EX2300',
        model: 'EX2300-24T Switch',
        description: 'Juniper enterprise access switch with ge-0/0/0 ports running Junos',
        badgeColor: '#84bd00',
      },
      {
        type: 'switch-l3',
        vendor: 'arista',
        name: 'Arista 7050X3',
        model: 'Arista 7050X3 Leaf Switch',
        description: 'Datacenter high-performance 10G/40G leaf switch running Arista EOS',
        badgeColor: '#002b49',
      },
      {
        type: 'switch',
        vendor: 'mikrotik',
        name: 'MikroTik CRS326',
        model: 'CRS326-24G-2S+ Switch',
        description: 'Cloud Router Switch with Dual Boot SwOS/RouterOS',
        badgeColor: '#e05206',
      },
    ],
  },
  {
    id: 'security-firewalls',
    title: 'Security & Firewalls',
    icon: <Shield className="w-3.5 h-3.5 text-[#d29922]" />,
    items: [
      {
        type: 'firewall',
        vendor: 'cisco',
        name: 'Cisco ASA 5506-X',
        model: 'ASA 5506-X Security Gateway',
        description: 'Next-gen security appliance with Inside/Outside/DMZ interfaces',
        badgeColor: '#049fd9',
      },
      {
        type: 'firewall',
        vendor: 'juniper',
        name: 'Juniper SRX300',
        model: 'SRX300 Services Gateway',
        description: 'Next-generation firewall and secure SD-WAN gateway running Junos',
        badgeColor: '#84bd00',
      },
      {
        type: 'firewall',
        vendor: 'fortinet',
        name: 'FortiGate 60F',
        model: 'FortiGate 60F Security Fabric',
        description: 'Fortinet next-gen firewall with wan1, wan2, and internal ports running FortiOS',
        badgeColor: '#ee3124',
      },
    ],
  },
  {
    id: 'end-devices',
    title: 'End Devices & Servers',
    icon: <Cpu className="w-3.5 h-3.5 text-[#a371f7]" />,
    items: [
      {
        type: 'pc',
        vendor: 'linux',
        name: 'PC Workstation',
        model: 'Desktop Host PC',
        description: 'Standard desktop client with Ethernet NIC',
        badgeColor: '#58a6ff',
      },
      {
        type: 'laptop',
        vendor: 'linux',
        name: 'Laptop Client',
        model: 'Portable Workstation',
        description: 'Mobile client with Ethernet and WiFi association',
        badgeColor: '#58a6ff',
      },
      {
        type: 'server',
        vendor: 'linux',
        name: 'Ubuntu Linux Server',
        model: 'Ubuntu Server 22.04 LTS',
        description: 'Enterprise dual-NIC Linux server running DHCP, DNS, HTTP services',
        badgeColor: '#f5c211',
      },
      {
        type: 'printer',
        vendor: 'linux',
        name: 'Network Printer',
        model: 'Office Network Printer',
        description: 'Network-attached IP printer node',
        badgeColor: '#8b949e',
      },
      {
        type: 'wireless-client',
        vendor: 'linux',
        name: 'Wireless Client',
        model: 'Mobile Wireless Host',
        description: '802.11 wireless client device',
        badgeColor: '#39d0d8',
      },
    ],
  },
  {
    id: 'wireless-wan',
    title: 'Wireless & WAN Cloud',
    icon: <Globe className="w-3.5 h-3.5 text-[#bc8cff]" />,
    items: [
      {
        type: 'access-point',
        vendor: 'cisco',
        name: 'Cisco Aironet 2802',
        model: 'Aironet 2802I Access Point',
        description: 'Dual-band 802.11ac enterprise wireless access point',
        badgeColor: '#049fd9',
      },
      {
        type: 'cloud',
        vendor: 'linux',
        name: 'Internet / WAN Cloud',
        model: 'WAN Cloud Gateway',
        description: 'Simulated wide-area network cloud / public internet provider',
        badgeColor: '#bc8cff',
      },
      {
        type: 'packet-generator',
        vendor: 'linux',
        name: 'Traffic Probe / Generator',
        model: 'TopoSphere Probe 1000',
        description: 'High-speed synthetic packet injector and telemetry collector',
        badgeColor: '#f85149',
      },
    ],
  },
];

export function DeviceLibrary() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'devices' | 'cables'>('devices');
  const [vendorFilter, setVendorFilter] = useState<'all' | DeviceVendor>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { addDevice } = useNetworkStore();
  const { setNodePosition, pushHistorySnapshot } = useProjectStore();
  const { addToast } = useUiStore();

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleDragStart = (e: React.DragEvent, item: DeviceItem) => {
    e.dataTransfer.setData(
      'application/toposphere-device',
      JSON.stringify({
        type: item.type,
        vendor: item.vendor,
        model: item.model,
        name: item.name,
      })
    );
    e.dataTransfer.setData('application/nexalab-device', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickAdd = (item: DeviceItem) => {
    const posX = 200 + Math.random() * 200;
    const posY = 150 + Math.random() * 200;

    const dev = addDevice(item.type, undefined, item.vendor, item.model);
    setNodePosition(dev.id, { x: posX, y: posY });
    pushHistorySnapshot();

    addToast({
      type: 'info',
      title: `${dev.hostname} (${dev.model}) Added`,
      message: `Placed ${item.vendor.toUpperCase()} hardware at (${Math.round(posX)}, ${Math.round(posY)})`,
    });
  };

  return (
    <aside className="w-68 border-r border-[#21262d] bg-[#161b22] flex flex-col h-full select-none shrink-0">
      {/* Header and Mode Tabs */}
      <div className="p-3 border-b border-[#21262d]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Hardware Palette</span>
          <span className="text-[10px] text-[#484f58] font-mono">MULTI-VENDOR</span>
        </div>

        {/* Devices vs Cables Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#0d1117] border border-[#21262d] mb-2.5">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'devices' ? 'bg-[#21262d] text-[#58a6ff] shadow-sm' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Devices</span>
          </button>
          <button
            onClick={() => setActiveTab('cables')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'cables' ? 'bg-[#21262d] text-[#d29922] shadow-sm' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#d29922]" />
            <span>Cables</span>
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="space-y-2">
            {/* Vendor Filter Badges */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {VENDOR_FILTERS.map((vf) => {
                const isSelected = vendorFilter === vf.id;
                return (
                  <button
                    key={vf.id}
                    onClick={() => setVendorFilter(vf.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1f6feb] text-white shadow-xs'
                        : 'bg-[#0d1117] text-[#8b949e] hover:text-[#e6edf3] border border-[#21262d]'
                    }`}
                  >
                    {vf.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8b949e]" />
              <input
                type="text"
                placeholder="Search models, vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Body: Either Cables Palette or Multi-Vendor Device Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {activeTab === 'cables' ? (
          <div className="space-y-3">
            <div className="px-1 text-[11px] text-[#8b949e]">
              Select a cable type below, then click devices on the canvas to connect their interfaces:
            </div>
            <CablesPalette />
          </div>
        ) : (
          <>
            {CATEGORIES.map((cat) => {
              const filteredItems = cat.items.filter((item) => {
                const matchesVendor = vendorFilter === 'all' || item.vendor === vendorFilter;
                const matchesSearch =
                  item.name.toLowerCase().includes(search.toLowerCase()) ||
                  item.description.toLowerCase().includes(search.toLowerCase()) ||
                  item.model.toLowerCase().includes(search.toLowerCase()) ||
                  item.vendor.toLowerCase().includes(search.toLowerCase());
                return matchesVendor && matchesSearch;
              });

              if (filteredItems.length === 0) return null;
              const isCollapsed = collapsedCategories[cat.id];

              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[#8b949e] hover:text-[#e6edf3] rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      {cat.icon}
                      <span>{cat.title}</span>
                      <span className="text-[10px] text-[#484f58]">({filteredItems.length})</span>
                    </div>
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-1 pl-1">
                      {filteredItems.map((item) => (
                        <div
                          key={`${item.vendor}-${item.model}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => handleQuickAdd(item)}
                          className="group flex items-center gap-2.5 p-2 rounded-md bg-[#0d1117] border border-[#21262d] hover:border-[#58a6ff]/50 hover:bg-[#1c2128] cursor-grab active:cursor-grabbing transition-all shadow-sm"
                          title={`Drag onto canvas or click to add (${item.vendor.toUpperCase()})`}
                        >
                          <div className="shrink-0 p-1 bg-[#161b22] rounded border border-[#21262d] group-hover:border-[#30363d]">
                            <DeviceIcon type={item.type} size={28} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-[#e6edf3] truncate group-hover:text-[#58a6ff]">
                                {item.name}
                              </span>
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 text-white"
                                style={{ backgroundColor: item.badgeColor }}
                              >
                                {item.vendor}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#8b949e] truncate leading-tight mt-0.5">
                              {item.model}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
}
