import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { PanelId, PanelState, ContextMenuState, ToastMessage } from '@/types/ui';
import { generateId } from '@/lib/utils';

export type CableType =
  | 'auto'
  | 'straight-through'
  | 'cross-over'
  | 'fiber'
  | 'console'
  | 'serial-dce';

export interface CableState {
  activeCable: CableType | null;
  sourceDeviceId: string | null;
  sourceInterfaceId: string | null;
}

interface UiStoreState {
  selectedDeviceIds: string[];
  selectedLinkIds: string[];
  hoveredDeviceId: string | null;
  hoveredLinkId: string | null;

  cableTool: CableState;
  portSelectModal: {
    isOpen: boolean;
    deviceId: string | null;
    isTarget: boolean;
  };

  panels: {
    deviceLibrary: PanelState;
    inspector: PanelState;
    simulation: PanelState;
    terminal: PanelState;
  };

  contextMenu: ContextMenuState;
  toasts: ToastMessage[];

  activeTerminalDeviceId: string | null;
  inspectorTab: string;
  simulationPanelHeight: number;

  isDiagnosticsOpen: boolean;
  isLabsOpen: boolean;
  isPacketInspectorOpen: boolean;
  isPacketGeneratorOpen: boolean;
  isPhysicalRackOpen: boolean;
  activeFirewallGuiDeviceId: string | null;
  isDeviceLibrarySlim: boolean;

  showPortLabels: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;

  // Actions
  setActiveCable: (cable: CableType | null) => void;
  setCableSource: (deviceId: string, interfaceId?: string | null) => void;
  resetCableTool: () => void;
  setPortSelectModal: (modal: { isOpen: boolean; deviceId: string | null; isTarget: boolean }) => void;

  setSelectedDeviceIds: (ids: string[]) => void;
  setSelectedLinkIds: (ids: string[]) => void;
  setHoveredDeviceId: (id: string | null) => void;
  setHoveredLinkId: (id: string | null) => void;

  togglePanel: (panel: PanelId) => void;
  setPanelVisible: (panel: PanelId, visible: boolean) => void;
  setSimulationPanelHeight: (height: number) => void;

  setContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;

  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;

  setActiveTerminalDevice: (deviceId: string | null) => void;
  setActiveFirewallGuiDevice: (deviceId: string | null) => void;
  toggleDeviceLibrarySlim: () => void;
  setInspectorTab: (tab: string) => void;

  setDiagnosticsOpen: (open: boolean) => void;
  setLabsOpen: (open: boolean) => void;
  setPacketInspectorOpen: (open: boolean) => void;
  setPacketGeneratorOpen: (open: boolean) => void;
  setPhysicalRackOpen: (open: boolean) => void;
  setShowPortLabels: (show: boolean) => void;

  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setZoom: (zoom: number) => void;
}

export const useUiStore = create<UiStoreState>()(
  immer((set) => ({
    selectedDeviceIds: [],
    selectedLinkIds: [],
    hoveredDeviceId: null,
    hoveredLinkId: null,

    panels: {
      deviceLibrary: { visible: true, width: 240 },
      inspector: { visible: true, width: 340 },
      simulation: { visible: true, height: 220 },
      terminal: { visible: false },
    },

    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      targetId: null,
      targetType: null,
    },

    toasts: [],
    activeTerminalDeviceId: null,
    inspectorTab: 'overview',
    simulationPanelHeight: 220,

    isDiagnosticsOpen: false,
    isLabsOpen: false,
    isPacketInspectorOpen: false,
    isPacketGeneratorOpen: false,
    isPhysicalRackOpen: false,
    activeFirewallGuiDeviceId: null,
    isDeviceLibrarySlim: false,

    showPortLabels: true,
    showGrid: true,
    snapToGrid: false,
    gridSize: 20,
    zoom: 1,

    cableTool: {
      activeCable: null,
      sourceDeviceId: null,
      sourceInterfaceId: null,
    },
    portSelectModal: {
      isOpen: false,
      deviceId: null,
      isTarget: false,
    },

    setActiveCable: (cable) =>
      set((state) => {
        state.cableTool.activeCable = cable;
        state.cableTool.sourceDeviceId = null;
        state.cableTool.sourceInterfaceId = null;
      }),

    setCableSource: (deviceId, interfaceId) =>
      set((state) => {
        state.cableTool.sourceDeviceId = deviceId;
        state.cableTool.sourceInterfaceId = interfaceId || null;
      }),

    resetCableTool: () =>
      set((state) => {
        state.cableTool.activeCable = null;
        state.cableTool.sourceDeviceId = null;
        state.cableTool.sourceInterfaceId = null;
        state.portSelectModal.isOpen = false;
        state.portSelectModal.deviceId = null;
      }),

    setPortSelectModal: (modal) =>
      set((state) => {
        state.portSelectModal = modal;
      }),

    setSelectedDeviceIds: (ids) =>
      set((state) => {
        state.selectedDeviceIds = ids;
        if (ids.length > 0) {
          state.panels.inspector.visible = true;
        }
      }),

    setSelectedLinkIds: (ids) =>
      set((state) => {
        state.selectedLinkIds = ids;
      }),

    setHoveredDeviceId: (id) =>
      set((state) => {
        state.hoveredDeviceId = id;
      }),

    setHoveredLinkId: (id) =>
      set((state) => {
        state.hoveredLinkId = id;
      }),

    togglePanel: (panel) =>
      set((state) => {
        state.panels[panel].visible = !state.panels[panel].visible;
      }),

    setPanelVisible: (panel, visible) =>
      set((state) => {
        state.panels[panel].visible = visible;
      }),

    setSimulationPanelHeight: (height) =>
      set((state) => {
        state.simulationPanelHeight = height;
        state.panels.simulation.height = height;
      }),

    setContextMenu: (menu) =>
      set((state) => {
        state.contextMenu = menu;
      }),

    closeContextMenu: () =>
      set((state) => {
        state.contextMenu.visible = false;
        state.contextMenu.targetId = null;
        state.contextMenu.targetType = null;
      }),

    addToast: (toast) => {
      const id = generateId('toast');
      set((state) => {
        if (state.toasts.length >= 4) {
          state.toasts.shift();
        }
        state.toasts.push({ ...toast, id });
      });
      // Automatically dismiss popups after 5 seconds
      setTimeout(() => {
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        });
      }, 5000);
      return id;
    },

    removeToast: (id) =>
      set((state) => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
      }),

    setActiveTerminalDevice: (deviceId) =>
      set((state) => {
        state.activeTerminalDeviceId = deviceId;
        state.panels.terminal.visible = !!deviceId;
      }),

    setActiveFirewallGuiDevice: (deviceId) =>
      set((state) => {
        state.activeFirewallGuiDeviceId = deviceId;
      }),

    toggleDeviceLibrarySlim: () =>
      set((state) => {
        state.isDeviceLibrarySlim = !state.isDeviceLibrarySlim;
      }),

    setInspectorTab: (tab) =>
      set((state) => {
        state.inspectorTab = tab;
      }),

    setDiagnosticsOpen: (open) =>
      set((state) => {
        state.isDiagnosticsOpen = open;
      }),

    setLabsOpen: (open) =>
      set((state) => {
        state.isLabsOpen = open;
      }),

    setPacketInspectorOpen: (open) =>
      set((state) => {
        state.isPacketInspectorOpen = open;
      }),

    setPacketGeneratorOpen: (open) =>
      set((state) => {
        state.isPacketGeneratorOpen = open;
      }),

    setPhysicalRackOpen: (open) =>
      set((state) => {
        state.isPhysicalRackOpen = open;
      }),

    setShowPortLabels: (show) =>
      set((state) => {
        state.showPortLabels = show;
      }),

    setShowGrid: (show) =>
      set((state) => {
        state.showGrid = show;
      }),

    setSnapToGrid: (snap) =>
      set((state) => {
        state.snapToGrid = snap;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = zoom;
      }),
  }))
);

