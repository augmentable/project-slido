
import { useState, useEffect, useCallback } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_QUIZ = gql`query GetQuiz($quizId: String!) { quiz(quizId: $quizId) { id title isActive currentQuestionIndex questions { id text timeLimit position options { id text position } } } }`;
const SUBMIT_ANSWER = gql`mutation SubmitQuizAnswer($quizQuestionId: String!, $selectedOptionId: String!, $voterToken: String!, $answeredInMs: Float!) { submitQuizAnswer(quizQuestionId: $quizQuestionId, selectedOptionId: $selectedOptionId, voterToken: $voterToken, answeredInMs: $answeredInMs) { id isCorrect score } }`;
const START_QUIZ = gql`mutation StartQuiz($quizId: String!) { startQuiz(quizId: $quizId) { id isActive currentQuestionIndex } }`;
const NEXT_QUESTION = gql`mutation NextQuestion($quizId: String!) { nextQuizQuestion(quizId: $quizId) { id currentQuestionIndex isActive } }`;
const GET_LEADERBOARD = gql`query GetLeaderboard($quizId: String!) { quizLeaderboard(quizId: $quizId) { voterToken totalScore correctCount } }`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QuizPlayer({ quiz: initialQuiz, voterToken, isCreator }: { quiz: any; voterToken: string; isCreator?: boolean }) {
  const { data, refetch } = useQuery(GET_QUIZ, { variables: { quizId: initialQuiz.id }, pollInterval: 2000, notifyOnNetworkStatusChange: false });
  const { data: lbData, refetch: refetchLb } = useQuery(GET_LEADERBOARD, { variables: { quizId: initialQuiz.id }, pollInterval: 3000, notifyOnNetworkStatusChange: false });
  const quiz = (data as any)?.quiz || initialQuiz;
  const leaderboard = (lbData as any)?.quizLeaderboard || [];

  const [startMs, setStartMs] = useState(0);
  const [answered, setAnswered] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastResult, setLastResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const currentQ = quiz.isActive && quiz.currentQuestionIndex >= 0 ? quiz.questions?.[quiz.currentQuestionIndex] : null;

  useEffect(() => { if (currentQ) { setStartMs(Date.now()); setAnswered(false); setLastResult(null); setTimeLeft(currentQ.timeLimit); } }, [currentQ?.id]);
  useEffect(() => { if (!currentQ || answered) return; const iv = setInterval(() => { setTimeLeft((t: number) => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }); }, 1000); return () => clearInterval(iv); }, [currentQ?.id, answered]);

  const [submitAnswer] = useMutation(SUBMIT_ANSWER, { onCompleted: (data: any) => { setLastResult(data.submitQuizAnswer); setAnswered(true); refetchLb(); }, onError: () => setAnswered(true) });
  const [startQuiz] = useMutation(START_QUIZ, { onCompleted: () => refetch() });
  const [nextQuestion] = useMutation(NEXT_QUESTION, { onCompleted: () => refetch() });

  const handleAnswer = useCallback((optionId: string) => {
    if (answered) return;
    submitAnswer({ variables: { quizQuestionId: currentQ.id, selectedOptionId: optionId, voterToken, answeredInMs: Date.now() - startMs } });
  }, [answered, startMs, currentQ, voterToken, submitAnswer]);

  const quizColors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];

  if (!quiz.isActive && quiz.currentQuestionIndex === -1) {
    return (
      <div className="themed-card p-4 space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{quiz.title}</h3>
        {isCreator && quiz.questions?.length > 0 && (
          <button onClick={() => startQuiz({ variables: { quizId: quiz.id } })} className="w-full py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--success)', color: 'var(--bg)' }}>
            Start Quiz ({quiz.questions.length} questions)
          </button>
        )}
        {!isCreator && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Waiting for the host to start the quiz...</p>}
        {leaderboard.length > 0 && <Leaderboard entries={leaderboard} />}
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="themed-card p-4 space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{quiz.title} — Finished!</h3>
        <Leaderboard entries={leaderboard} />
      </div>
    );
  }

  return (
    <div className="themed-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{quiz.title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Q{quiz.currentQuestionIndex + 1}/{quiz.questions.length}</span>
          <span className={`text-sm font-bold font-mono ${timeLeft <= 5 ? 'animate-pulse-glow' : ''}`} style={{ color: timeLeft <= 5 ? 'var(--danger)' : 'var(--accent)' }}>{timeLeft}s</span>
        </div>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>{currentQ.text}</p>
      <div className="grid grid-cols-2 gap-2">
        {[...(currentQ.options || [])].sort((a: {position: number}, b: {position: number}) => a.position - b.position).map((opt: { id: string; text: string }, i: number) => (
          <button key={opt.id} onClick={() => handleAnswer(opt.id)} disabled={answered || timeLeft === 0}
            className="text-white font-medium py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-50 hover:brightness-110"
            style={{ backgroundColor: quizColors[i % 4] }}>
            {opt.text}
          </button>
        ))}
      </div>
      {lastResult && (
        <div className="text-center p-2 rounded-lg" style={{ background: lastResult.isCorrect ? 'var(--success-subtle)' : 'var(--danger-subtle)', color: lastResult.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
          <p className="text-sm font-medium">{lastResult.isCorrect ? 'Correct!' : 'Wrong!'}</p>
          <p className="text-xs font-mono">+{lastResult.score} points</p>
        </div>
      )}
      {isCreator && (
        <button onClick={() => nextQuestion({ variables: { quizId: quiz.id } })} className="themed-btn w-full">
          {quiz.currentQuestionIndex + 1 >= quiz.questions.length ? 'End Quiz' : 'Next Question'}
        </button>
      )}
    </div>
  );
}

function Leaderboard({ entries }: { entries: { voterToken: string; totalScore: number; correctCount: number }[] }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Leaderboard</h4>
      {entries.slice(0, 10).map((entry, i) => (
        <div key={entry.voterToken} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
          style={{ background: i < 3 ? 'var(--accent-subtle)' : 'var(--bg-raised)' }}>
          <span style={{ color: 'var(--text)' }}>
            <span className="font-bold mr-2" style={{ color: 'var(--accent)' }}>#{i + 1}</span>
            {entry.voterToken.slice(0, 8)}...
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{entry.totalScore} pts ({entry.correctCount} correct)</span>
        </div>
      ))}
    </div>
  );
}
