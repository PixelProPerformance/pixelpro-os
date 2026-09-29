// Adaptadores de publicacao. Cada rede implementa publish(account, post, ctx).
// DRY_RUN (padrao true) faz o robo registrar sem postar de verdade, pra rodar sem credenciais.
// Publicar de verdade exige criar um app de desenvolvedor em cada plataforma e conectar a conta
// por OAuth (veja README e as rotas /api/social). Sem token valido, cai no dry-run automaticamente.

const DRY = () => String(process.env.DRY_RUN || 'true') !== 'false';

function firstImageUrl(post) {
  try { const d = JSON.parse(post.design || '{}'); return d.imageUrl || d.background || ''; } catch { return ''; }
}

// META (Instagram + Facebook) via Graph API.
// meta.igUserId / meta.pageId e account.accessToken vem do OAuth.
async function metaPublish(account, post, ctx) {
  const meta = safeJSON(account.meta);
  const token = account.accessToken;
  const caption = [post.captionIG, post.hashtags].filter(Boolean).join('\n\n');
  const imageUrl = firstImageUrl(post);
  if (DRY() || !token) return dry('meta', 'sem token ou DRY_RUN ligado');

  if (ctx.network === 'instagram') {
    if (!meta.igUserId || !imageUrl) return fail('meta', 'faltou igUserId ou imageUrl');
    // 1) cria o container 2) publica
    const create = await graph(`/${meta.igUserId}/media`, token, { image_url: imageUrl, caption });
    if (!create.id) return fail('instagram', JSON.stringify(create));
    const pub = await graph(`/${meta.igUserId}/media_publish`, token, { creation_id: create.id });
    return pub.id ? ok('instagram', pub.id) : fail('instagram', JSON.stringify(pub));
  }
  if (ctx.network === 'facebook') {
    if (!meta.pageId) return fail('facebook', 'faltou pageId');
    const endpoint = imageUrl ? `/${meta.pageId}/photos` : `/${meta.pageId}/feed`;
    const body = imageUrl ? { url: imageUrl, caption } : { message: caption };
    const r = await graph(endpoint, token, body);
    return r.id || r.post_id ? ok('facebook', r.id || r.post_id) : fail('facebook', JSON.stringify(r));
  }
  return dry('meta', 'rede nao tratada');
}

async function graph(path, token, params) {
  const url = `https://graph.facebook.com/v21.0${path}`;
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(url, { method: 'POST', body });
  return res.json();
}

// Redes que ainda dependem de app aprovado. Deixo o contrato pronto em dry-run.
async function stubPublish(name) { return async () => dry(name, 'adaptador em dry-run, configure OAuth e a API'); }

function ok(platform, id) { return { ok: true, externalId: String(id), detail: 'publicado', dryRun: false }; }
function fail(platform, detail) { return { ok: false, externalId: '', detail, dryRun: false }; }
function dry(platform, detail) { return { ok: true, externalId: 'dry_' + Date.now(), detail, dryRun: true }; }
function safeJSON(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

const ADAPTERS = {
  instagram: metaPublish,
  facebook: metaPublish,
  threads: async (a, p, c) => dry('threads', 'Threads API, configurar app'),
  youtube: async (a, p, c) => dry('youtube', 'YouTube Data API, configurar OAuth'),
  tiktok: async (a, p, c) => dry('tiktok', 'TikTok Content Posting API, configurar app'),
  linkedin: async (a, p, c) => dry('linkedin', 'LinkedIn Marketing API, configurar app'),
};

async function publishTo(network, account, post) {
  const fn = ADAPTERS[network];
  if (!fn) return fail(network, 'rede desconhecida');
  try { return await fn(account, post, { network }); }
  catch (e) { return fail(network, String(e && e.message || e)); }
}

module.exports = { publishTo, ADAPTERS, DRY };
