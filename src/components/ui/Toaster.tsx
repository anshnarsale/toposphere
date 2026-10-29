import { useUiStore } from '@/store/uiStore';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-12 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-[#d29922] shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-[#f85149] shrink-0" />,
          info: <Info className="w-4 h-4 text-[#58a6ff] shrink-0" />,
        }[toast.type];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border border-[#30363d] bg-[#161b22] text-[#e6edf3] shadow-lg animate-in slide-in-from-right-4"
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold leading-none mb-1">{toast.title}</div>
              {toast.message && (
                <div className="text-[11px] text-[#8b949e] leading-snug">{toast.message}</div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8b949e] hover:text-[#e6edf3] p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
