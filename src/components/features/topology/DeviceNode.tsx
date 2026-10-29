import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { DeviceIcon } from '../device-library/DeviceIcon';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import type { DeviceType } from '@/types/network';

export interface DeviceNodeData {
  deviceId: string;
  type: DeviceType;
  hostname: string;
}

export const DeviceNode = memo(function DeviceNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DeviceNodeData;
  const { topology } = useNetworkStore();
  const { setSelectedDeviceIds, setActiveTerminalDevice, setContextMenu } = useUiStore();

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
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      className={`
        relative group flex flex-col items-center p-2.5 rounded-xl
        bg-[#161b22] border transition-all select-none
        ${selected ? 'border-[#58a6ff] ring-2 ring-[#58a6ff]/40 shadow-lg shadow-[#1f6feb]/20' : 'border-[#30363d] hover:border-[#8b949e]'}
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
        return (
          <Handle
            key={`left-${iface.id}`}
            id={iface.id}
            type="source"
            position={Position.Left}
            style={{
              top: `${topPercent}%`,
              backgroundColor: iface.operState === 'up' ? '#3fb950' : '#484f58',
              borderColor: iface.adminState === 'up' ? '#21262d' : '#da3633',
            }}
            title={`${iface.name} (${iface.operState})`}
          />
        );
      })}

      {/* Right Interface Handles */}
      {rightInterfaces.map((iface, idx) => {
        const topPercent = ((idx + 1) / (rightInterfaces.length + 1)) * 100;
        return (
          <Handle
            key={`right-${iface.id}`}
            id={iface.id}
            type="source"
            position={Position.Right}
            style={{
              top: `${topPercent}%`,
              backgroundColor: iface.operState === 'up' ? '#3fb950' : '#484f58',
              borderColor: iface.adminState === 'up' ? '#21262d' : '#da3633',
            }}
            title={`${iface.name} (${iface.operState})`}
          />
        );
      })}
    </div>
  );
});
