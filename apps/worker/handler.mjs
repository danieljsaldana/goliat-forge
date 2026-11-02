import { createRepository } from '../shared/persistence.mjs';
import { createSender } from '../shared/queue.mjs';
import { processEvent, publishPending } from '../shared/domain.mjs';
export function createWorker(repository, sender) {
  return async event => {
    if (event?.kind === 'outbox-recovery') return { deliveries: await publishPending(repository, sender) };
    if (!Array.isArray(event?.Records)) throw Error('invalid_batch');
    const batchItemFailures = [];
    for (const record of event.Records) {
      try { await processEvent(repository, JSON.parse(record.body)); }
      catch { batchItemFailures.push({ itemIdentifier: record.messageId }); }
    }
    return { batchItemFailures };
  };
}
const state = { handler: null };
export async function handler(event) {
  state.handler ??= createWorker(await createRepository(process.env,{eventsEnabled:true}), createSender(process.env.QUEUE_URL));
  return state.handler(event);
}
