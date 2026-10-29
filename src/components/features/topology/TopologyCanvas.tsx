import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNetworkStore } from '@/store/networkStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { DeviceNode } from './DeviceNode';
import { NetworkEdge } from './NetworkEdge';
import { CableBanner } from '../cables/CableBanner';
import { CanvasCableDock } from '../cables/CanvasCableDock';
import type { DeviceType } from '@/types/network';
import { PlusCircle, Network } from 'lucide-react';

const nodeTypes: NodeTypes = { device: DeviceNode };
const edgeTypes: EdgeTypes = { network: NetworkEdge };

function TopologyCanvasInner() {
  const { topology, addDevice, addLink, removeDevice, removeLink } = useNetworkStore();
  const { layout, setNodePosition, pushHistorySnapshot } = useProjectStore();
  const {
    selectedDeviceIds,
    setSelectedDeviceIds,
    selectedLinkIds,
    setSelectedLinkIds,
    showGrid,
    setContextMenu,
    addToast,
  } = useUiStore();

  const { screenToFlowPosition } = useReactFlow();

  // Convert network model to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    return Object.values(topology.devices).map((dev, index) => {
      const pos = layout[dev.id] || {
        x: 150 + (index % 4) * 200,
        y: 120 + Math.floor(index / 4) * 160,
      };

      return {
        id: dev.id,
        type: 'device',
        position: pos,
        data: {
          deviceId: dev.id,
          type: dev.type,
          hostname: dev.hostname,
        },
        selected: selectedDeviceIds.includes(dev.id),
      };
    });
  }, [topology.devices, layout, selectedDeviceIds]);

  // Convert network links to React Flow edges
  const edges: Edge[] = useMemo(() => {
    return Object.values(topology.links).map((link) => ({
      id: link.id,
      source: link.sourceDeviceId,
      sourceHandle: link.sourceInterfaceId,
      target: link.targetDeviceId,
      targetHandle: link.targetInterfaceId,
      type: 'network',
      selected: selectedLinkIds.includes(link.id),
    }));
  }, [topology.links, selectedLinkIds]);

  // Connect interfaces with intelligent fallback for missed handle drops
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const srcDev = topology.devices[connection.source];
      const tgtDev = topology.devices[connection.target];
      if (!srcDev || !tgtDev) return;

      let srcHandle = connection.sourceHandle;
      let tgtHandle = connection.targetHandle;

      // Smart fallback: if handle ID was missing or already occupied, find first free port
      if (!srcHandle || !srcDev.interfaces[srcHandle] || srcDev.interfaces[srcHandle].linkedTo) {
        const freeIface = Object.values(srcDev.interfaces).find((i) => !i.linkedTo);
        if (freeIface) srcHandle = freeIface.id;
      }

      if (!tgtHandle || !tgtDev.interfaces[tgtHandle] || tgtDev.interfaces[tgtHandle].linkedTo) {
        const freeIface = Object.values(tgtDev.interfaces).find((i) => !i.linkedTo);
        if (freeIface) tgtHandle = freeIface.id;
      }

      if (!srcHandle || !tgtHandle) {
        addToast({
          type: 'warning',
          title: 'No Free Ports',
          message: 'One of the devices has no free interfaces available to connect.',
        });
        return;
      }

      const newLink = addLink(
        connection.source,
        srcHandle,
        connection.target,
        tgtHandle
      );

      if (newLink) {
        pushHistorySnapshot();
        addToast({
          type: 'success',
          title: 'Link Established',
          message: `Connected ${srcDev.hostname} (${srcDev.interfaces[srcHandle]?.shortName}) <--> ${tgtDev.hostname} (${tgtDev.interfaces[tgtHandle]?.shortName})`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          message: 'Interface already occupied or incompatible.',
        });
      }
    },
    [addLink, topology.devices, pushHistorySnapshot, addToast]
  );

  // Drag over canvas
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Drop device onto canvas
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const devType = e.dataTransfer.getData('application/nexalab-device') as DeviceType;
      if (!devType) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dev = addDevice(devType);
      setNodePosition(dev.id, position);
      pushHistorySnapshot();

      addToast({
        type: 'info',
        title: `${dev.hostname} Placed`,
        message: `Hardware added to virtual rack at (${Math.round(position.x)}, ${Math.round(position.y)})`,
      });
    },
    [screenToFlowPosition, addDevice, setNodePosition, pushHistorySnapshot, addToast]
  );

  // Node position drag end
  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      setNodePosition(node.id, node.position);
    },
    [setNodePosition]
  );

  // Selection change
  const onSelectionChange = useCallback(
    (params: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedDeviceIds(params.nodes.map((n) => n.id));
      setSelectedLinkIds(params.edges.map((e) => e.id));
    },
    [setSelectedDeviceIds, setSelectedLinkIds]
  );

  // Canvas context menu
  const onPaneContextMenu = useCallback(
    (e: unknown) => {
      const mouseEvent = e as React.MouseEvent;
      mouseEvent.preventDefault?.();
      setContextMenu({
        visible: true,
        x: mouseEvent.clientX || 200,
        y: mouseEvent.clientY || 200,
        targetId: null,
        targetType: 'canvas',
      });
    },
    [setContextMenu]
  );

  return (
    <div
      className="flex-1 relative w-full h-full bg-[#0d1117] overflow-hidden select-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        className="w-full h-full"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onPaneContextMenu={onPaneContextMenu}
        isValidConnection={() => true}
        connectionLineStyle={{ stroke: '#58a6ff', strokeWidth: 2 }}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            color="#21262d"
            gap={20}
            size={1.5}
          />
        )}
        <Controls
          className="border border-[#21262d] bg-[#161b22] rounded-lg overflow-hidden shadow-lg"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(n) => {
            const dev = topology.devices[n.id];
            if (dev?.type === 'router') return '#58a6ff';
            if (dev?.type === 'switch') return '#3fb950';
            if (dev?.type === 'firewall') return '#d29922';
            return '#8b949e';
          }}
          maskColor="rgba(13, 17, 23, 0.75)"
          className="border border-[#21262d] bg-[#161b22] rounded-lg shadow-lg"
        />
      </ReactFlow>

      {/* Floating Active Cable Notification & Guidance Banner */}
      <CableBanner />

      {/* Quick Cisco Cable Dock (Bottom Left) */}
      <CanvasCableDock />

      {/* Empty State Banner */}
      {Object.keys(topology.devices).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
          <div className="p-4 rounded-2xl bg-[#161b22]/80 border border-[#21262d] shadow-2xl backdrop-blur max-w-md pointer-events-auto">
            <Network className="w-12 h-12 text-[#58a6ff] mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-[#e6edf3] mb-1">Topology Canvas Empty</h3>
            <p className="text-xs text-[#8b949e] mb-4">
              Drag devices from the left palette or click below to deploy a starter topology.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const s = addDevice('switch', 'Switch-1');
                  const p1 = addDevice('pc', 'PC-1');
                  const p2 = addDevice('pc', 'PC-2');
                  setNodePosition(s.id, { x: 300, y: 150 });
                  setNodePosition(p1.id, { x: 140, y: 320 });
                  setNodePosition(p2.id, { x: 460, y: 320 });
                  addLink(p1.id, 'eth0', s.id, 'fa0_1');
                  addLink(p2.id, 'eth0', s.id, 'fa0_2');
                  pushHistorySnapshot();
                }}
                className="px-3 py-1.5 rounded-md bg-[#1f6feb] text-white text-xs font-medium hover:bg-[#388bfd] transition-colors cursor-pointer"
              >
                Deploy Starter LAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopologyCanvas() {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner />
    </ReactFlowProvider>
  );
}
