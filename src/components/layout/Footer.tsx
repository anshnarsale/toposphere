import { Globe, ExternalLink, Cpu, Shield, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function Footer() {
  const { isNeonConnected, openInviteAdmin } = useAuthStore();

  return (
    <footer className="h-8 bg-[var(--bg-secondary)] border-t-2 border-black flex items-center justify-between px-3 text-[11px] font-mono select-none text-[var(--text-primary)] shrink-0 z-20 shadow-[0_-2px_0px_#000]">
      {/* Left: Engine & System Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-none bg-[#00ff66] border border-black animate-pulse" />
          <span className="uppercase tracking-wider text-[10px]">TOPOSPHERE CORE v2.4</span>
        </div>

        <span className="text-[var(--text-muted)] hidden sm:inline">|</span>

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-medium">
          <Cpu className="w-3 h-3 text-[#00f0ff]" />
          <span>SIMULATION: DETERMINISTIC</span>
        </div>

        <span className="text-[var(--text-muted)] hidden md:inline">|</span>

        <button
          onClick={openInviteAdmin}
          className="hidden md:flex items-center gap-1 text-[10px] font-bold text-[#ffe600] hover:underline cursor-pointer"
        >
          <Shield className="w-3 h-3" />
          <span>INVITE SYSTEM: {isNeonConnected ? 'NEON POSTGRES' : 'ACTIVE'}</span>
        </button>
      </div>

      {/* Center/Right: Credit to Ansh Narsale */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center gap-1 text-[var(--text-primary)]">
          <Sparkles className="w-3 h-3 text-[#ffe600]" />
          Made by <strong className="text-black dark:text-white underline underline-offset-2">Ansh Narsale</strong>
        </span>

        {/* GitHub Link */}
        <a
          href="https://github.com/anshnarsale"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-0.5 bg-black text-white hover:bg-[#ffe600] hover:text-black border border-black text-[10px] font-bold transition-all shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          title="Ansh Narsale on GitHub"
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>

        {/* Website Link */}
        <a
          href="https://anshnarsale.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-0.5 bg-[#00f0ff] text-black hover:bg-[#ffe600] border border-black text-[10px] font-bold transition-all shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          title="Ansh Narsale Personal Website"
        >
          <Globe className="w-3 h-3" />
          <span className="hidden xs:inline">Website</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </footer>
  );
}
