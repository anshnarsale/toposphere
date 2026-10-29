import { useEffect, useRef } from 'react';
import {
  Terminal,
  Settings,
  Trash2,
  Unlink,
  Activity,
  Copy,
  PlusCircle,
} from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useProjectStore } from '@/store/projectStore';

export function ContextMenu() {
  const { contextMenu, closeContextMenu, setActiveTerminalDevice, setSelectedDeviceIds, setDiagnosticsOpen } = useUiStore();
  const { topology, removeDevice, removeLink, addDevice } = useNetworkStore();
  const { pushHistorySnapshot, setNodePosition } = useProjectStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu.visible) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu.visible, closeContextMenu]);

  if (!contextMenu.visible) return null;

  const targetDevice = contextMenu.targetType === 'device' && contextMenu.targetId
    ? topology.devices[contextMenu.targetId]
    : null;

  const targetLink = contextMenu.targetType === 'link' && contextMenu.targetId
    ? topology.links[contextMenu.targetId]
    : null;

  return (
    <div
      ref={menuRef}
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="fixed z-50 min-w-[180px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 text-xs text-[#e6edf3] animate-in fade-in-50 zoom-in-95"
    >
      {contextMenu.targetType === 'device' && targetDevice && (
        <>
          <div className="px-3 py-1.5 font-semibold text-[#8b949e] border-b border-[#21262d] truncate">
            {targetDevice.hostname} ({targetDevice.model})
          </div>

          <button
            onClick={() => {
              setSelectedDeviceIds([targetDevice.id]);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] hover:text-[#58a6ff] cursor-pointer text-left"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure Device</span>
          </button>

          <button
            onClick={() => {
              setActiveTerminalDevice(targetDevice.id);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] hover:text-[#3fb950] cursor-pointer text-left"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open Terminal CLI</span>
          </button>

          <button
            onClick={() => {
              setDiagnosticsOpen(true);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] hover:text-[#d29922] cursor-pointer text-left"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Run Diagnostics</span>
          </button>

          <button
            onClick={() => {
              const newDev = addDevice(targetDevice.type, `${targetDevice.hostname}-Copy`);
              setNodePosition(newDev.id, { x: 300, y: 200 });
              pushHistorySnapshot();
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] cursor-pointer text-left"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <div className="my-1 border-t border-[#21262d]" />

          <button
            onClick={() => {
              removeDevice(targetDevice.id);
              pushHistorySnapshot();
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#da3633]/20 text-[#f85149] cursor-pointer text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Device</span>
          </button>
        </>
      )}

      {contextMenu.targetType === 'link' && targetLink && (
        <>
          <div className="px-3 py-1.5 font-semibold text-[#8b949e] border-b border-[#21262d]">
            Link: {targetLink.bandwidth} Mbps Ethernet
          </div>

          <button
            onClick={() => {
              removeLink(targetLink.id);
              pushHistorySnapshot();
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#da3633]/20 text-[#f85149] cursor-pointer text-left"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Disconnect Link</span>
          </button>
        </>
      )}

      {contextMenu.targetType === 'canvas' && (
        <>
          <div className="px-3 py-1.5 font-semibold text-[#8b949e] border-b border-[#21262d]">
            Quick Add Device
          </div>

          <button
            onClick={() => {
              const d = addDevice('pc');
              setNodePosition(d.id, { x: contextMenu.x, y: contextMenu.y });
              pushHistorySnapshot();
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] cursor-pointer text-left"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Add PC Workstation</span>
          </button>

          <button
            onClick={() => {
              const d = addDevice('switch');
              setNodePosition(d.id, { x: contextMenu.x, y: contextMenu.y });
              pushHistorySnapshot();
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] cursor-pointer text-left"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#3fb950]" />
            <span>Add Catalyst Switch</span>
          </button>

          <button
            onClick={() => {
              const d = addDevice('router');
              setNodePosition(d.id, { x: contextMenu.x, y: contextMenu.y });
              pushHistorySnapshot();
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] cursor-pointer text-left"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Add Edge Router</span>
          </button>
        </>
      )}
    </div>
  );
}

