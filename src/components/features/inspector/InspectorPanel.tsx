import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { DeviceIcon } from '../device-library/DeviceIcon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { OverviewTab } from './tabs/OverviewTab';
import { InterfacesTab } from './tabs/InterfacesTab';
import { RoutingTab } from './tabs/RoutingTab';
import { VlanTab } from './tabs/VlanTab';
import { ServicesTab } from './tabs/ServicesTab';
import { LogsTab } from './tabs/LogsTab';
import { X, Terminal, Shield } from 'lucide-react';

export function InspectorPanel() {
  const {
    selectedDeviceIds,
    setSelectedDeviceIds,
    inspectorTab,
    setInspectorTab,
    panels,
    setActiveTerminalDevice,
    setActiveFirewallGuiDevice,
  } = useUiStore();
  const { topology } = useNetworkStore();

  if (!panels.inspector.visible) return null;

  const selectedDeviceId = selectedDeviceIds[0];
  const device = selectedDeviceId ? topology.devices[selectedDeviceId] : null;

  if (!device) {
    return (
      <aside className="w-80 border-l border-[#21262d] bg-[#161b22] flex flex-col items-center justify-center p-6 text-center select-none shrink-0">
        <div className="w-12 h-12 rounded-full bg-[#0d1117] border border-[#21262d] flex items-center justify-center text-[#484f58] mb-3">
          ?
        </div>
        <div className="text-xs font-semibold text-[#e6edf3] mb-1">No Device Selected</div>
        <div className="text-[11px] text-[#8b949e]">
          Click any device or interface on the canvas to configure its network parameters.
        </div>
      </aside>
    );
  }

  const isSwitch = device.type === 'switch' || device.type === 'switch-l3';
  const isRouter = device.type === 'router' || device.type === 'switch-l3' || device.type === 'firewall';
  const isServer = device.type === 'server' || device.type === 'router';

  return (
    <aside className="w-84 border-l border-[#21262d] bg-[#161b22] flex flex-col h-full overflow-hidden shrink-0 select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 p-1 bg-[#0d1117] rounded border border-[#21262d]">
            <DeviceIcon type={device.type} size={28} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#e6edf3] truncate">{device.hostname}</span>
              {device.vendor && (
                <span className="text-[9px] font-mono px-1 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d] uppercase font-semibold">
                  {device.vendor}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#8b949e] truncate">{device.model}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {device.type === 'firewall' && (
            <button
              onClick={() => setActiveFirewallGuiDevice(device.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#f85149]/20 hover:bg-[#f85149]/30 text-[#f85149] border border-[#f85149]/50 text-xs font-semibold cursor-pointer shadow-sm transition-colors"
              title="Open Firewall Web Management GUI"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Web GUI</span>
            </button>
          )}
          <button
            onClick={() => setActiveTerminalDevice(device.id)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#2d333b] text-[#3fb950] border border-[#30363d] text-xs font-semibold cursor-pointer shadow-sm hover:border-[#3fb950]/50 transition-colors"
            title={`Open ${device.vendor ? device.vendor.toUpperCase() + ' ' : ''}CLI Console`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>CLI</span>
          </button>
          <button
            onClick={() => setSelectedDeviceIds([])}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={inspectorTab}
        onValueChange={setInspectorTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="p-2 border-b border-[#21262d] bg-[#161b22]">
          <TabsList className="w-full justify-start overflow-x-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
            {isRouter && <TabsTrigger value="routing">Routing</TabsTrigger>}
            {isSwitch && <TabsTrigger value="vlans">VLANs</TabsTrigger>}
            {isServer && <TabsTrigger value="services">Services</TabsTrigger>}
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0d1117]">
          <TabsContent value="overview" className="m-0">
            <OverviewTab device={device} />
          </TabsContent>
          <TabsContent value="interfaces" className="m-0">
            <InterfacesTab device={device} />
          </TabsContent>
          {isRouter && (
            <TabsContent value="routing" className="m-0">
              <RoutingTab device={device} />
            </TabsContent>
          )}
          {isSwitch && (
            <TabsContent value="vlans" className="m-0">
              <VlanTab device={device} />
            </TabsContent>
          )}
          {isServer && (
            <TabsContent value="services" className="m-0">
              <ServicesTab device={device} />
            </TabsContent>
          )}
          <TabsContent value="logs" className="m-0">
            <LogsTab device={device} />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}

