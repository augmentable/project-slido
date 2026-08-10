'use client';

import { useState, use } from 'react';
import { gql } from '@apollo/client';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { PollCreator } from '@/components/polls/PollCreator';
import { PollCard } from '@/components/polls/PollCard';
import { QuizCreator } from '@/components/quiz/QuizCreator';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';
import { SurveyCreator } from '@/components/survey/SurveyCreator';
import { SurveyCard } from '@/components/survey/SurveyCard';
import { ThemePicker } from '@/components/ThemePicker';
import { useTheme } from '@/components/ThemeProvider';

const GET_SESSION_DETAILS = gql`
  query GetSessionDetails($code: String!) {
    session(code: $code) {
      id title code isModerated primaryColor logoUrl
      owner { id displayName }
      questions {
        id text authorName isApproved isHighlighted isAnswered upvoteCount createdAt
        replies { id text authorName createdAt }
      }
      polls { id type question isActive options { id text position voteCount } }
      quizzes { id title isActive currentQuestionIndex questions { id text timeLimit position options { id text position } } }
      surveys { id title isOpen questions { id type text position isRequired options { id text position } } }
    }
  }
`;

const GET_PENDING_QUESTIONS = gql`
  query GetPendingQuestions($sessionId: String!) {
    pendingQuestions(sessionId: $sessionId) { id text authorName createdAt }
  }
`;

const CREATE_QUESTION = gql`
  mutation CreateQuestion($sessionId: String!, $text: String!, $authorName: String) {
    createQuestion(sessionId: $sessionId, text: $text, authorName: $authorName) { id text authorName upvoteCount createdAt }
  }
`;

const UPVOTE_QUESTION = gql`
  mutation UpvoteQuestion($questionId: String!, $voterToken: String!) {
    upvoteQuestion(questionId: $questionId, voterToken: $voterToken) { id upvoteCount }
  }
`;

const APPROVE_QUESTION = gql`mutation ApproveQuestion($questionId: String!) { approveQuestion(questionId: $questionId) { id isApproved } }`;
const REJECT_QUESTION = gql`mutation RejectQuestion($questionId: String!) { rejectQuestion(questionId: $questionId) }`;
const HIGHLIGHT_QUESTION = gql`mutation HighlightQuestion($questionId: String!, $highlighted: Boolean!) { highlightQuestion(questionId: $questionId, highlighted: $highlighted) { id isHighlighted } }`;
const MARK_ANSWERED = gql`mutation MarkAnswered($questionId: String!, $answered: Boolean!) { markAsAnswered(questionId: $questionId, answered: $answered) { id isAnswered } }`;
const REPLY_TO_QUESTION = gql`mutation ReplyToQuestion($questionId: String!, $text: String!, $authorName: String!) { replyToQuestion(questionId: $questionId, text: $text, authorName: $authorName) { id text authorName createdAt } }`;

type Tab = 'qa' | 'polls' | 'quiz' | 'surveys';
type SortMode = 'popular' | 'recent' | 'unanswered';

export default function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { theme, setTheme } = useTheme();

  const [voterToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    let token = localStorage.getItem('slido_voter_token');
    if (!token) { token = crypto.randomUUID(); localStorage.setItem('slido_voter_token', token); }
    return token;
  });

  const [activeTab, setActiveTab] = useState<Tab>('qa');
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [questionText, setQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showModeration, setShowModeration] = useState(false);
  const [showCreators, setShowCreators] = useState<Record<string, boolean>>({});

  const { data, loading, error, refetch } = useQuery(GET_SESSION_DETAILS, {
    variables: { code: code.toUpperCase() },
    pollInterval: 3000,
    notifyOnNetworkStatusChange: false,
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = data?.session;

  const { data: pendingData, refetch: refetchPending } = useQuery(GET_PENDING_QUESTIONS, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id || !session?.isModerated,
    pollInterval: 5000,
  });
  const pendingQuestions = pendingData?.pendingQuestions || [];

  const [createQuestion, { loading: posting }] = useMutation(CREATE_QUESTION, { onCompleted: () => { setQuestionText(''); refetch(); } });
  const [upvoteQuestion] = useMutation(UPVOTE_QUESTION, { onCompleted: () => refetch() });
  const [approveQuestion] = useMutation(APPROVE_QUESTION, { onCompleted: () => { refetch(); refetchPending(); } });
  const [rejectQuestion] = useMutation(REJECT_QUESTION, { onCompleted: () => { refetch(); refetchPending(); } });
  const [highlightQuestion] = useMutation(HIGHLIGHT_QUESTION, { onCompleted: () => refetch() });
  const [markAnswered] = useMutation(MARK_ANSWERED, { onCompleted: () => refetch() });
  const [replyToQuestion] = useMutation(REPLY_TO_QUESTION, { onCompleted: () => refetch() });

  if (loading && !data) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="animate-pulse-glow w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--gradient-hero)' }}>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>Session not found or server error.</p>
        <Link href="/" className="text-sm mt-4 hover:underline" style={{ color: 'var(--accent)' }}>&larr; Back to Home</Link>
      </main>
    );
  }

  const highlighted = [...(session.questions || [])].filter((q: { isHighlighted: boolean }) => q.isHighlighted);

  type QType = { id: string; text: string; authorName: string | null; isAnswered: boolean; upvoteCount: number; isHighlighted: boolean; createdAt: string; replies: { id: string; text: string; authorName: string; createdAt: string }[] };

  const sortedQuestions = [...(session.questions || [])]
    .filter((q: QType) => !q.isHighlighted)
    .sort((a: QType, b: QType) => {
      if (sortMode === 'popular') return b.upvoteCount - a.upvoteCount;
      if (sortMode === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortMode === 'unanswered') {
        if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
        return b.upvoteCount - a.upvoteCount;
      }
      return 0;
    });

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'qa', label: 'Q&A', count: session.questions?.length || 0 },
    { key: 'polls', label: 'Polls', count: session.polls?.length || 0 },
    { key: 'quiz', label: 'Quiz', count: session.quizzes?.length || 0 },
    { key: 'surveys', label: 'Surveys', count: session.surveys?.length || 0 },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-2xl w-full space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between pb-4 animate-fade-in" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/" className="text-xs font-medium tracking-wider uppercase hover:underline" style={{ color: 'var(--accent)' }}>&larr; Leave</Link>
              <Link href={`/session/${code}/analytics`} className="text-xs tracking-wider uppercase hover:underline" style={{ color: 'var(--text-muted)' }}>Analytics</Link>
              <Link href={`/session/${code}/present`} className="text-xs tracking-wider uppercase hover:underline" style={{ color: 'var(--success)' }}>Present</Link>
            </div>
            <div className="flex items-center gap-3">
              {session.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
              )}
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>{session.title}</h1>
                {session.owner && <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Hosted by {session.owner.displayName}</p>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ThemePicker current={theme} onChange={setTheme} />
            <div className="themed-card px-3 py-1.5 text-right" style={{ borderRadius: '10px' }}>
              <span className="text-[10px] block font-medium tracking-wider uppercase" style={{ color: 'var(--text-faint)' }}>Room Code</span>
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>{session.code}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl animate-fade-in stagger-1" style={{ background: 'var(--bg-raised)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.key ? 'var(--bg)' : 'var(--text-muted)',
              }}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] font-mono opacity-70">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Q&A Tab */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            {session.isModerated && (
              <button onClick={() => setShowModeration(!showModeration)} className="text-xs font-medium" style={{ color: 'var(--warning)' }}>
                {showModeration ? 'Hide' : 'Show'} Moderation Queue ({pendingQuestions.length} pending)
              </button>
            )}

            {showModeration && pendingQuestions.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl animate-fade-in" style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--warning)' }}>Pending Approval</h3>
                {pendingQuestions.map((q: { id: string; text: string; authorName: string | null }) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text)' }}>{q.text}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{q.authorName || 'Anonymous'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveQuestion({ variables: { questionId: q.id } })} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--success)', background: 'var(--success-subtle)' }}>Approve</button>
                      <button onClick={() => rejectQuestion({ variables: { questionId: q.id } })} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--danger)', background: 'var(--danger-subtle)' }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Post Question Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!questionText.trim() || !session?.id) return;
                createQuestion({ variables: { sessionId: session.id, text: questionText.trim(), authorName: authorName.trim() || null } });
              }}
              className="themed-card p-4 space-y-3 animate-slide-up stagger-2"
            >
              <textarea
                rows={3}
                placeholder="Ask a question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="themed-input w-full resize-none"
              />
              <div className="flex items-center gap-3">
                <input type="text" placeholder="Your name (optional)" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="themed-input flex-1" />
                <button type="submit" disabled={posting || !questionText.trim()} className="themed-btn">
                  {posting ? 'Posting...' : 'Ask'}
                </button>
              </div>
            </form>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Sort:</span>
              {(['popular', 'recent', 'unanswered'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: sortMode === mode ? 'var(--accent)' : 'var(--bg-raised)',
                    color: sortMode === mode ? 'var(--bg)' : 'var(--text-muted)',
                  }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Highlighted */}
            {highlighted.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                  &#9733; Highlighted
                </h3>
                {highlighted.map((q: QType) => (
                  <QuestionItem key={q.id} q={q}
                    onUpvote={() => upvoteQuestion({ variables: { questionId: q.id, voterToken } })}
                    onHighlight={() => highlightQuestion({ variables: { questionId: q.id, highlighted: !q.isHighlighted } })}
                    onMarkAnswered={() => markAnswered({ variables: { questionId: q.id, answered: !q.isAnswered } })}
                    onReply={(text: string, name: string) => replyToQuestion({ variables: { questionId: q.id, text, authorName: name } })}
                    isHighlighted
                  />
                ))}
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold flex items-center justify-between" style={{ color: 'var(--text)' }}>
                <span>Questions</span>
                <span className="text-xs font-normal font-mono" style={{ color: 'var(--text-faint)' }}>{sortedQuestions.length} total</span>
              </h2>
              {sortedQuestions.length === 0 ? (
                <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>
                  No questions yet. Be the first to ask!
                </div>
              ) : (
                sortedQuestions.map((q: QType, i: number) => (
                  <QuestionItem key={q.id} q={q} className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                    onUpvote={() => upvoteQuestion({ variables: { questionId: q.id, voterToken } })}
                    onHighlight={() => highlightQuestion({ variables: { questionId: q.id, highlighted: !q.isHighlighted } })}
                    onMarkAnswered={() => markAnswered({ variables: { questionId: q.id, answered: !q.isAnswered } })}
                    onReply={(text: string, name: string) => replyToQuestion({ variables: { questionId: q.id, text, authorName: name } })}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Polls Tab */}
        {activeTab === 'polls' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setShowCreators({ ...showCreators, poll: !showCreators.poll })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {showCreators.poll ? 'Hide Creator' : '+ Create Poll'}
            </button>
            {showCreators.poll && <PollCreator sessionId={session.id} onCreated={() => { refetch(); setShowCreators({ ...showCreators, poll: false }); }} />}
            {session.polls?.length === 0 ? (
              <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>No polls yet.</div>
            ) : (
              session.polls?.map((poll: { id: string }) => <PollCard key={poll.id} poll={poll} voterToken={voterToken} isCreator />)
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setShowCreators({ ...showCreators, quiz: !showCreators.quiz })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {showCreators.quiz ? 'Hide Creator' : '+ Create Quiz'}
            </button>
            {showCreators.quiz && <QuizCreator sessionId={session.id} onCreated={() => { refetch(); setShowCreators({ ...showCreators, quiz: false }); }} />}
            {session.quizzes?.length === 0 ? (
              <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>No quizzes yet.</div>
            ) : (
              session.quizzes?.map((quiz: { id: string }) => <QuizPlayer key={quiz.id} quiz={quiz} voterToken={voterToken} isCreator />)
            )}
          </div>
        )}

        {/* Surveys Tab */}
        {activeTab === 'surveys' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setShowCreators({ ...showCreators, survey: !showCreators.survey })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {showCreators.survey ? 'Hide Creator' : '+ Create Survey'}
            </button>
            {showCreators.survey && <SurveyCreator sessionId={session.id} onCreated={() => { refetch(); setShowCreators({ ...showCreators, survey: false }); }} />}
            {session.surveys?.length === 0 ? (
              <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>No surveys yet.</div>
            ) : (
              session.surveys?.map((survey: { id: string }) => <SurveyCard key={survey.id} survey={survey} voterToken={voterToken} isCreator />)
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function QuestionItem({
  q, onUpvote, onHighlight, onMarkAnswered, onReply, isHighlighted, className = '',
}: {
  q: { id: string; text: string; authorName: string | null; isAnswered: boolean; upvoteCount: number; isHighlighted: boolean; replies?: { id: string; text: string; authorName: string; createdAt: string }[] };
  onUpvote: () => void; onHighlight: () => void; onMarkAnswered: () => void; onReply: (text: string, name: string) => void;
  isHighlighted?: boolean; className?: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');

  const borderStyle = isHighlighted
    ? { border: '1px solid var(--warning)', background: 'var(--warning-subtle)' }
    : q.isAnswered
    ? { border: '1px solid var(--success)', background: 'var(--success-subtle)' }
    : { border: '1px solid var(--border)', background: 'var(--gradient-card)' };

  return (
    <div className={`p-4 rounded-xl transition-all ${className}`} style={{ ...borderStyle, boxShadow: 'var(--shadow)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{q.text}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{q.authorName || 'Anonymous'}</span>
            {q.isAnswered && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--success)', background: 'var(--success-subtle)' }}>Answered</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <button onClick={onHighlight} className="text-[10px] transition-colors" style={{ color: 'var(--warning)' }} title="Highlight">
              {q.isHighlighted ? '★' : '☆'}
            </button>
            <button onClick={onMarkAnswered} className="text-[10px]" style={{ color: 'var(--success)' }} title="Mark answered">✓</button>
            <button onClick={() => setShowReplyForm(!showReplyForm)} className="text-[10px]" style={{ color: 'var(--accent-2)' }} title="Reply">↩</button>
          </div>
          <button
            onClick={onUpvote}
            className="flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all min-w-13"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--accent)' }}
          >
            <span className="text-xs">▲</span>
            <span className="text-xs font-bold font-mono">{q.upvoteCount}</span>
          </button>
        </div>
      </div>

      {q.replies && q.replies.length > 0 && (
        <div className="mt-3 ml-4 space-y-2 pl-3" style={{ borderLeft: '2px solid var(--border)' }}>
          {q.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{reply.authorName}</span>
              <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{reply.text}</p>
            </div>
          ))}
        </div>
      )}

      {showReplyForm && (
        <form className="mt-3 ml-4 flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!replyText.trim()) return;
          onReply(replyText.trim(), replyName.trim() || 'Host');
          setReplyText(''); setShowReplyForm(false);
        }}>
          <input type="text" placeholder="Name" value={replyName} onChange={(e) => setReplyName(e.target.value)} className="themed-input w-24 text-xs" style={{ padding: '6px 10px' }} />
          <input type="text" placeholder="Write a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="themed-input flex-1 text-xs" style={{ padding: '6px 10px' }} autoFocus />
          <button type="submit" className="themed-btn text-xs" style={{ padding: '6px 12px' }}>Reply</button>
        </form>
      )}
    </div>
  );
}
