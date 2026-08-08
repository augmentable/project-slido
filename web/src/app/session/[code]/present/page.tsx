'use client';

import { use, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useSubscription } from '@apollo/client/react';

const GET_SESSION = gql`
  query GetSession($code: String!) {
    session(code: $code) {
      id
      title
      code
      primaryColor
      logoUrl
      questions {
        id text authorName isHighlighted isAnswered upvoteCount createdAt
      }
      polls {
        id type question isActive responseCount
        options { id text position voteCount }
      }
      quizzes {
        id title isActive currentQuestionIndex
        questions { id text timeLimit position options { id text position } }
      }
    }
  }
`;

const POLL_UPDATED_SUB = gql`
  subscription OnPollUpdated($sessionId: String!) {
    pollUpdated(sessionId: $sessionId) { id isActive }
  }
`;

const QUESTION_SUB = gql`
  subscription OnNewQuestion($sessionId: String!) {
    questionCreated(sessionId: $sessionId) { id text authorName upvoteCount }
  }
`;

const UPVOTE_SUB = gql`
  subscription OnUpvote($sessionId: String!) {
    questionUpvoted(sessionId: $sessionId) { id upvoteCount }
  }
`;

type View = 'qa' | 'poll' | 'quiz';

export default function PresenterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [view, setView] = useState<View>('qa');

  const { data, refetch } = useQuery(GET_SESSION, {
    variables: { code: code.toUpperCase() },
    pollInterval: 3000,
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = data?.session;

  useSubscription(POLL_UPDATED_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });
  useSubscription(QUESTION_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });
  useSubscription(UPVOTE_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });

  if (!session) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl text-gray-500 font-mono">Loading...</p>
      </main>
    );
  }

  const brandColor = session.primaryColor || '#6366f1';
  const sortedQuestions = [...(session.questions || [])]
    .filter((q: { isHighlighted: boolean }) => !q.isHighlighted)
    .sort((a: { upvoteCount: number }, b: { upvoteCount: number }) => b.upvoteCount - a.upvoteCount);
  const highlighted = (session.questions || []).filter((q: { isHighlighted: boolean }) => q.isHighlighted);
  const activePoll = session.polls?.find((p: { isActive: boolean }) => p.isActive);
  const activeQuiz = session.quizzes?.find((q: { isActive: boolean }) => q.isActive);

  return (
    <main className="min-h-screen bg-black text-white p-8 flex flex-col" style={{ '--brand': brandColor } as React.CSSProperties}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {session.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-4xl font-bold" style={{ color: brandColor }}>{session.title}</h1>
            <p className="text-lg text-gray-500 font-mono mt-1">Join at slido.dev &mdash; Code: <span className="text-white font-bold">{session.code}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['qa', 'poll', 'quiz'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v ? 'text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
              style={view === v ? { backgroundColor: brandColor } : undefined}
            >
              {v === 'qa' ? 'Q&A' : v === 'poll' ? 'Poll' : 'Quiz'}
            </button>
          ))}
        </div>
      </div>

      {/* Q&A View */}
      {view === 'qa' && (
        <div className="flex-1 space-y-4 overflow-auto">
          {highlighted.map((q: { id: string; text: string; authorName: string | null; upvoteCount: number }) => (
            <div key={q.id} className="border-2 p-6 rounded-2xl" style={{ borderColor: brandColor, backgroundColor: `${brandColor}15` }}>
              <p className="text-2xl font-semibold leading-relaxed">{q.text}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-gray-400">{q.authorName || 'Anonymous'}</span>
                <span className="text-xl font-bold font-mono" style={{ color: brandColor }}>▲ {q.upvoteCount}</span>
              </div>
            </div>
          ))}
          {sortedQuestions.slice(0, 8).map((q: { id: string; text: string; authorName: string | null; upvoteCount: number; isAnswered: boolean }, i: number) => (
            <div key={q.id} className={`bg-gray-900 border border-gray-800 p-5 rounded-xl flex items-center gap-6 ${i === 0 ? 'text-xl' : 'text-lg'}`}>
              <div className="flex flex-col items-center min-w-16" style={{ color: brandColor }}>
                <span className="text-sm">▲</span>
                <span className="text-2xl font-bold font-mono">{q.upvoteCount}</span>
              </div>
              <div className="flex-1">
                <p className="leading-relaxed">{q.text}</p>
                <span className="text-sm text-gray-500 mt-1 block">
                  {q.authorName || 'Anonymous'}
                  {q.isAnswered && <span className="ml-2 text-green-400">Answered</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Poll View */}
      {view === 'poll' && (
        <div className="flex-1 flex items-center justify-center">
          {activePoll ? (
            <div className="w-full max-w-3xl space-y-6">
              <h2 className="text-3xl font-bold text-center">{activePoll.question}</h2>
              <div className="space-y-4 mt-8">
                {(() => {
                  const totalVotes = activePoll.options?.reduce((s: number, o: { voteCount: number }) => s + o.voteCount, 0) || 1;
                  return [...(activePoll.options || [])].sort((a: {position: number}, b: {position: number}) => a.position - b.position).map((opt: { id: string; text: string; voteCount: number }) => {
                    const pct = Math.round((opt.voteCount / totalVotes) * 100);
                    return (
                      <div key={opt.id} className="space-y-2">
                        <div className="flex justify-between text-lg">
                          <span>{opt.text}</span>
                          <span className="font-mono font-bold">{pct}% <span className="text-gray-500 text-sm">({opt.voteCount})</span></span>
                        </div>
                        <div className="h-8 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: brandColor }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="text-center text-gray-500 font-mono text-sm mt-4">{activePoll.responseCount} total votes</p>
            </div>
          ) : (
            <p className="text-2xl text-gray-600">No active poll</p>
          )}
        </div>
      )}

      {/* Quiz View */}
      {view === 'quiz' && (
        <div className="flex-1 flex items-center justify-center">
          {activeQuiz && activeQuiz.currentQuestionIndex >= 0 ? (
            <div className="w-full max-w-3xl text-center space-y-8">
              <p className="text-gray-500 font-mono">Question {activeQuiz.currentQuestionIndex + 1} of {activeQuiz.questions.length}</p>
              <h2 className="text-4xl font-bold">{activeQuiz.questions[activeQuiz.currentQuestionIndex]?.text}</h2>
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[...(activeQuiz.questions[activeQuiz.currentQuestionIndex]?.options || [])].sort((a: {position: number}, b: {position: number}) => a.position - b.position).map((opt: { id: string; text: string }, i: number) => {
                  const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];
                  return (
                    <div key={opt.id} className="py-6 px-8 rounded-xl text-xl font-bold text-white" style={{ backgroundColor: colors[i % 4] }}>
                      {opt.text}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-2xl text-gray-600">{activeQuiz ? 'Quiz finished!' : 'No active quiz'}</p>
          )}
        </div>
      )}
    </main>
  );
}
