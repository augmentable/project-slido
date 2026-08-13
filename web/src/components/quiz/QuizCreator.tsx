
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_QUIZ = gql`mutation CreateQuiz($sessionId: String!, $title: String!) { createQuiz(sessionId: $sessionId, title: $title) { id title } }`;
const ADD_QUIZ_QUESTION = gql`mutation AddQuizQuestion($quizId: String!, $text: String!, $options: [String!]!, $correctOptionIndex: Float!, $timeLimit: Float) { addQuizQuestion(quizId: $quizId, text: $text, options: $options, correctOptionIndex: $correctOptionIndex, timeLimit: $timeLimit) { id text } }`;

export function QuizCreator({ sessionId, onCreated }: { sessionId: string; onCreated: () => void }) {
  const [step, setStep] = useState<'title' | 'questions'>('title');
  const [title, setTitle] = useState('');
  const [quizId, setQuizId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [questionsAdded, setQuestionsAdded] = useState(0);
  const [createQuiz] = useMutation(CREATE_QUIZ, { onCompleted: (data: any) => { setQuizId(data.createQuiz.id); setStep('questions'); } });
  const [addQuestion, { loading }] = useMutation(ADD_QUIZ_QUESTION, { onCompleted: () => { setQuestionText(''); setOptions(['', '', '', '']); setCorrectIndex(0); setQuestionsAdded((n) => n + 1); } });

  if (step === 'title') {
    return (
      <div className="themed-card p-4 space-y-3 animate-fade-in">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Create Quiz</h3>
        <input type="text" placeholder="Quiz title..." value={title} onChange={(e) => setTitle(e.target.value)} className="themed-input w-full" />
        <button onClick={() => createQuiz({ variables: { sessionId, title } })} disabled={!title.trim()} className="themed-btn w-full">Create Quiz</button>
      </div>
    );
  }

  return (
    <div className="themed-card p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Add Question ({questionsAdded} added)</h3>
        <button onClick={onCreated} className="text-xs" style={{ color: 'var(--accent)' }}>Done</button>
      </div>
      <input type="text" placeholder="Question text..." value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="themed-input w-full" />
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} style={{ accentColor: 'var(--success)' }} />
            <input type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} className="themed-input flex-1" />
          </div>
        ))}
        <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Select the correct answer with the radio button</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Time limit:</label>
        <input type="number" min={5} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="themed-input w-16 text-center" style={{ padding: '4px 8px' }} />
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>seconds</span>
      </div>
      <button onClick={() => addQuestion({ variables: { quizId, text: questionText, options: options.filter((o) => o.trim()), correctOptionIndex: correctIndex, timeLimit } })}
        disabled={loading || !questionText.trim() || options.filter((o) => o.trim()).length < 2} className="themed-btn w-full">
        {loading ? 'Adding...' : 'Add Question'}
      </button>
    </div>
  );
}
