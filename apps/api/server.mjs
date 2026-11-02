import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { AppError, validateRequest, uuid, createMemoryRepository, publishPending, processEvent } from '../shared/domain.mjs';
import { createRepository } from '../shared/persistence.mjs';
import { createSender } from '../shared/queue.mjs';
import { createAuthenticator, assertDemoAllowed } from './auth.mjs';
const webRoot = resolve(fileURLToPath(new URL('../web/out/', import.meta.url)));
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
function send(response, status, body) { response.writeHead(status, headers); response.end(JSON.stringify(body)); }
async function bodyOf(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new AppError(415, 'json_required');
  const chunks = []; const state = { bytes: 0 };
  for await (const chunk of request) { state.bytes += chunk.length; if (state.bytes > 8192) throw new AppError(413, 'body_too_large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError(400, 'invalid_json'); }
}
export function createApplication({ repository, sender, authenticate, demo = false, publicOrigin = null, eventsEnabled = true }) {
  return createServer({ maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000 }, async (request, response) => {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && path === '/healthz') { await repository.ping(); return send(response, 200, { status: 'ok' }); }
      if (demo && request.method === 'GET' && !path.startsWith('/api/')) {
        if (path === '/config.json') return send(response, 200, { product: 'Goliat Forge', environment: 'local-demo', apiBase: '/api', auth: { mode: 'demo' }, eventsEnabled, database:{kind:'memory',driver:'memory'}, portals: { tenant: { label: 'Solicitudes', view: 'requester' }, admin: { label: 'Operaciones', view: 'operator' } } });
        const route = ['/', '/tenant/', '/admin/', '/callback/'].includes(path) ? '/index.html' : decodeURIComponent(path);
        const file = resolve(webRoot, '.' + route);
        if (!file.startsWith(webRoot + sep) || !['.html', '.css', '.js', '.svg', '.json', '.ico', '.png', '.woff2'].includes(extname(file))) throw new AppError(404, 'not_found');
        const content = await readFile(file).catch(() => null);
        if (!content) throw new AppError(404, 'not_found');
        response.writeHead(200, { ...headers, 'Content-Type': { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json':'application/json', '.ico':'image/x-icon', '.png':'image/png', '.woff2':'font/woff2' }[extname(file)] }); response.end(content); return;
      }
      if (!path.startsWith('/api/')) throw new AppError(404, 'not_found');
      if (request.method === 'POST' && publicOrigin && request.headers.origin && request.headers.origin !== publicOrigin) throw new AppError(403, 'origin_not_allowed');
      const principal = await authenticate(request.headers.authorization);
      if (path === '/api/me' && request.method === 'GET') return send(response, 200, principal);
      if (path === '/api/requests' && request.method === 'GET') return send(response, 200, { requests: await repository.list(principal) });
      if (path === '/api/activities' && request.method === 'GET') return send(response, 200, { activities: await repository.activities(principal) });
      if (path === '/api/requests' && request.method === 'POST') {
        const input = validateRequest(await bodyOf(request));
        const result = await repository.create(principal, input);
        const delivery = eventsEnabled ? await publishPending(repository, sender, input.id) : [];
        return send(response, result.existing ? 200 : eventsEnabled ? 202 : 201, { ...result, delivery: !eventsEnabled ? 'disabled' : delivery.some(r => !r.published) ? 'pending' : 'queued' });
      }
      const id = path.match(/^\/api\/requests\/([^/]+)$/)?.[1];
      if (id && request.method === 'GET') { if (!uuid(id)) throw new AppError(400, 'invalid_id'); return send(response, 200, { request: await repository.get(principal, id.toLowerCase()) }); }
      throw new AppError(404, 'not_found');
    } catch (error) {
      if (!(error instanceof AppError)) console.warn(JSON.stringify({event:'request_failed',requestId,category:/^[0-9A-Z]{5}$/.test(error.code || '') ? error.code : 'backend_unavailable'}));
      send(response, error instanceof AppError ? error.status : 503, { error: error instanceof AppError ? error.code : 'temporarily_unavailable', requestId });
    }
  });
}
async function main() {
  const demo = process.argv.includes('--demo');
  const host = demo ? '127.0.0.1' : '0.0.0.0';
  if (demo) { assertDemoAllowed(process.env, host); await readFile(resolve(webRoot, 'index.html')).catch(() => { throw Error('Run npm run build:web before starting the local demo.'); }); }
  else if (process.env.AUTH_MODE !== 'cognito' || !process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID || !process.env.JWKS_FUNCTION_ARN) throw Error('cognito_configuration_required');
  const eventsEnabled = process.env.EVENTS_ENABLED === 'true';
  const repository = demo ? createMemoryRepository({eventsEnabled}) : await createRepository(process.env, {eventsEnabled});
  const sender = demo ? async event => { setTimeout(() => processEvent(repository, event), 600).unref(); } : createSender(process.env.QUEUE_URL);
  if (demo) {
    for (const title of ['Preparar un entorno de pruebas', 'Revisar el acceso del equipo', 'Publicar la nueva versión']) {
      const { request } = await repository.create({sub:'local-demo-user'}, {id:randomUUID(),title,detail:'Ejemplo local para explorar el recorrido de una solicitud.'});
      if (eventsEnabled) await publishPending(repository, sender, request.id);
    }
  }
  const authenticate = demo ? async () => ({ sub: 'local-demo-user', operator: true }) : createAuthenticator({ userPoolId: process.env.COGNITO_USER_POOL_ID, clientId: process.env.COGNITO_CLIENT_ID, region: process.env.AWS_REGION, keyFunctionArn: process.env.JWKS_FUNCTION_ARN });
  const server = createApplication({ repository, sender, authenticate, demo, publicOrigin: process.env.PUBLIC_ORIGIN, eventsEnabled });
  const port = Number(process.env.PORT || 4080);
  await new Promise(resolve => server.listen(port, host, resolve));
  console.log(`Luma · ${demo ? 'local in-memory demo' : 'private API'} · http://${host}:${port}`);
  const stop = async () => { await new Promise(resolve => server.close(resolve)); await repository.close(); };
  process.once('SIGTERM', () => stop().catch(() => { process.exitCode = 1; }));
  process.once('SIGINT', () => stop().catch(() => { process.exitCode = 1; }));
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
