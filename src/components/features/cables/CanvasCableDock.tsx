import { useUiStore } from '@/store/uiStore';
import { CABLE_DEFINITIONS } from './CablesPalette';
import { Cable } from 'lucide-react';

export function CanvasCableDock() {
  const { cableTool, setActiveCable, resetCableTool, addToast } = useUiStore();

  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
      <div className="flex items-center gap-1 p-1 bg-[#161b22]/90 border border-[#30363d] rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#8b949e] border-r border-[#21262d] select-none">
          <Cable className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span>Cables:</span>
        </div>

        {CABLE_DEFINITIONS.map((cable) => {
          const isSelected = cableTool.activeCable === cable.id;
          return (
            <button
              key={cable.id}
              onClick={() => {
                if (isSelected) {
                  resetCableTool();
                } else {
                  setActiveCable(cable.id);
                  addToast({
                    type: 'info',
                    title: `${cable.shortName} Active`,
                    message: cable.id === 'auto'
                      ? 'Click first device, then second device to connect automatically.'
                      : 'Click first device to select port, then click target device.',
                  });
                }
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#1f6feb] text-white shadow-md ring-2 ring-[#58a6ff]/50'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
              }`}
              title={`${cable.name} — ${cable.description}`}
            >
              <div className="shrink-0">{cable.icon}</div>
              <span className="hidden sm:inline text-[11px]">{cable.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
