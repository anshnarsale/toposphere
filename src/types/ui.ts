export type PanelId = 'deviceLibrary' | 'inspector' | 'simulation' | 'terminal';

export interface PanelState {
  visible: boolean;
  width?: number;
  height?: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetType: 'device' | 'link' | 'canvas' | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface UiState {
  selectedDeviceIds: string[];
  selectedLinkIds: string[];
  hoveredDeviceId: string | null;
  hoveredLinkId: string | null;
  panels: Record<PanelId, PanelState>;
  contextMenu: ContextMenuState;
  toasts: ToastMessage[];
  activeTerminalDeviceId: string | null;
  inspectorTab: string;
  simulationPanelHeight: number;
  isDraggingDevice: boolean;
  connectingFrom: { deviceId: string; interfaceId: string } | null;
  searchQuery: string;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;
}
