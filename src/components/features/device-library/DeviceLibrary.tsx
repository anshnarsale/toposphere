import { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Cpu,
  Shield,
  Globe,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
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
  { id: 'fortinet', label: 'Fortinet' },
  { id: 'paloalto', label: 'Palo Alto' },
  { id: 'pfsense', label: 'pfSense' },
  { id: 'checkpoint', label: 'Check Point' },
  { id: 'cisco', label: 'Cisco' },
  { id: 'juniper', label: 'Juniper' },
  { id: 'arista', label: 'Arista' },
  { id: 'mikrotik', label: 'MikroTik' },
  { id: 'linux', label: 'Linux/Open' },
];

const CATEGORIES: CategoryGroup[] = [
  {
    id: 'security-firewalls',
    title: 'Firewalls & Security',
    icon: <Shield className="w-3.5 h-3.5 text-[#f85149]" />,
    items: [
      {
        type: 'firewall',
        vendor: 'fortinet',
        name: 'FortiGate 60F',
        model: 'FortiGate 60F Security Fabric',
        description: 'Fortinet NGFW with wan1/wan2, internal ports, and FortiOS Web GUI',
        badgeColor: '#ee3124',
      },
      {
        type: 'firewall',
        vendor: 'fortinet',
        name: 'FortiGate 100F',
        model: 'FortiGate 100F Enterprise NGFW',
        description: 'Enterprise rackmount security appliance with FortiOS 7.4 Web GUI',
        badgeColor: '#ee3124',
      },
      {
        type: 'firewall',
        vendor: 'paloalto',
        name: 'Palo Alto PA-440',
        model: 'Palo Alto PA-440 Next-Gen Firewall',
        description: 'Next-Gen Firewall with PAN-OS Web Management GUI and App-ID',
        badgeColor: '#0284c7',
      },
      {
        type: 'firewall',
        vendor: 'paloalto',
        name: 'Palo Alto PA-1410',
        model: 'Palo Alto PA-1410 Enterprise NGFW',
        description: 'High-throughput enterprise PAN-OS firewall with web policy editor',
        badgeColor: '#0284c7',
      },
      {
        type: 'firewall',
        vendor: 'pfsense',
        name: 'pfSense Netgate 4100',
        model: 'pfSense Netgate 4100 Appliance',
        description: 'Open-source stateful firewall with pfSense WebConfigurator GUI',
        badgeColor: '#b91c1c',
      },
      {
        type: 'firewall',
        vendor: 'checkpoint',
        name: 'Check Point 1570',
        model: 'Check Point Quantum Spark 1570 Pro',
        description: 'Branch security gateway with Gaia Portal web management',
        badgeColor: '#d946ef',
      },
      {
        type: 'firewall',
        vendor: 'cisco',
        name: 'Cisco ASA 5506-X',
        model: 'ASA 5506-X with Firepower',
        description: 'Cisco Next-Gen adaptive security appliance with ASA-OS and DMZ',
        badgeColor: '#049fd9',
      },
      {
        type: 'firewall',
        vendor: 'juniper',
        name: 'Juniper SRX300',
        model: 'SRX300 Services Gateway',
        description: 'Secure SD-WAN edge gateway and firewall running Junos OS',
        badgeColor: '#84bd00',
      },
    ],
  },
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
        description: 'Edge router with ge-0/0/0 and 10G interfaces running Junos OS',
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
        name: 'VyOS Router',
        model: 'VyOS 1.4 Rolling',
        description: 'Open-source Debian-based universal network routing appliance',
        badgeColor: '#f5c211',
      },
    ],
  },
  {
    id: 'network-switches',
    title: 'Switches (L2 & L3)',
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
        model: 'EX2300-24T Ethernet Switch',
        description: '24-port Gigabit access switch running Junos with 802.1Q tagging',
        badgeColor: '#84bd00',
      },
      {
        type: 'switch',
        vendor: 'arista',
        name: 'Arista 7050X3',
        model: 'Arista 7050X3 Leaf Switch',
        description: 'Cloud leaf switch with Et1-Et8 ports running Arista EOS',
        badgeColor: '#38bdf8',
      },
      {
        type: 'switch',
        vendor: 'mikrotik',
        name: 'MikroTik CRS326',
        model: 'CRS326-24G-2S+ Switch',
        description: 'Smart switch with Dual Boot SwOS/RouterOS capability',
        badgeColor: '#e05206',
      },
    ],
  },
  {
    id: 'end-devices',
    title: 'End Devices & Hosts',
    icon: <Cpu className="w-3.5 h-3.5 text-[#a371f7]" />,
    items: [
      {
        type: 'pc',
        vendor: 'cisco',
        name: 'PC Workstation',
        model: 'Desktop Host PC',
        description: 'Standard desktop client with Ethernet NIC and Windows Command Prompt',
        badgeColor: '#58a6ff',
      },
      {
        type: 'laptop',
        vendor: 'cisco',
        name: 'Laptop Client',
        model: 'Portable Workstation',
        description: 'Mobile client with Ethernet and WiFi association',
        badgeColor: '#58a6ff',
      },
      {
        type: 'server',
        vendor: 'linux',
        name: 'Ubuntu Server',
        model: 'Ubuntu Server 22.04 LTS',
        description: 'Enterprise dual-NIC Linux server running DHCP, DNS, HTTP services',
        badgeColor: '#f5c211',
      },
      {
        type: 'printer',
        vendor: 'cisco',
        name: 'Network Printer',
        model: 'Office Network Printer',
        description: 'Network-attached IP printer node',
        badgeColor: '#8b949e',
      },
      {
        type: 'wireless-client',
        vendor: 'cisco',
        name: 'Wireless Client',
        model: 'Mobile Wireless Host',
        description: '802.11 wireless client device',
        badgeColor: '#39d0d8',
      },
    ],
  },
  {
    id: 'wan-cloud',
    title: 'WAN & Cloud Services',
    icon: <Globe className="w-3.5 h-3.5 text-[#39d0d8]" />,
    items: [
      {
        type: 'cloud',
        vendor: 'cisco',
        name: 'Internet / WAN Cloud',
        model: 'WAN Gateway Node',
        description: 'Multi-interface WAN cloud gateway node for simulated internet',
        badgeColor: '#39d0d8',
      },
      {
        type: 'access-point',
        vendor: 'cisco',
        name: 'WiFi Access Point',
        model: 'Aironet 2802I AP',
        description: 'Dual-band 802.11ac wave 2 access point',
        badgeColor: '#58a6ff',
      },
      {
        type: 'packet-generator',
        vendor: 'cisco',
        name: 'Traffic Generator',
        model: 'NOC Flow Injector',
        description: 'Simulated packet flow generator and latency tester',
        badgeColor: '#f0883e',
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
  const { addToast, isDeviceLibrarySlim, toggleDeviceLibrarySlim } = useUiStore();

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
    const posX = 160 + Math.random() * 200;
    const posY = 120 + Math.random() * 200;

    const dev = addDevice(item.type, undefined, item.vendor, item.model);
    setNodePosition(dev.id, { x: posX, y: posY });
    pushHistorySnapshot();

    addToast({
      type: 'info',
      title: `${dev.hostname} Added`,
      message: `${item.model} deployed onto topology.`,
    });
  };

  // Ultra-Slim Dock View (w-12)
  if (isDeviceLibrarySlim) {
    return (
      <aside className="w-12 border-r border-[#21262d] bg-[#161b22] flex flex-col items-center py-2.5 select-none shrink-0 z-20 shadow-md">
        <button
          onClick={toggleDeviceLibrarySlim}
          className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#58a6ff] cursor-pointer mb-3 transition-colors"
          title="Expand Device Palette"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-[#21262d] mb-3" />

        {/* Quick Category Icons */}
        <div className="flex flex-col gap-2.5 items-center flex-1 overflow-y-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('devices');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#f85149] hover:scale-110 cursor-pointer transition-all"
            title="Firewalls & Security (Click to Expand)"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('devices');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#58a6ff] hover:scale-110 cursor-pointer transition-all"
            title="Routers & Gateways (Click to Expand)"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('devices');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#3fb950] hover:scale-110 cursor-pointer transition-all"
            title="Switches L2/L3 (Click to Expand)"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('devices');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#a371f7] hover:scale-110 cursor-pointer transition-all"
            title="End Devices & Workstations (Click to Expand)"
          >
            <Cpu className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('cables');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#d29922] hover:scale-110 cursor-pointer transition-all"
            title="Cables & Connectors (Click to Expand)"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Normal Slim View (w-50)
  return (
    <aside className="w-50 border-r border-[#21262d] bg-[#161b22] flex flex-col h-full select-none shrink-0 z-20 shadow-lg">
      {/* Header and Mode Tabs */}
      <div className="p-2 border-b border-[#21262d]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">Devices</span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#58a6ff] font-mono bg-[#58a6ff]/10 px-1 rounded border border-[#58a6ff]/20">MULTI-VENDOR</span>
            <button
              onClick={toggleDeviceLibrarySlim}
              className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] cursor-pointer transition-colors"
              title="Collapse into slim dock"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Devices vs Cables Tabs */}
        <div className="flex items-center p-0.5 rounded bg-[#0d1117] border border-[#21262d] mb-1.5">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
              activeTab === 'devices' ? 'bg-[#21262d] text-[#58a6ff] shadow-xs' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Devices</span>
          </button>
          <button
            onClick={() => setActiveTab('cables')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
              activeTab === 'cables' ? 'bg-[#21262d] text-[#d29922] shadow-xs' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            <Zap className="w-3 h-3 text-[#d29922]" />
            <span>Cables</span>
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="space-y-1.5">
            {/* Vendor Filter Badges */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {VENDOR_FILTERS.map((vf) => {
                const isSelected = vendorFilter === vf.id;
                return (
                  <button
                    key={vf.id}
                    onClick={() => setVendorFilter(vf.id)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1f6feb] text-white'
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
              <Search className="w-3 h-3 absolute left-2 top-2 text-[#8b949e]" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-[11px] bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Body: Either Cables Palette or Multi-Vendor Device Categories */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
        {activeTab === 'cables' ? (
          <div className="space-y-2">
            <div className="px-1 text-[10px] text-[#8b949e]">
              Click a cable type, then click devices to connect:
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
                    className="w-full flex items-center justify-between px-1.5 py-0.5 text-[10px] font-bold text-[#8b949e] hover:text-[#e6edf3] rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      {cat.icon}
                      <span className="truncate">{cat.title}</span>
                      <span className="text-[9px] text-[#484f58]">({filteredItems.length})</span>
                    </div>
                    {isCollapsed ? <ChevronRight className="w-2.5 h-2.5 shrink-0" /> : <ChevronDown className="w-2.5 h-2.5 shrink-0" />}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-1">
                      {filteredItems.map((item) => (
                        <div
                          key={`${item.vendor}-${item.model}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => handleQuickAdd(item)}
                          className="group flex items-center gap-1.5 p-1 rounded bg-[#0d1117] border border-[#21262d] hover:border-[#58a6ff]/60 hover:bg-[#1c2128] cursor-grab active:cursor-grabbing transition-all shadow-2xs"
                          title={`${item.name} (${item.vendor.toUpperCase()})\n${item.description}\nDrag onto canvas or click to add.`}
                        >
                          <div className="shrink-0 p-1 bg-[#161b22] rounded border border-[#21262d] group-hover:border-[#30363d]">
                            <DeviceIcon type={item.type} size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-semibold text-[#e6edf3] truncate group-hover:text-[#58a6ff]">
                                {item.name}
                              </span>
                              <span
                                className="px-1 py-0.2 rounded text-[7px] font-bold uppercase tracking-wider shrink-0 text-white leading-tight"
                                style={{ backgroundColor: item.badgeColor }}
                              >
                                {item.vendor}
                              </span>
                            </div>
                            <div className="text-[9px] text-[#8b949e] truncate leading-tight font-mono">
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
