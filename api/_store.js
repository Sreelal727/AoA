// Shared storage for review entries.
//
// Entries are append-only: every tick, flag, rejection or comment is one
// immutable record with a server timestamp, so nothing is ever overwritten
// and two people can act at the same moment without losing each other's work.
//
// Backend: Upstash Redis (one click from the Vercel dashboard: Storage → Redis).
// Vercel injects KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_* names).
// Without those variables the API reports storage as unavailable and the page
// keeps entries on the viewer's own device only.

const HASH_KEY = process.env.REVIEW_KEY || 'darcio:founders-agreement:entries';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory store, used only for local testing (REVIEW_MEMORY_STORE=1).
const memory = new Map();

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || ('redis http ' + r.status));
  return j.result;
}

function backend() {
  if (REDIS_URL && REDIS_TOKEN) return 'redis';
  if (process.env.REVIEW_MEMORY_STORE) return 'memory';
  return null;
}

async function listEntries() {
  const b = backend();
  if (b === 'redis') {
    const flat = await redis(['HGETALL', HASH_KEY]);
    const out = [];
    for (let i = 0; i < flat.length; i += 2) {
      try { out.push(JSON.parse(flat[i + 1])); } catch (e) { /* skip corrupt */ }
    }
    return out;
  }
  if (b === 'memory') return Array.from(memory.values());
  return null;
}

async function addEntry(entry) {
  const b = backend();
  const value = JSON.stringify(entry);
  if (b === 'redis') { await redis(['HSET', HASH_KEY, entry.id, value]); return true; }
  if (b === 'memory') { memory.set(entry.id, entry); return true; }
  return false;
}

module.exports = { backend, listEntries, addEntry };
