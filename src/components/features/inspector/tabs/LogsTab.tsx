import type { Device } from '@/types/network';
import { Info, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';

interface LogsTabProps {
  device: Device;
}

export function LogsTab({ device }: LogsTabProps) {
  const handleClear = () => {
    device.logs = [];
  };

  return (
    <div className="space-y-3 p-3 text-xs text-[#e6edf3]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-semibold text-[#8b949e]">Device Event History</span>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-[#f85149] cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {device.logs.length === 0 ? (
        <div className="p-4 rounded bg-[#161b22] border border-[#21262d] text-center text-[#8b949e] italic">
          No log events recorded.
        </div>
      ) : (
        <div className="space-y-1.5 font-mono text-[11px] max-h-96 overflow-y-auto">
          {device.logs.map((log) => {
            const icon = {
              info: <Info className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />,
              warn: <AlertTriangle className="w-3.5 h-3.5 text-[#d29922] shrink-0" />,
              error: <AlertCircle className="w-3.5 h-3.5 text-[#f85149] shrink-0" />,
              debug: <Info className="w-3.5 h-3.5 text-[#bc8cff] shrink-0" />,
            }[log.level];

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2 rounded bg-[#161b22] border border-[#21262d]"
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[#8b949e]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-[#e6edf3] break-words">{log.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

