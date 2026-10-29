import { useState, useRef, useEffect, useCallback } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useProjectStore } from '@/store/projectStore';
import { CliParser } from '@/engine/cli/CliParser';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';
import { Terminal, X, Minimize2, Maximize2 } from 'lucide-react';

interface TerminalLine {
  id: string;
  text: string;
  type: 'prompt-input' | 'output' | 'error' | 'success' | 'banner';
}

export function TerminalPanel() {
  const { activeTerminalDeviceId, setActiveTerminalDevice } = useUiStore();
  const { topology, model } = useNetworkStore();
  const { setEvents, setAnimatedPackets } = useSimulationStore();
  const { pushHistorySnapshot } = useProjectStore();

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const parserRef = useRef<CliParser | null>(null);

  const device = activeTerminalDeviceId ? topology.devices[activeTerminalDeviceId] : null;

  // Initialize or rebind parser when active device changes
  useEffect(() => {
    if (!device) return;

    const simEngine = new SimulationEngine(model);
    parserRef.current = new CliParser(device.id, model, simEngine);

    setLines([
      {
        id: 'banner-1',
        text: `NexaLab Virtual Terminal Console — ${device.hostname} (${device.model})`,
        type: 'banner',
      },
      {
        id: 'banner-2',
        text: 'Type "?" or "help" for a list of supported networking commands. Type "enable" for privileged mode.',
        type: 'banner',
      },
      { id: 'banner-3', text: '', type: 'output' },
    ]);

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [device?.id, model]);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleCommandSubmit = useCallback(() => {
    if (!inputVal.trim() || !parserRef.current || !device) return;

    const cmd = inputVal.trim();
    const prompt = parserRef.current.getPrompt();

    setHistory((prev) => [cmd, ...prev].slice(0, 50));
    setHistoryIdx(-1);

    // Record prompt line
    const userLine: TerminalLine = {
      id: `${Date.now()}-in`,
      text: `${prompt}${cmd}`,
      type: 'prompt-input',
    };

    // Execute command in CLI parser
    const simEngine = new SimulationEngine(model);
    parserRef.current = new CliParser(device.id, model, simEngine);
    const result = parserRef.current.execute(cmd);

    // If ping command, push simulation events & animations to store!
    if (cmd.startsWith('ping')) {
      const pingEvents = simEngine.getEvents();
      if (pingEvents.length > 0) {
        setEvents(pingEvents);
        setAnimatedPackets(simEngine.generateAnimatedPackets());
      }
    }

    if (result.configChanged) {
      pushHistorySnapshot();
    }

    const outputLine: TerminalLine = {
      id: `${Date.now()}-out`,
      text: result.output,
      type: result.success ? 'output' : 'error',
    };

    setLines((prev) => (result.output ? [...prev, userLine, outputLine] : [...prev, userLine]));
    setInputVal('');
  }, [inputVal, device, model, setEvents, setAnimatedPackets, pushHistorySnapshot]);

  if (!device || !activeTerminalDeviceId) return null;

  return (
    <div
      className={`
        fixed bottom-12 right-6 z-40 w-[540px] rounded-lg border border-[#30363d] bg-[#0d1117] shadow-2xl flex flex-col font-mono text-xs overflow-hidden transition-all
        ${isMinimized ? 'h-9' : 'h-[360px]'}
      `}
    >
      {/* Title Bar */}
      <div className="h-9 px-3 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-[#e6edf3]">
          <Terminal className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span className="font-semibold text-xs">{device.hostname}</span>
          <span className="text-[10px] text-[#8b949e]">({device.model})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-[#8b949e] hover:text-[#e6edf3] rounded cursor-pointer"
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setActiveTerminalDevice(null)}
            className="p-1 text-[#8b949e] hover:text-[#f85149] rounded cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Output Window */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#0d1117] cursor-text"
          >
            {lines.map((l) => (
              <div
                key={l.id}
                className={`whitespace-pre-wrap leading-relaxed ${
                  l.type === 'banner'
                    ? 'text-[#58a6ff]'
                    : l.type === 'prompt-input'
                    ? 'text-[#e6edf3] font-bold'
                    : l.type === 'error'
                    ? 'text-[#f85149]'
                    : 'text-[#8b949e]'
                }`}
              >
                {l.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Interactive Command Input Line */}
          <div className="p-2 border-t border-[#21262d] bg-[#161b22] flex items-center gap-1.5">
            <span className="text-[#3fb950] font-bold select-none shrink-0">
              {parserRef.current?.getPrompt() || `${device.hostname}> `}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCommandSubmit();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (history.length > 0 && historyIdx < history.length - 1) {
                    const nextIdx = historyIdx + 1;
                    setHistoryIdx(nextIdx);
                    setInputVal(history[nextIdx]);
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (historyIdx > 0) {
                    const prevIdx = historyIdx - 1;
                    setHistoryIdx(prevIdx);
                    setInputVal(history[prevIdx]);
                  } else if (historyIdx === 0) {
                    setHistoryIdx(-1);
                    setInputVal('');
                  }
                }
              }}
              placeholder="Type command ('?' for help)..."
              className="flex-1 bg-transparent border-none text-[#e6edf3] outline-none text-xs font-mono caret-[#58a6ff]"
              autoFocus
            />
          </div>
        </>
      )}
    </div>
  );
}
