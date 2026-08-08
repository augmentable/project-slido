'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_SURVEY = gql`
  query GetSurvey($surveyId: String!) {
    survey(surveyId: $surveyId) {
      id
      title
      isOpen
      responseCount
      questions {
        id
        type
        text
        position
        isRequired
        options {
          id
          text
          position
        }
      }
    }
  }
`;

const SUBMIT_SURVEY = gql`
  mutation SubmitSurvey($surveyId: String!, $voterToken: String!, $answers: [SurveyAnswerInput!]!) {
    submitSurveyResponse(surveyId: $surveyId, voterToken: $voterToken, answers: $answers) {
      id
    }
  }
`;

const CLOSE_SURVEY = gql`
  mutation CloseSurvey($surveyId: String!) {
    closeSurvey(surveyId: $surveyId) { id isOpen }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SurveyCard({ survey: initialSurvey, voterToken, isCreator }: { survey: any; voterToken: string; isCreator?: boolean }) {
  const { data, refetch } = useQuery(GET_SURVEY, {
    variables: { surveyId: initialSurvey.id },
  });
  const survey = data?.survey || initialSurvey;
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textValue?: string; ratingValue?: number }>>({});
  const [submitted, setSubmitted] = useState(false);

  const [submitSurvey, { loading }] = useMutation(SUBMIT_SURVEY, {
    onCompleted: () => { setSubmitted(true); refetch(); },
  });
  const [closeSurvey] = useMutation(CLOSE_SURVEY, { onCompleted: () => refetch() });

  const handleSubmit = () => {
    const answerInputs = Object.entries(answers).map(([surveyQuestionId, vals]) => ({
      surveyQuestionId,
      ...vals,
    }));
    submitSurvey({ variables: { surveyId: survey.id, voterToken, answers: answerInputs } });
  };

  const sortedQuestions = [...(survey.questions || [])].sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position,
  );

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 p-4 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{survey.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">{survey.responseCount || 0} responses</span>
          {isCreator && survey.isOpen && (
            <button onClick={() => closeSurvey({ variables: { surveyId: survey.id } })} className="text-xs text-red-400 hover:text-red-300">
              Close
            </button>
          )}
        </div>
      </div>

      {!survey.isOpen && <p className="text-xs text-slate-400">This survey is closed.</p>}

      {survey.isOpen && !submitted && (
        <div className="space-y-4">
          {sortedQuestions.map((q: { id: string; type: string; text: string; isRequired: boolean; options: { id: string; text: string }[] }) => (
            <div key={q.id} className="space-y-2">
              <label className="text-sm text-slate-300">
                {q.text} {q.isRequired && <span className="text-red-400">*</span>}
              </label>

              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-1">
                  {q.options?.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name={`survey-${q.id}`}
                        checked={answers[q.id]?.selectedOptionId === opt.id}
                        onChange={() => setAnswers({ ...answers, [q.id]: { selectedOptionId: opt.id } })}
                        className="accent-indigo-500"
                      />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'OPEN_TEXT' && (
                <textarea
                  rows={2}
                  value={answers[q.id]?.textValue || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: { textValue: e.target.value } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your answer..."
                />
              )}

              {q.type === 'RATING' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: { ratingValue: star } })}
                      className={`text-2xl ${(answers[q.id]?.ratingValue || 0) >= star ? 'text-yellow-400' : 'text-slate-600'} hover:text-yellow-300`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Survey'}
          </button>
        </div>
      )}

      {submitted && <p className="text-xs text-green-400 text-center">Survey submitted! Thank you.</p>}
    </div>
  );
}
