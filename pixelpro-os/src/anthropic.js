// Chamada server-side ao Claude para a Máquina de Assuntos.
// Usa ANTHROPIC_API_KEY do ambiente. Sem chave, o chamador cai no modo offline.

const STYLE_RULE = 'Regra de estilo obrigatoria: nunca use hifen nem travessao (nem "-" nem "—"); use virgula no lugar.';
const LANG = {
  br: 'portugues do Brasil (pt-BR)',
  pt: 'portugues europeu de Portugal (pt-PT), tom mais formal, sem brasileirismos',
  en: 'English',
};

function hasKey() { return !!process.env.ANTHROPIC_API_KEY; }

async function claudeJSON(userText, { maxTokens = 1200 } = {}) {
  if (!hasKey()) throw new Error('sem_chave');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userText }],
    }),
  });
  if (!res.ok) throw new Error('anthropic_http_' + res.status);
  const data = await res.json();
  let t = (data.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  t = t.replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b >= 0) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

async function genTopics(brief) {
  const used = [...(brief.used || []), ...(brief.topics || [])];
  const prompt = `Voce e estrategista de conteudo da PixelPro Performance. Gere 16 pautas de carrossel NOVAS e variadas para o nicho do cliente, cada uma como um titulo curto e atrativo que toca uma dor, duvida ou desejo do publico. Sem numeracao no inicio.
Cliente: ${brief.name}. Ramo: ${brief.ramo}. Assuntos: ${brief.assuntos || '(livre no ramo)'}. Tom: ${brief.tom || 'equilibrado'}. Idioma: ${LANG[brief.market] || LANG.br}.
Nao repita nenhuma destas: ${used.join(' | ') || '(nenhuma)'}.
${STYLE_RULE}
Responda APENAS JSON: {"topics":["...","..."]}`;
  const d = await claudeJSON(prompt);
  return (d.topics || []).map((s) => String(s).replace(/^[\d.\)\s]+/, '').trim()).filter(Boolean);
}

async function genCarousel(brief, topic, n) {
  const prompt = `Voce e redator senior de carrosseis da PixelPro Performance para o cliente ${brief.name} (ramo: ${brief.ramo}). Tom: ${brief.tom || 'equilibrado'}. Oferta/CTA: ${brief.cta || '(generico)'}. Idioma: ${LANG[brief.market] || LANG.br}.
Modelo 4:5: slide 1 capa com "headline" e "subhead"; slides do meio alternam "dark" e "light" com "tag" curta em caixa alta e "blocks" de 1 a 2 frases, mais "stat" e "card" quando fizer sentido; ultimo slide "cta" com "bridge", "title" e "cta" amarrado a oferta.
Tema: ${topic}. Crie EXATAMENTE ${n} slides.
${STYLE_RULE}
Responda APENAS JSON: {"headlines":["",""],"slides":[{"n":1,"kind":"capa","headline":"","subhead":""}],"captions":{"instagram":"","threads":""},"hashtags":["#"]}`;
  return claudeJSON(prompt);
}

async function genReels(brief, topic, dur) {
  const prompt = `Voce e roteirista de Reels da PixelPro Performance para o cliente ${brief.name} (ramo: ${brief.ramo}). Tom: ${brief.tom || 'equilibrado'}. Oferta/CTA: ${brief.cta || '(generico)'}. Idioma: ${LANG[brief.market] || LANG.br}.
Duracao alvo: ${dur}. Estrutura: gancho forte nos primeiros 3 segundos, cenas curtas com tempo aproximado, texto na tela ("onscreen"), fala ("voice") e sugestao de imagem ("broll"), e CTA final amarrado a oferta. Escreva tambem legenda e 5 hashtags.
${STYLE_RULE}
Responda APENAS JSON: {"hook":"","scenes":[{"t":"0 a 3s","onscreen":"","voice":"","broll":""}],"cta":"","caption":"","hashtags":["#"]}`;
  return claudeJSON(prompt);
}

module.exports = { hasKey, genTopics, genCarousel, genReels, LANG, STYLE_RULE };
