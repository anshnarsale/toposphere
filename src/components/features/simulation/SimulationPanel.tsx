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
      style={{ height: isVisible ? height : 34 }}
      className="border-t-2 border-black bg-[var(--bg-secondary)] flex flex-col shrink-0 transition-all select-none shadow-[0_-2px_0px_#000]"
    >
      {/* Top Header / Bar */}
      <div className="h-8 px-3 border-b-2 border-black flex items-center justify-between bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => togglePanel('simulation')}
            className="flex items-center gap-1.5 font-mono text-xs font-black uppercase text-[var(--text-primary)] hover:text-[#00f0ff] cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#ffe600]" />
            <span>Simulation & Event Timeline</span>
            {isVisible ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronUp className="w-3.5 h-3.5 ml-1" />}
          </button>

          {isVisible && (
            <div className="flex items-center gap-1.5 ml-4 border-l-2 border-black pl-4">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-2 py-0.5 border border-black font-mono text-[10px] font-black uppercase cursor-pointer transition-all ${
                  activeTab === 'events'
                    ? 'bg-[#ffe600] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-primary)]'
                }`}
              >
                Events
                {events.length > 0 && (
                  <span className="ml-1.5 px-1 py-0.2 border border-black text-[9px] bg-black text-white">
                    {events.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('flows')}
                className={`px-2 py-0.5 border border-black font-mono text-[10px] font-black uppercase cursor-pointer transition-all ${
                  activeTab === 'flows'
                    ? 'bg-[#00f0ff] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-primary)]'
                }`}
              >
                Captured Flows
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`px-2 py-0.5 border border-black font-mono text-[10px] font-black uppercase cursor-pointer transition-all ${
                  activeTab === 'console'
                    ? 'bg-[#00ff66] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-primary)]'
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
            className="flex items-center gap-1 font-mono text-[10px] font-black uppercase text-red-500 hover:underline cursor-pointer"
            title="Clear all recorded events"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Events</span>
          </button>
        )}
      </div>

      {/* Panel Body */}
      {isVisible && (
        <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
          {activeTab === 'events' && <EventTimeline />}
          {activeTab === 'flows' && <PacketList />}
          {activeTab === 'console' && <ConsoleOutput />}
        </div>
      )}
    </div>
  );
}

