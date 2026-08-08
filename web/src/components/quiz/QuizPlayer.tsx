'use client';

import { useState, useEffect, useCallback } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_QUIZ = gql`
  query GetQuiz($quizId: String!) {
    quiz(quizId: $quizId) {
      id
      title
      isActive
      currentQuestionIndex
      questions {
        id
        text
        timeLimit
        position
        options {
          id
          text
          position
        }
      }
    }
  }
`;

const SUBMIT_ANSWER = gql`
  mutation SubmitQuizAnswer(
    $quizQuestionId: String!
    $selectedOptionId: String!
    $voterToken: String!
    $answeredInMs: Float!
  ) {
    submitQuizAnswer(
      quizQuestionId: $quizQuestionId
      selectedOptionId: $selectedOptionId
      voterToken: $voterToken
      answeredInMs: $answeredInMs
    ) {
      id
      isCorrect
      score
    }
  }
`;

const START_QUIZ = gql`
  mutation StartQuiz($quizId: String!) {
    startQuiz(quizId: $quizId) { id isActive currentQuestionIndex }
  }
`;

const NEXT_QUESTION = gql`
  mutation NextQuestion($quizId: String!) {
    nextQuizQuestion(quizId: $quizId) { id currentQuestionIndex isActive }
  }
`;

const GET_LEADERBOARD = gql`
  query GetLeaderboard($quizId: String!) {
    quizLeaderboard(quizId: $quizId) {
      voterToken
      totalScore
      correctCount
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QuizPlayer({ quiz: initialQuiz, voterToken, isCreator }: { quiz: any; voterToken: string; isCreator?: boolean }) {
  const { data, refetch } = useQuery(GET_QUIZ, {
    variables: { quizId: initialQuiz.id },
    pollInterval: 2000,
  });
  const { data: lbData, refetch: refetchLb } = useQuery(GET_LEADERBOARD, {
    variables: { quizId: initialQuiz.id },
    pollInterval: 3000,
  });

  const quiz = data?.quiz || initialQuiz;
  const leaderboard = lbData?.quizLeaderboard || [];

  const [startMs, setStartMs] = useState(0);
  const [answered, setAnswered] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastResult, setLastResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const currentQ = quiz.isActive && quiz.currentQuestionIndex >= 0
    ? quiz.questions?.[quiz.currentQuestionIndex]
    : null;

  useEffect(() => {
    if (currentQ) {
      setStartMs(Date.now());
      setAnswered(false);
      setLastResult(null);
      setTimeLeft(currentQ.timeLimit);
    }
  }, [currentQ?.id]);

  useEffect(() => {
    if (!currentQ || answered) return;
    const interval = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQ?.id, answered]);

  const [submitAnswer] = useMutation(SUBMIT_ANSWER, {
    onCompleted: (data) => {
      setLastResult(data.submitQuizAnswer);
      setAnswered(true);
      refetchLb();
    },
    onError: () => setAnswered(true),
  });
  const [startQuiz] = useMutation(START_QUIZ, { onCompleted: () => refetch() });
  const [nextQuestion] = useMutation(NEXT_QUESTION, { onCompleted: () => refetch() });

  const handleAnswer = useCallback((optionId: string) => {
    if (answered) return;
    const elapsed = Date.now() - startMs;
    submitAnswer({
      variables: {
        quizQuestionId: currentQ.id,
        selectedOptionId: optionId,
        voterToken,
        answeredInMs: elapsed,
      },
    });
  }, [answered, startMs, currentQ, voterToken, submitAnswer]);

  if (!quiz.isActive && quiz.currentQuestionIndex === -1) {
    return (
      <div className="bg-slate-800/90 border border-slate-700/60 p-4 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">{quiz.title}</h3>
        {isCreator && quiz.questions?.length > 0 && (
          <button
            onClick={() => startQuiz({ variables: { quizId: quiz.id } })}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded-lg text-sm"
          >
            Start Quiz ({quiz.questions.length} questions)
          </button>
        )}
        {!isCreator && (
          <p className="text-xs text-slate-400">Waiting for the host to start the quiz...</p>
        )}
        {leaderboard.length > 0 && <Leaderboard entries={leaderboard} />}
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="bg-slate-800/90 border border-slate-700/60 p-4 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">{quiz.title} - Finished!</h3>
        <Leaderboard entries={leaderboard} />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 p-4 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{quiz.title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Q{quiz.currentQuestionIndex + 1}/{quiz.questions.length}
          </span>
          <span className={`text-sm font-bold font-mono ${timeLeft <= 5 ? 'text-red-400' : 'text-indigo-400'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <p className="text-slate-100 text-sm font-medium">{currentQ.text}</p>

      <div className="grid grid-cols-2 gap-2">
        {[...(currentQ.options || [])].sort((a: {position: number}, b: {position: number}) => a.position - b.position).map((opt: { id: string; text: string }, i: number) => {
          const colors = ['bg-red-600 hover:bg-red-500', 'bg-blue-600 hover:bg-blue-500', 'bg-yellow-600 hover:bg-yellow-500', 'bg-green-600 hover:bg-green-500'];
          return (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              disabled={answered || timeLeft === 0}
              className={`${colors[i % 4]} text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors disabled:opacity-50`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {lastResult && (
        <div className={`text-center p-2 rounded-lg ${lastResult.isCorrect ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          <p className="text-sm font-medium">{lastResult.isCorrect ? 'Correct!' : 'Wrong!'}</p>
          <p className="text-xs font-mono">+{lastResult.score} points</p>
        </div>
      )}

      {isCreator && (
        <button
          onClick={() => nextQuestion({ variables: { quizId: quiz.id } })}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm"
        >
          {quiz.currentQuestionIndex + 1 >= quiz.questions.length ? 'End Quiz' : 'Next Question'}
        </button>
      )}
    </div>
  );
}

function Leaderboard({ entries }: { entries: { voterToken: string; totalScore: number; correctCount: number }[] }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leaderboard</h4>
      {entries.slice(0, 10).map((entry, i) => (
        <div key={entry.voterToken} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${i < 3 ? 'bg-indigo-950/40' : 'bg-slate-800/40'}`}>
          <span className="text-slate-300">
            <span className="font-bold text-indigo-400 mr-2">#{i + 1}</span>
            {entry.voterToken.slice(0, 8)}...
          </span>
          <span className="font-mono text-xs text-slate-400">{entry.totalScore} pts ({entry.correctCount} correct)</span>
        </div>
      ))}
    </div>
  );
}
