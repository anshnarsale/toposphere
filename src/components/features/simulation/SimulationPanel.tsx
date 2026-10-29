import { useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useSimulationStore } from '@/store/simulationStore';
import { EventTimeline } from './EventTimeline';
import { PacketList } from './PacketList';
import { ConsoleOutput } from './ConsoleOutput';
import { ChevronUp, ChevronDown, Trash2, Activity } from 'lucide-react';

export function SimulationPanel() {
  const [activeTab, setActiveTab] = useState<'events' | 'flows' | 'console'>('events');
  const { panels, togglePanel } = useUiStore();
  const { events, clearEvents } = useSimulationStore();

  const isVisible = panels.simulation.visible;
  const height = panels.simulation.height || 220;

  return (
    <div
      style={{ height: isVisible ? height : 32 }}
      className="border-t border-[#21262d] bg-[#161b22] flex flex-col shrink-0 transition-all select-none"
    >
      {/* Top Header / Bar */}
      <div className="h-8 px-3 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => togglePanel('simulation')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#e6edf3] hover:text-[#58a6ff] cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Simulation & Event Timeline</span>
            {isVisible ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronUp className="w-3.5 h-3.5 ml-1" />}
          </button>

          {isVisible && (
            <div className="flex items-center gap-1 ml-4 border-l border-[#21262d] pl-4">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'events'
                    ? 'bg-[#21262d] text-[#58a6ff]'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Events
                {events.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#1f6feb] text-white">
                    {events.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('flows')}
                className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'flows'
                    ? 'bg-[#21262d] text-[#58a6ff]'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Captured Flows
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'console'
                    ? 'bg-[#21262d] text-[#58a6ff]'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                Engine Console
              </button>
            </div>
          )}
        </div>

        {isVisible && events.length > 0 && (
          <button
            onClick={clearEvents}
            className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-[#f85149] cursor-pointer"
            title="Clear all recorded events"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Events</span>
          </button>
        )}
      </div>

      {/* Panel Body */}
      {isVisible && (
        <div className="flex-1 overflow-hidden bg-[#0d1117]">
          {activeTab === 'events' && <EventTimeline />}
          {activeTab === 'flows' && <PacketList />}
          {activeTab === 'console' && <ConsoleOutput />}
        </div>
      )}
    </div>
  );
}
