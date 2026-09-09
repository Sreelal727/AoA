const crypto = require('crypto');
const { verify, readJson, send } = require('./_auth');
const store = require('./_store');

const STATUSES = new Set(['approved', 'flagged', 'rejected', 'pending']);
const MAX_TEXT = 4000;

module.exports = async (req, res) => {
  const user = verify(req);
  if (!user) return send(res, 401, { ok: false, error: 'Please sign in again.' });

  if (req.method === 'GET') {
    const entries = await store.listEntries().catch((e) => ({ error: e.message }));
    if (entries && entries.error) return send(res, 502, { ok: false, error: 'Storage error: ' + entries.error });
    return send(res, 200, {
      ok: true,
      user,
      storage: store.backend() !== null,
      entries: entries || [],
      serverTime: new Date().toISOString(),
    });
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const clauseId = String(body.clauseId || '').slice(0, 40);
    const type = body.type === 'status' ? 'status' : body.type === 'comment' ? 'comment' : null;
    const text = String(body.text || '').trim().slice(0, MAX_TEXT);
    const status = type === 'status' ? String(body.status || '') : undefined;
    if (!clauseId || !type) return send(res, 400, { ok: false, error: 'clauseId and type are required.' });
    if (type === 'status' && !STATUSES.has(status)) return send(res, 400, { ok: false, error: 'Unknown status.' });
    if (type === 'status' && (status === 'flagged' || status === 'rejected') && !text) {
      return send(res, 400, { ok: false, error: 'An explanation is required for that decision.' });
    }
    if (type === 'comment' && !text) return send(res, 400, { ok: false, error: 'Comment is empty.' });

    const at = new Date().toISOString();
    const entry = {
      id: clauseId + ':' + at + ':' + crypto.randomBytes(4).toString('hex'),
      clauseId, type, text, at,
      ...(status !== undefined ? { status } : {}),
      by: user.id, byName: user.name, byRole: user.role,
    };
    const saved = await store.addEntry(entry).catch((e) => ({ error: e.message }));
    if (saved && saved.error) return send(res, 502, { ok: false, error: 'Storage error: ' + saved.error });
    return send(res, 200, { ok: true, saved: saved === true, entry });
  }

  return send(res, 405, { ok: false, error: 'GET or POST only' });
};
