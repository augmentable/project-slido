import { Hono } from 'hono';
import { createGraphQLHandler } from './api/graphql';
import { handleExport } from './api/export';
import { handleTitle } from './api/title';

export { SessionDO } from './do/SessionDO';

type Bindings = {
  DB: D1Database;
  SESSION_DO: DurableObjectNamespace;
  ASSETS: Fetcher;
  OPENROUTER?: string;
  ADMIN_PASSWORD?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.all('/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426);
  }
  const code = new URL(c.req.url).searchParams.get('code');
  if (code && c.env.SESSION_DO) {
    const id = c.env.SESSION_DO.idFromName(code.toUpperCase());
    return c.env.SESSION_DO.get(id).fetch(c.req.raw);
  }
  return c.text('Missing code parameter', 400);
});

app.all('/api/graphql', async (c) => {
  const yoga = createGraphQLHandler(c.env.DB, c.env.ADMIN_PASSWORD);
  return yoga.handle(c.req.raw);
});

app.post('/api/title', async (c) => {
  return handleTitle(c.req.raw, c.env.DB, c.env.OPENROUTER);
});

app.get('/api/export/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const format = new URL(c.req.url).searchParams.get('format') || 'summary';
  return handleExport(sessionId, format, c.env.DB);
});

app.get('*', async (c) => {
  // SPA fallback: serve index.html for client-side routes
  // Static assets are served automatically by Cloudflare's asset handling
  // before reaching the worker — this catch-all only fires for non-asset paths
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
});

export default app;
