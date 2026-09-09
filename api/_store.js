// Shared storage for review entries.
//
// Entries are append-only: every tick, flag, rejection or comment is one
// immutable record with a server timestamp, so nothing is ever overwritten
// and two people can act at the same moment without losing each other's work.
//
// Backends, in order of preference:
//   1. Convex  — set CONVEX_URL and CONVEX_DEPLOY_KEY in Vercel. The deploy key
//                doubles as the admin credential for the internal functions in
//                convex/entries.js, which `npx convex deploy` publishes at build.
//   2. Redis   — Upstash via the Vercel Storage tab (KV_REST_API_URL/TOKEN).
//   3. Memory  — local testing only (REVIEW_MEMORY_STORE=1).
// With none of these the API reports storage as unavailable and the page keeps
// entries on the viewer's own device only.

const HASH_KEY = process.env.REVIEW_KEY || 'darcio:founders-agreement:entries';

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || 'https://incredible-crab-190.convex.cloud';
const CONVEX_KEY = process.env.CONVEX_DEPLOY_KEY;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const memory = new Map();

function backend() {
  if (CONVEX_URL && CONVEX_KEY) return 'convex';
  if (REDIS_URL && REDIS_TOKEN) return 'redis';
  if (process.env.REVIEW_MEMORY_STORE) return 'memory';
  return null;
}

// --- Convex -----------------------------------------------------------------
let convexClient = null;
function convex() {
  if (!convexClient) {
    const { ConvexHttpClient } = require('convex/browser');
    convexClient = new ConvexHttpClient(CONVEX_URL);
    convexClient.setAdminAuth(CONVEX_KEY);
  }
  return convexClient;
}
function fnRef(path) {
  const { makeFunctionReference } = require('convex/server');
  return makeFunctionReference(path);
}

// --- Redis ------------------------------------------------------------------
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

async function listEntries() {
  const b = backend();
  if (b === 'convex') return await convex().query(fnRef('entries:list'), {});
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
  if (b === 'convex') {
    const { id, ...rest } = entry;
    const args = { entryId: id };
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) args[k] = val;
    await convex().mutation(fnRef('entries:add'), args);
    return true;
  }
  if (b === 'redis') { await redis(['HSET', HASH_KEY, entry.id, JSON.stringify(entry)]); return true; }
  if (b === 'memory') { memory.set(entry.id, entry); return true; }
  return false;
}

module.exports = { backend, listEntries, addEntry };
