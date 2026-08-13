'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';

const CREATE_SESSION = gql`
  mutation CreateSession($title: String!, $code: String!, $isModerated: Boolean, $passcode: String, $authToken: String) {
    createSession(title: $title, code: $code, isModerated: $isModerated, passcode: $passcode, authToken: $authToken) {
      id title code
    }
  }
`;

const CHECK_SESSION = gql`
  query CheckSession($code: String!) {
    checkSession(code: $code) { exists isPasswordProtected }
  }
`;

const GET_SESSION = gql`
  query GetSession($code: String!, $passcode: String) {
    session(code: $code, passcode: $passcode) {
      id code title isPasswordProtected
    }
  }
`;

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { token user { id displayName email } }
  }
`;

const REGISTER = gql`
  mutation Register($email: String!, $password: String!, $displayName: String!) {
    register(email: $email, password: $password, displayName: $displayName) { token user { id displayName email } }
  }
`;

const ME = gql`
  query Me($token: String!) {
    me(token: $token) { id displayName email }
  }
`;

interface User { id: string; displayName: string; email: string }
interface AuthPayload { token: string; user: User }
interface MeData { me: User | null }
interface LoginData { login: AuthPayload }
interface RegisterData { register: AuthPayload }
interface CheckSessionData { checkSession: { exists: boolean; isPasswordProtected: boolean } }
interface GetSessionData { session: { id: string; code: string; title: string; isPasswordProtected: boolean } | null }

export default function HomePage() {
  const router = useRouter();

  const [joinCode, setJoinCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [needsPasscode, setNeedsPasscode] = useState(false);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; displayName: string; email: string } | null>(null);

  const [createSession, { loading: creating }] = useMutation(CREATE_SESSION);
  const [checkSession] = useLazyQuery(CHECK_SESSION);
  const [getSession, { loading: checking }] = useLazyQuery(GET_SESSION);
  const [login] = useMutation(LOGIN);
  const [register] = useMutation(REGISTER);
  const [getMe] = useLazyQuery(ME);

  useEffect(() => {
    const token = localStorage.getItem('slido_auth_token');
    if (token) {
      getMe({ variables: { token } }).then((result) => {
        const data = result.data as MeData | undefined;
        if (data?.me) setCurrentUser(data.me);
        else localStorage.removeItem('slido_auth_token');
      });
    }
  }, [getMe]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (authMode === 'login') {
        const { data } = await login({ variables: { email: authEmail, password: authPassword } }) as { data?: LoginData };
        if (!data) throw new Error('Authentication failed');
        localStorage.setItem('slido_auth_token', data.login.token);
        setCurrentUser(data.login.user);
      } else {
        const { data } = await register({ variables: { email: authEmail, password: authPassword, displayName: authName } }) as { data?: RegisterData };
        if (!data) throw new Error('Registration failed');
        localStorage.setItem('slido_auth_token', data.register.token);
        setCurrentUser(data.register.user);
      }
      setShowAuth(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('slido_auth_token');
    setCurrentUser(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setErrorMsg('');
    const codeFormatted = joinCode.trim().toUpperCase();

    if (!needsPasscode) {
      const { data: checkData } = await checkSession({ variables: { code: codeFormatted } }) as { data?: CheckSessionData };
      const info = checkData?.checkSession;
      if (!info?.exists) {
        setErrorMsg(`Session "${codeFormatted}" not found.`);
        return;
      }
      if (info.isPasswordProtected) {
        setNeedsPasscode(true);
        setErrorMsg('This session requires a passcode.');
        return;
      }
    }

    const { data } = await getSession({ variables: { code: codeFormatted, passcode: joinPasscode || null } }) as { data?: GetSessionData };
    if (data?.session) {
      router.push(`/session/${codeFormatted}`);
    } else {
      setErrorMsg(needsPasscode ? 'Incorrect passcode.' : `Session "${codeFormatted}" not found.`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;
    setErrorMsg('');
    const codeFormatted = newCode.trim().toUpperCase();
    const authToken = localStorage.getItem('slido_auth_token') || null;
    try {
      await createSession({ variables: { title: newTitle.trim(), code: codeFormatted, isModerated: false, passcode: newPasscode || null, authToken } });
      router.push(`/session/${codeFormatted}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create session');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-dots-pattern relative">
      <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
      <div className="relative z-10 max-w-md w-full space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3 animate-slide-up">
          <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>
            Live<span style={{ color: 'var(--accent)' }}>Topics</span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Real-time audience interaction
          </p>
        </div>

        {errorMsg && (
          <div className="animate-fade-in px-4 py-3 rounded-xl text-sm text-center" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {errorMsg}
          </div>
        )}

        {/* Auth panel */}
        {showAuth && !currentUser && (
          <div className="themed-card p-6 space-y-4 animate-slide-up" style={{ borderColor: 'var(--accent)', boxShadow: 'var(--glow)' }}>
            <div className="flex gap-2">
              {(['login', 'register'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAuthMode(mode)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: authMode === mode ? 'var(--accent)' : 'var(--bg-input)',
                    color: authMode === mode ? 'var(--bg)' : 'var(--text-muted)',
                  }}
                >
                  {mode === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === 'register' && (
                <input type="text" placeholder="Display Name" value={authName} onChange={(e) => setAuthName(e.target.value)} className="themed-input w-full" required />
              )}
              <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="themed-input w-full" required />
              <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="themed-input w-full" required />
              <button type="submit" className="themed-btn w-full">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {/* Main card */}
        <div className="themed-card p-6 space-y-6 animate-slide-up stagger-2">
          {/* Join */}
          <form onSubmit={handleJoin} className="space-y-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>Join a Session</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code e.g. AGENTNEWS"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="themed-input flex-1 uppercase tracking-widest font-mono text-sm"
              />
              <button type="submit" disabled={checking} className="themed-btn">
                {checking ? '...' : 'Join'}
              </button>
            </div>
            {needsPasscode && (
              <input type="password" placeholder="Session passcode" value={joinPasscode} onChange={(e) => setJoinPasscode(e.target.value)} className="themed-input w-full" />
            )}
          </form>

          <div className="relative flex items-center justify-center">
            <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
            <span className="px-3 text-xs uppercase tracking-wider font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-faint)', position: 'absolute' }}>or</span>
          </div>

          {/* Create */}
          <form onSubmit={handleCreate} className="space-y-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>Create New Session</h2>
            <input type="text" placeholder="Session Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="themed-input w-full" />
            <input type="text" placeholder="Room Code" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="themed-input w-full uppercase tracking-widest font-mono text-sm" />
            <input type="password" placeholder="Passcode (optional)" value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} className="themed-input w-full" />
            <button type="submit" disabled={creating} className="themed-btn-ghost w-full">
              {creating ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>
        <div className="flex items-center justify-center gap-4 pt-2 animate-fade-in">
          <Link href="/docs" className="text-xs font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>Docs</Link>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: 'var(--accent)' }}>{currentUser.displayName}</span>
              <button onClick={handleLogout} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(!showAuth)} className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
