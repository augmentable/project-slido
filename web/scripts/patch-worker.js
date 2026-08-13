/**
 * Post-build script that patches the OpenNext-generated worker.js to:
 * 1. Export the SessionDO class (required for Durable Object binding)
 * 2. Intercept WebSocket upgrade requests and route them to the DO
 *
 * Run after `npx @opennextjs/cloudflare build` and before `wrangler deploy`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = join(__dirname, '..', '.open-next', 'worker.js');

let source = readFileSync(workerPath, 'utf-8');

// 1. Add DO export at the top, alongside existing DO exports
const doExport = `export { SessionDO } from "../src/do/SessionDO";\n`;

if (source.includes('SessionDO')) {
  console.log('worker.js already patched — skipping.');
  process.exit(0);
}

// Insert after the last existing export { ... } line
const lastExportIdx = source.lastIndexOf('export {');
if (lastExportIdx === -1) {
  // No existing exports; add before the default export
  source = doExport + source;
} else {
  const lineEnd = source.indexOf('\n', lastExportIdx);
  source = source.slice(0, lineEnd + 1) + doExport + source.slice(lineEnd + 1);
}

// 2. Wrap the default fetch handler to intercept WebSocket upgrades
//    The generated worker looks like:
//      export default { async fetch(request, env, ctx) { return runWithCloudflareRequestContext(...) } };
//
//    We replace it with a wrapper that checks for WS upgrades first.

source = source.replace(
  /export default \{[\s\n]*async fetch\(request, env, ctx\) \{/,
  `const __originalWorker = { async fetch(request, env, ctx) {`
);

// Close the original object and add our wrapper
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

writeFileSync(workerPath, source);
console.log('worker.js patched — SessionDO export + WebSocket routing added.');
