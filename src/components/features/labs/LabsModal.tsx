import { useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { LEARNING_LABS, validateLab } from '@/features/labs/labDefinitions';
import { X, BookOpen, CheckCircle2, Circle, Clock, Tag, RefreshCw } from 'lucide-react';

export function LabsModal() {
  const { isLabsOpen, setLabsOpen, addToast } = useUiStore();
  const { topology } = useNetworkStore();

  const [selectedLabId, setSelectedLabId] = useState(LEARNING_LABS[0].id);

  if (!isLabsOpen) return null;

  const currentLab = LEARNING_LABS.find((l) => l.id === selectedLabId) || LEARNING_LABS[0];
  const validation = validateLab(currentLab.id, topology);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-4xl h-[85vh] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">NexaLab Interactive Learning Center</h2>
              <p className="text-xs text-[#8b949e]">Guided CCNA and networking hands-on laboratory exercises</p>
            </div>
          </div>

          <button
            onClick={() => setLabsOpen(false)}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Lab Navigation Selector */}
          <aside className="w-64 border-r border-[#21262d] bg-[#161b22] p-2 space-y-1.5 overflow-y-auto shrink-0">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase text-[#8b949e]">Available Labs</div>
            {LEARNING_LABS.map((lab) => {
              const isSelected = lab.id === selectedLabId;
              const labVal = validateLab(lab.id, topology);

              return (
                <button
                  key={lab.id}
                  onClick={() => setSelectedLabId(lab.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1f6feb]/15 border-[#58a6ff] text-[#e6edf3]'
                      : 'bg-[#0d1117] border-[#21262d] hover:border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#58a6ff]">
                      {lab.difficulty}
                    </span>
                    {labVal.completed ? (
                      <span className="flex items-center gap-1 text-[10px] text-[#3fb950] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8b949e]">{labVal.progressPercent}%</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold leading-snug">{lab.title}</div>
                </button>
              );
            })}
          </aside>

          {/* Right: Lab Details, Instructions & Live Validation */}
          <main className="flex-1 overflow-y-auto p-5 bg-[#0d1117] space-y-5">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[#1f6feb]/20 text-[#58a6ff]">
                  {currentLab.difficulty}
                </span>
                <span className="flex items-center gap-1 text-xs text-[#8b949e]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentLab.estimatedMinutes} mins</span>
                </span>
              </div>
              <h1 className="text-lg font-bold text-[#e6edf3] mb-1">{currentLab.title}</h1>
              <p className="text-xs text-[#8b949e]">{currentLab.description}</p>
            </div>

            {/* Live Progress Bar */}
            <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#e6edf3]">Objective Verification Status</span>
                <span className="font-mono text-[#58a6ff] font-bold">{validation.progressPercent}% Completed</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0d1117] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1f6feb] to-[#3fb950] transition-all duration-300"
                  style={{ width: `${validation.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Objectives Live Validation Checklist */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">Verification Checklist</h3>
              <div className="space-y-2">
                {validation.objectiveResults.map((obj) => (
                  <div
                    key={obj.id}
                    className={`p-3 rounded-lg border text-xs flex items-start gap-3 bg-[#161b22] ${
                      obj.passed ? 'border-[#238636]/50 text-[#e6edf3]' : 'border-[#30363d] text-[#8b949e]'
                    }`}
                  >
                    {obj.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#484f58] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#e6edf3]">{obj.description}</div>
                      <div className="text-[11px] text-[#8b949e] mt-0.5">{obj.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">Lab Steps & Workflow</h3>
              <div className="p-4 rounded-lg bg-[#161b22] border border-[#21262d] space-y-2 text-xs leading-relaxed text-[#e6edf3]">
                {currentLab.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-[#58a6ff] font-mono font-bold shrink-0">{idx + 1}.</span>
                    <span>{step.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hints Accordion */}
            <div className="p-3 rounded-lg bg-[#161b22] border border-[#21262d] space-y-1.5">
              <div className="text-xs font-bold text-[#d29922]">Lab Hints & Tips</div>
              <ul className="list-disc list-inside text-[11px] text-[#8b949e] space-y-1">
                {currentLab.hints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </div>
          </main>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#21262d] flex items-center justify-between">
          <span className="text-[11px] text-[#8b949e]">
            Configure topology in canvas and test results in real-time.
          </span>
          <button
            onClick={() => setLabsOpen(false)}
            className="px-4 py-1.5 rounded-md bg-[#1f6feb] hover:bg-[#388bfd] text-xs font-semibold text-white cursor-pointer"
          >
            Return to Workstation
          </button>
        </div>
      </div>
    </div>
  );
}

