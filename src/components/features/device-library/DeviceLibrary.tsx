import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Layers, Cpu, Radio, Shield, Globe, Wrench, Zap, Cable } from 'lucide-react';
import { DeviceIcon } from './DeviceIcon';
import { CablesPalette } from '../cables/CablesPalette';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import type { DeviceType } from '@/types/network';

interface DeviceItem {
  type: DeviceType;
  name: string;
  model: string;
  description: string;
}

interface CategoryGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: DeviceItem[];
}

const CATEGORIES: CategoryGroup[] = [
  {
    id: 'end-devices',
    title: 'End Devices',
    icon: <Cpu className="w-3.5 h-3.5 text-[#58a6ff]" />,
    items: [
      { type: 'pc', name: 'PC Workstation', model: 'Generic PC', description: 'Standard desktop client with FastEthernet' },
      { type: 'laptop', name: 'Laptop', model: 'Portable PC', description: 'Mobile host workstation' },
      { type: 'server', name: 'Enterprise Server', model: '1U Rack Server', description: 'Dual-Gigabit server for network services' },
      { type: 'printer', name: 'Network Printer', model: 'Office Printer', description: 'Ethernet networked printer node' },
      { type: 'wireless-client', name: 'Wireless Client', model: 'Mobile Device', description: 'Tablet / Wireless endpoint' },
    ],
  },
  {
    id: 'network-devices',
    title: 'Network Devices',
    icon: <Layers className="w-3.5 h-3.5 text-[#3fb950]" />,
    items: [
      { type: 'router', name: 'Edge Router', model: 'ISR 4331', description: 'Layer 3 enterprise router with 3x Gigabit ports' },
      { type: 'switch', name: 'L2 Switch', model: 'Catalyst 2960', description: '24-port FastEthernet + 2x Gigabit switch' },
      { type: 'switch-l3', name: 'L3 Switch', model: 'Catalyst 3650', description: 'Multilayer switch with routing and SVIs' },
    ],
  },
  {
    id: 'wireless',
    title: 'Wireless',
    icon: <Radio className="w-3.5 h-3.5 text-[#39d0d8]" />,
    items: [
      { type: 'access-point', name: 'Access Point', model: 'Aironet 2802', description: '802.11ac dual-band access point' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: <Shield className="w-3.5 h-3.5 text-[#d29922]" />,
    items: [
      { type: 'firewall', name: 'Firewall Gateway', model: 'ASA 5506-X', description: 'Security appliance with Inside/Outside/DMZ' },
    ],
  },
  {
    id: 'wan',
    title: 'WAN & Cloud',
    icon: <Globe className="w-3.5 h-3.5 text-[#bc8cff]" />,
    items: [
      { type: 'cloud', name: 'Internet / Cloud', model: 'WAN Gateway', description: 'Simulated wide-area network cloud' },
    ],
  },
  {
    id: 'tools',
    title: 'Testing Tools',
    icon: <Wrench className="w-3.5 h-3.5 text-[#f85149]" />,
    items: [
      { type: 'packet-generator', name: 'Traffic Probe', model: 'Probe 1000', description: 'Active packet generator and monitor' },
    ],
  },
];

export function DeviceLibrary() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'devices' | 'cables'>('devices');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { addDevice } = useNetworkStore();
  const { setNodePosition, pushHistorySnapshot } = useProjectStore();
  const { addToast } = useUiStore();

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleDragStart = (e: React.DragEvent, type: DeviceType) => {
    e.dataTransfer.setData('application/nexalab-device', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickAdd = (type: DeviceType) => {
    // Generate placement with jitter around canvas center
    const posX = 200 + Math.random() * 200;
    const posY = 150 + Math.random() * 200;

    const dev = addDevice(type);
    setNodePosition(dev.id, { x: posX, y: posY });
    pushHistorySnapshot();

    addToast({
      type: 'info',
      title: `${dev.hostname} Added`,
      message: `Placed on canvas at (${Math.round(posX)}, ${Math.round(posY)})`,
    });
  };

  return (
    <aside className="w-64 border-r border-[#21262d] bg-[#161b22] flex flex-col h-full select-none shrink-0">
      {/* Header and Mode Tabs (Cisco Packet Tracer Style) */}
      <div className="p-3 border-b border-[#21262d]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Hardware Palette</span>
          <span className="text-[10px] text-[#484f58] font-mono">PACKET TRACER</span>
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
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8b949e]" />
            <input
              type="text"
              placeholder="Search devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        )}
      </div>

      {/* Body: Either Cables Palette or Device Categories */}
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
            {/* Direct quick cable row for convenience */}
            <div className="p-2 rounded-lg bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#d29922]" />
                <span className="text-xs font-semibold text-[#e6edf3]">Connections / Cables</span>
              </div>
              <button
                onClick={() => setActiveTab('cables')}
                className="text-[10px] text-[#58a6ff] hover:underline cursor-pointer"
              >
                View all &rarr;
              </button>
            </div>

            {CATEGORIES.map((cat) => {
              const filteredItems = cat.items.filter(
                (item) =>
                  item.name.toLowerCase().includes(search.toLowerCase()) ||
                  item.description.toLowerCase().includes(search.toLowerCase()) ||
                  item.model.toLowerCase().includes(search.toLowerCase())
              );

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
                    </div>
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-1 pl-1">
                      {filteredItems.map((item) => (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.type)}
                          onClick={() => handleQuickAdd(item.type)}
                          className="group flex items-center gap-2.5 p-2 rounded-md bg-[#0d1117] border border-[#21262d] hover:border-[#58a6ff]/50 hover:bg-[#1c2128] cursor-grab active:cursor-grabbing transition-all shadow-sm"
                          title="Drag onto canvas or click to add"
                        >
                          <div className="shrink-0 p-1 bg-[#161b22] rounded border border-[#21262d] group-hover:border-[#30363d]">
                            <DeviceIcon type={item.type} size={28} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[#e6edf3] truncate group-hover:text-[#58a6ff]">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-[#8b949e] truncate">{item.model}</div>
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

