'use client';

import { useState, use } from 'react';
import { gql } from '@apollo/client';
import Link from 'next/link';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';

// 1. GraphQL Operations
const GET_SESSION_DETAILS = gql`
  query GetSessionDetails($code: String!) {
    session(code: $code) {
      id
      title
      code
      questions {
        id
        text
        upvoteCount
        createdAt
      }
    }
  }
`;

const CREATE_QUESTION = gql`
  mutation CreateQuestion($sessionId: String!, $text: String!) {
    createQuestion(sessionId: $sessionId, text: $text) {
      id
      text
      upvoteCount
      createdAt
    }
  }
`;

const UPVOTE_QUESTION = gql`
  mutation UpvoteQuestion($questionId: String!, $voterToken: String!) {
    upvoteQuestion(questionId: $questionId, voterToken: $voterToken) {
      id
      upvoteCount
    }
  }
`;

const QUESTION_UPVOTED_SUBSCRIPTION = gql`
  subscription OnQuestionUpvoted($sessionId: String!) {
    questionUpvoted(sessionId: $sessionId) {
      id
      text
      upvoteCount
    }
  }
`;

const NEW_QUESTION_SUBSCRIPTION = gql`
  subscription OnQuestionCreated($sessionId: String!) {
    questionCreated(sessionId: $sessionId) {
      id
      text
      upvoteCount
      createdAt
    }
  }
`;

export default function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  // Unwrap Next.js 15 params promise
  const { code } = use(params);
  console.log(code);

  const [voterToken] = useState(() => {
    let token = localStorage.getItem('slido_voter_token');
    if (!token) {
      token = 'voter_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('slido_voter_token', token);
    }
    return token;
  });
  const [questionText, setQuestionText] = useState('');

  // 2. Fetch Initial Session & Questions
  const { data, loading, error, refetch } = useQuery(GET_SESSION_DETAILS, {
    variables: { code: code.toUpperCase() },
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = data?.session;

  // 3. Setup WebSocket Subscription for Live Upvote Updates
  useSubscription(QUESTION_UPVOTED_SUBSCRIPTION, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => {
      // Refresh question list on incoming live subscription event
      refetch();
    },
  });

  useSubscription(NEW_QUESTION_SUBSCRIPTION, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });

  // 4. Mutations
  const [createQuestion, { loading: posting }] = useMutation(CREATE_QUESTION, {
    onCompleted: () => {
      setQuestionText('');
      refetch();
    },
  });

  const [upvoteQuestion] = useMutation(UPVOTE_QUESTION, {
    onCompleted: () => refetch(),
  });

  const handlePostQuestion = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !session?.id) return;

    createQuestion({
      variables: {
        sessionId: session.id,
        text: questionText.trim(),
      },
    });
  };

  const handleUpvote = (questionId: string) => {
    if (!voterToken) return;

    upvoteQuestion({
      variables: {
        questionId,
        voterToken,
      },
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-mono">Loading session...</p>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-red-400">Session not found or server error.</p>
        <Link
          href="/"
          className="text-indigo-400 hover:underline text-sm font-medium"
        >
          ← Back to Home
        </Link>
      </main>
    );
  }

  // Sort questions by upvote count descending
  const sortedQuestions = [...(session.questions || [])].sort(
    (a, b) => b.upvoteCount - a.upvoteCount,
  );

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <Link
              href="/"
              className="text-xs text-indigo-400 hover:underline font-mono uppercase tracking-wider"
            >
              ← Leave Session
            </Link>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              {session.title}
            </h1>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-right">
            <span className="text-xs text-slate-400 block font-mono">
              ROOM CODE
            </span>
            <span className="text-sm font-bold font-mono text-indigo-400">
              {session.code}
            </span>
          </div>
        </div>

        {/* Post Question Form */}
        <form
          onSubmit={handlePostQuestion}
          className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-3"
        >
          <textarea
            rows={3}
            placeholder="Ask a question..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={posting || !questionText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Ask Question'}
            </button>
          </div>
        </form>

        {/* Questions List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-300 flex items-center justify-between">
            <span>Questions</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              {sortedQuestions.length} total
            </span>
          </h2>

          {sortedQuestions.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm">
              No questions yet. Be the first to ask!
            </div>
          ) : (
            sortedQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-slate-800/90 border border-slate-700/60 p-4 rounded-xl flex items-start justify-between gap-4 transition-all hover:border-slate-600"
              >
                <p className="text-slate-200 text-sm leading-relaxed flex-1 pt-1">
                  {q.text}
                </p>

                {/* Upvote Button */}
                <button
                  onClick={() => handleUpvote(q.id)}
                  className="flex flex-col items-center justify-center bg-slate-900 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-500/50 text-indigo-400 px-3 py-2 rounded-lg transition-all min-w-13"
                >
                  <span className="text-xs">▲</span>
                  <span className="text-xs font-bold font-mono">
                    {q.upvoteCount}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
