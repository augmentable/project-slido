'use client';

import { use, useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DisplayControls } from '@/components/DisplayControls';

const GET_SESSION = gql`query GetSession($code: String!) { session(code: $code) { id title code pollsEnabled quizzesEnabled repliesEnabled surveysEnabled votesEnabled saturdayBannerEnabled reactionsEnabled } }`;
const GET_ANALYTICS = gql`query GetAnalytics($sessionId: String!) { sessionAnalytics(sessionId: $sessionId) { totalParticipants totalQuestions totalUpvotes totalPolls totalPollResponses totalQuizzes quizAverageScore totalSurveys totalSurveyResponses } }`;
const UPDATE_SESSION_FEATURES = gql`mutation UpdateSessionFeatures($sessionId: String!, $pollsEnabled: Boolean, $quizzesEnabled: Boolean, $repliesEnabled: Boolean, $surveysEnabled: Boolean, $votesEnabled: Boolean, $saturdayBannerEnabled: Boolean, $reactionsEnabled: Boolean) { updateSessionFeatures(sessionId: $sessionId, pollsEnabled: $pollsEnabled, quizzesEnabled: $quizzesEnabled, repliesEnabled: $repliesEnabled, surveysEnabled: $surveysEnabled, votesEnabled: $votesEnabled, saturdayBannerEnabled: $saturdayBannerEnabled, reactionsEnabled: $reactionsEnabled) { id pollsEnabled quizzesEnabled repliesEnabled surveysEnabled votesEnabled saturdayBannerEnabled reactionsEnabled } }`;
const ADMIN_LOGIN = gql`mutation AdminLogin($password: String!) { adminLogin(password: $password) { token } }`;
const ADMIN_SETTINGS = gql`query AdminSettings($adminToken: String!) { adminSettings(adminToken: $adminToken) { openrouterKeySet openrouterKeyPreview } }`;
const SET_OPENROUTER_KEY = gql`mutation SetOpenrouterKey($adminToken: String!, $key: String!) { setOpenrouterKey(adminToken: $adminToken, key: $key) { openrouterKeySet openrouterKeyPreview } }`;

const FEATURE_DEFAULTS = {
  pollsEnabled: false,
  quizzesEnabled: false,
  repliesEnabled: false,
  surveysEnabled: true,
  votesEnabled: true,
  saturdayBannerEnabled: true,
  reactionsEnabled: false,
} as const;

const FEATURE_OPTIONS: { key: keyof typeof FEATURE_DEFAULTS; label: string }[] = [
  { key: 'pollsEnabled', label: 'Polls' },
  { key: 'quizzesEnabled', label: 'Quizzes' },
  { key: 'repliesEnabled', label: 'Replies' },
  { key: 'surveysEnabled', label: 'Surveys' },
  { key: 'votesEnabled', label: 'Votes' },
  { key: 'reactionsEnabled', label: 'Reactions' },
  { key: 'saturdayBannerEnabled', label: 'Saturday banner' },
];

function isAdminAuthError(error: unknown): boolean {
  return /admin authentication required/i.test(serverErrorMessage(error));
}

// graphql-yoga masks resolver errors as "Unexpected error." and keeps the real
// message in extensions.originalError; dig it out so users see the server text.
function serverErrorMessage(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    const gqlError = error.errors[0];
    const original = gqlError?.extensions?.originalError;
    if (original && typeof original === 'object' && 'message' in original && typeof original.message === 'string' && original.message) {
      return original.message;
    }
    if (gqlError?.message) return gqlError.message;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

export default function SettingsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: sessionData } = useQuery(GET_SESSION, { variables: { code: code.toUpperCase() } });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = sessionData?.session;
  const { data: analyticsData } = useQuery(GET_ANALYTICS, {
    variables: { sessionId: session?.id || '' },
    skip: !session?.id,
    pollInterval: 15000,
    // Keep the previous result on screen while a poll is in flight, so the page
    // never drops back to the loading gate and re-runs its entry animations.
    notifyOnNetworkStatusChange: false,
    fetchPolicy: 'cache-first',
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const analytics = analyticsData?.sessionAnalytics;

  // ── Feature flags ──
  const [updateFeature, { error: updateFeatureError }] = useMutation(UPDATE_SESSION_FEATURES, {
    refetchQueries: [{ query: GET_SESSION, variables: { code: code.toUpperCase() } }],
  });
  const toggleFeature = (key: keyof typeof FEATURE_DEFAULTS, value: boolean) => {
    updateFeature({ variables: { sessionId: String(session.id), [key]: value } });
  };

  // ── Admin (OpenRouter key management) ──
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    setAdminToken(window.sessionStorage.getItem('slido_admin_token'));
  }, []);

  const [adminLogin] = useMutation(ADMIN_LOGIN);
  const [setOpenrouterKey] = useMutation(SET_OPENROUTER_KEY, {
    refetchQueries: [{ query: ADMIN_SETTINGS, variables: { adminToken: adminToken ?? '' } }],
  });

  const { data: adminData, error: adminQueryError, loading: adminLoading } = useQuery(ADMIN_SETTINGS, {
    variables: { adminToken: adminToken ?? '' },
    skip: !adminToken,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const adminSettings = adminData?.adminSettings;

  // If the stored token no longer authorizes, drop it and return to the locked state.
  useEffect(() => {
    if (adminQueryError && isAdminAuthError(adminQueryError)) {
      window.sessionStorage.removeItem('slido_admin_token');
      setAdminToken(null);
    }
  }, [adminQueryError]);

  const handleAdminLogin = async () => {
    setAdminError(null);
    try {
      const result = await adminLogin({ variables: { password: adminPassword } });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const token = result.data?.adminLogin?.token;
      if (typeof token === 'string') {
        window.sessionStorage.setItem('slido_admin_token', token);
        setAdminToken(token);
        setAdminPassword('');
      }
    } catch (err) {
      setAdminError(serverErrorMessage(err));
    }
  };

  const handleSaveKey = async (key: string) => {
    if (!adminToken) return;
    setAdminError(null);
    try {
      await setOpenrouterKey({ variables: { adminToken, key } });
      setAdminKeyInput('');
    } catch (err) {
      if (isAdminAuthError(err)) {
        window.sessionStorage.removeItem('slido_admin_token');
        setAdminToken(null);
      } else {
        setAdminError(serverErrorMessage(err));
      }
    }
  };

  const handleLock = () => {
    window.sessionStorage.removeItem('slido_admin_token');
    setAdminToken(null);
    setAdminError(null);
  };

  if (!session || !analytics) {
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
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider">
              <Link href={`/session/${code}`} className="hover:underline" style={{ color: 'var(--accent)' }}>&larr; Back to Session</Link>
            </div>
            <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>{session.title} — Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/api/export/${session.id}`} className="themed-btn-ghost text-sm">Export CSV</a>
            <DisplayControls compact />
          </div>
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

        <div className="themed-card p-6 animate-slide-up stagger-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURE_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={session[option.key] ?? FEATURE_DEFAULTS[option.key]}
                  onChange={(e) => toggleFeature(option.key, e.target.checked)}
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--accent)' }}
                />
                {option.label}
              </label>
            ))}
          </div>
          {updateFeatureError && (
            <p className="text-xs mt-3" style={{ color: 'var(--danger)' }}>{serverErrorMessage(updateFeatureError)}</p>
          )}
        </div>

        <div className="themed-card p-6 animate-slide-up stagger-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Admin</h2>
          {!adminToken ? (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enter the admin password to manage the OpenRouter API key.</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                  placeholder="Admin password"
                  className="themed-input flex-1"
                />
                <button onClick={handleAdminLogin} className="themed-btn">Unlock</button>
              </div>
              {adminError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{adminError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                OpenRouter key: {adminLoading ? 'Checking…' : adminSettings?.openrouterKeySet ? `Set (${adminSettings.openrouterKeyPreview})` : 'Not set'}
              </p>
              {adminQueryError && !isAdminAuthError(adminQueryError) && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{serverErrorMessage(adminQueryError)}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="New OpenRouter key"
                  className="themed-input flex-1"
                />
                <button onClick={() => handleSaveKey(adminKeyInput)} className="themed-btn" disabled={!adminKeyInput.trim()}>Save key</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSaveKey('')} className="themed-btn-ghost text-sm">Clear key</button>
                <button onClick={handleLock} className="themed-btn-ghost text-sm">Lock</button>
              </div>
              {adminError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{adminError}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
