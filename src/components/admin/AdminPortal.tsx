import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import {
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Send,
  Dices,
  Copy,
  Plus,
  RefreshCw,
  Database,
  ExternalLink,
  Users,
  LogOut,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { generateSecureInviteCode, sendInviteEmail, SUPER_ADMIN_EMAIL } from '@/lib/emailService';

export function AdminPortal() {
  const {
    currentUser,
    adminLogin,
    logout,
    inviteCodes,
    registeredUsers,
    fetchInviteCodes,
    fetchRegisteredUsers,
    createInviteCode,
    toggleInviteCode,
    isNeonConnected,
    neonMaskedUrl,
    testNeonConnection,
    isLoading,
  } = useAuthStore();

  const { theme, toggleTheme } = useUiStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Generator state
  const [newCode, setNewCode] = useState(generateSecureInviteCode('TS'));
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    message: string;
    mailtoUrl: string;
    gmailUrl: string;
    method: string;
    code: string;
  } | null>(null);
  const [dbStatusMsg, setDbStatusMsg] = useState('');
  const [isTestingDb, setIsTestingDb] = useState(false);

  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL || currentUser?.role === 'admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInviteCodes();
      fetchRegisteredUsers();
    }
  }, [isSuperAdmin, fetchInviteCodes, fetchRegisteredUsers]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const res = await adminLogin(password);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed');
    } else {
      setSuccessMsg('Welcome, Ansh! Super Admin Console initialized.');
    }
  };

  const handleRandomize = () => {
    setNewCode(generateSecureInviteCode('TS'));
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setIsDispatching(true);
    const codeToCreate = newCode.trim().toUpperCase();

    const res = await createInviteCode({
      code: codeToCreate,
      maxUses,
      note: note.trim() || `Dispatched to ${SUPER_ADMIN_EMAIL}`,
    });

    if (res.success) {
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
        gmailUrl: mailRes.gmailUrl,
        method: mailRes.method,
        code: codeToCreate,
      });

      setNewCode(generateSecureInviteCode('TS'));
      setNote('');
      setMaxUses(1);
    } else {
      setErrorMsg(res.error || 'Failed to create code');
    }

    setIsDispatching(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyCard = (code: string) => {
    const text = `Private TopoSphere Access Pass:
- Invite Code: ${code}
- Workspace: ${window.location.origin}
(Click "Have an Invite" to register)`;
    navigator.clipboard.writeText(text);
    setCopiedCode(code + '_card');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTestNeon = async () => {
    setIsTestingDb(true);
    setDbStatusMsg('Testing connection to Neon PostgreSQL...');
    const res = await testNeonConnection();
    setDbStatusMsg(res.message);
    setIsTestingDb(false);
  };

  const navigateToWorkspace = () => {
    window.location.href = '/';
  };

  // If NOT authenticated as Super Admin, show the private Super Admin Gate
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-[var(--bg-secondary)] border-3 border-black shadow-[8px_8px_0px_#000] p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#ffe600] border-2 border-black flex items-center justify-center font-mono text-[10px] font-black text-black">
                ★
              </span>
              <span className="font-mono font-black text-sm tracking-widest uppercase">
                SUPER ADMIN GATE
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#ffe600]" /> : <Moon className="w-3.5 h-3.5 text-black" />}
            </button>
          </div>

          <div className="mb-5 text-center">
            <div className="w-12 h-12 bg-black text-[#ffe600] border-2 border-black font-mono font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-[3px_3px_0px_#ffe600]">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-mono font-black text-lg uppercase tracking-tight mb-1">
              Ansh Narsale Portal
            </h1>
            <p className="font-mono text-xs text-[var(--text-secondary)]">
              Authorized personnel only. Restricted to <strong className="text-black dark:text-white underline">{SUPER_ADMIN_EMAIL}</strong>.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border-2 border-red-600 text-red-500 text-xs font-mono mb-4 flex items-start gap-2 shadow-[2px_2px_0px_#dc2626]">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border-2 border-emerald-600 text-emerald-500 text-xs font-mono mb-4 flex items-start gap-2 shadow-[2px_2px_0px_#059669]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                Designated Admin Identity
              </label>
              <input
                type="email"
                value={SUPER_ADMIN_EMAIL}
                disabled
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black font-mono text-xs text-[var(--text-secondary)] shadow-[2px_2px_0px_#000] cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-bold uppercase">
                  Passcode
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-mono flex items-center gap-1 text-[var(--text-muted)] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  required
                  autoFocus
                  className="w-full px-3 py-2 pr-10 bg-[var(--bg-primary)] border-2 border-black font-mono text-sm focus:outline-none focus:bg-[#ffe600]/10 shadow-[2px_2px_0px_#000]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 brutal-btn bg-[#ffe600] text-black font-mono font-black text-xs uppercase cursor-pointer hover:bg-[#ffea33] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <div className="mt-5 pt-3 border-t-2 border-black flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
            <button
              onClick={navigateToWorkspace}
              className="text-black dark:text-white underline hover:text-[#00f0ff] cursor-pointer flex items-center gap-1 font-bold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Public Workspace</span>
            </button>
            <span>v2.4 SECURE</span>
          </div>
        </div>
      </div>
    );
  }

  // Super Admin Authenticated Console
  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-mono select-none">
      {/* Top Header */}
      <header className="h-12 border-b-2 border-black bg-[var(--bg-secondary)] px-4 flex items-center justify-between shrink-0 shadow-[0_2px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 brutal-box bg-[#ffe600] px-2.5 py-1 text-black font-black text-xs">
            <span>TS</span>
            <span>SUPER ADMIN</span>
          </div>
          <span className="text-xs font-bold text-[var(--text-secondary)] hidden sm:inline">
            Logged in as <strong className="text-black dark:text-white underline">{SUPER_ADMIN_EMAIL}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 brutal-btn bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#ffe600]" /> : <Moon className="w-3.5 h-3.5 text-black" />}
          </button>

          <button
            onClick={navigateToWorkspace}
            className="px-3 py-1 brutal-btn bg-[#00f0ff] text-black text-xs font-black uppercase cursor-pointer flex items-center gap-1.5"
            title="Open Simulator Topology Workstation"
          >
            <span>Topology Workspace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={logout}
            className="px-2.5 py-1 brutal-btn bg-red-600 text-white text-xs font-black uppercase cursor-pointer flex items-center gap-1"
            title="Sign Out of Super Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 max-w-6xl w-full mx-auto space-y-5">
        {/* Email Dispatched Alert */}
        {emailStatus && (
          <div className="p-3 bg-[#00ff66]/15 border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Mail className="w-5 h-5 text-[#00ff66] shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-xs uppercase text-[var(--text-primary)] flex items-center gap-2">
                  <span>Pass {emailStatus.code} Ready</span>
                  {emailStatus.method !== 'client' && (
                    <span className="px-1.5 py-0.2 bg-[#00ff66] text-black text-[9px] font-black rounded">
                      AUTO-DISPATCHED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                  {emailStatus.message}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <a
                href={emailStatus.gmailUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 brutal-btn bg-[#ea4335] text-white text-xs font-black flex items-center gap-1.5"
                title="Send directly via Gmail Web"
              >
                <Send className="w-3.5 h-3.5" />
                <span>1-Click Send in Gmail</span>
              </a>
              <a
                href={emailStatus.mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 brutal-btn bg-[#ffe600] text-black text-xs font-black flex items-center gap-1"
                title="Open in default system mail client"
              >
                <span>Mail Client</span>
              </a>
              <button
                onClick={() => handleCopyCard(emailStatus.code)}
                className="px-2.5 py-1.5 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-xs font-black"
              >
                {copiedCode === emailStatus.code + '_card' ? 'Copied Card!' : 'Copy Share Card'}
              </button>
            </div>
          </div>
        )}

        {/* Database Telemetry */}
        <div className="p-3 bg-[var(--bg-secondary)] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-xs font-bold uppercase">
              Neon Cloud Database: {isNeonConnected ? 'AWS US-East Pooler (Connected)' : 'Local Storage'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[280px] hidden md:inline">
              {neonMaskedUrl}
            </span>
            <button
              onClick={handleTestNeon}
              disabled={isTestingDb}
              className="px-2.5 py-1 brutal-btn bg-[#00ff66] text-black text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingDb ? 'animate-spin' : ''}`} />
              Test Sync
            </button>
          </div>
        </div>
        {dbStatusMsg && (
          <div className="text-[11px] font-bold text-[#00f0ff]">
            &gt; {dbStatusMsg}
          </div>
        )}

        {/* Email Engine Status & Auto-Delivery Setup */}
        <div className="p-3 bg-[var(--bg-secondary)] border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#ea4335] shrink-0" />
            <span className="text-xs">
              <strong>Email Engine: </strong>
              {import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || import.meta.env.VITE_RESEND_API_KEY || import.meta.env.VITE_EMAIL_WEBHOOK_URL ? (
                <span className="text-[#00ff66] font-bold">Automated Background Inbox Delivery Active</span>
              ) : (
                <span>1-Click Gmail Mode active. To enable automatic background delivery to <strong>{SUPER_ADMIN_EMAIL}</strong>, add a free Web3Forms key to <code>.env</code>.</span>
              )}
            </span>
          </div>

          {!(import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || import.meta.env.VITE_RESEND_API_KEY || import.meta.env.VITE_EMAIL_WEBHOOK_URL) && (
            <a
              href="https://web3forms.com"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 brutal-btn bg-[#ffe600] text-black font-black text-[11px] shrink-0 flex items-center gap-1"
            >
              <span>Get Free Key (10 sec)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Code Generator Engine */}
        <div className="p-4 bg-[var(--bg-secondary)] border-2 border-black shadow-[4px_4px_0px_#000]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ffe600]" />
              Cryptographic Invite Engine &amp; Email Dispatcher
            </h2>
            <button
              onClick={handleRandomize}
              className="px-2.5 py-1 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Randomize Code</span>
            </button>
          </div>

          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black text-sm uppercase shadow-[2px_2px_0px_#000]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Max Redemptions</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black text-sm shadow-[2px_2px_0px_#000]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Recipient Note / Purpose</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Student Alex, Colleague"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black text-sm shadow-[2px_2px_0px_#000]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDispatching}
              className="w-full py-2.5 brutal-btn bg-[#ffe600] text-black text-xs font-black uppercase cursor-pointer hover:bg-[#ffea33] flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create in Neon &amp; Send to {SUPER_ADMIN_EMAIL}</span>
            </button>
          </form>
        </div>

        {/* Two Column Grid: Active Codes vs Registered Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Active Codes */}
          <div className="bg-[var(--bg-secondary)] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col max-h-[380px]">
            <div className="p-3 border-b-2 border-black bg-black text-white font-black text-xs uppercase flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#ffe600]" />
                <span>Generated Invite Codes ({inviteCodes.length})</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-primary)] text-[10px] uppercase border-b border-black">
                  <tr>
                    <th className="p-2">Code</th>
                    <th className="p-2">Uses</th>
                    <th className="p-2">Note</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/20">
                  {inviteCodes.map((inv) => (
                    <tr key={inv.code} className="hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="p-2 font-bold text-[#00f0ff]">{inv.code}</td>
                      <td className="p-2">{inv.timesUsed} / {inv.maxUses}</td>
                      <td className="p-2 text-[var(--text-secondary)] truncate max-w-[120px]">{inv.note || '—'}</td>
                      <td className="p-2">
                        {inv.isActive ? (
                          <span className="px-1.5 py-0.2 bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66] text-[9px] font-bold uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-red-500/20 text-red-500 border border-red-500 text-[9px] font-bold uppercase">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <button
                          onClick={() => handleCopy(inv.code)}
                          className="px-2 py-0.5 brutal-btn bg-white dark:bg-black text-[var(--text-primary)] text-[10px]"
                        >
                          {copiedCode === inv.code ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => toggleInviteCode(inv.code)}
                          className="px-2 py-0.5 brutal-btn bg-black/10 dark:bg-white/10 text-[var(--text-primary)] text-[10px]"
                        >
                          {inv.isActive ? 'Revoke' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Registered Users Table */}
          <div className="bg-[var(--bg-secondary)] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col max-h-[380px]">
            <div className="p-3 border-b-2 border-black bg-black text-white font-black text-xs uppercase flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Registered Lab Users ({registeredUsers.length})</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-primary)] text-[10px] uppercase border-b border-black">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Code Used</th>
                    <th className="p-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/20">
                  {registeredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[var(--text-muted)]">
                        No registered users yet.
                      </td>
                    </tr>
                  ) : (
                    registeredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="p-2 font-bold">{u.name}</td>
                        <td className="p-2 text-[var(--text-secondary)]">{u.email}</td>
                        <td className="p-2 text-[#00f0ff]">{u.inviteCodeUsed || 'DIRECT'}</td>
                        <td className="p-2 text-[10px] text-[var(--text-muted)]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

