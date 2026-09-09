// Shared authentication helpers for the review API.
// Credentials are checked server-side so they never appear in the page source.
const crypto = require('crypto');

const SALT = 'darcio-founders-agreement-review';
const SECRET = process.env.AUTH_SECRET || 'darcio-fa-review-fallback-secret-2026';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Passwords are stored as salted SHA-256 hashes.
const USERS = {
  'ca@pfco': {
    id: 'ca@pfco',
    name: 'CA (PFCO)',
    role: 'Chartered Accountant',
    hash: sha256(SALT + ':' + 'Darcio@012'),
  },
  'md@darcio': {
    id: 'md@darcio',
    name: 'MD (Darcio)',
    role: 'Managing Director',
    hash: sha256(SALT + ':' + 'Darcio@012'),
  },
};

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function sign(payload) {
  return b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
}

function publicUser(u) {
  return { id: u.id, name: u.name, role: u.role };
}

function login(username, password) {
  const u = USERS[String(username || '').trim().toLowerCase()];
  if (!u || typeof password !== 'string') return null;
  const given = Buffer.from(sha256(SALT + ':' + password));
  const want = Buffer.from(u.hash);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;
  const payload = b64url(JSON.stringify({ u: u.id, exp: Date.now() + TOKEN_TTL_MS }));
  return { token: payload + '.' + sign(payload), user: publicUser(u) };
}

function verify(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const expect = sign(payload);
  if (expect.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(sig))) return null;
  let data;
  try { data = JSON.parse(fromB64url(payload)); } catch (e) { return null; }
  if (!data || !data.u || !data.exp || data.exp < Date.now()) return null;
  const u = USERS[data.u];
  return u ? publicUser(u) : null;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = { login, verify, readJson, send };
