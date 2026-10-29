import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { DiagnosticsEngine } from '@/engine/diagnostics/DiagnosticsEngine';
import { X, Activity, AlertTriangle, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export function DiagnosticsModal() {
  const { isDiagnosticsOpen, setDiagnosticsOpen, setSelectedDeviceIds, setInspectorTab } = useUiStore();
  const { topology } = useNetworkStore();

  if (!isDiagnosticsOpen) return null;

  const findings = DiagnosticsEngine.analyze(topology);
  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warnCount = findings.filter((f) => f.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#d29922]/15 text-[#d29922]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">Network Diagnostic Engine</h2>
              <p className="text-xs text-[#8b949e]">
                Automated topology verification & configuration audits
              </p>
            </div>
          </div>

          <button
            onClick={() => setDiagnosticsOpen(false)}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Summary Pills */}
        <div className="px-4 py-2.5 bg-[#0d1117] border-b border-[#21262d] flex items-center gap-3 text-xs">
          <span className="text-[#8b949e]">Audit Status:</span>
          {findings.length === 0 ? (
            <span className="flex items-center gap-1.5 text-[#3fb950] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Checks Passed (0 Issues Found)</span>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#da3633]/20 text-[#f85149] font-mono font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorCount} Errors</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#d29922]/20 text-[#d29922] font-mono font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{warnCount} Warnings</span>
              </span>
            </div>
          )}
        </div>

        {/* Findings List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#0d1117]">
          {findings.length === 0 ? (
            <div className="p-8 text-center text-[#8b949e]">
              <CheckCircle2 className="w-12 h-12 text-[#3fb950] mx-auto mb-2 opacity-80" />
              <div className="text-sm font-semibold text-[#e6edf3]">Clean Configuration</div>
              <p className="text-xs text-[#8b949e] mt-1">
                No duplicate IPs, missing gateways, VLAN mode conflicts, or route inconsistencies detected.
              </p>
            </div>
          ) : (
            findings.map((f) => {
              const isError = f.severity === 'error';
              const dev = topology.devices[f.deviceId];

              return (
                <div
                  key={f.id}
                  className={`p-3.5 rounded-lg border bg-[#161b22] text-xs space-y-2 ${
                    isError ? 'border-[#da3633]/50' : 'border-[#d29922]/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <AlertCircle className="w-4 h-4 text-[#f85149] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#d29922] shrink-0" />
                      )}
                      <span className="font-bold text-[#e6edf3]">{f.title}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                          isError ? 'bg-[#da3633]/20 text-[#f85149]' : 'bg-[#d29922]/20 text-[#d29922]'
                        }`}
                      >
                        {f.category}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDeviceIds([f.deviceId]);
                        setInspectorTab(f.category === 'vlan' ? 'vlans' : f.category === 'routing' ? 'routing' : 'interfaces');
                        setDiagnosticsOpen(false);
                      }}
                      className="flex items-center gap-1 text-[11px] text-[#58a6ff] hover:underline cursor-pointer shrink-0"
                    >
                      <span>Fix on {dev?.hostname || 'Device'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-[#8b949e] text-xs leading-relaxed">{f.description}</p>

                  <div className="p-2 rounded bg-[#0d1117] border border-[#21262d] font-mono text-[11px] text-[#8b949e]">
                    <span className="text-[#e6edf3] font-semibold">Evidence:</span> {f.evidence}
                  </div>

                  <div className="text-[11px] text-[#3fb950]">
                    <span className="font-semibold text-[#e6edf3]">Recommended Fix:</span> {f.suggestion}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#21262d] flex justify-end">
          <button
            onClick={() => setDiagnosticsOpen(false)}
            className="px-4 py-1.5 rounded-md bg-[#21262d] hover:bg-[#2d333b] text-xs font-semibold text-[#e6edf3] cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
