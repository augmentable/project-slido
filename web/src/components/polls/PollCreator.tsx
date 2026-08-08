'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_POLL = gql`
  mutation CreatePoll(
    $sessionId: String!
    $type: PollType!
    $question: String!
    $options: [String!]
    $allowMultiple: Boolean
  ) {
    createPoll(
      sessionId: $sessionId
      type: $type
      question: $question
      options: $options
      allowMultiple: $allowMultiple
    ) {
      id
      type
      question
      isActive
    }
  }
`;

const POLL_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'WORD_CLOUD', label: 'Word Cloud' },
  { value: 'RATING', label: 'Rating' },
  { value: 'OPEN_TEXT', label: 'Open Text' },
  { value: 'RANKING', label: 'Ranking' },
] as const;

export function PollCreator({
  sessionId,
  onCreated,
}: {
  sessionId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const [createPoll, { loading }] = useMutation(CREATE_POLL, {
    onCompleted: () => {
      setQuestion('');
      setOptions(['', '']);
      onCreated();
    },
  });

  const needsOptions = type === 'MULTIPLE_CHOICE' || type === 'RANKING';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    createPoll({
      variables: {
        sessionId,
        type,
        question: question.trim(),
        options: needsOptions ? options.filter((o) => o.trim()) : null,
        allowMultiple,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Create Poll</h3>

      <div className="flex flex-wrap gap-2">
        {POLL_TYPES.map((pt) => (
          <button
            key={pt.value}
            type="button"
            onClick={() => setType(pt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              type === pt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Poll question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {needsOptions && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
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
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="text-red-400 text-xs px-2 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOptions([...options, ''])}
            className="text-indigo-400 text-xs hover:text-indigo-300"
          >
            + Add Option
          </button>
        </div>
      )}

      {type === 'MULTIPLE_CHOICE' && (
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="rounded border-slate-600"
          />
          Allow multiple selections
        </label>
      )}

      <button
        type="submit"
        disabled={loading || !question.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Poll'}
      </button>
    </form>
  );
}
