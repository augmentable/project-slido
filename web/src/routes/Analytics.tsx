import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link, useParams } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GET_SESSION = gql`query GetSession($code: String!) { session(code: $code) { id title code } }`;
const GET_ANALYTICS = gql`query GetAnalytics($sessionId: String!) { sessionAnalytics(sessionId: $sessionId) { totalParticipants totalQuestions totalUpvotes totalPolls totalPollResponses totalQuizzes quizAverageScore totalSurveys totalSurveyResponses } }`;

export default function AnalyticsPage() {
  const { code } = useParams<{ code: string }>();
  const { data: sessionData } = useQuery(GET_SESSION, { variables: { code: code!.toUpperCase() } });
  const session = (sessionData as { session?: { id: string; title: string; code: string } })?.session;
  const { data: analyticsData, loading } = useQuery(GET_ANALYTICS, { variables: { sessionId: session?.id || '' }, skip: !session?.id, pollInterval: 5000 });
  const analytics = (analyticsData as { sessionAnalytics?: Record<string, number> })?.sessionAnalytics;

  if (!session || loading || !analytics) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="animate-pulse-glow w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
      </main>
    );
  }

  const chartData = [
    { name: 'Questions', value: analytics.totalQuestions },
    { name: 'Upvotes', value: analytics.totalUpvotes },
    { name: 'Poll Resp.', value: analytics.totalPollResponses },
    { name: 'Survey Resp.', value: analytics.totalSurveyResponses },
  ];

  const cards = [
    { label: 'Participants', value: analytics.totalParticipants },
    { label: 'Questions', value: analytics.totalQuestions },
    { label: 'Upvotes', value: analytics.totalUpvotes },
    { label: 'Polls', value: analytics.totalPolls },
    { label: 'Poll Responses', value: analytics.totalPollResponses },
    { label: 'Quizzes', value: analytics.totalQuizzes },
    { label: 'Avg Quiz Score', value: Math.round(analytics.quizAverageScore) },
    { label: 'Surveys', value: analytics.totalSurveys },
    { label: 'Survey Responses', value: analytics.totalSurveyResponses },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-4xl w-full space-y-8">
        <div className="flex items-center justify-between pb-4 animate-fade-in" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <Link to={`/session/${code}`} className="text-xs font-medium uppercase tracking-wider hover:underline" style={{ color: 'var(--accent)' }}>&larr; Back to Session</Link>
            <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>{session.title} — Analytics</h1>
          </div>
          <a href={`/api/export/${session.id}`} className="themed-btn-ghost text-sm">Export CSV</a>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {cards.map((card, i) => (
            <div key={card.label} className={`themed-card p-4 text-center animate-slide-up stagger-${Math.min(i + 1, 6)}`}>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--accent)', animation: 'count-up 0.5s ease-out both', animationDelay: `${i * 0.06}s` }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            </div>
          ))}
        </div>

        <div className="themed-card p-6 animate-slide-up stagger-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Engagement Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} />
              <Bar dataKey="value" fill="var(--bar-fill)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
