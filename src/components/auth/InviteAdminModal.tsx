import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  KeyRound,
  Plus,
  CheckCircle2,
  XCircle,
  Copy,
  Database,
  ExternalLink,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export function InviteAdminModal() {
  const {
    isInviteAdminOpen,
    closeInviteAdmin,
    inviteCodes,
    fetchInviteCodes,
    createInviteCode,
    toggleInviteCode,
    isNeonConnected,
    neonMaskedUrl,
    testNeonConnection,
  } = useAuthStore();

  const [newCode, setNewCode] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [dbStatusMsg, setDbStatusMsg] = useState('');
  const [isTestingDb, setIsTestingDb] = useState(false);

  useEffect(() => {
    if (isInviteAdminOpen) {
      fetchInviteCodes();
    }
  }, [isInviteAdminOpen, fetchInviteCodes]);

  if (!isInviteAdminOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    const res = await createInviteCode({
      code: newCode.trim().toUpperCase(),
      maxUses,
      note: note.trim() || 'Created by Ansh Narsale',
    });
    if (res.success) {
      setNewCode('');
      setNote('');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTestNeon = async () => {
    setIsTestingDb(true);
    setDbStatusMsg('Testing connection to Neon PostgreSQL...');
    const res = await testNeonConnection();
    setDbStatusMsg(res.message);
    setIsTestingDb(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border-3 border-black shadow-[8px_8px_0px_#000] p-6 text-[var(--text-primary)] max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-[#ffe600] border-2 border-black flex items-center justify-center font-mono text-[10px] font-black text-black">
              🔑
            </span>
            <div>
              <h2 className="font-mono font-black text-sm uppercase tracking-wider">
                INVITE CODE DISPATCH & NEON ADMIN
              </h2>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                Manage who can access and create accounts on TopoSphere
              </span>
            </div>
          </div>

          <button
            onClick={closeInviteAdmin}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 border-2 border-transparent hover:border-black transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Neon Database Status Box */}
        <div className="p-3 bg-[var(--bg-primary)] border-2 border-black mb-5 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-mono text-xs font-bold uppercase">
                Neon Database: {isNeonConnected ? 'Connected (Postgres Cloud)' : 'Local Storage Mode'}
              </span>
            </div>
            <button
              onClick={handleTestNeon}
              disabled={isTestingDb}
              className="px-2.5 py-1 brutal-btn bg-[#00ff66] text-black text-[10px] font-mono cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingDb ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>
          <div className="mt-1.5 text-[11px] font-mono text-[var(--text-muted)] truncate">
            Connection: {neonMaskedUrl}
          </div>
          {dbStatusMsg && (
            <div className="mt-2 text-[10px] font-mono font-bold text-[#00f0ff]">
              &gt; {dbStatusMsg}
            </div>
          )}
        </div>

        {/* Create Code Form */}
        <form onSubmit={handleCreate} className="p-4 bg-[var(--bg-tertiary)] border-2 border-black mb-5 shadow-[3px_3px_0px_#000]">
          <h3 className="font-mono text-xs font-black uppercase mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffe600]" />
            Generate New Invite Code
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold mb-1">Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. VIP-FRIEND-2026"
                required
                className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border-2 border-black font-mono text-xs uppercase shadow-[1px_1px_0px_#000]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold mb-1">Max Redemptions</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border-2 border-black font-mono text-xs shadow-[1px_1px_0px_#000]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold mb-1">Recipient / Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. College Friend, Student"
                className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border-2 border-black font-medium text-xs shadow-[1px_1px_0px_#000]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 brutal-btn bg-[#ffe600] text-black font-mono text-xs uppercase cursor-pointer flex items-center gap-1.5 hover:bg-[#ffea33]"
          >
            <Plus className="w-3.5 h-3.5" />
            Create & Issue Code
          </button>
        </form>

        {/* Invite Codes Table */}
        <div className="flex-1 overflow-y-auto border-2 border-black shadow-[3px_3px_0px_#000]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-black text-white uppercase text-[10px] tracking-wider sticky top-0">
              <tr>
                <th className="p-2.5">Code</th>
                <th className="p-2.5">Uses</th>
                <th className="p-2.5">Note</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-[var(--bg-primary)]">
              {inviteCodes.map((inv) => (
                <tr key={inv.code} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="p-2.5 font-bold tracking-wider text-[#00f0ff] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#ffe600]" />
                    <span>{inv.code}</span>
                  </td>
                  <td className="p-2.5 font-semibold">
                    {inv.timesUsed} / {inv.maxUses}
                  </td>
                  <td className="p-2.5 text-[var(--text-secondary)] truncate max-w-[140px]">
                    {inv.note || '—'}
                  </td>
                  <td className="p-2.5">
                    {inv.isActive ? (
                      <span className="px-1.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66] text-[10px] font-bold uppercase">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 border border-red-500 text-[10px] font-bold uppercase">
                        REVOKED
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right space-x-1.5">
                    <button
                      onClick={() => handleCopy(inv.code)}
                      className="px-2 py-1 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-[10px] cursor-pointer inline-flex items-center gap-1"
                      title="Copy invite code to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === inv.code ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => toggleInviteCode(inv.code)}
                      className="px-2 py-1 brutal-btn bg-black/10 dark:bg-white/10 text-[var(--text-primary)] text-[10px] cursor-pointer"
                    >
                      {inv.isActive ? 'Revoke' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer Note */}
        <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>ANYONE YOU SHARE A VALID CODE WITH CAN CREATE AN ACCOUNT &amp; LOG IN REPEATEDLY.</span>
          <button
            onClick={closeInviteAdmin}
            className="px-3 py-1 brutal-btn bg-black text-white text-[10px] uppercase cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
