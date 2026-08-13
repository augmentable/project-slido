
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_POLL = gql`
  mutation CreatePoll($sessionId: String!, $type: PollType!, $question: String!, $options: [String!], $allowMultiple: Boolean) {
    createPoll(sessionId: $sessionId, type: $type, question: $question, options: $options, allowMultiple: $allowMultiple) { id type question isActive }
  }
`;

const POLL_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'WORD_CLOUD', label: 'Word Cloud' },
  { value: 'RATING', label: 'Rating' },
  { value: 'OPEN_TEXT', label: 'Open Text' },
  { value: 'RANKING', label: 'Ranking' },
] as const;

export function PollCreator({ sessionId, onCreated }: { sessionId: string; onCreated: () => void }) {
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [createPoll, { loading }] = useMutation(CREATE_POLL, { onCompleted: () => { setQuestion(''); setOptions(['', '']); onCreated(); } });
  const needsOptions = type === 'MULTIPLE_CHOICE' || type === 'RANKING';

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!question.trim()) return; createPoll({ variables: { sessionId, type, question: question.trim(), options: needsOptions ? options.filter((o) => o.trim()) : null, allowMultiple } }); }} className="themed-card p-4 space-y-4 animate-fade-in">
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Create Poll</h3>
      <div className="flex flex-wrap gap-2">
        {POLL_TYPES.map((pt) => (
          <button key={pt.value} type="button" onClick={() => setType(pt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: type === pt.value ? 'var(--accent)' : 'var(--bg-raised)', color: type === pt.value ? 'var(--bg)' : 'var(--text-muted)' }}>
            {pt.label}
          </button>
        ))}
      </div>
      <input type="text" placeholder="Poll question..." value={question} onChange={(e) => setQuestion(e.target.value)} className="themed-input w-full" />
      {needsOptions && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} className="themed-input flex-1" />
              {options.length > 2 && <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-xs px-2" style={{ color: 'var(--danger)' }}>Remove</button>}
            </div>
          ))}
          <button type="button" onClick={() => setOptions([...options, ''])} className="text-xs" style={{ color: 'var(--accent)' }}>+ Add Option</button>
        </div>
      )}
      {type === 'MULTIPLE_CHOICE' && (
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Allow multiple selections
        </label>
      )}
      <button type="submit" disabled={loading || !question.trim()} className="themed-btn w-full">{loading ? 'Creating...' : 'Create Poll'}</button>
    </form>
  );
}
