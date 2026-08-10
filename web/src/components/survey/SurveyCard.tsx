'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_SURVEY = gql`query GetSurvey($surveyId: String!) { survey(surveyId: $surveyId) { id title isOpen responseCount questions { id type text position isRequired options { id text position } } } }`;
const SUBMIT_SURVEY = gql`mutation SubmitSurvey($surveyId: String!, $voterToken: String!, $answers: [SurveyAnswerInput!]!) { submitSurveyResponse(surveyId: $surveyId, voterToken: $voterToken, answers: $answers) { id } }`;
const CLOSE_SURVEY = gql`mutation CloseSurvey($surveyId: String!) { closeSurvey(surveyId: $surveyId) { id isOpen } }`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SurveyCard({ survey: initialSurvey, voterToken, isCreator }: { survey: any; voterToken: string; isCreator?: boolean }) {
  const { data, refetch } = useQuery(GET_SURVEY, { variables: { surveyId: initialSurvey.id } });
  const survey = (data as any)?.survey || initialSurvey;
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textValue?: string; ratingValue?: number }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitSurvey, { loading }] = useMutation(SUBMIT_SURVEY, { onCompleted: () => { setSubmitted(true); refetch(); } });
  const [closeSurvey] = useMutation(CLOSE_SURVEY, { onCompleted: () => refetch() });

  const sortedQuestions = [...(survey.questions || [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position);

  return (
    <div className="themed-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{survey.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{survey.responseCount || 0} responses</span>
          {isCreator && survey.isOpen && <button onClick={() => closeSurvey({ variables: { surveyId: survey.id } })} className="text-xs" style={{ color: 'var(--danger)' }}>Close</button>}
        </div>
      </div>
      {!survey.isOpen && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This survey is closed.</p>}
      {survey.isOpen && !submitted && (
        <div className="space-y-4">
          {sortedQuestions.map((q: { id: string; type: string; text: string; isRequired: boolean; options: { id: string; text: string }[] }) => (
            <div key={q.id} className="space-y-2">
              <label className="text-sm" style={{ color: 'var(--text)' }}>{q.text} {q.isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-1">
                  {q.options?.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
                      <input type="radio" name={`survey-${q.id}`} checked={answers[q.id]?.selectedOptionId === opt.id}
                        onChange={() => setAnswers({ ...answers, [q.id]: { selectedOptionId: opt.id } })} style={{ accentColor: 'var(--accent)' }} />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'OPEN_TEXT' && (
                <textarea rows={2} value={answers[q.id]?.textValue || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: { textValue: e.target.value } })}
                  className="themed-input w-full resize-none" placeholder="Your answer..." />
              )}
              {q.type === 'RATING' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setAnswers({ ...answers, [q.id]: { ratingValue: star } })}
                      className="text-2xl transition-colors cursor-pointer" style={{ color: (answers[q.id]?.ratingValue || 0) >= star ? 'var(--warning)' : 'var(--text-faint)' }}>★</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={() => submitSurvey({ variables: { surveyId: survey.id, voterToken, answers: Object.entries(answers).map(([surveyQuestionId, vals]) => ({ surveyQuestionId, ...vals })) } })}
            disabled={loading} className="themed-btn w-full">{loading ? 'Submitting...' : 'Submit Survey'}</button>
        </div>
      )}
      {submitted && <p className="text-xs text-center" style={{ color: 'var(--success)' }}>Survey submitted! Thank you.</p>}
    </div>
  );
}
