import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link, useParams } from 'react-router';
import { DisplayControls } from '@/components/DisplayControls';
import { RoomCode } from '@/components/RoomCode';
import { SaturdayBanner } from '@/components/SaturdayBanner';
import { LinkifiedText } from '@/lib/linkify';

const GET_SESSION = gql`
  query GetSession($code: String!) {
    session(code: $code) {
      id title code primaryColor logoUrl pollsEnabled quizzesEnabled saturdayBannerEnabled
      questions { id title text authorName isHighlighted isAnswered upvoteCount downvoteCount score createdAt }
      polls { id type question isActive responseCount options { id text position voteCount } }
      quizzes { id title isActive currentQuestionIndex questions { id text timeLimit position options { id text position } } }
    }
  }
`;

type View = 'qa' | 'poll' | 'quiz';

export default function PresenterPage() {
  const { code } = useParams<{ code: string }>();
  const [view, setView] = useState<View>('qa');
  const [qrCollapsed, setQrCollapsed] = useState(false);

  const { data } = useQuery(GET_SESSION, { variables: { code: code!.toUpperCase() }, pollInterval: 3000 });
  const session = (data as { session?: Record<string, unknown> })?.session as {
    title: string; code: string; primaryColor?: string; logoUrl?: string;
    pollsEnabled?: boolean; quizzesEnabled?: boolean; saturdayBannerEnabled?: boolean;
    questions: { id: string; title: string; text: string; authorName: string | null; isHighlighted: boolean; isAnswered: boolean; upvoteCount: number; downvoteCount: number; score?: number }[];
    polls: { id: string; type: string; question: string; isActive: boolean; responseCount: number; options: { id: string; text: string; position: number; voteCount: number }[] }[];
    quizzes: { id: string; title: string; isActive: boolean; currentQuestionIndex: number; questions: { id: string; text: string; timeLimit: number; position: number; options: { id: string; text: string; position: number }[] }[] }[];
  } | undefined;

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse-glow w-4 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
      </main>
    );
  }

  const brandColor = session.primaryColor || 'var(--accent)';
  const sortedQuestions = [...(session.questions || [])]
    .filter((q) => !q.isHighlighted)
    .sort((a, b) => {
      const aScore = a.score ?? a.upvoteCount - a.downvoteCount;
      const bScore = b.score ?? b.upvoteCount - b.downvoteCount;
      return bScore - aScore;
    });
  const highlighted = (session.questions || []).filter((q) => q.isHighlighted);
  const activePoll = session.polls?.find((p) => p.isActive);
  const activeQuiz = session.quizzes?.find((q) => q.isActive);
  const pollsEnabled = session.pollsEnabled === true;
  const quizzesEnabled = session.quizzesEnabled === true;
  const currentView: View = view === 'poll' && !pollsEnabled ? 'qa' : view === 'quiz' && !quizzesEnabled ? 'qa' : view;
  const viewTabs: View[] = ['qa'];
  if (pollsEnabled) viewTabs.push('poll');
  if (quizzesEnabled) viewTabs.push('quiz');

  return (
    <main className="min-h-dvh lg:h-screen overflow-x-hidden lg:overflow-hidden flex flex-col lg:flex-row" style={{ background: 'var(--bg)', color: 'var(--text-strong)' }}>
      <aside
        className={`shrink-0 flex items-center justify-center w-full py-4 px-4 border-b lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:py-8 lg:pr-8 lg:pl-16 ${qrCollapsed ? 'lg:w-[240px]' : 'lg:w-[480px]'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <RoomCode code={session.code} size="xl" layout="stack" collapsible onCollapsedChange={setQrCollapsed} />
      </aside>
      <section className="min-w-0 flex-1 h-full overflow-y-auto p-4 md:p-8">
        <SaturdayBanner code={session.code} enabled={session.saturdayBannerEnabled ?? true} />
        <div className="flex flex-wrap items-center gap-3 lg:gap-4 mb-6 lg:mb-8 animate-fade-in">
          <div className="flex items-center gap-4 min-w-0">
            {session.logoUrl && (
              <img src={session.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <Link to={`/session/${code}`} className="text-xs font-medium tracking-wider uppercase hover:underline" style={{ color: 'var(--accent)' }}>&larr; Session</Link>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: brandColor }}>{session.title}</h1>
            </div>
          </div>
          {viewTabs.length > 1 && (
            <div className="flex gap-2 shrink-0">
              {viewTabs.map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: currentView === v ? brandColor : 'var(--bg-raised)', color: currentView === v ? 'var(--bg)' : 'var(--text-muted)' }}>
                  {v === 'qa' ? 'Topics' : v === 'poll' ? 'Poll' : 'Quiz'}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto shrink-0 self-start">
            <DisplayControls compact align="right" showTheme={false} />
          </div>
        </div>

      {currentView === 'qa' && (
        <div className="flex-1 space-y-4 overflow-auto">
          {highlighted.map((q) => (
            <div key={q.id} className="border-2 p-6 rounded-2xl animate-slide-up" style={{ borderColor: brandColor, background: 'var(--accent-subtle)' }}>
              <p className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-relaxed">{q.title}</p>
              {q.text.trim() && <LinkifiedText text={q.text} className="text-xl leading-relaxed mt-3" style={{ color: 'var(--text-muted)' }} />}
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg" style={{ color: 'var(--text-muted)' }}>{q.authorName || 'Anonymous'}</span>
                <span className="text-3xl font-bold leading-none font-mono" style={{ color: brandColor }}>{q.upvoteCount - q.downvoteCount}</span>
              </div>
            </div>
          ))}
          {sortedQuestions.slice(0, 8).map((q, i) => (
            <div key={q.id} className={`themed-card p-5 flex items-start sm:items-center gap-4 sm:gap-6 animate-fade-in stagger-${Math.min(i + 1, 6)}`} style={{ fontSize: i === 0 ? '1.25rem' : '1.125rem' }}>
              <div className="flex items-center justify-end min-w-20 font-mono" style={{ color: brandColor }}>
                <span className="text-3xl font-bold leading-none">{q.upvoteCount - q.downvoteCount}</span>
              </div>
              <div className="flex-1">
                <p className="text-xl sm:text-2xl lg:text-3xl font-semibold leading-relaxed">{q.title}</p>
                {q.text.trim() && <LinkifiedText text={q.text} className="text-lg leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }} />}
                <span className="text-base mt-1 block" style={{ color: 'var(--text-faint)' }}>
                  {q.authorName || 'Anonymous'}
                  {q.isAnswered && <span className="ml-2" style={{ color: 'var(--success)' }}>Answered</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentView === 'poll' && (
        <div className="flex-1 flex items-center justify-center">
          {activePoll ? (
            <div className="w-full max-w-3xl space-y-6 animate-slide-up">
              <h2 className="text-3xl font-bold text-center">{activePoll.question}</h2>
              <div className="space-y-4 mt-8">
                {(() => {
                  const totalVotes = activePoll.options?.reduce((s, o) => s + o.voteCount, 0) || 1;
                  return [...(activePoll.options || [])].sort((a, b) => a.position - b.position).map((opt) => {
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

      {currentView === 'quiz' && (
        <div className="flex-1 flex items-center justify-center">
          {activeQuiz && activeQuiz.currentQuestionIndex >= 0 ? (
            <div className="w-full max-w-3xl text-center space-y-8 animate-slide-up">
              <p className="font-mono" style={{ color: 'var(--text-faint)' }}>Question {activeQuiz.currentQuestionIndex + 1} of {activeQuiz.questions.length}</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{activeQuiz.questions[activeQuiz.currentQuestionIndex]?.text}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {[...(activeQuiz.questions[activeQuiz.currentQuestionIndex]?.options || [])].sort((a, b) => a.position - b.position).map((opt, i) => {
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
      </section>
    </main>
  );
}
