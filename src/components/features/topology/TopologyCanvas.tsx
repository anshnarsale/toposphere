import { useCallback, useMemo, useEffect } from 'react';
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
  const { topology, addDevice, addLink, removeDevice, removeLink, updateInterface } = useNetworkStore();
  const { layout, setNodePosition, pushHistorySnapshot } = useProjectStore();
  const {
    selectedDeviceIds,
    setSelectedDeviceIds,
    selectedLinkIds,
    setSelectedLinkIds,
    showGrid,
    setContextMenu,
    addToast,
    theme,
  } = useUiStore();

  const { screenToFlowPosition } = useReactFlow();

  // Controlled node state for fluid, smooth drag without grid stickiness
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  // Sync nodes when topology, layout, or selection changes
  useEffect(() => {
    const nextNodes: Node[] = Object.values(topology.devices).map((dev, index) => {
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
    setNodes(nextNodes);
  }, [topology.devices, layout, selectedDeviceIds, setNodes]);

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
      let devType: DeviceType | null = null;
      let vendor: any = undefined;
      let customModel: string | undefined = undefined;

      const rawJson = e.dataTransfer.getData('application/toposphere-device');
      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          devType = parsed.type;
          vendor = parsed.vendor;
          customModel = parsed.model;
        } catch {
          // fallback
        }
      }

      if (!devType) {
        devType = e.dataTransfer.getData('application/nexalab-device') as DeviceType;
      }
      if (!devType) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dev = addDevice(devType, undefined, vendor, customModel);
      setNodePosition(dev.id, position);
      pushHistorySnapshot();

      const vendorLabel = dev.vendor ? ` [${dev.vendor.toUpperCase()}]` : '';
      addToast({
        type: 'info',
        title: `${dev.hostname}${vendorLabel} Placed`,
        message: `${dev.model} deployed to rack at (${Math.round(position.x)}, ${Math.round(position.y)})`,
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
      className="flex-1 relative w-full h-full bg-[var(--bg-primary)] overflow-hidden select-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        className="w-full h-full"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onPaneContextMenu={onPaneContextMenu}
        isValidConnection={() => true}
        connectionLineStyle={{ stroke: theme === 'light' ? '#000000' : '#ffe600', strokeWidth: 2.5 }}
        snapToGrid={false}
        defaultViewport={{ x: 120, y: 80, zoom: 0.65 }}
        minZoom={0.2}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.75, maxZoom: 0.68, minZoom: 0.35 }}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            color={theme === 'light' ? '#a3a3a3' : '#333e4f'}
            gap={24}
            size={1.5}
          />
        )}
        <Controls
          className="border-2 border-black bg-[var(--bg-secondary)] shadow-[3px_3px_0px_#000] overflow-hidden"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(n) => {
            const dev = topology.devices[n.id];
            if (dev?.type === 'router') return '#00f0ff';
            if (dev?.type === 'switch') return '#00ff66';
            if (dev?.type === 'firewall') return '#ff6b00';
            return '#ffe600';
          }}
          maskColor={theme === 'light' ? 'rgba(244, 241, 234, 0.75)' : 'rgba(10, 13, 18, 0.75)'}
          className="border-2 border-black bg-[var(--bg-secondary)] shadow-[3px_3px_0px_#000]"
        />
      </ReactFlow>

      {/* Floating Active Cable Notification & Guidance Banner */}
      <CableBanner />

      {/* Quick Cisco Cable Dock (Bottom Left) */}
      <CanvasCableDock />

      {/* Empty State Banner */}
      {Object.keys(topology.devices).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
          <div className="p-5 bg-[var(--bg-secondary)] border-3 border-black shadow-[6px_6px_0px_#000] max-w-md pointer-events-auto">
            <div className="w-12 h-12 bg-[#ffe600] border-2 border-black flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0px_#000]">
              <Network className="w-7 h-7 text-black" />
            </div>
            <h3 className="text-base font-black uppercase text-[var(--text-primary)] mb-1 tracking-tight">
              Topology Canvas Empty
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium mb-4">
              Drag hardware modules from the left palette or deploy an authenticated starter LAN.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const r = addDevice('router', 'Router-1');
                  const s = addDevice('switch', 'Switch-1');
                  const p1 = addDevice('pc', 'PC-1');
                  const p2 = addDevice('pc', 'PC-2');

                  // Configure Gateway on Router Gi0/0/0
                  updateInterface(r.id, 'gi0_0', {
                    adminState: 'up',
                    ipv4: { address: '192.168.1.1', prefixLength: 24 },
                  });

                  // Configure PC-1
                  updateInterface(p1.id, 'eth0', {
                    adminState: 'up',
                    ipv4: { address: '192.168.1.10', prefixLength: 24, gateway: '192.168.1.1' },
                  });

                  // Configure PC-2
                  updateInterface(p2.id, 'eth0', {
                    adminState: 'up',
                    ipv4: { address: '192.168.1.20', prefixLength: 24, gateway: '192.168.1.1' },
                  });

                  setNodePosition(r.id, { x: 300, y: 50 });
                  setNodePosition(s.id, { x: 300, y: 190 });
                  setNodePosition(p1.id, { x: 140, y: 340 });
                  setNodePosition(p2.id, { x: 460, y: 340 });

                  addLink(r.id, 'gi0_0', s.id, 'gi0_1');
                  addLink(p1.id, 'eth0', s.id, 'fa0_1');
                  addLink(p2.id, 'eth0', s.id, 'fa0_2');
                  pushHistorySnapshot();
                }}
                className="px-4 py-2 brutal-btn bg-[#ffe600] text-black text-xs font-mono font-black uppercase cursor-pointer hover:bg-[#ffea33]"
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
