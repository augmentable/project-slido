import { getDb } from '@/db';
import * as s from '@/db/schema';
import { eq, count, avg } from 'drizzle-orm';

export async function handleExport(sessionId: string, format: string, d1: D1Database): Promise<Response> {
  const sid = Number(sessionId);
  const db = getDb(d1);

  try {
    const [qCount] = await db.select({ c: count() }).from(s.questions).where(eq(s.questions.sessionId, sid));
    const [uCount] = await db.select({ c: count() }).from(s.upvotes)
      .innerJoin(s.questions, eq(s.upvotes.questionId, s.questions.id))
      .where(eq(s.questions.sessionId, sid));
    const [pCount] = await db.select({ c: count() }).from(s.polls).where(eq(s.polls.sessionId, sid));
    const [prCount] = await db.select({ c: count() }).from(s.pollResponses)
      .innerJoin(s.polls, eq(s.pollResponses.pollId, s.polls.id))
      .where(eq(s.polls.sessionId, sid));
    const [qzCount] = await db.select({ c: count() }).from(s.quizzes).where(eq(s.quizzes.sessionId, sid));
    const [avgScore] = await db.select({ a: avg(s.quizAnswers.score) }).from(s.quizAnswers)
      .innerJoin(s.quizQuestions, eq(s.quizAnswers.quizQuestionId, s.quizQuestions.id))
      .innerJoin(s.quizzes, eq(s.quizQuestions.quizId, s.quizzes.id))
      .where(eq(s.quizzes.sessionId, sid));
    const [svCount] = await db.select({ c: count() }).from(s.surveys).where(eq(s.surveys.sessionId, sid));
    const [srCount] = await db.select({ c: count() }).from(s.surveyResponses)
      .innerJoin(s.surveys, eq(s.surveyResponses.surveyId, s.surveys.id))
      .where(eq(s.surveys.sessionId, sid));

    const rows: string[][] = [['Metric', 'Value']];
    rows.push(
      ['Total Questions', String(qCount.c)],
      ['Total Upvotes', String(uCount.c)],
      ['Total Polls', String(pCount.c)],
      ['Total Poll Responses', String(prCount.c)],
      ['Total Quizzes', String(qzCount.c)],
      ['Average Quiz Score', String(Math.round(Number(avgScore.a) || 0))],
      ['Total Surveys', String(svCount.c)],
      ['Total Survey Responses', String(srCount.c)],
    );

    if (format === 'full') {
      rows.push([], ['--- QUESTIONS ---']);
      rows.push(['ID', 'Text', 'Author', 'Upvotes', 'Answered']);

      const questionsList = await db.query.questions.findMany({
        where: eq(s.questions.sessionId, sid),
        with: { replies: true, upvotes: true },
      });

      for (const q of questionsList) {
        rows.push([
          String(q.id),
          `"${q.text}"`,
          q.authorName || 'Anonymous',
          String(q.upvotes.length),
          q.isAnswered ? 'Yes' : 'No',
        ]);
      }

      rows.push([], ['--- POLLS ---']);
      rows.push(['ID', 'Type', 'Question', 'Options & Votes']);

      const pollsList = await db.query.polls.findMany({
        where: eq(s.polls.sessionId, sid),
        with: { options: true },
      });

      for (const p of pollsList) {
        const optInfo = p.options.map((o) => `${o.text}`).join(', ');
        rows.push([String(p.id), p.type, `"${p.question}"`, `"${optInfo}"`]);
      }
    }

    const csv = rows.map((row) => row.join(',')).join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="session-${sessionId}-${format}.csv"`,
      },
    });
  } catch {
    return Response.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
