const { login, readJson, send } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  const body = await readJson(req);
  const result = login(body.username, body.password);
  if (!result) {
    // Small delay blunts password guessing without hurting real users.
    await new Promise((r) => setTimeout(r, 400));
    return send(res, 401, { ok: false, error: 'Wrong username or password.' });
  }
  return send(res, 200, { ok: true, ...result });
};
