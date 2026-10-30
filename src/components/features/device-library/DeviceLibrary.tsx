import { useState, useMemo } from 'react';
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
  Router,
  Monitor,
  X,
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
  section: 'network' | 'end-devices' | 'firewalls' | 'infra';
  icon: React.ReactNode;
  items: DeviceItem[];
}

const VENDOR_FILTERS: Array<{ id: 'all' | DeviceVendor; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'cisco', label: 'Cisco' },
  { id: 'linux', label: 'Linux/PC' },
  { id: 'juniper', label: 'Juniper' },
  { id: 'arista', label: 'Arista' },
  { id: 'mikrotik', label: 'MikroTik' },
  { id: 'fortinet', label: 'Fortinet' },
  { id: 'paloalto', label: 'Palo Alto' },
  { id: 'pfsense', label: 'pfSense' },
  { id: 'checkpoint', label: 'Check Point' },
];

/**
 * Ordered strictly starting with Basics:
 * 1. Network Devices: Routers & Gateways
 * 2. Network Devices: Switches (L2 & L3)
 * 3. End Devices & Hosts (PCs, Laptops, Servers)
 * 4. Firewalls & Security (Afterwards)
 * 5. Wireless & Infrastructure
 */
const CATEGORIES: CategoryGroup[] = [
  {
    id: 'network-routers',
    title: 'Routers & Gateways',
    section: 'network',
    icon: <Router className="w-3.5 h-3.5 text-[#00f0ff]" />,
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
    section: 'network',
    icon: <Layers className="w-3.5 h-3.5 text-[#00ff66]" />,
    items: [
      {
        type: 'switch',
        vendor: 'cisco',
        name: 'Cisco Catalyst 2960',
        model: 'Catalyst 2960-24TT',
        description: '24-port FastEthernet + 2x Gigabit Layer 2 switch with VLANs',
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
    title: 'End Devices & Workstations',
    section: 'end-devices',
    icon: <Monitor className="w-3.5 h-3.5 text-[#ffe600]" />,
    items: [
      {
        type: 'pc',
        vendor: 'cisco',
        name: 'PC Workstation',
        model: 'Standard Desktop PC',
        description: 'Standard workstation with Ethernet NIC and Windows Command Prompt',
        badgeColor: '#58a6ff',
      },
      {
        type: 'laptop',
        vendor: 'cisco',
        name: 'Laptop Client',
        model: 'Mobile Workstation',
        description: 'Mobile client with Ethernet NIC and Command Prompt',
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
    id: 'security-firewalls',
    title: 'Firewalls & Security (NGFW)',
    section: 'firewalls',
    icon: <Shield className="w-3.5 h-3.5 text-[#ff3366]" />,
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
    id: 'wan-cloud',
    title: 'Wireless & Infrastructure',
    section: 'infra',
    icon: <Globe className="w-3.5 h-3.5 text-[#a371f7]" />,
    items: [
      {
        type: 'access-point',
        vendor: 'cisco',
        name: 'WiFi Access Point',
        model: 'Aironet 2802I AP',
        description: 'Dual-band 802.11ac wave 2 access point',
        badgeColor: '#58a6ff',
      },
      {
        type: 'cloud',
        vendor: 'cisco',
        name: 'Internet / WAN Cloud',
        model: 'WAN Gateway Node',
        description: 'Multi-interface WAN cloud gateway node for simulated internet',
        badgeColor: '#39d0d8',
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

type QuickFilter = 'all' | 'network' | 'end-devices' | 'firewalls';

export function DeviceLibrary() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'devices' | 'cables'>('devices');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
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
      message: `${item.name} (${item.model}) deployed onto topology.`,
    });
  };

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      if (quickFilter === 'all') return true;
      return cat.section === quickFilter;
    });
  }, [quickFilter]);

  // Ultra-Slim Dock View (w-12)
  if (isDeviceLibrarySlim) {
    return (
      <aside className="w-12 border-r-2 border-black bg-[var(--bg-secondary)] flex flex-col items-center py-2.5 select-none shrink-0 z-20 shadow-[2px_0px_0px_#000]">
        <button
          onClick={toggleDeviceLibrarySlim}
          className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer mb-3"
          title="Expand Device Palette"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <div className="w-6 h-0.5 bg-black mb-3" />

        {/* Quick Category Icons */}
        <div className="flex flex-col gap-2.5 items-center flex-1 overflow-y-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('devices');
              setQuickFilter('network');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 border border-black bg-[var(--bg-primary)] text-[#00f0ff] hover:bg-[#ffe600] hover:text-black cursor-pointer shadow-[1px_1px_0px_#000]"
            title="Network Devices (Routers & Switches)"
          >
            <Router className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('devices');
              setQuickFilter('end-devices');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 border border-black bg-[var(--bg-primary)] text-[#ffe600] hover:bg-black hover:text-[#ffe600] cursor-pointer shadow-[1px_1px_0px_#000]"
            title="End Devices & Hosts (PCs, Servers)"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('devices');
              setQuickFilter('firewalls');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 border border-black bg-[var(--bg-primary)] text-[#ff3366] hover:bg-[#ffe600] hover:text-black cursor-pointer shadow-[1px_1px_0px_#000]"
            title="Firewalls & Security (NGFW)"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('cables');
              toggleDeviceLibrarySlim();
            }}
            className="p-2 border border-black bg-[var(--bg-primary)] text-[#ff6b00] hover:bg-[#ffe600] hover:text-black cursor-pointer shadow-[1px_1px_0px_#000]"
            title="Cables & Connectors"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Normal Uncluttered View (w-60)
  return (
    <aside className="w-60 border-r-2 border-black bg-[var(--bg-secondary)] flex flex-col h-full select-none shrink-0 z-20 shadow-[2px_0px_0px_#000]">
      {/* Header & Tabs */}
      <div className="p-2.5 border-b-2 border-black space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-black uppercase tracking-wider text-[var(--text-primary)]">
            Hardware Palette
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-black font-mono font-black bg-[#ffe600] px-1.5 py-0.2 border border-black">
              MULTI-VENDOR
            </span>
            <button
              onClick={toggleDeviceLibrarySlim}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-primary)] cursor-pointer"
              title="Collapse palette"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Devices vs Cables Mode Toggle */}
        <div className="flex items-center p-0.5 bg-[var(--bg-primary)] border-2 border-black shadow-[1px_1px_0px_#000]">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 font-mono text-[10px] font-black uppercase cursor-pointer transition-all ${
              activeTab === 'devices'
                ? 'bg-[#ffe600] text-black border border-black shadow-[1px_1px_0px_#000]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Devices</span>
          </button>
          <button
            onClick={() => setActiveTab('cables')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 font-mono text-[10px] font-black uppercase cursor-pointer transition-all ${
              activeTab === 'cables'
                ? 'bg-[#00f0ff] text-black border border-black shadow-[1px_1px_0px_#000]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Cables</span>
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="space-y-1.5">
            {/* Quick Section Filter Pills (Basics First!) */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => setQuickFilter('all')}
                className={`py-0.5 text-[9px] font-mono font-black uppercase border border-black cursor-pointer transition-all ${
                  quickFilter === 'all' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setQuickFilter('network')}
                className={`py-0.5 text-[9px] font-mono font-black uppercase border border-black cursor-pointer transition-all ${
                  quickFilter === 'network' ? 'bg-[#00f0ff] text-black font-black' : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Routers & Switches"
              >
                Network
              </button>
              <button
                onClick={() => setQuickFilter('end-devices')}
                className={`py-0.5 text-[9px] font-mono font-black uppercase border border-black cursor-pointer transition-all ${
                  quickFilter === 'end-devices' ? 'bg-[#ffe600] text-black font-black' : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="PCs, Laptops, Servers"
              >
                End Dev
              </button>
              <button
                onClick={() => setQuickFilter('firewalls')}
                className={`py-0.5 text-[9px] font-mono font-black uppercase border border-black cursor-pointer transition-all ${
                  quickFilter === 'firewalls' ? 'bg-[#ff3366] text-white font-black' : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Firewalls & NGFW"
              >
                Security
              </button>
            </div>

            {/* Vendor Filter Badges */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {VENDOR_FILTERS.map((vf) => {
                const isSelected = vendorFilter === vf.id;
                return (
                  <button
                    key={vf.id}
                    onClick={() => setVendorFilter(vf.id)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase whitespace-nowrap cursor-pointer transition-all border border-black ${
                      isSelected
                        ? 'bg-[#ffe600] text-black font-black shadow-[1px_1px_0px_#000]'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {vf.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input with Clear Button */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search hardware..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-[11px] font-mono bg-[var(--bg-primary)] border-2 border-black text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:bg-[#ffe600]/10 shadow-[1px_1px_0px_#000]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1.5 p-0.5 text-[var(--text-muted)] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body: Either Cables Palette or Structured Multi-Vendor Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {activeTab === 'cables' ? (
          <div className="space-y-2">
            <div className="px-1 text-[10px] font-mono text-[var(--text-muted)] uppercase">
              Select cable, then connect device interfaces:
            </div>
            <CablesPalette />
          </div>
        ) : (
          <>
            {visibleCategories.map((cat) => {
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
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-[10px] font-mono font-black uppercase text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-black/15"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {cat.icon}
                      <span className="truncate">{cat.title}</span>
                      <span className="text-[9px] text-[var(--text-muted)] font-mono">({filteredItems.length})</span>
                    </div>
                    {isCollapsed ? <ChevronRight className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
                  </button>

                  {/* Device Items */}
                  {!isCollapsed && (
                    <div className="space-y-1.5 pt-0.5">
                      {filteredItems.map((item) => (
                        <div
                          key={`${item.vendor}-${item.model}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => handleQuickAdd(item)}
                          className="group flex items-center gap-2 p-1.5 bg-[var(--bg-primary)] border-2 border-black hover:bg-[#ffe600]/15 cursor-grab active:cursor-grabbing transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                          title={`${item.name} (${item.vendor.toUpperCase()})\n${item.description}\nDrag onto canvas or click to add.`}
                        >
                          <div className="shrink-0 p-1.5 bg-[var(--bg-secondary)] border border-black shadow-[1px_1px_0px_#000]">
                            <DeviceIcon type={item.type} size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-black uppercase text-[var(--text-primary)] truncate group-hover:text-[#00f0ff]">
                                {item.name}
                              </span>
                              <span
                                className="px-1 py-0.2 border border-black text-[7px] font-mono font-black uppercase tracking-wider shrink-0 text-black leading-tight"
                                style={{ backgroundColor: item.badgeColor }}
                              >
                                {item.vendor}
                              </span>
                            </div>
                            <div className="text-[9px] text-[var(--text-muted)] truncate leading-tight font-mono">
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
