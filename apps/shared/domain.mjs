export class AppError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !uuid(body.id)) throw new AppError(400, 'invalid_request');
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 140) throw new AppError(400, 'invalid_title');
  if (typeof body.detail !== 'string' || body.detail.length > 1200) throw new AppError(400, 'invalid_detail');
  return { id: body.id.toLowerCase(), title: body.title.trim(), detail: body.detail.trim() };
}
export function eventFor(request) { return { version: 1, kind: 'request.created', id: request.id, requestId: request.id }; }
export function parseEvent(value) {
  if (!value || value.version !== 1 || value.kind !== 'request.created' || !uuid(value.id) || value.id !== value.requestId) throw new AppError(400, 'invalid_event');
  return value;
}
export async function publishPending(repository, sender, id) {
  const pending = await repository.pending(id);
  const results = [];
  for (const event of pending) {
    try { await sender(event); await repository.markPublished(event.id); results.push({ id: event.id, published: true }); }
    catch { results.push({ id: event.id, published: false }); }
  }
  return results;
}
export async function processEvent(repository, value) { return repository.process(parseEvent(value)); }
export function createMemoryRepository({ eventsEnabled = true } = {}) {
  const requests = new Map(), outbox = new Map(), activities = new Map();
  return {
    ping: async () => true,
    async create(principal, input) {
      const prior = requests.get(input.id);
      if (prior) {
        if (prior.owner_id !== principal.sub) throw new AppError(404, 'not_found');
        if (prior.title !== input.title || prior.detail !== input.detail) throw new AppError(409, 'idempotency_conflict');
        return { request: { ...prior }, existing: true };
      }
      const row = { ...input, owner_id: principal.sub, status: 'accepted', created_at: new Date().toISOString() };
      requests.set(row.id, row); if (eventsEnabled) outbox.set(row.id, eventFor(row));
      return { request: { ...row }, existing: false };
    },
    async list(principal) { return [...requests.values()].filter(r => principal.operator || r.owner_id === principal.sub).map(r => ({ ...r })).reverse(); },
    async get(principal, id) {
      const row = requests.get(id);
      if (!row || (!principal.operator && row.owner_id !== principal.sub)) throw new AppError(404, 'not_found');
      return { ...row };
    },
    async activities(principal) { return [...activities.values()].filter(a => principal.operator || requests.get(a.request_id)?.owner_id === principal.sub); },
    async pending(id) { return [...outbox.values()].filter(e => !id || e.id === id); },
    async markPublished(id) { outbox.delete(id); },
    async process(event) {
      if (!requests.has(event.requestId)) throw new AppError(400, 'unknown_request');
      if (activities.has(event.id)) return false;
      activities.set(event.id, { event_id: event.id, request_id: event.requestId, kind: 'request.processed', created_at: new Date().toISOString() });
      requests.get(event.requestId).status = 'processed'; return true;
    },
    close: async () => {},
  };
}
