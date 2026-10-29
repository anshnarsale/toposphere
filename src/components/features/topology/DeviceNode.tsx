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
        relative group flex flex-col items-center p-2.5 rounded-xl
        bg-[#161b22] border transition-colors duration-150 select-none
        ${
          isCableSource
            ? 'border-[#3fb950] ring-4 ring-[#3fb950]/40 shadow-xl shadow-[#3fb950]/20 scale-105'
            : isCableModeActive
            ? 'border-[#58a6ff] hover:ring-2 hover:ring-[#58a6ff]/50 cursor-pointer shadow-md'
            : selected
            ? 'border-[#58a6ff] ring-2 ring-[#58a6ff]/40 shadow-lg shadow-[#1f6feb]/20'
            : 'border-[#30363d] hover:border-[#8b949e]'
        }
      `}
      style={{ minWidth: 100 }}
    >
      {/* Device Status Indicator Glow Dot */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full transition-colors"
        style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
        title={`Status: ${statusText}`}
      />

      {/* Realistic Hardware SVG Device Art */}
      <div className="p-1">
        <DeviceIcon type={device.type} size={48} />
      </div>

      {/* Hostname Label */}
      <div className="text-xs font-semibold text-[#e6edf3] text-center max-w-[120px] truncate leading-tight mt-1">
        {device.hostname}
      </div>

      {/* Primary IP or Model Subtext */}
      <div className="text-[10px] text-[#8b949e] font-mono text-center max-w-[110px] truncate">
        {Object.values(device.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address || device.model}
      </div>

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

