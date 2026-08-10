'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_SURVEY = gql`mutation CreateSurvey($sessionId: String!, $title: String!) { createSurvey(sessionId: $sessionId, title: $title) { id title } }`;
const ADD_SURVEY_QUESTION = gql`mutation AddSurveyQuestion($surveyId: String!, $type: SurveyQuestionType!, $text: String!, $options: [String!], $isRequired: Boolean) { addSurveyQuestion(surveyId: $surveyId, type: $type, text: $text, options: $options, isRequired: $isRequired) { id text } }`;

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'OPEN_TEXT', label: 'Open Text' },
  { value: 'RATING', label: 'Rating' },
] as const;

export function SurveyCreator({ sessionId, onCreated }: { sessionId: string; onCreated: () => void }) {
  const [step, setStep] = useState<'title' | 'questions'>('title');
  const [title, setTitle] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [qType, setQType] = useState('MULTIPLE_CHOICE');
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isRequired, setIsRequired] = useState(false);
  const [questionsAdded, setQuestionsAdded] = useState(0);
  const [createSurvey] = useMutation(CREATE_SURVEY, { onCompleted: (data: any) => { setSurveyId(data.createSurvey.id); setStep('questions'); } });
  const [addQuestion, { loading }] = useMutation(ADD_SURVEY_QUESTION, { onCompleted: () => { setQText(''); setOptions(['', '']); setQuestionsAdded((n) => n + 1); } });

  if (step === 'title') {
    return (
      <div className="themed-card p-4 space-y-3 animate-fade-in">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Create Survey</h3>
        <input type="text" placeholder="Survey title..." value={title} onChange={(e) => setTitle(e.target.value)} className="themed-input w-full" />
        <button onClick={() => createSurvey({ variables: { sessionId, title } })} disabled={!title.trim()} className="themed-btn w-full">Create Survey</button>
      </div>
    );
  }

  return (
    <div className="themed-card p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Add Questions ({questionsAdded} added)</h3>
        <button onClick={onCreated} className="text-xs" style={{ color: 'var(--accent)' }}>Done</button>
      </div>
      <div className="flex gap-2">
        {QUESTION_TYPES.map((qt) => (
          <button key={qt.value} type="button" onClick={() => setQType(qt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: qType === qt.value ? 'var(--accent)' : 'var(--bg-raised)', color: qType === qt.value ? 'var(--bg)' : 'var(--text-muted)' }}>
            {qt.label}
          </button>
        ))}
      </div>
      <input type="text" placeholder="Question text..." value={qText} onChange={(e) => setQText(e.target.value)} className="themed-input w-full" />
      {qType === 'MULTIPLE_CHOICE' && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <input key={i} type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} className="themed-input w-full" />
          ))}
          <button type="button" onClick={() => setOptions([...options, ''])} className="text-xs" style={{ color: 'var(--accent)' }}>+ Add Option</button>
        </div>
      )}
      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} style={{ accentColor: 'var(--accent)' }} /> Required
      </label>
      <button onClick={() => addQuestion({ variables: { surveyId, type: qType, text: qText, options: qType === 'MULTIPLE_CHOICE' ? options.filter((o) => o.trim()) : null, isRequired } })}
        disabled={loading || !qText.trim()} className="themed-btn w-full">{loading ? 'Adding...' : 'Add Question'}</button>
    </div>
  );
}
