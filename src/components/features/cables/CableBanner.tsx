import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { CABLE_DEFINITIONS } from './CablesPalette';
import { X, Cable, Zap, ArrowRight, CornerDownRight } from 'lucide-react';
import { useEffect } from 'react';

export function CableBanner() {
  const { cableTool, resetCableTool } = useUiStore();
  const { topology } = useNetworkStore();

  // Cancel cable on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cableTool.activeCable) {
        resetCableTool();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cableTool.activeCable, resetCableTool]);

  if (!cableTool.activeCable) return null;

  const cableDef = CABLE_DEFINITIONS.find((c) => c.id === cableTool.activeCable);
  const srcDev = cableTool.sourceDeviceId ? topology.devices[cableTool.sourceDeviceId] : null;
  const srcIface = srcDev && cableTool.sourceInterfaceId ? srcDev.interfaces[cableTool.sourceInterfaceId] : null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex items-center gap-3 px-3.5 py-2 bg-[#161b22]/95 border border-[#58a6ff] rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2">
        {/* Cable type pill */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-semibold text-[#e6edf3]">
          {cableDef?.icon}
          <span>{cableDef?.shortName || 'Cable Mode'}</span>
        </div>

        {/* Status prompt */}
        <div className="flex items-center gap-2 text-xs">
          {!srcDev ? (
            <span className="text-[#e6edf3] font-medium flex items-center gap-1.5">
              <CornerDownRight className="w-3.5 h-3.5 text-[#58a6ff] animate-pulse" />
              Click the <strong className="text-[#58a6ff]">first device</strong> on the canvas to plug in
            </span>
          ) : (
            <span className="text-[#e6edf3] font-medium flex items-center gap-1.5">
              <span className="text-[#3fb950] font-semibold">{srcDev.hostname}</span>
              {srcIface && <span className="text-[#8b949e]">({srcIface.shortName})</span>}
              <ArrowRight className="w-3.5 h-3.5 text-[#58a6ff]" />
              Now click the <strong className="text-[#3fb950]">target device</strong> to complete connection
            </span>
          )}
        </div>

        {/* Cancel button */}
        <button
          onClick={resetCableTool}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#f85149] text-xs font-medium cursor-pointer transition-colors ml-2"
          title="Cancel cable connection (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
