import { useUiStore } from '@/store/uiStore';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

function sanitizeMessage(msg?: string): string {
  if (!msg) return '';
  return msg
    .replace(/&rarr;/g, '→')
    .replace(/&harr;/g, '↔')
    .replace(/&larr;/g, '←')
    .replace(/&bull;/g, '•');
}

export function Toaster() {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 max-w-[320px] w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-[#d29922] shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-[#f85149] shrink-0" />,
          info: <Info className="w-4 h-4 text-[#58a6ff] shrink-0" />,
        }[toast.type];

        const accentBorder = {
          success: 'border-l-[#3fb950]',
          warning: 'border-l-[#d29922]',
          error: 'border-l-[#f85149]',
          info: 'border-l-[#58a6ff]',
        }[toast.type];

        const progressBarColor = {
          success: 'bg-[#3fb950]',
          warning: 'bg-[#d29922]',
          error: 'bg-[#f85149]',
          info: 'bg-[#58a6ff]',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto relative overflow-hidden flex items-start gap-2.5 px-3 py-2.5 rounded-lg
              border border-[#30363d] border-l-4 ${accentBorder} bg-[#161b22]/95 backdrop-blur-md
              text-[#e6edf3] shadow-xl animate-in slide-in-from-top-3 fade-in duration-200
            `}
          >
            {icon}
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-semibold leading-tight text-[#e6edf3] truncate">
                {toast.title}
              </div>
              {toast.message && (
                <div className="text-[11px] text-[#8b949e] leading-snug mt-0.5 break-words">
                  {sanitizeMessage(toast.message)}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8b949e] hover:text-[#e6edf3] p-0.5 rounded cursor-pointer -mr-1 -mt-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Subtle countdown progress line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#21262d]">
              <div
                className={`h-full ${progressBarColor} animate-[shrink_5s_linear_forwards]`}
                style={{
                  animation: 'shrink 5s linear forwards',
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
