const express = require('express');
const prisma = require('../db');
const { hash, publicUser, requirePermission, ensureClientScope } = require('../auth');
const { scopeForUser, can } = require('../permissions');
const ai = require('../anthropic');
const { publishTo } = require('../publish/adapters');
const { sendMail, approvalRequestEmail } = require('../email');

const router = express.Router();
const J = (s, f = []) => { try { return JSON.parse(s); } catch { return f; } };

// -------- CLIENTS --------
router.get('/clients', requirePermission('client.read'), async (req, res) => {
  const where = scopeForUser(req.user).clientId ? { id: req.user.clientId } : {};
  const clients = await prisma.client.findMany({ where, orderBy: { createdAt: 'asc' } });
  res.json({ clients });
});

router.post('/clients', requirePermission('client.create'), async (req, res) => {
  const b = req.body || {};
  const client = await prisma.client.create({
    data: {
      name: b.name || 'Novo cliente', handle: b.handle || '', color: b.color || '#7c6cff',
      market: b.market || 'br', ramo: b.ramo || '', assuntos: b.assuntos || '', tom: b.tom || '', cta: b.cta || '',
    },
  });
  res.json({ client });
});

router.patch('/clients/:id', requirePermission('client.update'), async (req, res) => {
  if (!ensureClientScope(req, req.params.id)) return res.status(403).json({ error: 'fora_do_escopo' });
  const b = req.body || {};
  const data = {};
  ['name','handle','color','market','ramo','assuntos','tom','cta','template'].forEach(k => { if (b[k] !== undefined) data[k] = b[k]; });
  const client = await prisma.client.update({ where: { id: req.params.id }, data });
  res.json({ client });
});

router.delete('/clients/:id', requirePermission('client.delete'), async (req, res) => {
  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// -------- POSTS --------
router.get('/posts', requirePermission('post.read'), async (req, res) => {
  const scope = scopeForUser(req.user);
  const where = {};
  if (scope.clientId) where.clientId = scope.clientId;
  if (req.query.clientId && !scope.clientId) where.clientId = String(req.query.clientId);
  const posts = await prisma.post.findMany({ where, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    include: { approvals: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { comments: true } } } });
  res.json({ posts });
});

router.post('/posts', requirePermission('post.create'), async (req, res) => {
  const b = req.body || {};
  if (!b.clientId) return res.status(400).json({ error: 'faltou_clientId' });
  const post = await prisma.post.create({ data: {
    clientId: b.clientId, title: b.title || 'Sem titulo', format: b.format || 'Carrossel',
    networks: JSON.stringify(b.networks || []), status: b.status || 'IDEA',
    captionIG: b.captionIG || '', captionTh: b.captionTh || '', hashtags: b.hashtags || '',
    design: b.design || '', roteiro: b.roteiro || '', createdById: req.user.id,
    scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
  }});
  res.json({ post });
});

router.patch('/posts/:id', requirePermission('post.update'), async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'nao_encontrado' });
  if (!ensureClientScope(req, post.clientId)) return res.status(403).json({ error: 'fora_do_escopo' });
  const b = req.body || {};
  const data = {};
  ['title','format','status','captionIG','captionTh','hashtags','design','roteiro'].forEach(k => { if (b[k] !== undefined) data[k] = b[k]; });
  if (b.networks !== undefined) data.networks = JSON.stringify(b.networks);
  if (b.scheduledAt !== undefined) data.scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : null;
  const updated = await prisma.post.update({ where: { id: req.params.id }, data });
  res.json({ post: updated });
});

router.delete('/posts/:id', requirePermission('post.delete'), async (req, res) => {
  await prisma.comment.deleteMany({ where: { postId: req.params.id } });
  await prisma.approval.deleteMany({ where: { postId: req.params.id } });
  await prisma.publishLog.deleteMany({ where: { postId: req.params.id } });
  await prisma.post.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.post('/posts/:id/schedule', requirePermission('post.schedule'), async (req, res) => {
  const when = req.body && req.body.scheduledAt;
  if (!when) return res.status(400).json({ error: 'faltou_scheduledAt' });
  const post = await prisma.post.update({ where: { id: req.params.id }, data: { scheduledAt: new Date(when), status: 'SCHEDULED' } });
  res.json({ post });
});

router.post('/posts/:id/publish-now', requirePermission('post.publishNow'), async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: { client: { include: { accounts: true } } } });
  if (!post) return res.status(404).json({ error: 'nao_encontrado' });
  const results = [];
  for (const network of J(post.networks)) {
    const account = post.client.accounts.find(a => a.platform === network) || { accessToken: '', meta: '{}' };
    const r = await publishTo(network, account, post);
    await prisma.publishLog.create({ data: { postId: post.id, platform: network, ok: r.ok, externalId: r.externalId || '', detail: r.detail || '', dryRun: !!r.dryRun } });
    results.push({ network, ...r });
  }
  const allOk = results.every(r => r.ok);
  await prisma.post.update({ where: { id: post.id }, data: { status: allOk ? 'PUBLISHED' : 'FAILED' } });
  res.json({ results, status: allOk ? 'PUBLISHED' : 'FAILED' });
});

// -------- APPROVALS --------
router.post('/posts/:id/request-approval', requirePermission('approval.request'), async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: { client: { include: { users: true } } } });
  if (!post) return res.status(404).json({ error: 'nao_encontrado' });
  await prisma.approval.create({ data: { postId: post.id, state: 'PENDING', note: req.body && req.body.note || '' } });
  await prisma.post.update({ where: { id: post.id }, data: { status: 'PENDING_APPROVAL' } });
  const portalUrl = (process.env.APP_URL || '') + '/app';
  const clients = post.client.users.filter(u => u.role === 'CLIENT');
  for (const u of clients) {
    try { await sendMail({ to: u.email, ...approvalRequestEmail({ clientName: post.client.name, postTitle: post.title, portalUrl }) }); }
    catch (e) { console.error('[email] falhou', e.message); }
  }
  res.json({ ok: true, notified: clients.length });
});

router.post('/posts/:id/decide', requirePermission('approval.decide'), async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'nao_encontrado' });
  if (!ensureClientScope(req, post.clientId)) return res.status(403).json({ error: 'fora_do_escopo' });
  const decision = (req.body && req.body.decision) === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED';
  const last = await prisma.approval.findFirst({ where: { postId: post.id }, orderBy: { createdAt: 'desc' } });
  if (last) await prisma.approval.update({ where: { id: last.id }, data: { state: decision, note: req.body.note || '', deciderId: req.user.id, decidedAt: new Date() } });
  await prisma.post.update({ where: { id: post.id }, data: { status: decision === 'APPROVED' ? 'APPROVED' : 'PRODUCTION' } });
  res.json({ ok: true, decision });
});

// -------- COMMENTS --------
router.get('/posts/:id/comments', requirePermission('post.read'), async (req, res) => {
  const comments = await prisma.comment.findMany({ where: { postId: req.params.id }, orderBy: { createdAt: 'asc' }, include: { author: true } });
  res.json({ comments: comments.map(c => ({ id: c.id, body: c.body, createdAt: c.createdAt, author: c.author.name, role: c.author.role })) });
});
router.post('/posts/:id/comments', requirePermission('comment.create'), async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'nao_encontrado' });
  if (!ensureClientScope(req, post.clientId)) return res.status(403).json({ error: 'fora_do_escopo' });
  const c = await prisma.comment.create({ data: { postId: post.id, authorId: req.user.id, body: String(req.body.body || '').slice(0, 2000) } });
  res.json({ ok: true, id: c.id });
});

// -------- MAQUINA --------
async function deckFor(clientId) {
  let deck = await prisma.topicDeck.findUnique({ where: { clientId } });
  if (!deck) deck = await prisma.topicDeck.create({ data: { clientId } });
  return deck;
}
router.get('/maquina/:clientId/deck', requirePermission('maquina.use'), async (req, res) => {
  const deck = await deckFor(req.params.clientId);
  res.json({ topics: J(deck.topics), used: J(deck.used) });
});
router.post('/maquina/:clientId/topics', requirePermission('maquina.use'), async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.clientId } });
  if (!client) return res.status(404).json({ error: 'cliente_nao_encontrado' });
  const deck = await deckFor(client.id);
  const brief = { name: client.name, market: client.market, ramo: client.ramo, assuntos: client.assuntos, tom: client.tom, cta: client.cta, topics: J(deck.topics), used: J(deck.used) };
  let list = [];
  if (ai.hasKey()) { try { list = await ai.genTopics(brief); } catch (e) { console.error('[maquina] IA falhou', e.message); } }
  if (!list.length) list = templateTopics(brief); // fallback offline
  const topics = [...new Set([...J(deck.topics), ...list])].filter(t => !J(deck.used).includes(t));
  await prisma.topicDeck.update({ where: { clientId: client.id }, data: { topics: JSON.stringify(topics) } });
  res.json({ added: list.length, topics, ai: ai.hasKey() });
});
router.post('/maquina/:clientId/carousel', requirePermission('maquina.use'), async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.clientId } });
  if (!client) return res.status(404).json({ error: 'cliente_nao_encontrado' });
  if (!ai.hasKey()) return res.status(400).json({ error: 'sem_ia', message: 'Configure ANTHROPIC_API_KEY pra gerar textos.' });
  try { const data = await ai.genCarousel(brief(client), req.body.topic || '', Number(req.body.slides || 6)); res.json({ data }); }
  catch (e) { res.status(502).json({ error: 'ia_falhou', detail: e.message }); }
});
router.post('/maquina/:clientId/reels', requirePermission('maquina.use'), async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.clientId } });
  if (!client) return res.status(404).json({ error: 'cliente_nao_encontrado' });
  if (!ai.hasKey()) return res.status(400).json({ error: 'sem_ia' });
  try { const data = await ai.genReels(brief(client), req.body.topic || '', req.body.dur || '30s'); res.json({ data }); }
  catch (e) { res.status(502).json({ error: 'ia_falhou', detail: e.message }); }
});
router.post('/maquina/:clientId/use-topic', requirePermission('maquina.use'), async (req, res) => {
  const deck = await deckFor(req.params.clientId);
  const used = [...new Set([...J(deck.used), req.body.topic])].filter(Boolean);
  const topics = J(deck.topics).filter(t => t !== req.body.topic);
  await prisma.topicDeck.update({ where: { clientId: req.params.clientId }, data: { used: JSON.stringify(used), topics: JSON.stringify(topics) } });
  res.json({ ok: true });
});
function brief(c) { return { name: c.name, market: c.market, ramo: c.ramo, assuntos: c.assuntos, tom: c.tom, cta: c.cta }; }
function templateTopics(b) {
  const bases = (b.assuntos || b.ramo || '').split(',').map(s => s.trim()).filter(Boolean);
  const frames = ['O erro mais comum em', 'O que ninguem explica sobre', 'Guia rapido de', '5 sinais de problema em', 'Mitos e verdades sobre', 'Antes de investir em'];
  const out = []; frames.forEach(f => bases.forEach(x => out.push(`${f} ${x}`)));
  return [...new Set(out)];
}

// -------- SOCIAL ACCOUNTS --------
router.get('/social/:clientId', requirePermission('social.read'), async (req, res) => {
  const accounts = await prisma.socialAccount.findMany({ where: { clientId: req.params.clientId } });
  res.json({ accounts: accounts.map(a => ({ id: a.id, platform: a.platform, displayName: a.displayName, status: a.status, hasToken: !!a.accessToken })) });
});
// Conexao manual (ate os apps OAuth ficarem prontos): guarda token e ids que voce colar.
router.post('/social/:clientId/connect', requirePermission('social.connect'), async (req, res) => {
  const b = req.body || {};
  if (!b.platform) return res.status(400).json({ error: 'faltou_platform' });
  const acc = await prisma.socialAccount.create({ data: {
    clientId: req.params.clientId, platform: b.platform, displayName: b.displayName || '',
    accessToken: b.accessToken || '', meta: JSON.stringify(b.meta || {}), status: b.accessToken ? 'CONNECTED' : 'PENDING',
  }});
  res.json({ ok: true, id: acc.id });
});
router.delete('/social/:id', requirePermission('social.delete'), async (req, res) => {
  await prisma.socialAccount.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// -------- USERS (admin) --------
router.get('/users', requirePermission('user.read'), async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ users: users.map(publicUser) });
});
router.post('/users', requirePermission('user.manage'), async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.password) return res.status(400).json({ error: 'faltou_email_ou_senha' });
  const exists = await prisma.user.findUnique({ where: { email: b.email.toLowerCase() } });
  if (exists) return res.status(409).json({ error: 'email_em_uso' });
  const user = await prisma.user.create({ data: {
    email: b.email.toLowerCase(), passwordHash: await hash(b.password), name: b.name || b.email,
    role: ['ADMIN','COLLABORATOR','CLIENT'].includes(b.role) ? b.role : 'COLLABORATOR',
    clientId: b.role === 'CLIENT' ? (b.clientId || null) : null,
  }});
  res.json({ user: publicUser(user) });
});
router.delete('/users/:id', requirePermission('user.manage'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'nao_pode_excluir_voce' });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// permissao exposta pro front decidir o que mostrar
router.get('/whoami', (req, res) => {
  const role = req.user ? req.user.role : null;
  const actions = {};
  ['post.create','post.delete','post.schedule','post.publishNow','approval.request','approval.decide','maquina.use','social.connect','user.manage','client.delete','template.update']
    .forEach(a => { actions[a] = role ? can(role, a) : false; });
  res.json({ user: req.user ? publicUser(req.user) : null, can: actions });
});

module.exports = router;
