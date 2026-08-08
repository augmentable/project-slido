'use client';

import { useState, use } from 'react';
import { gql } from '@apollo/client';
import Link from 'next/link';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { PollCreator } from '@/components/polls/PollCreator';
import { PollCard } from '@/components/polls/PollCard';
import { QuizCreator } from '@/components/quiz/QuizCreator';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';
import { SurveyCreator } from '@/components/survey/SurveyCreator';
import { SurveyCard } from '@/components/survey/SurveyCard';

const GET_SESSION_DETAILS = gql`
  query GetSessionDetails($code: String!) {
    session(code: $code) {
      id
      title
      code
      isModerated
      primaryColor
      logoUrl
      questions {
        id
        text
        authorName
        isApproved
        isHighlighted
        isAnswered
        upvoteCount
        createdAt
      }
      polls {
        id
        type
        question
        isActive
        options { id text position voteCount }
      }
      quizzes {
        id
        title
        isActive
        currentQuestionIndex
        questions { id text timeLimit position options { id text position } }
      }
      surveys {
        id
        title
        isOpen
        questions { id type text position isRequired options { id text position } }
      }
    }
  }
`;

const GET_PENDING_QUESTIONS = gql`
  query GetPendingQuestions($sessionId: String!) {
    pendingQuestions(sessionId: $sessionId) {
      id text authorName createdAt
    }
  }
`;

const CREATE_QUESTION = gql`
  mutation CreateQuestion($sessionId: String!, $text: String!, $authorName: String) {
    createQuestion(sessionId: $sessionId, text: $text, authorName: $authorName) {
      id text authorName upvoteCount createdAt
    }
  }
`;

const UPVOTE_QUESTION = gql`
  mutation UpvoteQuestion($questionId: String!, $voterToken: String!) {
    upvoteQuestion(questionId: $questionId, voterToken: $voterToken) {
      id upvoteCount
    }
  }
`;

const APPROVE_QUESTION = gql`
  mutation ApproveQuestion($questionId: String!) {
    approveQuestion(questionId: $questionId) { id isApproved }
  }
`;

const REJECT_QUESTION = gql`
  mutation RejectQuestion($questionId: String!) {
    rejectQuestion(questionId: $questionId)
  }
`;

const HIGHLIGHT_QUESTION = gql`
  mutation HighlightQuestion($questionId: String!, $highlighted: Boolean!) {
    highlightQuestion(questionId: $questionId, highlighted: $highlighted) { id isHighlighted }
  }
`;

const MARK_ANSWERED = gql`
  mutation MarkAnswered($questionId: String!, $answered: Boolean!) {
    markAsAnswered(questionId: $questionId, answered: $answered) { id isAnswered }
  }
`;

const QUESTION_UPVOTED_SUB = gql`
  subscription OnQuestionUpvoted($sessionId: String!) {
    questionUpvoted(sessionId: $sessionId) { id text upvoteCount }
  }
`;

const NEW_QUESTION_SUB = gql`
  subscription OnQuestionCreated($sessionId: String!) {
    questionCreated(sessionId: $sessionId) { id text authorName upvoteCount createdAt }
  }
`;

const QUESTION_MODERATED_SUB = gql`
  subscription OnQuestionModerated($sessionId: String!) {
    questionModerated(sessionId: $sessionId) { id isHighlighted isAnswered }
  }
`;

const POLL_UPDATED_SUB = gql`
  subscription OnPollUpdated($sessionId: String!) {
    pollUpdated(sessionId: $sessionId) { id isActive }
  }
`;

type Tab = 'qa' | 'polls' | 'quiz' | 'surveys';

export default function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [voterToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    let token = localStorage.getItem('slido_voter_token');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('slido_voter_token', token);
    }
    return token;
  });

  const [activeTab, setActiveTab] = useState<Tab>('qa');
  const [questionText, setQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showModeration, setShowModeration] = useState(false);
  const [showCreators, setShowCreators] = useState<Record<string, boolean>>({});

  const { data, loading, error, refetch } = useQuery(GET_SESSION_DETAILS, {
    variables: { code: code.toUpperCase() },
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

  useSubscription(QUESTION_UPVOTED_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });
  useSubscription(NEW_QUESTION_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => { refetch(); refetchPending(); },
  });
  useSubscription(QUESTION_MODERATED_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });
  useSubscription(POLL_UPDATED_SUB, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    onData: () => refetch(),
  });

  const [createQuestion, { loading: posting }] = useMutation(CREATE_QUESTION, {
    onCompleted: () => { setQuestionText(''); refetch(); },
  });
  const [upvoteQuestion] = useMutation(UPVOTE_QUESTION, { onCompleted: () => refetch() });
  const [approveQuestion] = useMutation(APPROVE_QUESTION, { onCompleted: () => { refetch(); refetchPending(); } });
  const [rejectQuestion] = useMutation(REJECT_QUESTION, { onCompleted: () => { refetch(); refetchPending(); } });
  const [highlightQuestion] = useMutation(HIGHLIGHT_QUESTION, { onCompleted: () => refetch() });
  const [markAnswered] = useMutation(MARK_ANSWERED, { onCompleted: () => refetch() });

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
        <Link href="/" className="text-indigo-400 hover:underline text-sm font-medium">&larr; Back to Home</Link>
      </main>
    );
  }

  const brandStyle = session.primaryColor
    ? { '--brand-color': session.primaryColor } as React.CSSProperties
    : {};

  const highlighted = [...(session.questions || [])].filter((q: { isHighlighted: boolean }) => q.isHighlighted);
  const sortedQuestions = [...(session.questions || [])]
    .filter((q: { isHighlighted: boolean }) => !q.isHighlighted)
    .sort((a: { upvoteCount: number }, b: { upvoteCount: number }) => b.upvoteCount - a.upvoteCount);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'qa', label: 'Q&A', count: session.questions?.length || 0 },
    { key: 'polls', label: 'Polls', count: session.polls?.length || 0 },
    { key: 'quiz', label: 'Quiz', count: session.quizzes?.length || 0 },
    { key: 'surveys', label: 'Surveys', count: session.surveys?.length || 0 },
  ];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex justify-center" style={brandStyle}>
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xs text-indigo-400 hover:underline font-mono uppercase tracking-wider">&larr; Leave</Link>
              <Link href={`/session/${code}/analytics`} className="text-xs text-slate-400 hover:text-slate-300 font-mono uppercase tracking-wider">Analytics</Link>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {session.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
              )}
              <h1 className="text-2xl font-bold text-slate-100">{session.title}</h1>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-right">
            <span className="text-xs text-slate-400 block font-mono">ROOM CODE</span>
            <span className="text-sm font-bold font-mono text-indigo-400">{session.code}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
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
            {/* Moderation toggle */}
            {session.isModerated && (
              <button
                onClick={() => setShowModeration(!showModeration)}
                className="text-xs text-amber-400 hover:text-amber-300 font-mono"
              >
                {showModeration ? 'Hide' : 'Show'} Moderation Queue ({pendingQuestions.length} pending)
              </button>
            )}

            {/* Moderation Queue */}
            {showModeration && pendingQuestions.length > 0 && (
              <div className="space-y-2 bg-amber-950/20 border border-amber-800/30 p-3 rounded-xl">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Approval</h3>
                {pendingQuestions.map((q: { id: string; text: string; authorName: string | null }) => (
                  <div key={q.id} className="flex items-center justify-between bg-slate-800/60 p-3 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-200">{q.text}</p>
                      <p className="text-[10px] text-slate-500">{q.authorName || 'Anonymous'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveQuestion({ variables: { questionId: q.id } })} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 bg-green-950/40 rounded">Approve</button>
                      <button onClick={() => rejectQuestion({ variables: { questionId: q.id } })} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 rounded">Reject</button>
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
                createQuestion({
                  variables: {
                    sessionId: session.id,
                    text: questionText.trim(),
                    authorName: authorName.trim() || null,
                  },
                });
              }}
              className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-3"
            >
              <textarea
                rows={3}
                placeholder="Ask a question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={posting || !questionText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Ask'}
                </button>
              </div>
            </form>

            {/* Highlighted Questions */}
            {highlighted.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                  <span>&#9733;</span> Highlighted
                </h3>
                {highlighted.map((q: { id: string; text: string; authorName: string | null; isAnswered: boolean; upvoteCount: number; isHighlighted: boolean }) => (
                  <QuestionItem
                    key={q.id}
                    q={q}
                    onUpvote={() => upvoteQuestion({ variables: { questionId: q.id, voterToken } })}
                    onHighlight={() => highlightQuestion({ variables: { questionId: q.id, highlighted: !q.isHighlighted } })}
                    onMarkAnswered={() => markAnswered({ variables: { questionId: q.id, answered: !q.isAnswered } })}
                    isHighlighted
                  />
                ))}
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-300 flex items-center justify-between">
                <span>Questions</span>
                <span className="text-xs font-normal text-slate-500 font-mono">{sortedQuestions.length} total</span>
              </h2>
              {sortedQuestions.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm">
                  No questions yet. Be the first to ask!
                </div>
              ) : (
                sortedQuestions.map((q: { id: string; text: string; authorName: string | null; isAnswered: boolean; upvoteCount: number; isHighlighted: boolean }) => (
                  <QuestionItem
                    key={q.id}
                    q={q}
                    onUpvote={() => upvoteQuestion({ variables: { questionId: q.id, voterToken } })}
                    onHighlight={() => highlightQuestion({ variables: { questionId: q.id, highlighted: !q.isHighlighted } })}
                    onMarkAnswered={() => markAnswered({ variables: { questionId: q.id, answered: !q.isAnswered } })}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Polls Tab */}
        {activeTab === 'polls' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreators({ ...showCreators, poll: !showCreators.poll })}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
            >
              {showCreators.poll ? 'Hide Creator' : '+ Create Poll'}
            </button>
            {showCreators.poll && (
              <PollCreator sessionId={session.id} onCreated={() => { refetch(); setShowCreators({ ...showCreators, poll: false }); }} />
            )}
            {session.polls?.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm">
                No polls yet. Create one above!
              </div>
            ) : (
              session.polls?.map((poll: { id: string }) => (
                <PollCard key={poll.id} poll={poll} voterToken={voterToken} isCreator />
              ))
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreators({ ...showCreators, quiz: !showCreators.quiz })}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
            >
              {showCreators.quiz ? 'Hide Creator' : '+ Create Quiz'}
            </button>
            {showCreators.quiz && (
              <QuizCreator sessionId={session.id} onCreated={() => { refetch(); setShowCreators({ ...showCreators, quiz: false }); }} />
            )}
            {session.quizzes?.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm">
                No quizzes yet. Create one above!
              </div>
            ) : (
              session.quizzes?.map((quiz: { id: string }) => (
                <QuizPlayer key={quiz.id} quiz={quiz} voterToken={voterToken} isCreator />
              ))
            )}
          </div>
        )}

        {/* Surveys Tab */}
        {activeTab === 'surveys' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreators({ ...showCreators, survey: !showCreators.survey })}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
            >
              {showCreators.survey ? 'Hide Creator' : '+ Create Survey'}
            </button>
            {showCreators.survey && (
              <SurveyCreator sessionId={session.id} onCreated={() => { refetch(); setShowCreators({ ...showCreators, survey: false }); }} />
            )}
            {session.surveys?.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm">
                No surveys yet. Create one above!
              </div>
            ) : (
              session.surveys?.map((survey: { id: string }) => (
                <SurveyCard key={survey.id} survey={survey} voterToken={voterToken} isCreator />
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function QuestionItem({
  q,
  onUpvote,
  onHighlight,
  onMarkAnswered,
  isHighlighted,
}: {
  q: { id: string; text: string; authorName: string | null; isAnswered: boolean; upvoteCount: number; isHighlighted: boolean };
  onUpvote: () => void;
  onHighlight: () => void;
  onMarkAnswered: () => void;
  isHighlighted?: boolean;
}) {
  return (
    <div className={`border p-4 rounded-xl flex items-start justify-between gap-4 transition-all hover:border-slate-600 ${
      isHighlighted
        ? 'bg-yellow-950/20 border-yellow-700/40'
        : q.isAnswered
        ? 'bg-green-950/10 border-green-800/30'
        : 'bg-slate-800/90 border-slate-700/60'
    }`}>
      <div className="flex-1 space-y-1">
        <p className="text-slate-200 text-sm leading-relaxed">{q.text}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{q.authorName || 'Anonymous'}</span>
          {q.isAnswered && <span className="text-[10px] text-green-400 bg-green-950/40 px-1.5 py-0.5 rounded">Answered</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button onClick={onHighlight} className="text-[10px] text-yellow-500 hover:text-yellow-400" title="Highlight">
            {q.isHighlighted ? '★' : '☆'}
          </button>
          <button onClick={onMarkAnswered} className="text-[10px] text-green-500 hover:text-green-400" title="Mark answered">
            ✓
          </button>
        </div>
        <button
          onClick={onUpvote}
          className="flex flex-col items-center justify-center bg-slate-900 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-500/50 text-indigo-400 px-3 py-2 rounded-lg transition-all min-w-13"
        >
          <span className="text-xs">▲</span>
          <span className="text-xs font-bold font-mono">{q.upvoteCount}</span>
        </button>
      </div>
    </div>
  );
}
