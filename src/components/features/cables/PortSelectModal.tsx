import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';
import { DeviceIcon } from '../device-library/DeviceIcon';
import { X, Cable, CheckCircle2, AlertCircle } from 'lucide-react';

export function PortSelectModal() {
  const { cableTool, portSelectModal, setPortSelectModal, setCableSource, resetCableTool, addToast } = useUiStore();
  const { topology, addLink } = useNetworkStore();
  const { pushHistorySnapshot } = useProjectStore();

  if (!portSelectModal.isOpen || !portSelectModal.deviceId) return null;

  const device = topology.devices[portSelectModal.deviceId];
  if (!device) return null;

  const interfaces = Object.values(device.interfaces);
  const isTarget = portSelectModal.isTarget;

  const handleSelectInterface = (ifaceId: string) => {
    const iface = device.interfaces[ifaceId];
    if (iface.linkedTo) {
      addToast({
        type: 'warning',
        title: 'Port Already Connected',
        message: `${iface.name} is already connected to another device. Please disconnect it first or choose another port.`,
      });
      return;
    }

    if (!isTarget) {
      // Set source device and interface
      setCableSource(device.id, ifaceId);
      setPortSelectModal({ isOpen: false, deviceId: null, isTarget: false });
      addToast({
        type: 'info',
        title: 'Source Port Selected',
        message: `Connected cable to ${device.hostname} (${iface.shortName}). Now click the target device to connect.`,
      });
    } else {
      // Connect source to target
      if (!cableTool.sourceDeviceId || !cableTool.sourceInterfaceId) {
        resetCableTool();
        return;
      }

      const srcDev = topology.devices[cableTool.sourceDeviceId];
      const srcIface = srcDev?.interfaces[cableTool.sourceInterfaceId];

      const newLink = addLink(
        cableTool.sourceDeviceId,
        cableTool.sourceInterfaceId,
        device.id,
        ifaceId
      );

      if (newLink) {
        pushHistorySnapshot();
        addToast({
          type: 'success',
          title: 'Link Established',
          message: `Connected ${srcDev?.hostname} (${srcIface?.shortName}) <--> ${device.hostname} (${iface.shortName})`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          message: 'Could not connect the selected interfaces. They may be incompatible or already linked.',
        });
      }

      resetCableTool();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-[#58a6ff]">
              <Cable className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#e6edf3]">
                {isTarget ? 'Connect Cable to Target Port' : 'Select Source Port to Plug Cable'}
              </div>
              <div className="text-[11px] text-[#8b949e] flex items-center gap-1.5">
                <DeviceIcon type={device.type} size={14} />
                <span>{device.hostname} ({device.model})</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setPortSelectModal({ isOpen: false, deviceId: null, isTarget: false })}
            className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Port list */}
        <div className="p-4 max-h-[380px] overflow-y-auto space-y-2">
          <div className="text-[11px] text-[#8b949e] font-medium mb-1">
            Available Interfaces ({interfaces.filter((i) => !i.linkedTo).length}/{interfaces.length}):
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {interfaces.map((iface) => {
              const isOccupied = Boolean(iface.linkedTo);
              return (
                <button
                  key={iface.id}
                  disabled={isOccupied}
                  onClick={() => handleSelectInterface(iface.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isOccupied
                      ? 'bg-[#0d1117]/50 border-[#21262d] opacity-50 cursor-not-allowed'
                      : 'bg-[#0d1117] border-[#30363d] hover:border-[#58a6ff] hover:bg-[#1f6feb]/10 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isOccupied ? 'bg-[#da3633]' : 'bg-[#3fb950]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#e6edf3] truncate font-mono">
                        {iface.name}
                      </div>
                      <div className="text-[10px] text-[#8b949e] truncate">
                        {iface.speed} Mbps • {iface.duplex} duplex
                        {iface.ipv4?.address ? ` • IP: ${iface.ipv4.address}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-[10px] font-medium">
                    {isOccupied ? (
                      <span className="flex items-center gap-1 text-[#da3633]">
                        <AlertCircle className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#3fb950]">
                        <CheckCircle2 className="w-3 h-3" />
                        Available
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0d1117] border-t border-[#21262d] flex items-center justify-between">
          <span className="text-[10px] text-[#8b949e]">
            {cableTool.activeCable ? `Cable type: ${cableTool.activeCable}` : 'Select an interface to connect'}
          </span>
          <button
            onClick={() => {
              resetCableTool();
              setPortSelectModal({ isOpen: false, deviceId: null, isTarget: false });
            }}
            className="px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-[#8b949e] hover:text-[#e6edf3] cursor-pointer"
          >
            Cancel Cable
          </button>
        </div>
      </div>
    </div>
  );
}

