import { useState, useRef } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';
import { exportTopologyPdf } from '@/lib/exportPdf';
import { exportPacketTracerFile } from '@/lib/exportPkt';
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  Activity,
  BookOpen,
  Send,
  Layers,
  Settings2,
  FileText,
  FileDown,
  Printer,
  Sun,
  Moon,
  KeyRound,
  LogOut,
  User,
  Shield,
} from 'lucide-react';

export function TopBar() {
  const {
    currentProject,
    layout,
    saveStatus,
    saveProject,
    exportProjectJson,
    importProjectJson,
    undo,
    redo,
    canUndo,
    canRedo,
    updateProjectMeta,
  } = useProjectStore();

  const { topology, model } = useNetworkStore();
  const { mode, status, speed, setMode, setStatus, setSpeed, setEvents, setAnimatedPackets, resetSimulation } =
    useSimulationStore();

  const {
    panels,
    togglePanel,
    setDiagnosticsOpen,
    setLabsOpen,
    setPacketGeneratorOpen,
    setPhysicalRackOpen,
    showPortLabels,
    setShowPortLabels,
    addToast,
    theme,
    toggleTheme,
  } = useUiStore();

  const { currentUser, logout, openAuthModal, openInviteAdmin, isNeonConnected } = useAuthStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentProject.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      updateProjectMeta({ name: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleRunSimulation = () => {
    setStatus(status === 'running' ? 'paused' : 'running');
  };

  const handleQuickPing = () => {
    // Find first two hosts in topology
    const hosts = Object.values(topology.devices).filter(
      (d) => Object.values(d.interfaces).some((i) => i.ipv4?.address)
    );

    if (hosts.length < 2) {
      addToast({
        type: 'warning',
        title: 'Quick Ping Required',
        message: 'Configure at least two devices with IPv4 addresses to simulate traffic.',
      });
      return;
    }

    const srcDev = hosts[0];
    const tgtDev = hosts[1];
    const targetIp = Object.values(tgtDev.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address;

    if (!targetIp) return;

    const engine = new SimulationEngine(model);
    const result = engine.runPing(srcDev.id, targetIp);

    setEvents(engine.getEvents());
    setAnimatedPackets(engine.generateAnimatedPackets());
    setMode('simulation');
    setStatus('running');

    addToast({
      type: result.success ? 'success' : 'error',
      title: result.success ? 'ICMP Echo Reply Received' : 'Ping Failed',
      message: `${srcDev.hostname} &rarr; ${tgtDev.hostname} (${targetIp}): ${
        result.success ? '5/5 Packets Delivered' : result.errorMessage
      }`,
    });
  };

  const handleExport = () => {
    const jsonStr = exportProjectJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, '-')}-toposphere.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Lab Exported', message: 'Project saved as JSON file.' });
  };

  const handleExportPdf = () => {
    exportTopologyPdf({ projectName: currentProject.name, topology, layout });
    addToast({ type: 'success', title: 'PDF Exported', message: 'Full network topology scene and tables saved to PDF.' });
  };

  const handleExportPkt = () => {
    exportPacketTracerFile({ projectName: currentProject.name, topology, layout });
    addToast({ type: 'success', title: 'Packet Tracer Exported', message: 'Saved as Cisco Packet Tracer (.pkt) interchange file.' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importProjectJson(content);
      if (res.success) {
        addToast({ type: 'success', title: 'Lab Imported', message: 'Project loaded successfully.' });
      } else {
        addToast({ type: 'error', title: 'Import Failed', message: res.error });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-12 px-3 border-b-2 border-black bg-[var(--bg-secondary)] flex items-center justify-between select-none shrink-0 z-30 shadow-[0_2px_0px_#000]">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-2.5">
        {/* TopoSphere Brutalist Logo */}
        <div
          className="flex items-center gap-1.5 cursor-pointer brutal-box bg-[#ffe600] px-2 py-1 text-black"
          onClick={() => setLabsOpen(true)}
          title="TopoSphere Guided Labs"
        >
          <div className="w-5 h-5 bg-black text-[#ffe600] flex items-center justify-center font-mono font-black text-[10px] tracking-tight">
            TS
          </div>
          <span className="font-mono font-black text-xs tracking-wider uppercase">
            TOPOSPHERE
          </span>
        </div>

        {/* Project Name and Save Status */}
        <div className="flex items-center gap-1.5 border-2 border-black bg-[var(--bg-primary)] px-2 py-1 shadow-[2px_2px_0px_#000]">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="bg-transparent border-none text-xs font-mono font-bold text-[var(--text-primary)] outline-none max-w-[140px]"
              autoFocus
            />
          ) : (
            <span
              onClick={() => {
                setTitleInput(currentProject.name);
                setIsEditingTitle(true);
              }}
              className="text-xs font-mono font-bold text-[var(--text-primary)] hover:text-[#00f0ff] cursor-pointer truncate max-w-[140px]"
              title="Click to rename lab project"
            >
              {currentProject.name}
            </span>
          )}

          <span
            className={`w-2 h-2 border border-black ${
              saveStatus === 'saved' ? 'bg-[#00ff66]' : 'bg-[#ffe600]'
            }`}
            title={`Status: ${saveStatus}`}
          />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Simulation Controls & Mode Switch */}
      <div className="flex items-center gap-2">
        {/* Design / Simulation Mode Toggle */}
        <div className="flex items-center border-2 border-black bg-[var(--bg-primary)] p-0.5 shadow-[2px_2px_0px_#000]">
          <button
            onClick={() => setMode('design')}
            className={`px-2.5 py-0.5 font-mono text-[11px] font-black uppercase cursor-pointer transition-all ${
              mode === 'design'
                ? 'bg-[#00f0ff] text-black border border-black shadow-[1px_1px_0px_#000]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Design
          </button>
          <button
            onClick={() => setMode('simulation')}
            className={`px-2.5 py-0.5 font-mono text-[11px] font-black uppercase cursor-pointer transition-all ${
              mode === 'simulation'
                ? 'bg-[#00ff66] text-black border border-black shadow-[1px_1px_0px_#000]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Simulate
          </button>
        </div>

        {/* Play / Pause / Reset buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRunSimulation}
            className={`flex items-center gap-1 px-3 py-1 font-mono text-xs font-black uppercase brutal-btn cursor-pointer ${
              status === 'running'
                ? 'bg-[#ffe600] text-black hover:bg-[#ffea33]'
                : 'bg-[#00ff66] text-black hover:bg-[#33ff88]'
            }`}
          >
            {status === 'running' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{status === 'running' ? 'Pause' : 'Run'}</span>
          </button>

          <button
            onClick={resetSimulation}
            className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
            title="Reset Simulation Time"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Quick Ping Traffic Injection */}
          <button
            onClick={handleQuickPing}
            className="flex items-center gap-1 px-2.5 py-1 brutal-btn bg-[#00f0ff] text-black font-mono text-xs font-black uppercase cursor-pointer"
            title="Inject real test packet between hosts"
          >
            <Send className="w-3 h-3" />
            <span>Simulate Traffic</span>
          </button>

          {/* Complex PDU Traffic Generator */}
          <button
            onClick={() => setPacketGeneratorOpen(true)}
            className="flex items-center gap-1 px-2 py-1 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-xs font-black uppercase cursor-pointer"
            title="Open Packet / PDU Generator Tool"
          >
            <span>+ PDU</span>
          </button>
        </div>
      </div>

      {/* Right: Actions, Dark/Light Mode, Invite Admin, User Profile */}
      <div className="flex items-center gap-2">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#ffe600]" />
          ) : (
            <Moon className="w-4 h-4 text-black" />
          )}
        </button>

        {/* Super Admin Invite Code Generator (Exclusive to Ansh Narsale) */}
        {currentUser && (currentUser.email.toLowerCase() === 'anshnarsale2003@gmail.com' || currentUser.role === 'admin') && (
          <button
            onClick={openInviteAdmin}
            className="flex items-center gap-1 px-2 py-1 brutal-btn bg-[#ffe600] text-black font-mono text-xs font-black uppercase cursor-pointer"
            title="Generate and Dispatch Invite Codes to anshnarsale2003@gmail.com"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Invites</span>
          </button>
        )}

        {/* Guided Labs Button */}
        <button
          onClick={() => setLabsOpen(true)}
          className="hidden lg:flex items-center gap-1 px-2 py-1 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-xs font-black uppercase cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>Labs</span>
        </button>

        {/* Diagnostics Button */}
        <button
          onClick={() => setDiagnosticsOpen(true)}
          className="hidden md:flex items-center gap-1 px-2 py-1 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-xs font-black uppercase cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-[#00ff66]" />
          <span>Diagnose</span>
        </button>

        {/* Save / Export */}
        <button
          onClick={() => {
            saveProject();
            addToast({ type: 'success', title: 'Lab Saved', message: 'Project stored in browser storage.' });
          }}
          className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
          title="Save Project (LocalStorage)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleExportPdf}
          className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
          title="Export Whole Scene Mapped to PDF Report"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleExportPkt}
          className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
          title="Export as Cisco Packet Tracer (.pkt) File"
        >
          <FileDown className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
          title="Import Lab Project JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />

        {/* Panel Toggles */}
        <button
          onClick={() => togglePanel('deviceLibrary')}
          className={`p-1.5 brutal-btn cursor-pointer ${
            panels.deviceLibrary.visible ? 'bg-[#ffe600] text-black' : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
          }`}
          title="Toggle Hardware Palette"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => togglePanel('inspector')}
          className={`p-1.5 brutal-btn cursor-pointer ${
            panels.inspector.visible ? 'bg-[#ffe600] text-black' : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
          }`}
          title="Toggle Device Inspector"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        {/* User Account / Logout */}
        {currentUser ? (
          <div className="flex items-center gap-1 border-2 border-black bg-[var(--bg-primary)] px-2 py-1 shadow-[2px_2px_0px_#000]">
            <div className="w-4 h-4 bg-[#00ff66] border border-black flex items-center justify-center font-mono text-[9px] font-black text-black">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-mono text-xs font-black truncate max-w-[90px] text-[var(--text-primary)]">
              {currentUser.name}
            </span>
            <button
              onClick={logout}
              className="p-0.5 hover:text-red-500 cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="px-2 py-1 brutal-btn bg-[#00f0ff] text-black font-mono text-xs font-black uppercase cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

