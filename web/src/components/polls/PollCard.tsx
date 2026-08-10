'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_POLL = gql`
  query GetPoll($pollId: String!) {
    poll(pollId: $pollId) {
      id type question isActive responseCount
      options { id text position voteCount }
      responses { id textValue }
    }
  }
`;

const SUBMIT_RESPONSE = gql`
  mutation SubmitPollResponse($pollId: String!, $voterToken: String!, $selectedOptionId: String, $textValue: String, $ratingValue: Float, $rankingOrder: [String!]) {
    submitPollResponse(pollId: $pollId, voterToken: $voterToken, selectedOptionId: $selectedOptionId, textValue: $textValue, ratingValue: $ratingValue, rankingOrder: $rankingOrder)
  }
`;

const ACTIVATE_POLL = gql`mutation ActivatePoll($pollId: String!) { activatePoll(pollId: $pollId) { id isActive } }`;
const DEACTIVATE_POLL = gql`mutation DeactivatePoll($pollId: String!) { deactivatePoll(pollId: $pollId) { id isActive } }`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PollCard({ poll: initialPoll, voterToken, isCreator }: { poll: any; voterToken: string; isCreator?: boolean }) {
  const { data, refetch } = useQuery(GET_POLL, {
    variables: { pollId: initialPoll.id },
    pollInterval: 3000,
    notifyOnNetworkStatusChange: false,
  });

  const poll = data?.poll || initialPoll;
  const [selectedOption, setSelectedOption] = useState('');
  const [textValue, setTextValue] = useState('');
  const [ratingValue, setRatingValue] = useState(3);
  const [submitted, setSubmitted] = useState(false);

  const [submitResponse] = useMutation(SUBMIT_RESPONSE, { onCompleted: () => { setSubmitted(true); refetch(); } });
  const [activatePoll] = useMutation(ACTIVATE_POLL, { onCompleted: () => refetch() });
  const [deactivatePoll] = useMutation(DEACTIVATE_POLL, { onCompleted: () => refetch() });

  const totalVotes = poll.options?.reduce((s: number, o: { voteCount: number }) => s + o.voteCount, 0) || poll.responseCount || 0;

  const handleSubmit = () => {
    submitResponse({
      variables: { pollId: poll.id, voterToken, selectedOptionId: selectedOption || null, textValue: textValue || null, ratingValue: poll.type === 'RATING' ? ratingValue : null },
    });
  };

  return (
    <div className="themed-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{poll.question}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium" style={{
            background: poll.isActive ? 'var(--success-subtle)' : 'var(--bg-raised)',
            color: poll.isActive ? 'var(--success)' : 'var(--text-faint)',
          }}>
            {poll.isActive ? 'LIVE' : 'CLOSED'}
          </span>
          {isCreator && (
            <button onClick={() => poll.isActive ? deactivatePoll({ variables: { pollId: poll.id } }) : activatePoll({ variables: { pollId: poll.id } })} className="text-xs" style={{ color: 'var(--accent)' }}>
              {poll.isActive ? 'Close' : 'Open'}
            </button>
          )}
        </div>
      </div>

      {poll.type === 'MULTIPLE_CHOICE' || poll.type === 'RANKING' ? (
        <div className="space-y-2">
          {[...(poll.options || [])].sort((a: {position: number}, b: {position: number}) => a.position - b.position).map((opt: { id: string; text: string; voteCount: number }) => {
            const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  {poll.isActive && !submitted && (
                    <input type="radio" name={`poll-${poll.id}`} checked={selectedOption === opt.id} onChange={() => setSelectedOption(opt.id)} style={{ accentColor: 'var(--accent)' }} />
                  )}
                  <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>{opt.text}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{opt.voteCount} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                  <div className="h-full bar-fill rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : poll.type === 'RATING' ? (
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" disabled={!poll.isActive || submitted} onClick={() => setRatingValue(star)}
              className="text-2xl transition-colors cursor-pointer disabled:cursor-default"
              style={{ color: star <= ratingValue ? 'var(--warning)' : 'var(--text-faint)' }}>★</button>
          ))}
          <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>{poll.responseCount || 0} responses</span>
        </div>
      ) : poll.type === 'WORD_CLOUD' ? (
        <div className="space-y-3">
          <WordCloud responses={poll.responses || []} />
          {poll.isActive && !submitted && (
            <input type="text" placeholder="Enter a word..." value={textValue} onChange={(e) => setTextValue(e.target.value)} className="themed-input w-full" />
          )}
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{poll.responseCount || 0} responses</span>
        </div>
      ) : poll.type === 'OPEN_TEXT' ? (
        <div className="space-y-2">
          {poll.isActive && !submitted && (
            <input type="text" placeholder="Type your answer..." value={textValue} onChange={(e) => setTextValue(e.target.value)} className="themed-input w-full" />
          )}
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{poll.responseCount || 0} responses</span>
        </div>
      ) : null}

      {poll.isActive && !submitted && (
        <button onClick={handleSubmit}
          disabled={(poll.type === 'MULTIPLE_CHOICE' && !selectedOption) && (poll.type !== 'RATING' && poll.type !== 'WORD_CLOUD' && poll.type !== 'OPEN_TEXT')}
          className="themed-btn w-full">Submit Vote</button>
      )}
      {submitted && <p className="text-xs text-center" style={{ color: 'var(--success)' }}>Response submitted!</p>}
    </div>
  );
}

function WordCloud({ responses }: { responses: { textValue: string | null }[] }) {
  const wordCounts = new Map<string, number>();
  for (const r of responses) {
    if (!r.textValue) continue;
    wordCounts.set(r.textValue.toLowerCase().trim(), (wordCounts.get(r.textValue.toLowerCase().trim()) || 0) + 1);
  }
  if (wordCounts.size === 0) return <p className="text-xs text-center py-4" style={{ color: 'var(--text-faint)' }}>No words yet</p>;

  const entries = [...wordCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = entries[0][1];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4 px-4 min-h-20 rounded-lg" style={{ background: 'var(--bg-input)' }}>
      {entries.map(([word, count]) => {
        const scale = 0.75 + (count / maxCount) * 1.25;
        return (
          <span key={word} className="font-bold transition-all" style={{ fontSize: `${scale}rem`, color: 'var(--accent)', opacity: 0.5 + (count / maxCount) * 0.5 }} title={`${word}: ${count}`}>
            {word}
          </span>
        );
      })}
    </div>
  );
}
