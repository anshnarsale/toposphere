import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, KeyRound, LogIn, UserPlus, Lock, Mail, User, AlertCircle, Sparkles, Database } from 'lucide-react';

export function AuthModal() {
  const {
    currentUser,
    isAuthModalOpen,
    closeAuthModal,
    login,
    registerWithInvite,
    isLoading,
    isNeonConnected,
  } = useAuthStore();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAuthModalOpen && currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (!inviteCode.trim()) {
        setErrorMsg('Please enter an invite code to gain access.');
        return;
      }
      const res = await registerWithInvite({
        code: inviteCode,
        name,
        email,
        password,
      });
      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed');
      } else {
        setSuccessMsg('Account created successfully! Welcome to TopoSphere.');
      }
    } else {
      const res = await login({ email, password });
      if (!res.success) {
        setErrorMsg(res.error || 'Login failed');
      } else {
        setSuccessMsg('Signed in successfully.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border-3 border-black dark:border-black shadow-[6px_6px_0px_#000] p-6 text-[var(--text-primary)]">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#ffe600] border-2 border-black flex items-center justify-center font-mono text-[9px] font-black text-black">
              ★
            </span>
            <span className="font-mono font-black text-sm tracking-widest uppercase">
              TOPOSPHERE ACCESS GATE
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#00ff66] border border-black font-mono text-[10px] font-black text-black uppercase">
            <Database className="w-3 h-3" />
            <span>{isNeonConnected ? 'NEON SQL' : 'INVITE ACTIVE'}</span>
          </div>
        </div>

        {/* Title & Vision */}
        <div className="mb-5 text-center">
          <h2 className="text-xl font-black uppercase tracking-tight mb-1">
            {mode === 'register' ? 'Claim Your Invite' : 'Sign In To TopoSphere'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            {mode === 'register'
              ? 'Private invite-only next-gen networking simulation laboratory.'
              : 'Enter your credentials to resume your virtual topology workstation.'}
          </p>
        </div>

        {/* Brutalist Mode Toggle Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black/10 dark:bg-black/40 border-2 border-black mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-black uppercase font-mono transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-[#ffe600] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Have an Invite
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-black uppercase font-mono transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-[#00f0ff] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Existing User
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border-2 border-red-600 text-red-500 text-xs font-mono mb-4 flex items-start gap-2 shadow-[2px_2px_0px_#dc2626]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border-2 border-emerald-600 text-emerald-500 text-xs font-mono mb-4 flex items-start gap-2 shadow-[2px_2px_0px_#059669]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#ffe600]" />
                  Invite Code (Required)
                </span>
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                autoComplete="off"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black font-mono text-sm tracking-wider uppercase focus:outline-none focus:bg-[#ffe600]/10 shadow-[2px_2px_0px_#000]"
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ansh Narsale or Student Name"
                required
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black font-medium text-sm focus:outline-none focus:bg-[#00f0ff]/10 shadow-[2px_2px_0px_#000]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black font-mono text-sm focus:outline-none focus:bg-[#00f0ff]/10 shadow-[2px_2px_0px_#000]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-black font-mono text-sm focus:outline-none focus:bg-[#00f0ff]/10 shadow-[2px_2px_0px_#000]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-2 py-2.5 px-4 brutal-btn cursor-pointer font-mono font-black text-xs uppercase flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-[#ffe600] text-black hover:bg-[#ffea33]'
                : 'bg-[#00f0ff] text-black hover:bg-[#33f3ff]'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : mode === 'register' ? (
              <>
                <Sparkles className="w-4 h-4" />
                Redeem Code & Enter Lab
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In to Workspace
              </>
            )}
          </button>
        </form>

        {/* Footer Credit */}
        <div className="mt-5 pt-3 border-t-2 border-black flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>PLATFORM CREATED BY ANSH NARSALE</span>
          <a
            href="https://anshnarsale.netlify.app/"
            target="_blank"
            rel="noreferrer"
            className="text-black dark:text-white font-bold underline hover:text-[#00f0ff]"
          >
            anshnarsale.netlify.app
          </a>
        </div>
      </div>
    </div>
  );
}

