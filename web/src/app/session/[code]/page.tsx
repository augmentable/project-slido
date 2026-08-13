'use client';

import { useState, use, useCallback, useEffect } from 'react';
import { gql } from '@apollo/client';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { PollCreator } from '@/components/polls/PollCreator';
import { PollCard } from '@/components/polls/PollCard';
import { QuizCreator } from '@/components/quiz/QuizCreator';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';
import { SurveyCreator } from '@/components/survey/SurveyCreator';
import { SurveyCard } from '@/components/survey/SurveyCard';
import { RoomCode } from '@/components/RoomCode';
import { SaturdayBanner } from '@/components/SaturdayBanner';
import { useSessionSocket } from '@/hooks/useSessionSocket';
import { clampQuestionTitle } from '@/lib/question-title';
import { QUESTION_REACTIONS } from '@/lib/question-reactions';
import { LinkifiedText } from '@/lib/linkify';

const GET_SESSION_DETAILS = gql`
  query GetSessionDetails($code: String!) {
    session(code: $code) {
      id title code isModerated primaryColor logoUrl pollsEnabled quizzesEnabled repliesEnabled surveysEnabled votesEnabled saturdayBannerEnabled reactionsEnabled
      owner { id displayName }
      questions {
        id title text authorName isApproved isHighlighted isAnswered upvoteCount downvoteCount score
        reactions { emoji count }
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
    pendingQuestions(sessionId: $sessionId) { id title text authorName createdAt }
  }
`;

const CREATE_QUESTION = gql`
  mutation CreateQuestion($sessionId: String!, $title: String!, $text: String, $authorName: String) {
    createQuestion(sessionId: $sessionId, title: $title, text: $text, authorName: $authorName) {
      id title text authorName upvoteCount downvoteCount score reactions { emoji count } createdAt
    }
  }
`;

const VOTE_QUESTION = gql`
  mutation VoteQuestion($questionId: String!, $voterToken: String!, $value: Int!) {
    voteQuestion(questionId: $questionId, voterToken: $voterToken, value: $value) {
      id upvoteCount downvoteCount score
    }
  }
`;

const REACT_TO_QUESTION = gql`
  mutation ReactToQuestion($questionId: String!, $voterToken: String!, $emoji: String!) {
    reactToQuestion(questionId: $questionId, voterToken: $voterToken, emoji: $emoji) {
      id reactions { emoji count }
    }
  }
`;

const APPROVE_QUESTION = gql`mutation ApproveQuestion($questionId: String!) { approveQuestion(questionId: $questionId) { id isApproved } }`;
const REJECT_QUESTION = gql`mutation RejectQuestion($questionId: String!) { rejectQuestion(questionId: $questionId) }`;
const HIGHLIGHT_QUESTION = gql`mutation HighlightQuestion($questionId: String!, $highlighted: Boolean!) { highlightQuestion(questionId: $questionId, highlighted: $highlighted) { id isHighlighted } }`;
const MARK_ANSWERED = gql`mutation MarkAnswered($questionId: String!, $answered: Boolean!) { markAsAnswered(questionId: $questionId, answered: $answered) { id isAnswered } }`;
const REPLY_TO_QUESTION = gql`mutation ReplyToQuestion($questionId: String!, $text: String!, $authorName: String!) { replyToQuestion(questionId: $questionId, text: $text, authorName: $authorName) { id text authorName createdAt } }`;

async function requestSuggestedQuestionTitle(text: string): Promise<string> {
  const response = await fetch('/api/title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const payload = await response.json().catch(() => ({})) as { title?: unknown; error?: unknown };
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Could not write a title');
  }
  if (typeof payload.title !== 'string' || !payload.title.trim()) {
    throw new Error('Could not write a title');
  }
  return payload.title.trim();
}

type Tab = 'qa' | 'polls' | 'quiz' | 'surveys';
type SortMode = 'popular' | 'recent' | 'unanswered';

export default function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

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
  const [titleGenerating, setTitleGenerating] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showCreators, setShowCreators] = useState<Record<string, boolean>>({});
  const [wsPostingQuestion, setWsPostingQuestion] = useState(false);
  const [qrCollapsed, setQrCollapsed] = useState(false);

  useEffect(() => {
    const rememberedName = localStorage.getItem('slido_author_name');
    if (rememberedName !== null) setAuthorName(rememberedName);
  }, []);

  // ── WebSocket (primary) ──
  const { session: wsSession, connected: wsConnected, fallbackToPolling, send: wsSend } = useSessionSocket({ code });

  // ── Apollo (fallback) — only polls when WS is unavailable ──
  const usePolling = fallbackToPolling || !wsConnected;
  const { data, loading, error, refetch } = useQuery(GET_SESSION_DETAILS, {
    variables: { code: code.toUpperCase() },
    pollInterval: usePolling ? 3000 : 0,
    notifyOnNetworkStatusChange: false,
  });

  // Unified session type that both WS and Apollo data conform to
  type SessionData = {
    id: string | number;
    code: string;
    title: string;
    isModerated: boolean;
    primaryColor?: string | null;
    logoUrl?: string | null;
    pollsEnabled?: boolean;
    quizzesEnabled?: boolean;
    repliesEnabled?: boolean;
    surveysEnabled?: boolean;
    votesEnabled?: boolean;
    saturdayBannerEnabled?: boolean;
    reactionsEnabled?: boolean;
    owner?: { id: string | number; displayName: string } | null;
    questions: QType[];
    polls: { id: string | number; type: string; question: string; isActive: boolean; options: { id: string | number; text: string; position: number; voteCount: number }[] }[];
    quizzes: { id: string | number; title: string; isActive: boolean; currentQuestionIndex: number; questions: { id: string | number; text: string; timeLimit: number; position: number; options: { id: string | number; text: string; position: number }[] }[] }[];
    surveys: { id: string | number; title: string; isOpen: boolean; questions: { id: string | number; type: string; text: string; position: number; isRequired: boolean; options: { id: string | number; text: string; position: number }[] }[] }[];
  };

  type QType = {
    id: string | number;
    title: string;
    text: string;
    authorName: string | null;
    isAnswered: boolean;
    upvoteCount: number;
    downvoteCount: number;
    score: number;
    reactions: { emoji: string; count: number }[];
    isHighlighted: boolean;
    createdAt: string;
    replies: { id: string | number; text: string; authorName: string; createdAt: string }[];
  };

  // Prefer WebSocket session data; fall back to Apollo
  const gqlSession = (data as { session?: SessionData } | undefined)?.session;
  const session: SessionData | undefined = wsConnected && wsSession ? wsSession as unknown as SessionData : gqlSession;

  const { data: pendingData, refetch: refetchPending } = useQuery(GET_PENDING_QUESTIONS, {
    variables: { sessionId: session?.id ? String(session.id) : '' },
    skip: !session?.id || !session?.isModerated,
    pollInterval: session?.isModerated ? 5000 : 0,
  });
  const pendingQuestions = (pendingData as Record<string, unknown>)?.pendingQuestions as Array<{ id: string; title: string; text: string; authorName: string | null }> || [];

  // GraphQL mutations for host-only actions. After success, send 'refresh' to DO so all clients get the update.
  const refreshDO = useCallback(() => { if (wsConnected) wsSend({ type: 'refresh' }); }, [wsConnected, wsSend]);

  const [createQuestionGql, { loading: gqlPosting }] = useMutation(CREATE_QUESTION, { onCompleted: () => { setQuestionText(''); refetch(); refreshDO(); } });
  const [voteQuestionGql] = useMutation(VOTE_QUESTION, { onCompleted: () => { refetch(); refreshDO(); } });
  const [reactToQuestionGql] = useMutation(REACT_TO_QUESTION, { onCompleted: () => { refetch(); refreshDO(); } });
  const [approveQuestion] = useMutation(APPROVE_QUESTION, { onCompleted: () => { refetch(); refetchPending(); refreshDO(); } });
  const [rejectQuestion] = useMutation(REJECT_QUESTION, { onCompleted: () => { refetch(); refetchPending(); refreshDO(); } });
  const [highlightQuestion] = useMutation(HIGHLIGHT_QUESTION, { onCompleted: () => { refetch(); refreshDO(); } });
  const [markAnswered] = useMutation(MARK_ANSWERED, { onCompleted: () => { refetch(); refreshDO(); } });
  const [replyToQuestion] = useMutation(REPLY_TO_QUESTION, { onCompleted: () => { refetch(); refreshDO(); } });

  const posting = wsPostingQuestion || gqlPosting;

  const handleVote = useCallback((questionId: string | number, value: 1 | -1) => {
    if (wsConnected) {
      wsSend({ type: 'vote', questionId: Number(questionId), voterToken, value });
    } else {
      voteQuestionGql({ variables: { questionId: String(questionId), voterToken, value } });
    }
  }, [wsConnected, wsSend, voterToken, voteQuestionGql]);

  const handleReact = useCallback((questionId: string | number, emoji: string) => {
    if (wsConnected) {
      wsSend({ type: 'react', questionId: Number(questionId), voterToken, emoji });
    } else {
      reactToQuestionGql({ variables: { questionId: String(questionId), voterToken, emoji } });
    }
  }, [wsConnected, wsSend, voterToken, reactToQuestionGql]);

  const handleCreateQuestion = useCallback(async () => {
    if (!session?.id) return;
    const text = questionText.trim();
    const hasEnoughText = text.replace(/\s/g, '').length >= 12;
    if (!hasEnoughText || titleGenerating || posting) return;

    setTitleGenerating(true);
    let title: string;
    try {
      title = await requestSuggestedQuestionTitle(text);
    } catch {
      title = clampQuestionTitle(text);
    } finally {
      setTitleGenerating(false);
    }

    if (!title) return;

    if (wsConnected) {
      wsSend({ type: 'createQuestion', title, text: text || undefined, authorName: authorName.trim() || undefined });
      setQuestionText('');
      setWsPostingQuestion(false);
    } else {
      createQuestionGql({ variables: { sessionId: String(session.id), title, text: text || null, authorName: authorName.trim() || null } });
    }
  }, [questionText, authorName, session?.id, wsConnected, wsSend, createQuestionGql, titleGenerating, posting]);

  if (loading && !data && !wsSession) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="animate-pulse-glow w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
      </main>
    );
  }

  if ((error && !wsSession) || !session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--gradient-hero)' }}>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>Session not found or server error.</p>
        <Link href="/" className="text-sm mt-4 hover:underline" style={{ color: 'var(--accent)' }}>&larr; Back to Home</Link>
      </main>
    );
  }

  const highlighted = [...(session.questions || [])].filter((q) => q.isHighlighted);

  const sortedQuestions = [...(session.questions || [])]
    .filter((q: QType) => !q.isHighlighted)
    .sort((a: QType, b: QType) => {
      if (sortMode === 'popular') return (b.score ?? b.upvoteCount - b.downvoteCount) - (a.score ?? a.upvoteCount - a.downvoteCount);
      if (sortMode === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortMode === 'unanswered') {
        if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
        return (b.score ?? b.upvoteCount - b.downvoteCount) - (a.score ?? a.upvoteCount - a.downvoteCount);
      }
      return 0;
    });

  const pollsEnabled = session.pollsEnabled ?? false;
  const quizzesEnabled = session.quizzesEnabled ?? false;
  const repliesEnabled = session.repliesEnabled ?? false;
  const surveysEnabled = session.surveysEnabled ?? false;
  const votesEnabled = session.votesEnabled ?? true;
  const saturdayBannerEnabled = session.saturdayBannerEnabled ?? true;
  const reactionsEnabled = session.reactionsEnabled ?? false;

  const featureTabs: { key: Tab; label: string; count?: number }[] = [
    ...(pollsEnabled ? [{ key: 'polls' as Tab, label: 'Polls', count: session.polls?.length || 0 }] : []),
    ...(quizzesEnabled ? [{ key: 'quiz' as Tab, label: 'Quiz', count: session.quizzes?.length || 0 }] : []),
    ...(surveysEnabled ? [{ key: 'surveys' as Tab, label: 'Surveys', count: session.surveys?.length || 0 }] : []),
  ];

  // Topics is the default view, so its tab only appears when there is
  // something else to switch to — otherwise it is a button to nowhere.
  const tabs: { key: Tab; label: string; count?: number }[] = featureTabs.length
    ? [{ key: 'qa', label: 'Topics', count: session.questions?.length || 0 }, ...featureTabs]
    : [];

  // If the active tab was hidden by feature flags, fall back to Topics.
  const visibleTab: Tab = tabs.some((tab) => tab.key === activeTab) ? activeTab : 'qa';

  const hasEnoughQuestionText = questionText.replace(/\s/g, '').length >= 12;

  return (
    <main className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--gradient-hero)' }}>
      <aside
        className={`shrink-0 flex items-center justify-center w-full py-4 px-4 border-b lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:py-8 lg:pr-8 lg:pl-16 ${qrCollapsed ? 'lg:w-[240px]' : 'lg:w-[480px]'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <RoomCode code={session.code} size="xl" layout="stack" collapsible live={wsConnected} onCollapsedChange={setQrCollapsed} />
      </aside>
      <section className="min-w-0 flex-1 p-4 md:p-8 flex flex-col items-center gap-5">
      <SaturdayBanner code={session.code} enabled={saturdayBannerEnabled} />
      <div className="max-w-2xl w-full space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 pb-4 animate-fade-in" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {session.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
              )}
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>{session.title}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href={`/session/${code}/present`} className="inline-flex items-center gap-1 text-xs tracking-wider uppercase hover:underline" style={{ color: 'var(--success)' }}>
              <span aria-hidden="true">▶</span>
              Enlarge
            </Link>
            <Link href={`/session/${code}/settings`} className="text-base leading-none hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Settings" aria-label="Settings">
              <span aria-hidden="true">⚙</span>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
        <div className="flex gap-1 p-1 rounded-xl animate-fade-in stagger-1" style={{ background: 'var(--bg-raised)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
              style={{
                background: visibleTab === tab.key ? 'var(--accent)' : 'transparent',
                color: visibleTab === tab.key ? 'var(--bg)' : 'var(--text-muted)',
              }}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] font-mono opacity-70">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        )}

        {/* Q&A Tab */}
        {visibleTab === 'qa' && (
          <div className="space-y-4">
            {session.isModerated && (
              <button onClick={() => setShowModeration(!showModeration)} className="text-xs font-medium" style={{ color: 'var(--warning)' }}>
                {showModeration ? 'Hide' : 'Show'} Moderation Queue ({pendingQuestions.length} pending)
              </button>
            )}

            {showModeration && pendingQuestions.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl animate-fade-in" style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--warning)' }}>Pending Approval</h3>
                {pendingQuestions.map((q) => (
                  <div key={q.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{q.title}</p>
                      {q.text.trim() && <LinkifiedText text={q.text} className="text-xs mt-1" style={{ color: 'var(--text-muted)' }} />}
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{q.authorName || 'Anonymous'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveQuestion({ variables: { questionId: String(q.id) } })} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--success)', background: 'var(--success-subtle)' }}>Approve</button>
                      <button onClick={() => rejectQuestion({ variables: { questionId: String(q.id) } })} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--danger)', background: 'var(--danger-subtle)' }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Post Question Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateQuestion();
              }}
              className="themed-card p-4 space-y-3 animate-slide-up stagger-2"
            >
              <textarea
                rows={3}
                required
                minLength={12}
                placeholder="What's your topic for discussion?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="themed-input w-full resize-none"
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input type="text" placeholder="Your name (optional)" value={authorName} onChange={(e) => {
                  const nextName = e.target.value;
                  setAuthorName(nextName);
                  localStorage.setItem('slido_author_name', nextName);
                }} className="themed-input flex-1" />
                <button type="submit" disabled={posting || titleGenerating || !hasEnoughQuestionText} className="themed-btn">
                  {titleGenerating ? 'Writing title…' : posting ? 'Posting...' : 'Add'}
                </button>
              </div>
            </form>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Sort:</span>
              {(['popular', 'recent'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: sortMode === mode ? 'var(--accent)' : 'var(--bg-raised)',
                    color: sortMode === mode ? 'var(--bg)' : 'var(--text-muted)',
                  }}
                >
                  {mode === 'recent' ? 'New' : 'Popular'}
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
                    onVote={(value: 1 | -1) => handleVote(q.id, value)}
                    onReact={(emoji: string) => handleReact(q.id, emoji)}
                    onHighlight={() => highlightQuestion({ variables: { questionId: String(q.id), highlighted: !q.isHighlighted } })}
                    onMarkAnswered={() => markAnswered({ variables: { questionId: String(q.id), answered: !q.isAnswered } })}
                    onReply={(text: string, name: string) => replyToQuestion({ variables: { questionId: String(q.id), text, authorName: name } })}
                    repliesEnabled={repliesEnabled}
                    votesEnabled={votesEnabled}
                    isHighlighted
                    reactionsEnabled={reactionsEnabled}
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
                    onVote={(value: 1 | -1) => handleVote(q.id, value)}
                    onReact={(emoji: string) => handleReact(q.id, emoji)}
                    onHighlight={() => highlightQuestion({ variables: { questionId: String(q.id), highlighted: !q.isHighlighted } })}
                    onMarkAnswered={() => markAnswered({ variables: { questionId: String(q.id), answered: !q.isAnswered } })}
                    onReply={(text: string, name: string) => replyToQuestion({ variables: { questionId: String(q.id), text, authorName: name } })}
                    repliesEnabled={repliesEnabled}
                    votesEnabled={votesEnabled}
                    reactionsEnabled={reactionsEnabled}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Polls Tab */}
        {visibleTab === 'polls' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setShowCreators({ ...showCreators, poll: !showCreators.poll })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {showCreators.poll ? 'Hide Creator' : '+ Create Poll'}
            </button>
            {showCreators.poll && <PollCreator sessionId={String(session.id)} onCreated={() => { refetch(); refreshDO(); setShowCreators({ ...showCreators, poll: false }); }} />}
            {session.polls?.length === 0 ? (
              <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>No polls yet.</div>
            ) : (
              session.polls?.map((poll) => <PollCard key={String(poll.id)} poll={poll} voterToken={voterToken} isCreator />)
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {visibleTab === 'quiz' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setShowCreators({ ...showCreators, quiz: !showCreators.quiz })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {showCreators.quiz ? 'Hide Creator' : '+ Create Quiz'}
            </button>
            {showCreators.quiz && <QuizCreator sessionId={String(session.id)} onCreated={() => { refetch(); refreshDO(); setShowCreators({ ...showCreators, quiz: false }); }} />}
            {session.quizzes?.length === 0 ? (
              <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>No quizzes yet.</div>
            ) : (
              session.quizzes?.map((quiz) => <QuizPlayer key={String(quiz.id)} quiz={quiz} voterToken={voterToken} isCreator />)
            )}
          </div>
        )}

        {/* Surveys Tab */}
        {visibleTab === 'surveys' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setShowCreators({ ...showCreators, survey: !showCreators.survey })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {showCreators.survey ? 'Hide Creator' : '+ Create Survey'}
            </button>
            {showCreators.survey && <SurveyCreator sessionId={String(session.id)} onCreated={() => { refetch(); refreshDO(); setShowCreators({ ...showCreators, survey: false }); }} />}
            {session.surveys?.length === 0 ? (
              <div className="text-center py-12 rounded-xl text-sm" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>No surveys yet.</div>
            ) : (
              session.surveys?.map((survey) => <SurveyCard key={String(survey.id)} survey={survey} voterToken={voterToken} isCreator />)
            )}
          </div>
        )}
        <div className="pt-6">
          <Link href="/" className="text-xs font-medium tracking-wider uppercase hover:underline" style={{ color: 'var(--accent)' }}>&larr; Leave</Link>
        </div>
      </div>
      </section>
    </main>
  );
}

function QuestionItem({
  q, onVote, onReact, onHighlight, onMarkAnswered, onReply, isHighlighted, repliesEnabled, votesEnabled, reactionsEnabled = false, className = '',
}: {
  q: {
    id: string | number;
    title: string;
    text: string;
    authorName: string | null;
    isAnswered: boolean;
    upvoteCount: number;
    downvoteCount: number;
    reactions?: { emoji: string; count: number }[];
    isHighlighted: boolean;
    replies?: { id: string | number; text: string; authorName: string; createdAt: string }[];
  };
  onVote: (value: 1 | -1) => void;
  onReact: (emoji: string) => void;
  onHighlight: () => void;
  onMarkAnswered: () => void;
  onReply: (text: string, name: string) => void;
  repliesEnabled: boolean;
  votesEnabled: boolean;
  reactionsEnabled?: boolean;
  isHighlighted?: boolean; className?: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');
  const [activeVote, setActiveVote] = useState<1 | -1 | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = JSON.parse(localStorage.getItem('slido_question_votes') || '{}') as Record<string, unknown>;
      const value = stored[String(q.id)];
      return value === 1 || value === -1 ? value : null;
    } catch {
      return null;
    }
  });
  const [activeReactions, setActiveReactions] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = JSON.parse(localStorage.getItem('slido_question_reactions') || '{}') as Record<string, unknown>;
      const values = stored[String(q.id)];
      if (!Array.isArray(values)) return [];
      return values.filter((value): value is string => typeof value === 'string' && QUESTION_REACTIONS.some((reaction) => reaction.id === value));
    } catch {
      return [];
    }
  });
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const reaction of QUESTION_REACTIONS) counts[reaction.id] = 0;
    for (const reaction of q.reactions || []) {
      if (QUESTION_REACTIONS.some((knownReaction) => knownReaction.id === reaction.emoji)) counts[reaction.emoji] = reaction.count;
    }
    return counts;
  });

  useEffect(() => {
    const nextCounts: Record<string, number> = {};
    for (const reaction of QUESTION_REACTIONS) nextCounts[reaction.id] = 0;
    for (const reaction of q.reactions || []) {
      if (QUESTION_REACTIONS.some((knownReaction) => knownReaction.id === reaction.emoji)) nextCounts[reaction.emoji] = reaction.count;
    }
    setReactionCounts(nextCounts);
  }, [q.id, q.reactions]);

  const handleVote = (value: 1 | -1) => {
    const nextVote = activeVote === value ? null : value;
    setActiveVote(nextVote);
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('slido_question_votes') || '{}') as Record<string, unknown>;
        if (nextVote === null) delete stored[String(q.id)];
        else stored[String(q.id)] = nextVote;
        localStorage.setItem('slido_question_votes', JSON.stringify(stored));
      } catch {
        // Ignore storage failures. The server still receives the vote.
      }
    }
    onVote(value);
  };

  const handleReaction = (emoji: string) => {
    const isActive = activeReactions.includes(emoji);
    const nextReactions = isActive
      ? activeReactions.filter((reaction) => reaction !== emoji)
      : [...activeReactions, emoji];
    setActiveReactions(nextReactions);
    setReactionCounts((current) => ({ ...current, [emoji]: Math.max(0, (current[emoji] || 0) + (isActive ? -1 : 1)) }));
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('slido_question_reactions') || '{}') as Record<string, unknown>;
        stored[String(q.id)] = nextReactions;
        localStorage.setItem('slido_question_reactions', JSON.stringify(stored));
      } catch {
        // Ignore storage failures. The server still receives the reaction.
      }
    }
    onReact(emoji);
  };

  const borderStyle = isHighlighted
    ? { border: '1px solid var(--warning)', background: 'var(--warning-subtle)' }
    : q.isAnswered
    ? { border: '1px solid var(--success)', background: 'var(--success-subtle)' }
    : { border: '1px solid var(--border)', background: 'var(--gradient-card)' };

  return (
    <div className={`p-4 rounded-xl transition-all ${className}`} style={{ ...borderStyle, boxShadow: 'var(--shadow)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>{q.title}</p>
          {q.text.trim() && <LinkifiedText text={q.text} className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }} />}
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
            {repliesEnabled && (
              <button onClick={() => setShowReplyForm(!showReplyForm)} className="text-[10px]" style={{ color: 'var(--accent-2)' }} title="Reply">↩</button>
            )}
          </div>
          {votesEnabled && (
            <div className="flex flex-col items-center gap-1 min-w-16">
              <button
                onClick={() => handleVote(1)}
                className="w-full flex items-center justify-center px-3 py-1.5 rounded-lg transition-all"
                style={{ background: activeVote === 1 ? 'var(--accent-subtle)' : 'var(--bg-input)', border: '1px solid var(--border)', color: activeVote === 1 ? 'var(--accent)' : 'var(--text-muted)' }}
                aria-label="Vote up"
                aria-pressed={activeVote === 1}
              >
                <span className="text-sm">▲</span>
              </button>
              <span className="text-2xl font-bold font-mono leading-none" style={{ color: 'var(--text-strong)' }}>{q.upvoteCount - q.downvoteCount}</span>
              <button
                onClick={() => handleVote(-1)}
                className="w-full flex items-center justify-center px-3 py-1.5 rounded-lg transition-all"
                style={{ background: activeVote === -1 ? 'var(--danger-subtle)' : 'var(--bg-input)', border: '1px solid var(--border)', color: activeVote === -1 ? 'var(--danger)' : 'var(--text-muted)' }}
                aria-label="Vote down"
                aria-pressed={activeVote === -1}
              >
                <span className="text-sm">▼</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {votesEnabled && reactionsEnabled && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUESTION_REACTIONS.map((reaction) => {
            const active = activeReactions.includes(reaction.id);
            return (
              <button
                key={reaction.id}
                onClick={() => handleReaction(reaction.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
                style={{ background: active ? 'var(--accent-subtle)' : 'var(--bg-input)', border: '1px solid var(--border)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                aria-label={reaction.label}
                aria-pressed={active}
              >
                <span>{reaction.emoji}</span>
                <span className="font-mono">{reactionCounts[reaction.id] || 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {repliesEnabled && q.replies && q.replies.length > 0 && (
        <div className="mt-3 ml-4 space-y-2 pl-3" style={{ borderLeft: '2px solid var(--border)' }}>
          {q.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{reply.authorName}</span>
              <LinkifiedText text={reply.text} className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      )}

      {repliesEnabled && showReplyForm && (
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
