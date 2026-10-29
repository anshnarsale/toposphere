import { useState, useRef } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useProjectStore } from '@/store/projectStore';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';
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
} from 'lucide-react';

export function TopBar() {
  const {
    currentProject,
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
  } = useUiStore();

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
    a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, '-')}-nexalab.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Lab Exported', message: 'Project saved as JSON file.' });
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
    <header className="h-11 px-3 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        {/* NexaLab Hexagon Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLabsOpen(true)}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1f6feb] to-[#58a6ff] p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-[#0d1117] rounded-[6px] flex items-center justify-center font-black text-xs text-[#58a6ff] tracking-tight">
              NL
            </div>
          </div>
          <span className="font-bold text-sm tracking-tight text-[#e6edf3]">
            Nexa<span className="text-[#58a6ff]">Lab</span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#30363d]" />

        {/* Project Name and Save Status */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="bg-[#0d1117] border border-[#58a6ff] rounded px-2 py-0.5 text-xs text-[#e6edf3] outline-none"
              autoFocus
            />
          ) : (
            <span
              onClick={() => {
                setTitleInput(currentProject.name);
                setIsEditingTitle(true);
              }}
              className="text-xs font-semibold text-[#8b949e] hover:text-[#e6edf3] cursor-pointer"
              title="Click to rename lab project"
            >
              {currentProject.name}
            </span>
          )}

          <span
            className={`w-2 h-2 rounded-full ${
              saveStatus === 'saved' ? 'bg-[#3fb950]' : 'bg-[#d29922]'
            }`}
            title={`Status: ${saveStatus}`}
          />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-30 disabled:pointer-events-none rounded cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-30 disabled:pointer-events-none rounded cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Simulation Controls & Mode Switch */}
      <div className="flex items-center gap-2">
        {/* Design / Simulation Mode Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#0d1117] border border-[#21262d]">
          <button
            onClick={() => setMode('design')}
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              mode === 'design' ? 'bg-[#21262d] text-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Design
          </button>
          <button
            onClick={() => setMode('simulation')}
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              mode === 'simulation' ? 'bg-[#21262d] text-[#3fb950]' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Simulation
          </button>
        </div>

        {/* Play / Pause / Reset buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRunSimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
              status === 'running'
                ? 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/40'
                : 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40 hover:bg-[#238636]/30'
            }`}
          >
            {status === 'running' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{status === 'running' ? 'Pause' : 'Run'}</span>
          </button>

          <button
            onClick={resetSimulation}
            className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded cursor-pointer"
            title="Reset Simulation Time"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Quick Ping Traffic Injection */}
          <button
            onClick={handleQuickPing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1f6feb]/20 text-[#58a6ff] hover:bg-[#1f6feb]/30 border border-[#1f6feb]/40 text-xs font-semibold cursor-pointer transition-colors ml-1"
            title="Inject real test packet between hosts"
          >
            <Send className="w-3 h-3" />
            <span>Simulate Traffic</span>
          </button>

          {/* Complex PDU Traffic Generator (Packet Tracer Tool) */}
          <button
            onClick={() => setPacketGeneratorOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] text-xs font-semibold text-[#e6edf3] cursor-pointer"
            title="Open Packet / PDU Generator Tool"
          >
            <span>+ PDU</span>
          </button>
        </div>
      </div>

      {/* Right: Actions, Diagnostics, Labs, Export */}
      <div className="flex items-center gap-2">
        {/* Port Labels Toggle (Cisco Packet Tracer feature) */}
        <button
          onClick={() => setShowPortLabels(!showPortLabels)}
          className={`px-2 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
            showPortLabels
              ? 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40'
              : 'bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-[#e6edf3]'
          }`}
          title="Toggle Port Labels on links (Packet Tracer: Always Show Port Labels)"
        >
          <span>Port Labels</span>
        </button>

        {/* Physical Rack View */}
        <button
          onClick={() => setPhysicalRackOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] text-xs font-medium text-[#e6edf3] cursor-pointer"
          title="View Physical 19-inch Equipment Rack"
        >
          <Layers className="w-3.5 h-3.5 text-[#3fb950]" />
          <span>Physical Rack</span>
        </button>
        {/* Guided Labs Button */}
        <button
          onClick={() => setLabsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] text-xs font-medium text-[#e6edf3] cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span>Learning Labs</span>
        </button>

        {/* Diagnostics Button */}
        <button
          onClick={() => setDiagnosticsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] text-xs font-medium text-[#e6edf3] cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-[#d29922]" />
          <span>Diagnostics</span>
        </button>

        <div className="h-4 w-[1px] bg-[#30363d]" />

        {/* Save / Export / Import */}
        <button
          onClick={() => {
            saveProject();
            addToast({ type: 'success', title: 'Lab Saved', message: 'Project stored in browser storage.' });
          }}
          className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded cursor-pointer"
          title="Save Project (LocalStorage)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleExport}
          className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded cursor-pointer"
          title="Export Lab Project as JSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded cursor-pointer"
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
        <div className="h-4 w-[1px] bg-[#30363d]" />

        <button
          onClick={() => togglePanel('deviceLibrary')}
          className={`p-1.5 rounded cursor-pointer ${
            panels.deviceLibrary.visible ? 'text-[#58a6ff] bg-[#21262d]' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
          title="Toggle Device Library"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => togglePanel('inspector')}
          className={`p-1.5 rounded cursor-pointer ${
            panels.inspector.visible ? 'text-[#58a6ff] bg-[#21262d]' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
          title="Toggle Device Inspector"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}

