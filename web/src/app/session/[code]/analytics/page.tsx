'use client';

import { use } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const GET_SESSION = gql`
  query GetSession($code: String!) {
    session(code: $code) {
      id
      title
      code
    }
  }
`;

const GET_ANALYTICS = gql`
  query GetAnalytics($sessionId: String!) {
    sessionAnalytics(sessionId: $sessionId) {
      totalParticipants
      totalQuestions
      totalUpvotes
      totalPolls
      totalPollResponses
      totalQuizzes
      quizAverageScore
      totalSurveys
      totalSurveyResponses
    }
  }
`;

export default function AnalyticsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { data: sessionData } = useQuery(GET_SESSION, {
    variables: { code: code.toUpperCase() },
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = sessionData?.session;

  const { data: analyticsData, loading } = useQuery(GET_ANALYTICS, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    pollInterval: 5000,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const analytics = analyticsData?.sessionAnalytics;

  if (!session || loading || !analytics) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-mono">Loading analytics...</p>
      </main>
    );
  }

  const chartData = [
    { name: 'Questions', value: analytics.totalQuestions },
    { name: 'Upvotes', value: analytics.totalUpvotes },
    { name: 'Poll Responses', value: analytics.totalPollResponses },
    { name: 'Survey Responses', value: analytics.totalSurveyResponses },
  ];

  const cards = [
    { label: 'Participants', value: analytics.totalParticipants, color: 'text-indigo-400' },
    { label: 'Questions', value: analytics.totalQuestions, color: 'text-blue-400' },
    { label: 'Upvotes', value: analytics.totalUpvotes, color: 'text-green-400' },
    { label: 'Polls', value: analytics.totalPolls, color: 'text-purple-400' },
    { label: 'Poll Responses', value: analytics.totalPollResponses, color: 'text-pink-400' },
    { label: 'Quizzes', value: analytics.totalQuizzes, color: 'text-yellow-400' },
    { label: 'Avg Quiz Score', value: Math.round(analytics.quizAverageScore), color: 'text-orange-400' },
    { label: 'Surveys', value: analytics.totalSurveys, color: 'text-teal-400' },
    { label: 'Survey Responses', value: analytics.totalSurveyResponses, color: 'text-cyan-400' },
  ];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <Link href={`/session/${code}`} className="text-xs text-indigo-400 hover:underline font-mono uppercase tracking-wider">
              &larr; Back to Session
            </Link>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">{session.title} &mdash; Analytics</h1>
          </div>
          <a
            href={`/api/export/${session.id}`}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Export CSV
          </a>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-xl text-center">
              <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
              <p className="text-xs text-slate-400 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 p-6 rounded-xl">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Engagement Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
