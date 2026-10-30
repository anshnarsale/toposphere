import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { DeviceIcon } from '../device-library/DeviceIcon';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import type { DeviceType } from '@/types/network';

export interface DeviceNodeData {
  deviceId: string;
  type: DeviceType;
  hostname: string;
}

const VENDOR_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  cisco: { label: 'CISCO', bg: 'bg-[#049fd9]/15', text: 'text-[#38bdf8]', border: 'border-[#049fd9]/30' },
  juniper: { label: 'JUNIPER', bg: 'bg-[#84bd00]/15', text: 'text-[#a3e635]', border: 'border-[#84bd00]/30' },
  arista: { label: 'ARISTA', bg: 'bg-[#38bdf8]/15', text: 'text-[#7dd3fc]', border: 'border-[#38bdf8]/30' },
  mikrotik: { label: 'MIKROTIK', bg: 'bg-[#e05206]/15', text: 'text-[#fb923c]', border: 'border-[#e05206]/30' },
  fortinet: { label: 'FORTINET', bg: 'bg-[#ee3124]/15', text: 'text-[#f87171]', border: 'border-[#ee3124]/30' },
  linux: { label: 'LINUX', bg: 'bg-[#f5c211]/15', text: 'text-[#facc15]', border: 'border-[#f5c211]/30' },
};

export const DeviceNode = memo(function DeviceNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DeviceNodeData;
  const { topology, addLink } = useNetworkStore();
  const {
    setSelectedDeviceIds,
    setActiveTerminalDevice,
    setContextMenu,
    cableTool,
    setCableSource,
    resetCableTool,
    setPortSelectModal,
    addToast,
  } = useUiStore();
  const { pushHistorySnapshot } = useProjectStore();

  const device = topology.devices[nodeData.deviceId];
  if (!device) return null;

  const interfaces = Object.values(device.interfaces);
  const upCount = interfaces.filter((i) => i.operState === 'up').length;
  const configuredCount = interfaces.filter((i) => i.ipv4 || i.linkedTo).length;

  let statusColor = '#484f58'; // inactive
  let statusText = 'Offline';
  if (upCount > 0 && upCount === configuredCount) {
    statusColor = '#3fb950'; // operational
    statusText = 'Operational';
  } else if (upCount > 0) {
    statusColor = '#d29922'; // partial
    statusText = 'Partial Link';
  }

  // Left vs Right interface handle distribution
  const leftInterfaces = interfaces.slice(0, Math.ceil(interfaces.length / 2));
  const rightInterfaces = interfaces.slice(Math.ceil(interfaces.length / 2));

  const isCableSource = cableTool.sourceDeviceId === device.id;
  const isCableModeActive = Boolean(cableTool.activeCable);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If cable tool is active
    if (cableTool.activeCable) {
      if (!cableTool.sourceDeviceId) {
        // Step 1: Select source device
        if (cableTool.activeCable === 'auto') {
          const availableIface = Object.values(device.interfaces).find((i) => !i.linkedTo);
          if (!availableIface) {
            addToast({
              type: 'warning',
              title: 'No Free Ports',
              message: `${device.hostname} has no available ports left.`,
            });
            return;
          }
          setCableSource(device.id, availableIface.id);
          addToast({
            type: 'info',
            title: 'Auto Cable Plugged',
            message: `Plugged into ${device.hostname} (${availableIface.shortName}). Now click target device.`,
          });
        } else {
          setPortSelectModal({ isOpen: true, deviceId: device.id, isTarget: false });
        }
      } else {
        // Step 2: Select target device
        if (cableTool.sourceDeviceId === device.id) {
          addToast({
            type: 'warning',
            title: 'Invalid Connection',
            message: 'Cannot connect a device to itself.',
          });
          return;
        }

        if (cableTool.activeCable === 'auto') {
          const availableIface = Object.values(device.interfaces).find((i) => !i.linkedTo);
          if (!availableIface) {
            addToast({
              type: 'warning',
              title: 'No Free Ports',
              message: `${device.hostname} has no available ports left.`,
            });
            return;
          }

          const srcDev = topology.devices[cableTool.sourceDeviceId];
          const srcIface = srcDev?.interfaces[cableTool.sourceInterfaceId!];

          const newLink = addLink(
            cableTool.sourceDeviceId,
            cableTool.sourceInterfaceId!,
            device.id,
            availableIface.id
          );

          if (newLink) {
            pushHistorySnapshot();
            addToast({
              type: 'success',
              title: 'Link Established',
              message: `Connected ${srcDev?.hostname} (${srcIface?.shortName}) <--> ${device.hostname} (${availableIface.shortName})`,
            });
          }
          resetCableTool();
        } else {
          setPortSelectModal({ isOpen: true, deviceId: device.id, isTarget: true });
        }
      }
      return;
    }

    // Normal selection
    setSelectedDeviceIds([device.id]);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDeviceIds([device.id]);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId: device.id,
      targetType: 'device',
    });
  };

  const handleDoubleClick = () => {
    setActiveTerminalDevice(device.id);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      className={`
        relative group flex flex-col items-center p-2.5 rounded-none
        bg-[var(--bg-secondary)] border-2 border-black transition-all duration-120 select-none
        ${
          isCableSource
            ? 'border-2 border-black ring-4 ring-[#ffe600] shadow-[5px_5px_0px_#ffe600] scale-105'
            : isCableModeActive
            ? 'border-2 border-black hover:ring-2 hover:ring-[#00f0ff] cursor-pointer shadow-[3px_3px_0px_#000]'
            : selected
            ? 'border-2 border-black shadow-[5px_5px_0px_#ffe600] bg-[var(--bg-tertiary)] translate-x-[-1px] translate-y-[-1px]'
            : 'shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]'
        }
      `}
      style={{ minWidth: 105 }}
    >
      {/* Vendor Badge */}
      {device.vendor && VENDOR_BADGES[device.vendor] && (
        <div
          className={`absolute top-1 left-1.5 px-1 py-0.2 border border-black text-[8px] font-mono font-black tracking-wider uppercase ${VENDOR_BADGES[device.vendor].bg} ${VENDOR_BADGES[device.vendor].text}`}
        >
          {VENDOR_BADGES[device.vendor].label}
        </div>
      )}

      {/* Device Status Indicator Box */}
      <div
        className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border border-black transition-colors"
        style={{ backgroundColor: statusColor }}
        title={`Status: ${statusText}`}
      />

      {/* Realistic Hardware SVG Device Art */}
      <div className="p-1 mt-1">
        <DeviceIcon type={device.type} size={48} />
      </div>

      {/* Hostname Label */}
      <div className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)] text-center max-w-[125px] truncate leading-tight mt-1">
        {device.hostname}
      </div>

      {/* Primary IP or Model Subtext */}
      <div className="text-[10px] text-[var(--text-muted)] font-mono font-semibold text-center max-w-[115px] truncate">
        {Object.values(device.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address || device.model}
      </div>

      {/* VLAN Badge for connected hosts */}
      {(() => {
        if (!['pc', 'laptop', 'server', 'printer'].includes(device.type)) return null;
        for (const iface of Object.values(device.interfaces)) {
          if (iface.linkedTo) {
            const link = topology.links[iface.linkedTo];
            if (link) {
              const otherDevId = link.sourceDeviceId === device.id ? link.targetDeviceId : link.sourceDeviceId;
              const otherIfId = link.sourceDeviceId === device.id ? link.targetInterfaceId : link.sourceInterfaceId;
              const switchDev = topology.devices[otherDevId];
              if (switchDev && (switchDev.type === 'switch' || switchDev.type === 'switch-l3')) {
                const switchPort = switchDev.interfaces[otherIfId];
                if (switchPort) {
                  return (
                    <div className="mt-1 px-1.5 py-0.2 bg-[#00f0ff] text-black border border-black text-[9px] font-mono font-black shadow-[1px_1px_0px_#000]">
                      VLAN {switchPort.accessVlan}
                    </div>
                  );
                }
              }
            }
          }
        }
        return null;
      })()}

      {/* Left Interface Handles */}
      {leftInterfaces.map((iface, idx) => {
        const topPercent = ((idx + 1) / (leftInterfaces.length + 1)) * 100;
        const isOccupied = Boolean(iface.linkedTo);
        return (
          <div key={`left-grp-${iface.id}`}>
            {/* Target handle */}
            <Handle
              id={iface.id}
              type="target"
              position={Position.Left}
              isConnectable={!isOccupied}
              className="w-3 h-3 !bg-[#30363d] hover:!bg-[#58a6ff] hover:scale-125 transition-all cursor-crosshair z-10"
              style={{
                top: `${topPercent}%`,
                backgroundColor: iface.operState === 'up' ? '#3fb950' : isOccupied ? '#f85149' : '#8b949e',
                borderColor: '#161b22',
              }}
              title={`${iface.name} (${iface.operState})${isOccupied ? ' [Connected]' : ' [Available]'}`}
            />
            {/* Source handle */}
            <Handle
              id={iface.id}
              type="source"
              position={Position.Left}
              isConnectable={!isOccupied}
              className="w-3 h-3 !bg-[#30363d] hover:!bg-[#58a6ff] hover:scale-125 transition-all cursor-crosshair z-20"
              style={{
                top: `${topPercent}%`,
                backgroundColor: iface.operState === 'up' ? '#3fb950' : isOccupied ? '#f85149' : '#8b949e',
                borderColor: '#161b22',
              }}
              title={`${iface.name} (${iface.operState})${isOccupied ? ' [Connected]' : ' [Available]'}`}
            />
          </div>
        );
      })}

      {/* Right Interface Handles */}
      {rightInterfaces.map((iface, idx) => {
        const topPercent = ((idx + 1) / (rightInterfaces.length + 1)) * 100;
        const isOccupied = Boolean(iface.linkedTo);
        return (
          <div key={`right-grp-${iface.id}`}>
            {/* Target handle */}
            <Handle
              id={iface.id}
              type="target"
              position={Position.Right}
              isConnectable={!isOccupied}
              className="w-3 h-3 !bg-[#30363d] hover:!bg-[#58a6ff] hover:scale-125 transition-all cursor-crosshair z-10"
              style={{
                top: `${topPercent}%`,
                backgroundColor: iface.operState === 'up' ? '#3fb950' : isOccupied ? '#f85149' : '#8b949e',
                borderColor: '#161b22',
              }}
              title={`${iface.name} (${iface.operState})${isOccupied ? ' [Connected]' : ' [Available]'}`}
            />
            {/* Source handle */}
            <Handle
              id={iface.id}
              type="source"
              position={Position.Right}
              isConnectable={!isOccupied}
              className="w-3 h-3 !bg-[#30363d] hover:!bg-[#58a6ff] hover:scale-125 transition-all cursor-crosshair z-20"
              style={{
                top: `${topPercent}%`,
                backgroundColor: iface.operState === 'up' ? '#3fb950' : isOccupied ? '#f85149' : '#8b949e',
                borderColor: '#161b22',
              }}
              title={`${iface.name} (${iface.operState})${isOccupied ? ' [Connected]' : ' [Available]'}`}
            />
          </div>
        );
      })}
    </div>
  );
});

