const { Codex } = require('../electron/codex.cjs');
(async () => {
  const codex = new Codex();
  try {
    await codex.connect();
    const { account } = await codex.request('account/read');
    const models = await codex.request('model/list');
    console.log(JSON.stringify({ connected: codex.ready, authType: account?.type || 'not-signed-in', modelCount: models.data?.length || 0 }, null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; } finally { codex.close(); }
})();
