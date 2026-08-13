import { describe, it, expect } from 'vitest';

const SAMPLE_WORKER = `export { DOClass } from "../src/do/Other";
export default {
  async fetch(request, env, ctx) {
    return runWithCloudflareRequestContext(request, env, ctx, async () => {
      return handler(request, env, ctx);
    });
  }
};
`;

const SAMPLE_WORKER_NO_EXPORTS = `export default {
  async fetch(request, env, ctx) {
    return handler(request, env, ctx);
  }
};
`;

function patchWorker(source: string): string {
  const doExport = `export { SessionDO } from "../src/do/SessionDO";\n`;

  if (source.includes('SessionDO')) {
    return source;
  }

  const lastExportIdx = source.lastIndexOf('export {');
  if (lastExportIdx === -1) {
    source = doExport + source;
  } else {
    const lineEnd = source.indexOf('\n', lastExportIdx);
    source = source.slice(0, lineEnd + 1) + doExport + source.slice(lineEnd + 1);
  }

  source = source.replace(
    /export default \{[\s\n]*async fetch\(request, env, ctx\) \{/,
    `const __originalWorker = { async fetch(request, env, ctx) {`
  );

  source = source.replace(
    /\};\s*$/,
    `};

export default {
  async fetch(request, env, ctx) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      if (code && env.SESSION_DO) {
        const id = env.SESSION_DO.idFromName(code.toUpperCase());
        const stub = env.SESSION_DO.get(id);
        return stub.fetch(request);
      }
      return new Response('Missing code parameter', { status: 400 });
    }
    return __originalWorker.fetch(request, env, ctx);
  }
};
`
  );

  return source;
}

describe('patch-worker', () => {
  it('adds SessionDO export after existing exports', () => {
    const patched = patchWorker(SAMPLE_WORKER);
    expect(patched).toContain('export { SessionDO } from "../src/do/SessionDO"');
    const doExportIdx = patched.indexOf('export { SessionDO }');
    const otherExportIdx = patched.indexOf('export { DOClass }');
    expect(doExportIdx).toBeGreaterThan(otherExportIdx);
  });

  it('adds SessionDO export at top when no existing named exports', () => {
    const patched = patchWorker(SAMPLE_WORKER_NO_EXPORTS);
    expect(patched.startsWith('export { SessionDO }')).toBe(true);
  });

  it('wraps default fetch with WebSocket interceptor', () => {
    const patched = patchWorker(SAMPLE_WORKER);
    expect(patched).toContain('const __originalWorker = { async fetch(request, env, ctx)');
    expect(patched).toContain("request.headers.get('Upgrade') === 'websocket'");
    expect(patched).toContain('env.SESSION_DO.idFromName(code.toUpperCase())');
    expect(patched).toContain('return __originalWorker.fetch(request, env, ctx)');
  });

  it('preserves original fetch body', () => {
    const patched = patchWorker(SAMPLE_WORKER);
    expect(patched).toContain('runWithCloudflareRequestContext');
  });

  it('is idempotent — skips if already patched', () => {
    const first = patchWorker(SAMPLE_WORKER);
    const second = patchWorker(first);
    expect(first).toBe(second);
  });

  it('routes websocket requests to DO by session code', () => {
    const patched = patchWorker(SAMPLE_WORKER);
    expect(patched).toContain("url.searchParams.get('code')");
    expect(patched).toContain("new Response('Missing code parameter', { status: 400 })");
  });

  it('falls through to original handler for non-websocket requests', () => {
    const patched = patchWorker(SAMPLE_WORKER);
    const lines = patched.split('\n');
    const fallthrough = lines.find(l => l.includes('return __originalWorker.fetch'));
    expect(fallthrough).toBeDefined();
  });
});
