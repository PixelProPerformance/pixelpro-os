// Robo de publicacao. Roda a cada minuto no mesmo processo do servidor.
// Pega posts com status SCHEDULED e horario vencido, e publica em cada rede via adaptador.
// Pra escalar, esse loop pode virar um servico separado no Railway (worker), sem mudar a logica.

const prisma = require('../db');
const { publishTo } = require('./adapters');

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const due = await prisma.post.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      include: { client: { include: { accounts: true } } },
      take: 20,
    });
    for (const post of due) {
      const networks = safeArr(post.networks);
      let allOk = true;
      for (const network of networks) {
        const account = post.client.accounts.find((a) => a.platform === network);
        const result = await publishTo(network, account || { accessToken: '', meta: '{}' }, post);
        await prisma.publishLog.create({
          data: {
            postId: post.id, platform: network, ok: result.ok,
            externalId: result.externalId || '', detail: result.detail || '', dryRun: !!result.dryRun,
          },
        });
        if (!result.ok) allOk = false;
      }
      await prisma.post.update({
        where: { id: post.id },
        data: { status: allOk ? 'PUBLISHED' : 'FAILED' },
      });
      console.log(`[worker] post ${post.id} -> ${allOk ? 'PUBLISHED' : 'FAILED'} (${networks.join(',')})`);
    }
  } catch (e) {
    console.error('[worker] erro', e);
  } finally {
    running = false;
  }
}

function safeArr(s) { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }

function start() {
  const ms = Number(process.env.WORKER_INTERVAL_MS || 60000);
  setInterval(tick, ms);
  console.log(`[worker] robo de publicacao ativo, intervalo ${ms}ms, DRY_RUN=${process.env.DRY_RUN || 'true'}`);
  tick();
}

module.exports = { start, tick };
