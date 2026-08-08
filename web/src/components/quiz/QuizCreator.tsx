'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_QUIZ = gql`
  mutation CreateQuiz($sessionId: String!, $title: String!) {
    createQuiz(sessionId: $sessionId, title: $title) {
      id
      title
    }
  }
`;

const ADD_QUIZ_QUESTION = gql`
  mutation AddQuizQuestion(
    $quizId: String!
    $text: String!
    $options: [String!]!
    $correctOptionIndex: Float!
    $timeLimit: Float
  ) {
    addQuizQuestion(
      quizId: $quizId
      text: $text
      options: $options
      correctOptionIndex: $correctOptionIndex
      timeLimit: $timeLimit
    ) {
      id
      text
    }
  }
`;

export function QuizCreator({
  sessionId,
  onCreated,
}: {
  sessionId: string;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<'title' | 'questions'>('title');
  const [title, setTitle] = useState('');
  const [quizId, setQuizId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [questionsAdded, setQuestionsAdded] = useState(0);

  const [createQuiz] = useMutation(CREATE_QUIZ, {
    onCompleted: (data) => {
      setQuizId(data.createQuiz.id);
      setStep('questions');
    },
  });

  const [addQuestion, { loading }] = useMutation(ADD_QUIZ_QUESTION, {
    onCompleted: () => {
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
      setQuestionsAdded((n) => n + 1);
    },
  });

  if (step === 'title') {
    return (
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Create Quiz</h3>
        <input
          type="text"
          placeholder="Quiz title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => createQuiz({ variables: { sessionId, title } })}
          disabled={!title.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          Create Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Add Question ({questionsAdded} added)</h3>
        <button onClick={onCreated} className="text-xs text-indigo-400 hover:text-indigo-300">
          Done
        </button>
      </div>

      <input
        type="text"
        placeholder="Question text..."
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              className="accent-green-500"
            />
            <input
              type="text"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
        <p className="text-[10px] text-slate-500">Select the correct answer with the radio button</p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Time limit:</label>
        <input
          type="number"
          min={5}
          max={120}
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-sm text-center"
        />
        <span className="text-xs text-slate-500">seconds</span>
      </div>

      <button
        onClick={() =>
          addQuestion({
            variables: {
              quizId,
              text: questionText,
              options: options.filter((o) => o.trim()),
              correctOptionIndex: correctIndex,
              timeLimit,
            },
          })
        }
        disabled={loading || !questionText.trim() || options.filter((o) => o.trim()).length < 2}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Question'}
      </button>
    </div>
  );
}
