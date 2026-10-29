import { TopBar } from './TopBar';
import { DeviceLibrary } from '@/components/features/device-library/DeviceLibrary';
import { TopologyCanvas } from '@/components/features/topology/TopologyCanvas';
import { InspectorPanel } from '@/components/features/inspector/InspectorPanel';
import { SimulationPanel } from '@/components/features/simulation/SimulationPanel';
import { TerminalPanel } from '@/components/features/terminal/TerminalPanel';
import { ContextMenu } from '@/components/features/topology/ContextMenu';
import { DiagnosticsModal } from '@/components/features/diagnostics/DiagnosticsModal';
import { LabsModal } from '@/components/features/labs/LabsModal';
import { PacketInspectorModal } from '@/components/features/packet-inspector/PacketInspectorModal';
import { PacketGeneratorModal } from '@/components/features/traffic-generator/PacketGeneratorModal';
import { PhysicalRackModal } from '@/components/features/physical/PhysicalRackModal';
import { Toaster } from '@/components/ui/Toaster';
import { useUiStore } from '@/store/uiStore';

export function WorkspaceLayout() {
  const { panels } = useUiStore();

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0d1117] text-[#e6edf3] overflow-hidden select-none">
      {/* Top Command Bar */}
      <TopBar />

      {/* Main Middle Row (Library, Canvas, Inspector) */}
      <div className="flex flex-1 overflow-hidden relative">
        {panels.deviceLibrary.visible && <DeviceLibrary />}
        <TopologyCanvas />
        <InspectorPanel />
      </div>

      {/* Bottom Collapsible Simulation & Console Panel */}
      <SimulationPanel />

      {/* Floating Interactive Terminal Console */}
      <TerminalPanel />

      {/* Popups & Modals */}
      <ContextMenu />
      <DiagnosticsModal />
      <LabsModal />
      <PacketInspectorModal />
      <PacketGeneratorModal />
      <PhysicalRackModal />
      <Toaster />
    </div>
  );
}

