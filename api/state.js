const crypto = require('crypto');
const { verify, readJson, send } = require('./_auth');
const store = require('./_store');

const STATUSES = new Set(['approved', 'flagged', 'rejected', 'pending']);
const MAX_TEXT = 6000;
const CLAUSE_ID = /^[A-Za-z0-9][A-Za-z0-9 .\-]{0,30}$/;

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
    const clauseId = String(body.clauseId || '').trim().slice(0, 40);
    const type = ['status', 'comment', 'clause'].includes(body.type) ? body.type : null;
    const text = String(body.text || '').trim().slice(0, MAX_TEXT);
    if (!clauseId || !type) return send(res, 400, { ok: false, error: 'clauseId and type are required.' });
    if (!CLAUSE_ID.test(clauseId)) return send(res, 400, { ok: false, error: 'Clause number may only use letters, digits, dots and dashes.' });

    const at = new Date().toISOString();
    const entry = {
      id: clauseId + ':' + at + ':' + crypto.randomBytes(4).toString('hex'),
      clauseId, type, text, at,
      by: user.id, byName: user.name, byRole: user.role,
    };

    if (type === 'status') {
      const status = String(body.status || '');
      if (!STATUSES.has(status)) return send(res, 400, { ok: false, error: 'Unknown status.' });
      if ((status === 'flagged' || status === 'rejected') && !text) {
        return send(res, 400, { ok: false, error: 'An explanation is required for that decision.' });
      }
      entry.status = status;
    } else if (type === 'comment') {
      if (!text) return send(res, 400, { ok: false, error: 'Comment is empty.' });
    } else {
      // A proposed clause: a new one, a revised text, or a withdrawal.
      const removed = body.removed === true;
      const title = String(body.title || '').trim().slice(0, 200);
      const section = String(body.section || '').trim().slice(0, 200);
      const sectionNum = String(body.sectionNum || '').trim().slice(0, 10);
      if (!removed) {
        if (!title) return send(res, 400, { ok: false, error: 'Give the clause a title.' });
        if (!text) return send(res, 400, { ok: false, error: 'Write the clause text.' });
        if (!section) return send(res, 400, { ok: false, error: 'Choose a section.' });
      }
      entry.removed = removed;
      entry.title = title;
      entry.section = section;
      if (sectionNum) entry.sectionNum = sectionNum;
    }

    const saved = await store.addEntry(entry).catch((e) => ({ error: e.message }));
    if (saved && saved.error) return send(res, 502, { ok: false, error: 'Storage error: ' + saved.error });
    return send(res, 200, { ok: true, saved: saved === true, entry });
  }

  return send(res, 405, { ok: false, error: 'GET or POST only' });
};
