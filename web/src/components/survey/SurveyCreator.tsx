'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_SURVEY = gql`
  mutation CreateSurvey($sessionId: String!, $title: String!) {
    createSurvey(sessionId: $sessionId, title: $title) {
      id
      title
    }
  }
`;

const ADD_SURVEY_QUESTION = gql`
  mutation AddSurveyQuestion(
    $surveyId: String!
    $type: SurveyQuestionType!
    $text: String!
    $options: [String!]
    $isRequired: Boolean
  ) {
    addSurveyQuestion(
      surveyId: $surveyId
      type: $type
      text: $text
      options: $options
      isRequired: $isRequired
    ) {
      id
      text
    }
  }
`;

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'OPEN_TEXT', label: 'Open Text' },
  { value: 'RATING', label: 'Rating' },
] as const;

export function SurveyCreator({
  sessionId,
  onCreated,
}: {
  sessionId: string;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<'title' | 'questions'>('title');
  const [title, setTitle] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [qType, setQType] = useState('MULTIPLE_CHOICE');
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isRequired, setIsRequired] = useState(false);
  const [questionsAdded, setQuestionsAdded] = useState(0);

  const [createSurvey] = useMutation(CREATE_SURVEY, {
    onCompleted: (data) => {
      setSurveyId(data.createSurvey.id);
      setStep('questions');
    },
  });

  const [addQuestion, { loading }] = useMutation(ADD_SURVEY_QUESTION, {
    onCompleted: () => {
      setQText('');
      setOptions(['', '']);
      setQuestionsAdded((n) => n + 1);
    },
  });

  if (step === 'title') {
    return (
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Create Survey</h3>
        <input
          type="text"
          placeholder="Survey title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => createSurvey({ variables: { sessionId, title } })}
          disabled={!title.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          Create Survey
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Add Questions ({questionsAdded} added)</h3>
        <button onClick={onCreated} className="text-xs text-indigo-400 hover:text-indigo-300">Done</button>
      </div>

      <div className="flex gap-2">
        {QUESTION_TYPES.map((qt) => (
          <button
            key={qt.value}
            type="button"
            onClick={() => setQType(qt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              qType === qt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {qt.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Question text..."
        value={qText}
        onChange={(e) => setQText(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {qType === 'MULTIPLE_CHOICE' && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}
          <button type="button" onClick={() => setOptions([...options, ''])} className="text-indigo-400 text-xs hover:text-indigo-300">
            + Add Option
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded border-slate-600" />
        Required
      </label>

      <button
        onClick={() =>
          addQuestion({
            variables: {
              surveyId,
              type: qType,
              text: qText,
              options: qType === 'MULTIPLE_CHOICE' ? options.filter((o) => o.trim()) : null,
              isRequired,
            },
          })
        }
        disabled={loading || !qText.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Question'}
      </button>
    </div>
  );
}
