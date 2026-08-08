import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const query = `
    query ExportData($sessionId: String!) {
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

  try {
    const res = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { sessionId } }),
    });

    const json = await res.json();
    const analytics = json.data?.sessionAnalytics;

    if (!analytics) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const rows = [
      ['Metric', 'Value'],
      ['Total Participants', analytics.totalParticipants],
      ['Total Questions', analytics.totalQuestions],
      ['Total Upvotes', analytics.totalUpvotes],
      ['Total Polls', analytics.totalPolls],
      ['Total Poll Responses', analytics.totalPollResponses],
      ['Total Quizzes', analytics.totalQuizzes],
      ['Average Quiz Score', Math.round(analytics.quizAverageScore)],
      ['Total Surveys', analytics.totalSurveys],
      ['Total Survey Responses', analytics.totalSurveyResponses],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="session-${sessionId}-analytics.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
