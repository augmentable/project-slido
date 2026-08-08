'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';

const CREATE_SESSION = gql`
  mutation CreateSession($title: String!, $code: String!, $isModerated: Boolean, $passcode: String, $authToken: String) {
    createSession(title: $title, code: $code, isModerated: $isModerated, passcode: $passcode, authToken: $authToken) {
      id title code
    }
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

export default function HomePage() {
  const router = useRouter();

  const [joinCode, setJoinCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [isModerated, setIsModerated] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [needsPasscode, setNeedsPasscode] = useState(false);

  // Auth state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; displayName: string; email: string } | null>(null);

  const [createSession, { loading: creating }] = useMutation(CREATE_SESSION);
  const [getSession, { loading: checking }] = useLazyQuery(GET_SESSION);
  const [login] = useMutation(LOGIN);
  const [register] = useMutation(REGISTER);
  const [getMe] = useLazyQuery(ME);

  useEffect(() => {
    const token = localStorage.getItem('slido_auth_token');
    if (token) {
      getMe({ variables: { token } }).then(({ data }) => {
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
        const { data } = await login({ variables: { email: authEmail, password: authPassword } });
        localStorage.setItem('slido_auth_token', data.login.token);
        setCurrentUser(data.login.user);
      } else {
        const { data } = await register({ variables: { email: authEmail, password: authPassword, displayName: authName } });
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

    const { data } = await getSession({
      variables: { code: codeFormatted, passcode: joinPasscode || null },
    });

    if (data?.session) {
      router.push(`/session/${codeFormatted}`);
    } else if (!needsPasscode) {
      setNeedsPasscode(true);
      setErrorMsg('This session may require a passcode.');
    } else {
      setErrorMsg(`Session with code "${codeFormatted}" not found or incorrect passcode.`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;

    setErrorMsg('');
    const codeFormatted = newCode.trim().toUpperCase();
    const authToken = localStorage.getItem('slido_auth_token') || null;

    try {
      await createSession({
        variables: {
          title: newTitle.trim(),
          code: codeFormatted,
          isModerated,
          passcode: newPasscode || null,
          authToken,
        },
      });
      router.push(`/session/${codeFormatted}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create session');
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* User bar */}
        <div className="flex justify-end">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                <span className="text-indigo-400 font-medium">{currentUser.displayName}</span>
              </span>
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-300 font-mono">Logout</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(!showAuth)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
            >
              Sign in / Register
            </button>
          )}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-400">
            Live Q&A
          </h1>
          <p className="text-slate-400 text-sm">
            Real-time audience interaction &mdash; Q&A, Polls, Quizzes &amp; Surveys
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        {/* Auth Modal */}
        {showAuth && !currentUser && (
          <div className="bg-slate-800/90 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${authMode === 'register' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Register
              </button>
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Display Name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
          {/* Join Session */}
          <form onSubmit={handleJoin} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Join a Session</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Code (e.g. SLIDODEV)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider font-mono text-sm"
              />
              <button
                type="submit"
                disabled={checking}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {checking ? 'Checking...' : 'Join'}
              </button>
            </div>
            {needsPasscode && (
              <input
                type="password"
                placeholder="Session passcode"
                value={joinPasscode}
                onChange={(e) => setJoinPasscode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            )}
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-700 w-full" />
            <span className="bg-slate-800 px-3 text-xs text-slate-500 uppercase font-mono">Or</span>
          </div>

          {/* Create Session */}
          <form onSubmit={handleCreate} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Create New Session</h2>
            <input
              type="text"
              placeholder="Session Title (e.g. Tech Talk)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="text"
              placeholder="Custom Room Code (e.g. SLIDODEV)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider font-mono text-sm"
            />
            <input
              type="password"
              placeholder="Session passcode (optional)"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={isModerated}
                onChange={(e) => setIsModerated(e.target.checked)}
                className="rounded border-slate-600 accent-indigo-500"
              />
              Enable Q&A moderation
            </label>
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
