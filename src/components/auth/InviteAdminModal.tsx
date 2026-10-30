import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  KeyRound,
  Plus,
  Copy,
  Database,
  X,
  RefreshCw,
  Sparkles,
  Mail,
  Send,
  Dices,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { generateSecureInviteCode, sendInviteEmail, SUPER_ADMIN_EMAIL } from '@/lib/emailService';

export function InviteAdminModal() {
  const {
    currentUser,
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

  const [newCode, setNewCode] = useState(generateSecureInviteCode('TS'));
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [dbStatusMsg, setDbStatusMsg] = useState('');
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ message: string; mailtoUrl: string; code: string } | null>(null);

  useEffect(() => {
    if (isInviteAdminOpen) {
      fetchInviteCodes();
      if (!newCode) setNewCode(generateSecureInviteCode('TS'));
    }
  }, [isInviteAdminOpen, fetchInviteCodes, newCode]);

  if (!isInviteAdminOpen) return null;

  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL || currentUser?.role === 'admin';

  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
        <div className="w-full max-w-md bg-[var(--bg-secondary)] border-3 border-black shadow-[6px_6px_0px_#000] p-6 text-center text-[var(--text-primary)]">
          <div className="w-12 h-12 bg-red-600 text-white font-mono font-black text-xl flex items-center justify-center mx-auto mb-3 border-2 border-black shadow-[2px_2px_0px_#000]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-mono font-black text-sm uppercase text-red-500 mb-1">
            403 ACCESS RESTRICTED
          </h2>
          <p className="font-mono text-xs text-[var(--text-secondary)] mb-4">
            The Invite Generator &amp; Admin Dashboard is restricted exclusively to <strong>{SUPER_ADMIN_EMAIL}</strong>.
          </p>
          <button
            onClick={closeInviteAdmin}
            className="px-4 py-1.5 brutal-btn bg-black text-white font-mono text-xs uppercase cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleRandomize = () => {
    setNewCode(generateSecureInviteCode('TS'));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setIsDispatching(true);
    const codeToCreate = newCode.trim().toUpperCase();

    // 1. Store in Neon Postgres
    const res = await createInviteCode({
      code: codeToCreate,
      maxUses,
      note: note.trim() || `Dispatched to ${SUPER_ADMIN_EMAIL}`,
    });

    if (res.success) {
      // 2. Dispatch Email notification to Ansh Narsale
      const mailRes = await sendInviteEmail({
        toEmail: SUPER_ADMIN_EMAIL,
        code: codeToCreate,
        maxUses,
        note: note.trim(),
        directUrl: window.location.origin,
      });

      setEmailStatus({
        message: mailRes.message,
        mailtoUrl: mailRes.mailtoUrl,
        code: codeToCreate,
      });

      // Prepare fresh code for next dispatch
      setNewCode(generateSecureInviteCode('TS'));
      setNote('');
      setMaxUses(1);
    }

    setIsDispatching(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyFullCard = (code: string) => {
    const text = `Hey! Here is your private access invite for TopoSphere Network Simulator:
- Invite Code: ${code}
- Link: ${window.location.origin}
(Click "Have an Invite" on the site to register)`;
    navigator.clipboard.writeText(text);
    setCopiedCode(code + '_full');
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
      <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border-3 border-black shadow-[8px_8px_0px_#000] p-6 text-[var(--text-primary)] max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-[#ffe600] border-2 border-black flex items-center justify-center font-mono text-[10px] font-black text-black">
              🔒
            </span>
            <div>
              <h2 className="font-mono font-black text-sm uppercase tracking-wider">
                ANSH NARSALE SUPER ADMIN &amp; INVITE ENGINE
              </h2>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                Codes automatically dispatch to: <strong className="text-black dark:text-white underline">{SUPER_ADMIN_EMAIL}</strong>
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

        {/* Email Dispatch Success Notification */}
        {emailStatus && (
          <div className="p-3 bg-[#00ff66]/15 border-2 border-black mb-4 shadow-[3px_3px_0px_#000]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-[#00ff66] mt-0.5 shrink-0" />
                <div>
                  <div className="font-mono text-xs font-black uppercase text-[var(--text-primary)]">
                    Invite Code {emailStatus.code} Ready!
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                    Prepared for dispatch to {SUPER_ADMIN_EMAIL}.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={emailStatus.mailtoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 brutal-btn bg-[#ffe600] text-black text-[10px] font-mono font-black flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send via Email Client</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>

                <button
                  onClick={() => handleCopyFullCard(emailStatus.code)}
                  className="px-2 py-1 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-[10px] font-mono font-black"
                >
                  {copiedCode === emailStatus.code + '_full' ? 'Copied Card!' : 'Copy For Recipient'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Neon Database Status Box */}
        <div className="p-2.5 bg-[var(--bg-primary)] border-2 border-black mb-4 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-mono text-xs font-bold uppercase">
                Neon Cloud Postgres: {isNeonConnected ? 'Online (AWS Pooler)' : 'Local Storage'}
              </span>
            </div>
            <button
              onClick={handleTestNeon}
              disabled={isTestingDb}
              className="px-2 py-0.5 brutal-btn bg-[#00ff66] text-black text-[10px] font-mono cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingDb ? 'animate-spin' : ''}`} />
              Test Sync
            </button>
          </div>
          {dbStatusMsg && (
            <div className="mt-1 text-[10px] font-mono font-bold text-[#00f0ff]">
              &gt; {dbStatusMsg}
            </div>
          )}
        </div>

        {/* Generator Form */}
        <form onSubmit={handleCreate} className="p-3.5 bg-[var(--bg-tertiary)] border-2 border-black mb-4 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-xs font-black uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ffe600]" />
              Generate &amp; Dispatch Private Invite
            </h3>
            <button
              type="button"
              onClick={handleRandomize}
              className="px-2 py-0.5 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-[10px] font-mono flex items-center gap-1 cursor-pointer"
              title="Generate new random cryptographic code"
            >
              <Dices className="w-3 h-3 text-[#00f0ff]" />
              <span>Randomize</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold mb-1">Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="TS-XXXX-2026-YYYY"
                required
                className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border-2 border-black font-mono text-xs uppercase shadow-[1px_1px_0px_#000]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold mb-1">Max Redemptions</label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border-2 border-black font-mono text-xs shadow-[1px_1px_0px_#000]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold mb-1">Recipient Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Student Alex, Colleague"
                className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border-2 border-black font-medium text-xs shadow-[1px_1px_0px_#000]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isDispatching}
            className="w-full py-2 brutal-btn bg-[#ffe600] text-black font-mono text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[#ffea33] disabled:opacity-50"
          >
            {isDispatching ? (
              <span>Dispatching to Database &amp; Email...</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Save to Neon &amp; Send to {SUPER_ADMIN_EMAIL}</span>
              </>
            )}
          </button>
        </form>

        {/* Invite Codes Table */}
        <div className="flex-1 overflow-y-auto border-2 border-black shadow-[3px_3px_0px_#000]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-black text-white uppercase text-[10px] tracking-wider sticky top-0">
              <tr>
                <th className="p-2">Code</th>
                <th className="p-2">Uses</th>
                <th className="p-2">Note</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-[var(--bg-primary)]">
              {inviteCodes.map((inv) => (
                <tr key={inv.code} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="p-2 font-bold tracking-wider text-[#00f0ff] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#ffe600]" />
                    <span>{inv.code}</span>
                  </td>
                  <td className="p-2 font-semibold">
                    {inv.timesUsed} / {inv.maxUses}
                  </td>
                  <td className="p-2 text-[var(--text-secondary)] truncate max-w-[130px]">
                    {inv.note || '—'}
                  </td>
                  <td className="p-2">
                    {inv.isActive ? (
                      <span className="px-1.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66] text-[9px] font-bold uppercase">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 border border-red-500 text-[9px] font-bold uppercase">
                        REVOKED
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right space-x-1">
                    <button
                      onClick={() => handleCopy(inv.code)}
                      className="px-2 py-0.5 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-[10px] cursor-pointer inline-flex items-center gap-1"
                      title="Copy invite code"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === inv.code ? 'Copied' : 'Code'}
                    </button>
                    <button
                      onClick={() => toggleInviteCode(inv.code)}
                      className="px-2 py-0.5 brutal-btn bg-black/10 dark:bg-white/10 text-[var(--text-primary)] text-[10px] cursor-pointer"
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
        <div className="mt-3 pt-2.5 border-t-2 border-black flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>PRIVATE TO ANSH NARSALE. NO INVITE CODES ARE SHOWN PUBLICLY.</span>
          <button
            onClick={closeInviteAdmin}
            className="px-3 py-1 brutal-btn bg-black text-white text-[10px] uppercase cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
