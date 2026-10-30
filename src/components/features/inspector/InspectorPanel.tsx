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
      <aside className="w-80 border-l-2 border-black bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-6 text-center select-none shrink-0 shadow-[-2px_0px_0px_#000]">
        <div className="w-12 h-12 border-2 border-black bg-[#ffe600] flex items-center justify-center font-mono font-black text-black text-base mb-3 shadow-[2px_2px_0px_#000]">
          ?
        </div>
        <div className="text-xs font-mono font-black uppercase text-[var(--text-primary)] mb-1">No Device Selected</div>
        <div className="text-[11px] font-medium text-[var(--text-secondary)]">
          Click any device or interface on the canvas to configure its network parameters.
        </div>
      </aside>
    );
  }

  const isSwitch = device.type === 'switch' || device.type === 'switch-l3';
  const isRouter = device.type === 'router' || device.type === 'switch-l3' || device.type === 'firewall';
  const isServer = device.type === 'server' || device.type === 'router';

  return (
    <aside className="w-84 border-l-2 border-black bg-[var(--bg-secondary)] flex flex-col h-full overflow-hidden shrink-0 select-none shadow-[-2px_0px_0px_#000]">
      {/* Header */}
      <div className="p-3 border-b-2 border-black flex items-center justify-between bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 p-1 bg-[var(--bg-primary)] border border-black">
            <DeviceIcon type={device.type} size={28} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-black uppercase text-[var(--text-primary)] truncate">{device.hostname}</span>
              {device.vendor && (
                <span className="text-[9px] font-mono px-1 bg-[#ffe600] text-black border border-black uppercase font-black">
                  {device.vendor}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">{device.model}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {device.type === 'firewall' && (
            <button
              onClick={() => setActiveFirewallGuiDevice(device.id)}
              className="flex items-center gap-1 px-2 py-1 brutal-btn bg-[#ff6b00] text-black text-xs font-mono cursor-pointer"
              title="Open Firewall Web Management GUI"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Web GUI</span>
            </button>
          )}
          <button
            onClick={() => setActiveTerminalDevice(device.id)}
            className="flex items-center gap-1 px-2 py-1 brutal-btn bg-[#00ff66] text-black text-xs font-mono cursor-pointer"
            title={`Open ${device.vendor ? device.vendor.toUpperCase() + ' ' : ''}CLI Console`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>CLI</span>
          </button>
          <button
            onClick={() => setSelectedDeviceIds([])}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
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
        <div className="p-2 border-b-2 border-black bg-[var(--bg-primary)]">
          <TabsList className="w-full justify-start overflow-x-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
            {isRouter && <TabsTrigger value="routing">Routing</TabsTrigger>}
            {isSwitch && <TabsTrigger value="vlans">VLANs</TabsTrigger>}
            {isServer && <TabsTrigger value="services">Services</TabsTrigger>}
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
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

