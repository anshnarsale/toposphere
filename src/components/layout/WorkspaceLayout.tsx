import { useEffect } from 'react';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
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
import { PortSelectModal } from '@/components/features/cables/PortSelectModal';
import { FirewallGuiModal } from '@/components/features/firewall-gui/FirewallGuiModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { InviteAdminModal } from '@/components/auth/InviteAdminModal';
import { Toaster } from '@/components/ui/Toaster';
import { useUiStore } from '@/store/uiStore';

export function WorkspaceLayout() {
  const { panels, theme } = useUiStore();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden select-none transition-colors duration-150">
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

      {/* Workspace Footer (Ansh Narsale Links & System Telemetry) */}
      <Footer />

      {/* Floating Interactive Terminal Console */}
      <TerminalPanel />

      {/* Popups & Modals */}
      <ContextMenu />
      <DiagnosticsModal />
      <LabsModal />
      <PacketInspectorModal />
      <PacketGeneratorModal />
      <PhysicalRackModal />
      <PortSelectModal />
      <FirewallGuiModal />
      <AuthModal />
      <InviteAdminModal />
      <Toaster />
    </div>
  );
}

