import { NextResponse } from 'next/server';
import { clampQuestionTitle } from '@/lib/question-title';
import { getDb, type Db } from '@/db';
import * as s from '@/db/schema';
import { eq } from 'drizzle-orm';

const TITLE_MODEL = 'deepseek/deepseek-v4-flash-0731';
const OPENROUTER_KEY = 'openrouter_key';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TITLE_SYSTEM_PROMPT =
  'Return only the title. Use at most 10 words and fewer than 80 characters. Do not use quotes or a trailing period. Use sentence case. Capture the actual ask.';

function failureStatus(error: unknown): string | number {
  if (error instanceof Error && error.name === 'AbortError') return 'timeout';
  return 'error';
}

function extractContent(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('choices' in data) || !Array.isArray(data.choices)) {
    return undefined;
  }
  const first = data.choices[0];
  if (typeof first !== 'object' || first === null || !('message' in first)) return undefined;
  const message = first.message;
  if (typeof message !== 'object' || message === null || !('content' in message)) return undefined;
  return typeof message.content === 'string' ? message.content : undefined;
}

async function getDbInstance(): Promise<Db> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext();
    return getDb(ctx.env.DB);
  } catch {
    const { default: Database } = await import('better-sqlite3');
    const { readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const d1Dir = join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
    const files = readdirSync(d1Dir).filter((f: string) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
    if (!files.length) throw new Error('No local D1 database found.');
    const sqliteDb = new Database(join(d1Dir, files[0]));
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const schemaImport = await import('@/db/schema');
    return drizzle(sqliteDb, { schema: schemaImport }) as unknown as Db;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const text = typeof body === 'object' && body !== null && 'text' in body
    ? body.text
    : undefined;
  if (typeof text !== 'string' || text.trim().length < 12) {
    return NextResponse.json(
      { error: 'Text must be at least 12 characters long' },
      { status: 400 },
    );
  }

  let apiKey = '';
  try {
    const db = await getDbInstance();
    const [row] = await db.select().from(s.appSettings).where(eq(s.appSettings.key, OPENROUTER_KEY));
    apiKey = row?.value?.trim() ?? '';
  } catch (error) {
    console.warn('[title] failed to read app_settings.openrouter_key, falling back to env', error);
  }
  if (!apiKey) apiKey = process.env.OPENROUTER?.trim() ?? '';
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenRouter API key is not configured' },
      { status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        messages: [
          { role: 'system', content: TITLE_SYSTEM_PROMPT },
          { role: 'user', content: text.trim() },
        ],
        temperature: 0.2,
        max_tokens: 300,
        reasoning: { enabled: false, exclude: true },
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.warn(`[title] OpenRouter model failed: ${TITLE_MODEL} (status=${failureStatus(error)})`);
    return NextResponse.json({ error: 'Unable to generate a question title right now' }, { status: 503 });
  }

  if (response.status !== 200) {
    console.warn(`[title] OpenRouter model failed: ${TITLE_MODEL} (status=${response.status})`);
    return NextResponse.json(
      {
        error: response.status === 402
          ? 'OpenRouter account is out of credits. Add credits or configure another account.'
          : 'Unable to generate a question title right now',
      },
      { status: 503 },
    );
  }

  try {
    const data: unknown = await response.json();
    const content = extractContent(data);
    const title = typeof content === 'string' ? clampQuestionTitle(content) : '';
    if (title) return NextResponse.json({ title });
    console.warn(`[title] OpenRouter model failed: ${TITLE_MODEL} (status=${response.status}, empty title)`);
  } catch (error) {
    console.warn(`[title] OpenRouter model failed: ${TITLE_MODEL} (status=${response.status}, ${failureStatus(error)})`);
  }

  return NextResponse.json(
    {
      error: 'Unable to generate a question title right now',
    },
    { status: 503 },
  );
}
