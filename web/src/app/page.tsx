'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';

const CREATE_SESSION = gql`
  mutation CreateSession($title: String!, $code: String!) {
    createSession(title: $title, code: $code) {
      id
      title
      code
    }
  }
`;

const GET_SESSION = gql`
  query GetSession($code: String!) {
    session(code: $code) {
      id
      code
      title
    }
  }
`;

export default function HomePage() {
  const router = useRouter();

  // Form states
  const [joinCode, setJoinCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [createSession, { loading: creating }] = useMutation(CREATE_SESSION);
  const [getSession, { loading: checking }] = useLazyQuery(GET_SESSION);

  // Handle joining a session
  const handleJoin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setErrorMsg('');
    const codeFormatted = joinCode.trim().toUpperCase();

    const { data } = await getSession({ variables: { code: codeFormatted } });

    console.log(data);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (data?.session) {
      router.push(`/session/${codeFormatted}`);
    } else {
      setErrorMsg(`Session with code "${codeFormatted}" not found.`);
    }
  };

  // Handle creating a new session
  const handleCreate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;

    setErrorMsg('');
    const codeFormatted = newCode.trim().toUpperCase();

    try {
      await createSession({
        variables: {
          title: newTitle.trim(),
          code: codeFormatted,
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
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-400">
            Live Q&A
          </h1>
          <p className="text-slate-400 text-sm">
            Real-time audience interaction powered by GraphQL
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
          {/* Join Session Form */}
          <form onSubmit={handleJoin} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">
              Join a Session
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Code (e.g. SLIDO123)"
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
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-700 w-full" />
            <span className="bg-slate-800 px-3 text-xs text-slate-500 uppercase font-mono">
              Or
            </span>
          </div>

          {/* Create Session Form */}
          <form onSubmit={handleCreate} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">
              Create New Session
            </h2>
            <input
              type="text"
              placeholder="Session Title (e.g. Tech Talk)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="text"
              placeholder="Custom Room Code (e.g. SLIDO123)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider font-mono text-sm"
            />
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
