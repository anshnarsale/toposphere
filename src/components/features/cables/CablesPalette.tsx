import { useUiStore, type CableType } from '@/store/uiStore';
import { Zap, Cable, ArrowRightLeft, Radio, Terminal, Activity, HelpCircle } from 'lucide-react';

export interface CableDefinition {
  id: CableType;
  name: string;
  shortName: string;
  description: string;
  color: string;
  dashed?: boolean;
  icon: React.ReactNode;
}

export const CABLE_DEFINITIONS: CableDefinition[] = [
  {
    id: 'auto',
    name: 'Automatically Choose Connection Type',
    shortName: 'Auto Connect',
    description: 'Automatically chooses link type and first available free ports',
    color: '#d29922',
    icon: <Zap className="w-4 h-4 text-[#d29922]" />,
  },
  {
    id: 'straight-through',
    name: 'Copper Straight-Through',
    shortName: 'Straight-Through',
    description: 'Connects host to switch, switch to router (Ethernet / FastEthernet / Gigabit)',
    color: '#58a6ff',
    icon: <Cable className="w-4 h-4 text-[#58a6ff]" />,
  },
  {
    id: 'cross-over',
    name: 'Copper Cross-Over',
    shortName: 'Cross-Over',
    description: 'Connects similar devices (Switch to Switch, PC to PC, Router to Router)',
    color: '#f0883e',
    dashed: true,
    icon: <ArrowRightLeft className="w-4 h-4 text-[#f0883e]" />,
  },
  {
    id: 'fiber',
    name: 'Fiber Optic Cable',
    shortName: 'Fiber Optic',
    description: 'High-speed multi-mode / single-mode fiber optic connection',
    color: '#e3b341',
    icon: <Radio className="w-4 h-4 text-[#e3b341]" />,
  },
  {
    id: 'console',
    name: 'Console Cable (Rollover)',
    shortName: 'Console Cable',
    description: 'RJ45 to DB9/USB out-of-band management console link',
    color: '#39d0d8',
    icon: <Terminal className="w-4 h-4 text-[#39d0d8]" />,
  },
  {
    id: 'serial-dce',
    name: 'Serial DCE / WAN Cable',
    shortName: 'Serial Cable',
    description: 'Point-to-point synchronous serial WAN interconnection',
    color: '#f85149',
    icon: <Activity className="w-4 h-4 text-[#f85149]" />,
  },
];

export function CablesPalette() {
  const { cableTool, setActiveCable, resetCableTool, addToast } = useUiStore();

  const handleSelectCable = (cable: CableDefinition) => {
    if (cableTool.activeCable === cable.id) {
      resetCableTool();
      addToast({
        type: 'info',
        title: 'Cable Deselected',
        message: 'Returned to normal pointer selection mode.',
      });
    } else {
      setActiveCable(cable.id);
      addToast({
        type: 'info',
        title: `${cable.shortName} Selected`,
        message: cable.id === 'auto'
          ? 'Click first device, then target device to auto-connect.'
          : 'Click first device to select port, then target device to connect.',
      });
    }
  };

  return (
    <div className="space-y-1">
      {CABLE_DEFINITIONS.map((cable) => {
        const isSelected = cableTool.activeCable === cable.id;
        return (
          <button
            key={cable.id}
            onClick={() => handleSelectCable(cable)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#1f6feb]/20 border-[#58a6ff] text-[#e6edf3] shadow-md ring-1 ring-[#58a6ff]/40'
                : 'bg-[#0d1117]/60 border-[#21262d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#30363d] hover:bg-[#161b22]'
            }`}
          >
            <div
              className={`p-1.5 rounded-md border flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-[#161b22] border-[#58a6ff]/50' : 'bg-[#161b22] border-[#30363d]'
              }`}
            >
              {cable.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold truncate">{cable.name}</span>
                {isSelected && (
                  <span className="px-1.5 py-0.2 rounded bg-[#1f6feb] text-[9px] font-bold text-white uppercase tracking-wider">
                    Active
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#8b949e] truncate leading-tight mt-0.5">
                {cable.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
