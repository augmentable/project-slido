import { NextResponse } from 'next/server';

const EXPORT_QUERY = `
  query ExportData($sessionId: String!) {
    sessionAnalytics(sessionId: $sessionId) {
      totalParticipants totalQuestions totalUpvotes
      totalPolls totalPollResponses totalQuizzes
      quizAverageScore totalSurveys totalSurveyResponses
    }
  }
`;

const SESSION_DETAIL_QUERY = `
  query SessionDetailExport($code: String!) {
    session(code: $code) {
      id title code
      questions { id text authorName isAnswered upvoteCount createdAt replies { text authorName } }
      polls { id type question options { text voteCount } }
      surveys { id title questions { text type } }
    }
  }
`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'summary';

  try {
    const analyticsRes = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: EXPORT_QUERY, variables: { sessionId } }),
    });
    const analyticsJson = await analyticsRes.json();
    const analytics = analyticsJson.data?.sessionAnalytics;
    if (!analytics) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const rows: string[][] = [['Metric', 'Value']];
    rows.push(
      ['Total Participants', analytics.totalParticipants],
      ['Total Questions', analytics.totalQuestions],
      ['Total Upvotes', analytics.totalUpvotes],
      ['Total Polls', analytics.totalPolls],
      ['Total Poll Responses', analytics.totalPollResponses],
      ['Total Quizzes', analytics.totalQuizzes],
      ['Average Quiz Score', Math.round(analytics.quizAverageScore).toString()],
      ['Total Surveys', analytics.totalSurveys],
      ['Total Survey Responses', analytics.totalSurveyResponses],
    );

    if (format === 'full') {
      rows.push([], ['--- QUESTIONS ---']);
      rows.push(['ID', 'Text', 'Author', 'Upvotes', 'Answered', 'Replies']);

      const detailRes = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SESSION_DETAIL_QUERY, variables: { code: '' } }),
      });
      const detailJson = await detailRes.json();
      const session = detailJson.data?.session;
      if (session?.questions) {
        for (const q of session.questions) {
          const replyTexts = q.replies?.map((r: { authorName: string; text: string }) => `${r.authorName}: ${r.text}`).join(' | ') || '';
          rows.push([q.id, `"${q.text}"`, q.authorName || 'Anonymous', q.upvoteCount, q.isAnswered ? 'Yes' : 'No', `"${replyTexts}"`]);
        }
      }

      rows.push([], ['--- POLLS ---']);
      rows.push(['ID', 'Type', 'Question', 'Options & Votes']);
      if (session?.polls) {
        for (const p of session.polls) {
          const optionInfo = p.options?.map((o: { text: string; voteCount: number }) => `${o.text}(${o.voteCount})`).join(', ') || '';
          rows.push([p.id, p.type, `"${p.question}"`, `"${optionInfo}"`]);
        }
      }
    }

    const csv = rows.map((row) => row.join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="session-${sessionId}-${format}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
