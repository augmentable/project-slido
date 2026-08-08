'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_POLL = gql`
  query GetPoll($pollId: String!) {
    poll(pollId: $pollId) {
      id
      type
      question
      isActive
      responseCount
      options {
        id
        text
        position
        voteCount
      }
      responses {
        id
        textValue
      }
    }
  }
`;

const SUBMIT_RESPONSE = gql`
  mutation SubmitPollResponse(
    $pollId: String!
    $voterToken: String!
    $selectedOptionId: String
    $textValue: String
    $ratingValue: Float
    $rankingOrder: [String!]
  ) {
    submitPollResponse(
      pollId: $pollId
      voterToken: $voterToken
      selectedOptionId: $selectedOptionId
      textValue: $textValue
      ratingValue: $ratingValue
      rankingOrder: $rankingOrder
    )
  }
`;

const ACTIVATE_POLL = gql`
  mutation ActivatePoll($pollId: String!) {
    activatePoll(pollId: $pollId) { id isActive }
  }
`;

const DEACTIVATE_POLL = gql`
  mutation DeactivatePoll($pollId: String!) {
    deactivatePoll(pollId: $pollId) { id isActive }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PollCard({ poll: initialPoll, voterToken, isCreator }: { poll: any; voterToken: string; isCreator?: boolean }) {
  const { data, refetch } = useQuery(GET_POLL, {
    variables: { pollId: initialPoll.id },
    pollInterval: 3000,
  });

  const poll = data?.poll || initialPoll;
  const [selectedOption, setSelectedOption] = useState('');
  const [textValue, setTextValue] = useState('');
  const [ratingValue, setRatingValue] = useState(3);
  const [submitted, setSubmitted] = useState(false);

  const [submitResponse] = useMutation(SUBMIT_RESPONSE, {
    onCompleted: () => { setSubmitted(true); refetch(); },
  });
  const [activatePoll] = useMutation(ACTIVATE_POLL, { onCompleted: () => refetch() });
  const [deactivatePoll] = useMutation(DEACTIVATE_POLL, { onCompleted: () => refetch() });

  const totalVotes = poll.options?.reduce((s: number, o: { voteCount: number }) => s + o.voteCount, 0) || poll.responseCount || 0;

  const handleSubmit = () => {
    submitResponse({
      variables: {
        pollId: poll.id,
        voterToken,
        selectedOptionId: selectedOption || null,
        textValue: textValue || null,
        ratingValue: poll.type === 'RATING' ? ratingValue : null,
      },
    });
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{poll.question}</h3>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${poll.isActive ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
            {poll.isActive ? 'LIVE' : 'CLOSED'}
          </span>
          {isCreator && (
            <button
              onClick={() => poll.isActive ? deactivatePoll({ variables: { pollId: poll.id } }) : activatePoll({ variables: { pollId: poll.id } })}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
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
                    <input
                      type="radio"
                      name={`poll-${poll.id}`}
                      checked={selectedOption === opt.id}
                      onChange={() => setSelectedOption(opt.id)}
                      className="accent-indigo-500"
                    />
                  )}
                  <span className="text-sm text-slate-300 flex-1">{opt.text}</span>
                  <span className="text-xs text-slate-400 font-mono">{opt.voteCount} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : poll.type === 'RATING' ? (
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={!poll.isActive || submitted}
              onClick={() => setRatingValue(star)}
              className={`text-2xl transition-colors ${star <= ratingValue ? 'text-yellow-400' : 'text-slate-600'} ${poll.isActive && !submitted ? 'hover:text-yellow-300 cursor-pointer' : ''}`}
            >
              ★
            </button>
          ))}
          <span className="text-xs text-slate-400 font-mono ml-auto">{poll.responseCount || 0} responses</span>
        </div>
      ) : poll.type === 'WORD_CLOUD' ? (
        <div className="space-y-3">
          <WordCloud responses={poll.responses || []} />
          {poll.isActive && !submitted && (
            <input
              type="text"
              placeholder="Enter a word..."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <span className="text-xs text-slate-400 font-mono">{poll.responseCount || 0} responses</span>
        </div>
      ) : poll.type === 'OPEN_TEXT' ? (
        <div className="space-y-2">
          {poll.isActive && !submitted && (
            <input
              type="text"
              placeholder="Type your answer..."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <span className="text-xs text-slate-400 font-mono">{poll.responseCount || 0} responses</span>
        </div>
      ) : null}

      {poll.isActive && !submitted && (
        <button
          onClick={handleSubmit}
          disabled={
            (poll.type === 'MULTIPLE_CHOICE' && !selectedOption) &&
            (poll.type !== 'RATING' && poll.type !== 'WORD_CLOUD' && poll.type !== 'OPEN_TEXT')
          }
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          Submit Vote
        </button>
      )}
      {submitted && (
        <p className="text-xs text-green-400 text-center">Response submitted!</p>
      )}
    </div>
  );
}

function WordCloud({ responses }: { responses: { textValue: string | null }[] }) {
  const wordCounts = new Map<string, number>();
  for (const r of responses) {
    if (!r.textValue) continue;
    const word = r.textValue.toLowerCase().trim();
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  if (wordCounts.size === 0) {
    return <p className="text-xs text-slate-500 text-center py-4">No words yet</p>;
  }

  const entries = [...wordCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = entries[0][1];
  const colors = ['text-indigo-400', 'text-blue-400', 'text-purple-400', 'text-pink-400', 'text-cyan-400', 'text-emerald-400', 'text-amber-400', 'text-rose-400'];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4 bg-slate-900/50 rounded-lg px-4 min-h-20">
      {entries.map(([word, count], i) => {
        const scale = 0.75 + (count / maxCount) * 1.25;
        const colorClass = colors[i % colors.length];
        return (
          <span
            key={word}
            className={`font-bold transition-all ${colorClass}`}
            style={{ fontSize: `${scale}rem`, opacity: 0.6 + (count / maxCount) * 0.4 }}
            title={`${word}: ${count}`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
