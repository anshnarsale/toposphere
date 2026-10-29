import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useUiStore } from '@/store/uiStore';

export const NetworkEdge = memo(function NetworkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const { topology } = useNetworkStore();
  const { animatedPackets } = useSimulationStore();
  const { setContextMenu, setSelectedLinkIds } = useUiStore();

  const link = topology.links[id];
  const operState = link?.operState ?? 'down';

  const strokeColor = {
    up: '#3fb950',
    down: '#f85149',
    'err-disabled': '#484f58',
  }[operState] ?? '#484f58';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const activePackets = animatedPackets.filter((p) => p.linkId === id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLinkIds([id]);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetType: 'link',
    });
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#58a6ff' : strokeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: operState === 'down' ? '4 4' : undefined,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
      />

      {/* Packet in-flight animations flowing along calculated link path */}
      {activePackets.map((pkt) => (
        <circle key={pkt.id} r={6} fill={pkt.color} opacity={0.9}>
          <animateMotion
            dur={`${pkt.duration}ms`}
            repeatCount="indefinite"
            path={pkt.direction === 'forward' ? edgePath : edgePath}
            keyPoints={pkt.direction === 'forward' ? '0;1' : '1;0'}
            keyTimes="0;1"
          />
        </circle>
      ))}

      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          onContextMenu={handleContextMenu}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`
            px-2 py-0.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all
            ${selected ? 'bg-[#1f6feb] text-white border-[#58a6ff]' : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#e6edf3]'}
          `}
        >
          {link ? `${link.bandwidth}M` : 'Ethernet'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

