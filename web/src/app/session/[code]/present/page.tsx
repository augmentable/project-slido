'use client';

import { use, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const GET_SESSION = gql`
  query GetSession($code: String!) {
    session(code: $code) {
      id title code primaryColor logoUrl
      questions { id text authorName isHighlighted isAnswered upvoteCount createdAt }
      polls { id type question isActive responseCount options { id text position voteCount } }
      quizzes { id title isActive currentQuestionIndex questions { id text timeLimit position options { id text position } } }
    }
  }
`;

type View = 'qa' | 'poll' | 'quiz';

export default function PresenterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [view, setView] = useState<View>('qa');

  const { data } = useQuery(GET_SESSION, { variables: { code: code.toUpperCase() }, pollInterval: 3000 });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = data?.session;

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse-glow w-4 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
      </main>
    );
  }

  const brandColor = session.primaryColor || 'var(--accent)';
  const sortedQuestions = [...(session.questions || [])]
    .filter((q: { isHighlighted: boolean }) => !q.isHighlighted)
    .sort((a: { upvoteCount: number }, b: { upvoteCount: number }) => b.upvoteCount - a.upvoteCount);
  const highlighted = (session.questions || []).filter((q: { isHighlighted: boolean }) => q.isHighlighted);
  const activePoll = session.polls?.find((p: { isActive: boolean }) => p.isActive);
  const activeQuiz = session.quizzes?.find((q: { isActive: boolean }) => q.isActive);

  return (
    <main className="min-h-screen p-8 flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-strong)' }}>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div className="flex items-center gap-4">
          {session.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: brandColor }}>{session.title}</h1>
            <p className="text-lg font-mono mt-1" style={{ color: 'var(--text-faint)' }}>Code: <span className="font-bold" style={{ color: 'var(--text-strong)' }}>{session.code}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['qa', 'poll', 'quiz'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: view === v ? brandColor : 'var(--bg-raised)', color: view === v ? 'var(--bg)' : 'var(--text-muted)' }}>
              {v === 'qa' ? 'Q&A' : v === 'poll' ? 'Poll' : 'Quiz'}
            </button>
          ))}
        </div>
      </div>

      {view === 'qa' && (
        <div className="flex-1 space-y-4 overflow-auto">
          {highlighted.map((q: { id: string; text: string; authorName: string | null; upvoteCount: number }) => (
            <div key={q.id} className="border-2 p-6 rounded-2xl animate-slide-up" style={{ borderColor: brandColor, background: 'var(--accent-subtle)' }}>
              <p className="text-2xl font-semibold leading-relaxed">{q.text}</p>
              <div className="flex items-center justify-between mt-3">
                <span style={{ color: 'var(--text-muted)' }}>{q.authorName || 'Anonymous'}</span>
                <span className="text-xl font-bold font-mono" style={{ color: brandColor }}>▲ {q.upvoteCount}</span>
              </div>
            </div>
          ))}
          {sortedQuestions.slice(0, 8).map((q: { id: string; text: string; authorName: string | null; upvoteCount: number; isAnswered: boolean }, i: number) => (
            <div key={q.id} className={`themed-card p-5 flex items-center gap-6 animate-fade-in stagger-${Math.min(i + 1, 6)}`} style={{ fontSize: i === 0 ? '1.25rem' : '1.125rem' }}>
              <div className="flex flex-col items-center min-w-16" style={{ color: brandColor }}>
                <span className="text-sm">▲</span>
                <span className="text-2xl font-bold font-mono">{q.upvoteCount}</span>
              </div>
              <div className="flex-1">
                <p className="leading-relaxed">{q.text}</p>
                <span className="text-sm mt-1 block" style={{ color: 'var(--text-faint)' }}>
                  {q.authorName || 'Anonymous'}
                  {q.isAnswered && <span className="ml-2" style={{ color: 'var(--success)' }}>Answered</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'poll' && (
        <div className="flex-1 flex items-center justify-center">
          {activePoll ? (
            <div className="w-full max-w-3xl space-y-6 animate-slide-up">
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
                          <span className="font-mono font-bold">{pct}% <span className="text-sm" style={{ color: 'var(--text-faint)' }}>({opt.voteCount})</span></span>
                        </div>
                        <div className="h-8 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                          <div className="h-full bar-fill rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="text-center font-mono text-sm mt-4" style={{ color: 'var(--text-faint)' }}>{activePoll.responseCount} total votes</p>
            </div>
          ) : (
            <p className="text-2xl" style={{ color: 'var(--text-faint)' }}>No active poll</p>
          )}
        </div>
      )}

      {view === 'quiz' && (
        <div className="flex-1 flex items-center justify-center">
          {activeQuiz && activeQuiz.currentQuestionIndex >= 0 ? (
            <div className="w-full max-w-3xl text-center space-y-8 animate-slide-up">
              <p className="font-mono" style={{ color: 'var(--text-faint)' }}>Question {activeQuiz.currentQuestionIndex + 1} of {activeQuiz.questions.length}</p>
              <h2 className="text-4xl font-bold">{activeQuiz.questions[activeQuiz.currentQuestionIndex]?.text}</h2>
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[...(activeQuiz.questions[activeQuiz.currentQuestionIndex]?.options || [])].sort((a: {position: number}, b: {position: number}) => a.position - b.position).map((opt: { id: string; text: string }, i: number) => {
                  const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];
                  return <div key={opt.id} className="py-6 px-8 rounded-xl text-xl font-bold text-white" style={{ backgroundColor: colors[i % 4] }}>{opt.text}</div>;
                })}
              </div>
            </div>
          ) : (
            <p className="text-2xl" style={{ color: 'var(--text-faint)' }}>{activeQuiz ? 'Quiz finished!' : 'No active quiz'}</p>
          )}
        </div>
      )}
    </main>
  );
}
