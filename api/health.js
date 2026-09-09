// Unauthenticated health check: reports which store is configured and whether
// it answers. Returns counts only, never entry contents.
const store = require('./_store');
const { send } = require('./_auth');

module.exports = async (req, res) => {
  const backend = store.backend();
  if (!backend) return send(res, 200, { ok: true, backend: null, storage: false });
  try {
    const entries = await store.listEntries();
    return send(res, 200, { ok: true, backend, storage: true, entries: entries.length });
  } catch (e) {
    return send(res, 502, { ok: false, backend, storage: false, error: e.message });
  }
};
