import { useState, useRef, useEffect, useCallback } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useProjectStore } from '@/store/projectStore';
import { CliParser } from '@/engine/cli/CliParser';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';
import { Terminal, X, Minimize2, Maximize2, Trash2 } from 'lucide-react';

interface TerminalLine {
  id: string;
  text: string;
  type: 'prompt-input' | 'output' | 'error' | 'success' | 'banner';
}

// Persist parser instances per device so sessions and modes persist
const parserRegistry = new Map<string, CliParser>();

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
  const [isMaximized, setIsMaximized] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const device = activeTerminalDeviceId ? topology.devices[activeTerminalDeviceId] : null;

  // Retrieve or create persistent CliParser instance for this device
  const getOrCreateParser = useCallback((devId: string): CliParser => {
    let p = parserRegistry.get(devId);
    if (!p) {
      const simEngine = new SimulationEngine(model);
      p = new CliParser(devId, model, simEngine);
      parserRegistry.set(devId, p);
    } else {
      // Update simulation engine reference
      p.setSimulationEngine(new SimulationEngine(model));
    }
    return p;
  }, [model]);

  // When active device changes, display session welcome or continue
  useEffect(() => {
    if (!device) return;

    const parser = getOrCreateParser(device.id);

    const isEndDevice = ['pc', 'laptop', 'printer', 'wireless-client'].includes(device.type);
    if (isEndDevice) {
      setLines([
        {
          id: 'banner-1',
          text: `Microsoft Windows [Version 10.0.19045.3803]`,
          type: 'banner',
        },
        {
          id: 'banner-2',
          text: `(c) Microsoft Corporation. All rights reserved.`,
          type: 'banner',
        },
        {
          id: 'banner-3',
          text: `TopoSphere Virtual Command Prompt — ${device.hostname} (${device.model})`,
          type: 'banner',
        },
        {
          id: 'banner-4',
          text: 'Type "help" or "ipconfig /all" to inspect network parameters.',
          type: 'banner',
        },
        { id: 'banner-5', text: '', type: 'output' },
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const vendor = device.vendor || 'cisco';
    let vendorBanner = `Cisco IOS Software, ${device.model}, RELEASE SOFTWARE (fc2)`;
    let hintBanner = 'Type "?" or "help" for Cisco command reference (e.g. "en", "conf t", "sh ip int br").';

    if (vendor === 'juniper') {
      vendorBanner = `JUNOS 21.4R1 built 2023-01-15 — Juniper Networks ${device.model}`;
      hintBanner = 'Junos CLI ready. Type "show interfaces terse", "configure", "set interfaces ...", "commit".';
    } else if (vendor === 'arista') {
      vendorBanner = `Arista EOS version 4.28.1F — Arista Networks ${device.model}`;
      hintBanner = 'Arista EOS CLI ready. Type "enable", "show running-config", "show ip interface brief".';
    } else if (vendor === 'mikrotik') {
      vendorBanner = `MikroTik RouterOS 7.10 (c) 1999-2023 http://www.mikrotik.com/ [${device.model}]`;
      hintBanner = 'RouterOS CLI ready. Type "/interface print", "/ip address print", "/ip route print".';
    } else if (vendor === 'fortinet') {
      vendorBanner = `FortiOS v7.4.2 GA (c) Fortinet Inc. [${device.model}]`;
      hintBanner = 'FortiOS CLI ready. Type "get system status", "get router info routing-table all", or open Web GUI.';
    } else if (vendor === 'paloalto') {
      vendorBanner = `Palo Alto PAN-OS 11.1 (c) Palo Alto Networks [${device.model}]`;
      hintBanner = 'PAN-OS CLI ready. Type "show system info", "show interface all", "configure", or open Web GUI.';
    } else if (vendor === 'pfsense') {
      vendorBanner = `pfSense 2.7.2-RELEASE (amd64) Netgate [${device.model}]`;
      hintBanner = 'pfSense Shell ready. Use Web GUI or enter option (e.g. 1 to assign, 2 to set IP, 8 for shell).';
    } else if (vendor === 'checkpoint') {
      vendorBanner = `Check Point Gaia Portal R81.20 [${device.model}]`;
      hintBanner = 'Gaia CLI ready. Type "show interfaces", "show route", or open Web GUI.';
    } else if (vendor === 'linux') {
      vendorBanner = `Linux ${device.hostname} 5.15.0-generic #1 SMP x86_64 [${device.model}]`;
      hintBanner = 'Linux Shell ready. Type "ip addr", "ip route", "ping <ip>", "uname -a".';
    }

    setLines([
      {
        id: 'banner-1',
        text: `TopoSphere Virtual Console [${vendor.toUpperCase()}] — ${device.hostname}`,
        type: 'banner',
      },
      {
        id: 'banner-2',
        text: vendorBanner,
        type: 'banner',
      },
      {
        id: 'banner-3',
        text: hintBanner,
        type: 'banner',
      },
      { id: 'banner-4', text: '', type: 'output' },
    ]);

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [device?.id, getOrCreateParser]);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleCommandSubmit = useCallback((explicitCommand?: string) => {
    const raw = explicitCommand !== undefined ? explicitCommand : inputVal;
    if (!raw.trim() || !device) return;

    const cmd = raw.trim();
    const parser = getOrCreateParser(device.id);
    const prompt = parser.getPrompt();

    setHistory((prev) => [cmd, ...prev].slice(0, 50));
    setHistoryIdx(-1);

    // Record prompt line
    const userLine: TerminalLine = {
      id: `${Date.now()}-in`,
      text: `${prompt}${cmd}`,
      type: 'prompt-input',
    };

    // Execute on the persistent parser
    const result = parser.execute(cmd);

    // If ping command, push simulation events & animations to store
    if (cmd.toLowerCase().startsWith('ping')) {
      const simEngine = parser.getSimulationEngine();
      if (simEngine) {
        const pingEvents = simEngine.getEvents();
        if (pingEvents.length > 0) {
          setEvents(pingEvents);
          setAnimatedPackets(simEngine.generateAnimatedPackets());
        }
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
    if (explicitCommand === undefined) {
      setInputVal('');
    }
  }, [inputVal, device, getOrCreateParser, setEvents, setAnimatedPackets, pushHistorySnapshot]);

  const currentPrompt = device ? getOrCreateParser(device.id).getPrompt() : '> ';

  if (!device || !activeTerminalDeviceId) return null;

  const isEndDevice = ['pc', 'laptop', 'printer', 'wireless-client'].includes(device.type);
  const vendor = device.vendor || 'cisco';

  let quickCommands: Array<{ label: string; cmd: string; title: string }> = [
    { label: 'sh ip int br', cmd: 'sh ip int br', title: 'show ip interface brief' },
    { label: 'sh run', cmd: 'sh run', title: 'show running-config' },
    { label: 'sh mac', cmd: 'sh mac', title: 'show mac address-table' },
  ];

  if (isEndDevice) {
    quickCommands = [
      { label: 'ipconfig', cmd: 'ipconfig', title: 'Display basic IP configuration' },
      { label: 'ipconfig /all', cmd: 'ipconfig /all', title: 'Display full network interface details' },
      { label: 'arp -a', cmd: 'arp -a', title: 'Display ARP cache table' },
      { label: 'ping gateway', cmd: 'ping 192.168.1.1', title: 'Ping default gateway' },
    ];
  } else if (vendor === 'linux') {
    quickCommands = [
      { label: 'ip addr', cmd: 'ip addr', title: 'Display IP addresses and interfaces' },
      { label: 'ip route', cmd: 'ip route', title: 'Display routing table' },
      { label: 'uname -a', cmd: 'uname -a', title: 'Display Linux kernel specifications' },
    ];
  } else if (vendor === 'juniper') {
    quickCommands = [
      { label: 'show int terse', cmd: 'show interfaces terse', title: 'Junos brief interfaces table' },
      { label: 'show route', cmd: 'show route', title: 'Display inet.0 route table' },
      { label: 'configure', cmd: 'configure', title: 'Enter Junos configuration mode' },
    ];
  } else if (vendor === 'mikrotik') {
    quickCommands = [
      { label: '/interface print', cmd: '/interface print', title: 'List interfaces' },
      { label: '/ip addr print', cmd: '/ip address print', title: 'List IP addresses' },
      { label: '/ip route print', cmd: '/ip route print', title: 'List routes' },
    ];
  } else if (vendor === 'fortinet') {
    quickCommands = [
      { label: 'get sys status', cmd: 'get system status', title: 'FortiGate status' },
      { label: 'show sys int', cmd: 'get system interface physical', title: 'Interface details' },
      { label: 'firewall policy', cmd: 'config firewall policy', title: 'Firewall rules' },
    ];
  } else if (vendor === 'paloalto') {
    quickCommands = [
      { label: 'show sys info', cmd: 'show system info', title: 'PAN-OS system info' },
      { label: 'show int all', cmd: 'show interface all', title: 'Interface table' },
      { label: 'configure', cmd: 'configure', title: 'Enter configuration mode' },
    ];
  }

  return (
    <div
      className={`
        fixed z-40 rounded-lg border border-[#30363d] bg-[#0d1117] shadow-2xl flex flex-col font-mono text-xs overflow-hidden transition-all
        ${
          isMinimized
            ? 'bottom-12 right-6 w-[540px] h-9'
            : isMaximized
            ? 'inset-8 w-auto h-auto'
            : 'bottom-12 right-6 w-[620px] h-[440px]'
        }
      `}
    >
      {/* Title Bar */}
      <div className="h-9 px-3 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-[#e6edf3]">
          <Terminal className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span className="font-semibold text-xs">{device.hostname}</span>
          <span className="text-[10px] text-[#8b949e]">({device.model})</span>
        </div>

        {/* Quick Command Pills Adapted Per Operating System */}
        {!isMinimized && (
          <div className="flex items-center gap-1.5 ml-4">
            {quickCommands.map((q) => (
              <button
                key={q.cmd}
                onClick={() => handleCommandSubmit(q.cmd)}
                className="px-2 py-0.5 rounded bg-[#21262d] text-[10px] text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#2d333b] cursor-pointer transition-colors"
                title={q.title}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setLines([])}
            className="p-1 text-[#8b949e] hover:text-[#e6edf3] rounded cursor-pointer"
            title="Clear Terminal Screen"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
              setIsMinimized(false);
            }}
            className="p-1 text-[#8b949e] hover:text-[#e6edf3] rounded cursor-pointer"
            title={isMaximized ? 'Restore Size' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-[#8b949e] hover:text-[#e6edf3] rounded cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setActiveTerminalDevice(null)}
            className="p-1 text-[#8b949e] hover:text-[#f85149] rounded cursor-pointer"
            title="Close Terminal"
          >
            <X className="w-3.5 h-3.5" />
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
            <span className="text-[#3fb950] font-bold select-none shrink-0 font-mono">
              {currentPrompt}
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
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  if (device) {
                    const parser = getOrCreateParser(device.id);
                    const completed = parser.autocomplete(inputVal);
                    if (completed && completed !== inputVal) {
                      setInputVal(completed);
                    }
                  }
                }
              }}
              placeholder="Type command ('?' for help, Tab to auto-complete)..."
              className="flex-1 bg-transparent border-none text-[#e6edf3] outline-none text-xs font-mono caret-[#58a6ff]"
              autoFocus
            />
          </div>
        </>
      )}
    </div>
  );
}
