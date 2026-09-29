const $ = (s, r=document) => r.querySelector(s);
const api = async (url, opts={}) => {
  const r = await fetch(url, { headers: { 'content-type':'application/json' }, ...opts });
  if (r.status === 401) { location.href = '/login'; throw new Error('401'); }
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw Object.assign(new Error(d.error||'erro'), { data:d, status:r.status });
  return d;
};
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let toastT; const toast = m => { const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2600); };
const icons = () => window.lucide && lucide.createIcons();

const NETWORKS = [
  {id:'instagram',label:'Instagram',icon:'instagram'},{id:'facebook',label:'Facebook',icon:'facebook'},
  {id:'youtube',label:'YouTube',icon:'youtube'},{id:'threads',label:'Threads',icon:'at-sign'},
  {id:'tiktok',label:'TikTok',icon:'music'},{id:'linkedin',label:'LinkedIn',icon:'linkedin'},
];
const STATUS = ['IDEA','PRODUCTION','PENDING_APPROVAL','APPROVED','SCHEDULED','PUBLISHED','FAILED'];
const STATUS_LABEL = {IDEA:'Ideia',PRODUCTION:'Producao',PENDING_APPROVAL:'Aguardando aprovacao',APPROVED:'Aprovado',SCHEDULED:'Agendado',PUBLISHED:'Publicado',FAILED:'Falhou'};
const FORMATS = ['Carrossel','Reels','Story','Post','Video'];

const state = { me:null, can:{}, clients:[], clientId:null, posts:[] };

async function boot(){
  const who = await api('/api/whoami');
  if (!who.user) { location.href = '/login'; return; }
  state.me = who.user; state.can = who.can;
  renderShell();
  const cl = await api('/api/clients'); state.clients = cl.clients;
  state.clientId = state.me.role==='CLIENT' ? state.me.clientId : (state.clients[0] && state.clients[0].id) || null;
  renderClientPicker();
  go(state.me.role==='CLIENT' ? 'approvals' : 'dashboard');
}

function navItems(){
  const r = state.me.role;
  const items = [
    {id:'dashboard',label:'Painel',icon:'layout-dashboard',roles:['ADMIN','COLLABORATOR']},
    {id:'planner',label:'Planner',icon:'calendar-days',roles:['ADMIN','COLLABORATOR','CLIENT']},
    {id:'maquina',label:'Maquina de Assuntos',icon:'sparkles',roles:['ADMIN','COLLABORATOR']},
    {id:'production',label:'Production Pro',icon:'image',roles:['ADMIN','COLLABORATOR']},
    {id:'approvals',label:'Aprovacoes',icon:'check-circle',roles:['ADMIN','COLLABORATOR','CLIENT']},
    {id:'clients',label:'Clientes',icon:'briefcase',roles:['ADMIN','COLLABORATOR']},
    {id:'social',label:'Contas de rede',icon:'share-2',roles:['ADMIN','COLLABORATOR']},
    {id:'users',label:'Usuarios',icon:'users',roles:['ADMIN']},
  ];
  return items.filter(i => i.roles.includes(r));
}
function renderShell(){
  $('#nav').innerHTML = navItems().map(i=>`<button class="nav" data-go="${i.id}"><i data-lucide="${i.icon}" class="icon"></i> ${i.label}</button>`).join('');
  $('#who').innerHTML = `<b>${esc(state.me.name)}</b><span class="roletag">${roleLabel(state.me.role)}</span>`;
  $('#nav').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{go(b.dataset.go); $('#side').classList.remove('open');});
  $('#logout').onclick = async ()=>{ await api('/api/auth/logout',{method:'POST'}); location.href='/login'; };
  $('#menutoggle').onclick = ()=> $('#side').classList.toggle('open');
  icons();
}
const roleLabel = r => ({ADMIN:'Admin',COLLABORATOR:'Colaborador',CLIENT:'Cliente'}[r]||r);

function renderClientPicker(){
  const box = $('#clientPicker');
  if (state.me.role==='CLIENT' || !state.clients.length){ box.innerHTML=''; return; }
  box.innerHTML = `<span class="pill"><i data-lucide="briefcase" class="icon"></i></span>
    <select id="clientSel" style="width:auto;min-width:170px">${state.clients.map(c=>`<option value="${c.id}" ${c.id===state.clientId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;
  $('#clientSel').onchange = e => { state.clientId = e.target.value; go(current); };
  icons();
}

let current='dashboard';
function go(id){
  current=id;
  $('#nav').querySelectorAll('.nav').forEach(b=>b.classList.toggle('active', b.dataset.go===id));
  const titles={dashboard:'Painel',planner:'Planner',maquina:'Maquina de Assuntos',production:'Production Pro',approvals:'Aprovacoes',clients:'Clientes',social:'Contas de rede',users:'Usuarios'};
  $('#pageTitle').textContent = titles[id]||'PixelPro OS';
  ({dashboard:viewDashboard,planner:viewPlanner,maquina:viewMaquina,production:viewProduction,approvals:viewApprovals,clients:viewClients,social:viewSocial,users:viewUsers}[id]||viewDashboard)();
}

// -------------- DASHBOARD --------------
async function viewDashboard(){
  const { posts } = await api('/api/posts' + (state.clientId?`?clientId=${state.clientId}`:''));
  state.posts = posts;
  const by = s => posts.filter(p=>p.status===s).length;
  $('#view').innerHTML = `<div class="grid">
    ${statCard('Posts', posts.length, 'layers')}
    ${statCard('Aguardando aprovacao', by('PENDING_APPROVAL'), 'clock')}
    ${statCard('Agendados', by('SCHEDULED'), 'calendar-clock')}
    ${statCard('Publicados', by('PUBLISHED'), 'send')}
  </div>
  <div class="cardbox" style="margin-top:16px"><h3><i data-lucide="rocket" class="icon"></i> Comece por aqui</h3>
    <p>Gere pautas na Maquina de Assuntos, monte a arte no Production Pro, mande pro cliente aprovar e agende. O robo publica no horario.</p>
  </div>`;
  icons();
}
const statCard = (label,val,icon)=>`<div class="cardbox stat"><i data-lucide="${icon}" class="icon" style="color:var(--violet2)"></i><b>${val}</b><small>${label}</small></div>`;

// -------------- PLANNER --------------
async function viewPlanner(){
  const { posts } = await api('/api/posts' + (state.clientId?`?clientId=${state.clientId}`:''));
  state.posts = posts;
  const canCreate = state.can['post.create'];
  $('#view').innerHTML = `
    <div class="row" style="margin-bottom:14px">
      ${canCreate?`<button class="btn primary" id="newPost"><i data-lucide="plus" class="icon"></i> Novo post</button>`:''}
    </div>
    <div class="cardbox" style="padding:0;overflow:auto">
      <table><thead><tr><th>Titulo</th><th>Formato</th><th>Redes</th><th>Quando</th><th>Status</th><th></th></tr></thead>
      <tbody>${posts.map(rowPost).join('') || `<tr><td colspan="6" class="hint" style="padding:20px">Nada aqui ainda.</td></tr>`}</tbody></table>
    </div>`;
  if (canCreate) $('#newPost').onclick = ()=> editPost(null);
  $('#view').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editPost(b.dataset.edit));
  icons();
}
function rowPost(p){
  const nets = JSON.parse(p.networks||'[]').map(n=>`<i data-lucide="${(NETWORKS.find(x=>x.id===n)||{}).icon||'circle'}" class="icon" title="${n}"></i>`).join(' ');
  const when = p.scheduledAt ? new Date(p.scheduledAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
  return `<tr><td><b>${esc(p.title)}</b></td><td>${esc(p.format)}</td><td>${nets}</td><td>${when}</td>
    <td><span class="badge b-${p.status}">${STATUS_LABEL[p.status]||p.status}</span></td>
    <td style="text-align:right"><button class="btn sm" data-edit="${p.id}"><i data-lucide="pencil" class="icon"></i></button></td></tr>`;
}

function editPost(id){
  const p = id ? state.posts.find(x=>x.id===id) : null;
  const nets = p ? JSON.parse(p.networks||'[]') : ['instagram'];
  const clientOptions = state.clients.map(c=>`<option value="${c.id}" ${ (p?p.clientId:state.clientId)===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
  openModal(`${p?'Editar post':'Novo post'}`, `
    <div class="field"><label>Cliente</label><select id="fClient">${clientOptions}</select></div>
    <div class="field"><label>Titulo / pauta</label><input id="fTitle" value="${p?esc(p.title):''}"></div>
    <div class="field"><label>Formato</label><select id="fFormat">${FORMATS.map(f=>`<option ${p&&p.format===f?'selected':''}>${f}</option>`).join('')}</select></div>
    <div class="field"><label>Redes</label><div class="row" id="fNets">${NETWORKS.map(n=>`<button class="chip ${nets.includes(n.id)?'on':''}" data-n="${n.id}"><i data-lucide="${n.icon}" class="icon"></i> ${n.label}</button>`).join('')}</div></div>
    <div class="field"><label>Status</label><select id="fStatus">${STATUS.map(s=>`<option value="${s}" ${p&&p.status===s?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}</select></div>
    <div class="field"><label>Agendar para</label><input type="datetime-local" id="fWhen" value="${p&&p.scheduledAt?toLocalInput(p.scheduledAt):''}"></div>
    <div class="field"><label>Legenda Instagram</label><textarea id="fCap">${p?esc(p.captionIG):''}</textarea></div>
    <div class="field"><label>Hashtags</label><input id="fTags" value="${p?esc(p.hashtags):''}"></div>
  `, footerPost(p));
  let sel = [...nets];
  $('#fNets').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{const n=b.dataset.n; sel.includes(n)?sel=sel.filter(x=>x!==n):sel.push(n); b.classList.toggle('on');});
  $('#savePost').onclick = async ()=>{
    const body = { clientId:$('#fClient').value, title:$('#fTitle').value.trim(), format:$('#fFormat').value, networks:sel,
      status:$('#fStatus').value, captionIG:$('#fCap').value, hashtags:$('#fTags').value, scheduledAt:$('#fWhen').value||null };
    if(!body.title){ toast('Da um titulo.'); return; }
    if (p) await api('/api/posts/'+p.id,{method:'PATCH',body:JSON.stringify(body)});
    else await api('/api/posts',{method:'POST',body:JSON.stringify(body)});
    closeModal(); toast('Post salvo.'); viewPlanner();
  };
  if($('#reqApprove')) $('#reqApprove').onclick = async ()=>{ await api(`/api/posts/${p.id}/request-approval`,{method:'POST',body:'{}'}); closeModal(); toast('Enviado pro cliente aprovar.'); viewPlanner(); };
  if($('#schedule')) $('#schedule').onclick = async ()=>{ const when=$('#fWhen').value; if(!when){toast('Escolha data e hora.');return;} await api(`/api/posts/${p.id}/schedule`,{method:'POST',body:JSON.stringify({scheduledAt:when})}); closeModal(); toast('Agendado, o robo publica no horario.'); viewPlanner(); };
  if($('#publishNow')) $('#publishNow').onclick = async ()=>{ const r=await api(`/api/posts/${p.id}/publish-now`,{method:'POST',body:'{}'}); closeModal(); toast('Status: '+r.status); viewPlanner(); };
  if($('#delPost')) $('#delPost').onclick = async ()=>{ if(!confirm('Excluir?'))return; await api('/api/posts/'+p.id,{method:'DELETE'}); closeModal(); toast('Excluido.'); viewPlanner(); };
  icons();
}
function footerPost(p){
  const left = (p && state.can['post.delete']) ? `<button class="btn danger" id="delPost"><i data-lucide="trash-2" class="icon"></i> Excluir</button>` : '<span></span>';
  const right = [];
  if (p && state.can['approval.request']) right.push(`<button class="btn" id="reqApprove"><i data-lucide="mail" class="icon"></i> Enviar p/ aprovacao</button>`);
  if (p && state.can['post.schedule']) right.push(`<button class="btn" id="schedule"><i data-lucide="calendar-clock" class="icon"></i> Agendar</button>`);
  if (p && state.can['post.publishNow']) right.push(`<button class="btn" id="publishNow"><i data-lucide="send" class="icon"></i> Publicar agora</button>`);
  right.push(`<button class="btn primary" id="savePost"><i data-lucide="check" class="icon"></i> Salvar</button>`);
  return `${left}<div class="right">${right.join('')}</div>`;
}

// -------------- MAQUINA --------------
let deck = { topics:[], used:[] }, currentTopic=null;
async function viewMaquina(){
  if(!state.clientId){ $('#view').innerHTML='<div class="cardbox">Cadastre um cliente primeiro.</div>'; return; }
  const d = await api(`/api/maquina/${state.clientId}/deck`); deck=d; currentTopic=null;
  const pool = deck.topics.filter(t=>!deck.used.includes(t));
  $('#view').innerHTML = `
    <div class="row" style="margin-bottom:14px">
      <button class="btn primary" id="genTopics"><i data-lucide="wand-2" class="icon"></i> Gerar assuntos (IA)</button>
      <span class="pill">${pool.length} no baralho, ${deck.used.length} usados</span>
    </div>
    <div class="cardbox" id="mqStage"><p class="hint">Gere os assuntos e sorteie. Sem IA configurada, gera um baralho base offline.</p></div>`;
  $('#genTopics').onclick = async ()=>{ const b=$('#genTopics'); b.disabled=true; try{ const r=await api(`/api/maquina/${state.clientId}/topics`,{method:'POST',body:'{}'}); deck.topics=r.topics; toast((r.ai?'IA':'Offline')+': '+r.added+' assuntos'); viewMaquinaStage(); }catch(e){toast('Falhou.');} b.disabled=false; };
  viewMaquinaStage();
  icons();
}
function viewMaquinaStage(){
  const pool = deck.topics.filter(t=>!deck.used.includes(t));
  const stage = $('#mqStage');
  if(currentTopic){ stageTopic(); return; }
  stage.innerHTML = pool.length
    ? `<button class="btn primary" id="spin"><i data-lucide="dices" class="icon"></i> Sortear assunto</button>`
    : `<p class="hint">Baralho vazio. Clique em Gerar assuntos.</p>`;
  if($('#spin')) $('#spin').onclick = ()=>{ currentTopic = pool[Math.floor(Math.random()*pool.length)]; stageTopic(); };
  icons();
}
function stageTopic(){
  $('#mqStage').innerHTML = `
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--violet2);font-weight:600;margin-bottom:6px">Assunto sorteado</div>
    <h2 id="topicText" style="font-size:22px;margin-bottom:14px">${esc(currentTopic)}</h2>
    <div class="row">
      <button class="btn primary" id="mCar"><i data-lucide="layout-panel-left" class="icon"></i> Gerar carrossel</button>
      <button class="btn" id="mReel"><i data-lucide="clapperboard" class="icon"></i> Converter em Reels</button>
      <button class="btn" id="mSpicy"><i data-lucide="flame" class="icon"></i> Deixar mais apimentado</button>
      <button class="btn" id="mSkip"><i data-lucide="skip-forward" class="icon"></i> Outro</button>
    </div>
    <div id="mResult" style="margin-top:14px"></div>`;
  $('#mSpicy').onclick = ()=>{ const t=$('#topicText'); t.textContent = 'Pare de ignorar isso, '+currentTopic.charAt(0).toLowerCase()+currentTopic.slice(1); t.style.color='#ff8fa0'; };
  $('#mSkip').onclick = async ()=>{ await api(`/api/maquina/${state.clientId}/use-topic`,{method:'POST',body:JSON.stringify({topic:currentTopic})}); deck.used.push(currentTopic); currentTopic=null; viewMaquinaStage(); };
  $('#mCar').onclick = ()=> genContent('carousel');
  $('#mReel').onclick = ()=> genContent('reels');
  icons();
}
async function genContent(kind){
  const r=$('#mResult'); r.innerHTML='<p class="hint">Gerando com IA...</p>';
  const topic = $('#topicText').textContent;
  try{
    const body = kind==='carousel' ? {topic,slides:6} : {topic,dur:'30s'};
    const { data } = await api(`/api/maquina/${state.clientId}/${kind}`,{method:'POST',body:JSON.stringify(body)});
    const text = kind==='carousel' ? carouselText(data,topic) : reelsText(data,topic);
    r.innerHTML = `<div class="cardbox" style="white-space:pre-wrap;font-size:13.5px;line-height:1.6">${esc(text)}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn mint" id="toPlanner"><i data-lucide="calendar-plus" class="icon"></i> Enviar ao Planner</button>
        <button class="btn" id="toProd"><i data-lucide="image" class="icon"></i> Abrir no Production Pro</button>
      </div>`;
    const caption = kind==='carousel' ? (data.captions&&data.captions.instagram||'') : (data.caption||'');
    const hashtags = (data.hashtags||[]).join(' ');
    $('#toPlanner').onclick = async ()=>{
      await api('/api/posts',{method:'POST',body:JSON.stringify({clientId:state.clientId,title:topic,format:kind==='carousel'?'Carrossel':'Reels',networks:kind==='carousel'?['instagram','facebook','threads']:['instagram','tiktok'],status:'PRODUCTION',captionIG:caption,hashtags,roteiro:text})});
      toast('Enviado ao Planner.');
    };
    $('#toProd').onclick = async ()=>{
      const { post } = await api('/api/posts',{method:'POST',body:JSON.stringify({clientId:state.clientId,title:topic,format:'Carrossel',status:'PRODUCTION',captionIG:caption,hashtags,roteiro:text})});
      go('production'); setTimeout(()=>loadIntoProduction(post.id),150);
    };
    await api(`/api/maquina/${state.clientId}/use-topic`,{method:'POST',body:JSON.stringify({topic:currentTopic})});
  }catch(e){ r.innerHTML = `<p class="hint">${e.data&&e.data.error==='sem_ia'?'Configure ANTHROPIC_API_KEY no servidor pra gerar textos.':'A IA nao respondeu.'}</p>`; }
  icons();
}
const carouselText = (d,topic)=>`CARROSSEL, ${topic}\n\n`+(d.headlines||[]).map((h,i)=>`Headline ${String.fromCharCode(65+i)}: ${h}`).join('\n')+'\n\n'+(d.slides||[]).map(s=>`Slide ${s.n} (${s.kind})`+(s.tag?' '+s.tag:'')+': '+[s.headline,s.subhead,s.bridge,s.title,s.cta,(s.blocks||[]).join(' '),s.card].filter(Boolean).join(' | ')).join('\n')+`\n\nLegenda IG:\n${(d.captions||{}).instagram||''}\n\n${(d.hashtags||[]).join(' ')}`;
const reelsText = (d,topic)=>`REELS, ${topic}\n\nGancho: ${d.hook||''}\n\n`+(d.scenes||[]).map(s=>`[${s.t}] Tela: ${s.onscreen} | Fala: ${s.voice}`).join('\n')+`\n\nCTA: ${d.cta||''}\n\nLegenda:\n${d.caption||''}\n\n${(d.hashtags||[]).join(' ')}`;

// -------------- PRODUCTION PRO (basico) --------------
let ppPost=null;
async function viewProduction(){
  const { posts } = await api('/api/posts' + (state.clientId?`?clientId=${state.clientId}`:''));
  $('#view').innerHTML = `
    <div class="field" style="max-width:420px"><label>Escolha um post pra montar a arte</label>
      <select id="ppPick"><option value="">—</option>${posts.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
    <div id="ppEditor"></div>`;
  $('#ppPick').onchange = e => e.target.value && loadIntoProduction(e.target.value);
  icons();
}
async function loadIntoProduction(postId){
  const { posts } = await api('/api/posts' + (state.clientId?`?clientId=${state.clientId}`:''));
  ppPost = posts.find(p=>p.id===postId); if(!ppPost) return;
  const headline = (ppPost.title||'').toUpperCase();
  $('#ppEditor').innerHTML = `
    <div class="pp" style="margin-top:12px">
      <div class="ppControls">
        <div class="cardbox">
          <div class="field"><label>Imagem de fundo (URL)</label><input id="ppBg" placeholder="https://..."></div>
          <div class="field"><label>Headline</label><textarea id="ppHl">${esc(headline)}</textarea></div>
          <div class="field"><label>Tamanho do texto</label><input type="range" id="ppSize" min="16" max="46" value="24"></div>
          <div class="row">
            <button class="btn" id="ppExport"><i data-lucide="download" class="icon"></i> Exportar PNG</button>
            ${state.can['approval.request']?`<button class="btn mint" id="ppSend"><i data-lucide="mail" class="icon"></i> Enviar p/ aprovacao</button>`:''}
          </div>
          <p class="hint" style="margin-top:10px">Arraste o texto no canvas. O fundo com identidade visual do cliente entra pelo modelo definido pelo admin, aqui voce so ajusta.</p>
        </div>
      </div>
      <div class="canvas-wrap"><div id="ppCanvas"><div class="ppText" id="ppText">${esc(headline)}</div></div></div>
    </div>`;
  const canvas=$('#ppCanvas'), txt=$('#ppText');
  $('#ppBg').oninput = e => canvas.style.background = e.target.value ? `center/cover url("${e.target.value.replace(/"/g,'')}")` : '#222';
  $('#ppHl').oninput = e => txt.textContent = e.target.value;
  $('#ppSize').oninput = e => txt.style.fontSize = e.target.value+'px';
  dragify(txt, canvas);
  $('#ppExport').onclick = ()=> toast('Exportacao: gere o PNG no navegador (html2canvas). Placeholder no starter.');
  if($('#ppSend')) $('#ppSend').onclick = async ()=>{
    const design = JSON.stringify({ headline: txt.textContent, x: txt.offsetLeft, y: txt.offsetTop, size: txt.style.fontSize, background: $('#ppBg').value });
    await api('/api/posts/'+ppPost.id,{method:'PATCH',body:JSON.stringify({design})});
    await api('/api/posts/'+ppPost.id+'/request-approval',{method:'POST',body:'{}'});
    toast('Arte salva e enviada pro cliente aprovar.');
  };
  icons();
}
function dragify(el, parent){
  let sx,sy,ox,oy,drag=false;
  el.onpointerdown = e => { drag=true; el.setPointerCapture(e.pointerId); sx=e.clientX; sy=e.clientY; ox=el.offsetLeft; oy=el.offsetTop; };
  el.onpointermove = e => { if(!drag)return; el.style.left=Math.max(0,Math.min(parent.clientWidth-40, ox+(e.clientX-sx)))+'px'; el.style.top=Math.max(0,Math.min(parent.clientHeight-20, oy+(e.clientY-sy)))+'px'; };
  el.onpointerup = ()=> drag=false;
}

// -------------- APPROVALS --------------
async function viewApprovals(){
  const { posts } = await api('/api/posts' + (state.clientId&&state.me.role!=='CLIENT'?`?clientId=${state.clientId}`:''));
  const pending = posts.filter(p=>p.status==='PENDING_APPROVAL');
  const rest = posts.filter(p=>p.status!=='PENDING_APPROVAL');
  $('#view').innerHTML = `
    <div class="cardbox"><h3><i data-lucide="clock" class="icon"></i> Aguardando sua resposta</h3>
      ${pending.map(cardApproval).join('') || '<p class="hint">Nada pendente.</p>'}</div>
    <div class="cardbox" style="margin-top:14px"><h3><i data-lucide="history" class="icon"></i> Outros</h3>
      <table><tbody>${rest.map(p=>`<tr><td>${esc(p.title)}</td><td><span class="badge b-${p.status}">${STATUS_LABEL[p.status]}</span></td></tr>`).join('')||'<tr><td class="hint">—</td></tr>'}</tbody></table></div>`;
  $('#view').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openApproval(b.dataset.open));
  icons();
}
function cardApproval(p){
  return `<div class="row" style="justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:12px;margin-top:8px">
    <div><b>${esc(p.title)}</b><div class="hint">${esc(p.captionIG||'')}</div></div>
    <button class="btn" data-open="${p.id}"><i data-lucide="eye" class="icon"></i> Ver</button></div>`;
}
async function openApproval(id){
  const p = state.posts.find(x=>x.id===id) || (await api('/api/posts')).posts.find(x=>x.id===id);
  const { comments } = await api(`/api/posts/${id}/comments`);
  const canDecide = state.can['approval.decide'];
  openModal('Aprovacao', `
    <b>${esc(p.title)}</b>
    <div class="hint">${esc(p.captionIG||'')}</div>
    <div class="pill" style="width:fit-content">${esc(p.hashtags||'')}</div>
    <div class="field"><label>Comentarios</label><div id="cmts" style="display:flex;flex-direction:column;gap:6px">${comments.map(c=>`<div style="font-size:13px"><b>${esc(c.author)}</b>: ${esc(c.body)}</div>`).join('')||'<span class="hint">Sem comentarios.</span>'}</div></div>
    <div class="field"><textarea id="cmt" placeholder="Escreva um comentario ou uma observacao"></textarea></div>
  `, `
    <button class="btn" id="addCmt"><i data-lucide="message-square" class="icon"></i> Comentar</button>
    <div class="right">
      ${canDecide?`<button class="btn danger" id="reject"><i data-lucide="x" class="icon"></i> Pedir ajuste</button><button class="btn mint" id="approve"><i data-lucide="check" class="icon"></i> Aprovar</button>`:''}
    </div>`);
  $('#addCmt').onclick = async ()=>{ const body=$('#cmt').value.trim(); if(!body)return; await api(`/api/posts/${id}/comments`,{method:'POST',body:JSON.stringify({body})}); closeModal(); toast('Comentario enviado.'); };
  if($('#approve')) $('#approve').onclick = async ()=>{ await api(`/api/posts/${id}/decide`,{method:'POST',body:JSON.stringify({decision:'approve',note:$('#cmt').value})}); closeModal(); toast('Aprovado.'); viewApprovals(); };
  if($('#reject')) $('#reject').onclick = async ()=>{ await api(`/api/posts/${id}/decide`,{method:'POST',body:JSON.stringify({decision:'reject',note:$('#cmt').value})}); closeModal(); toast('Ajuste solicitado.'); viewApprovals(); };
  icons();
}

// -------------- CLIENTS --------------
async function viewClients(){
  const { clients } = await api('/api/clients'); state.clients=clients;
  $('#view').innerHTML = `<div class="row" style="margin-bottom:14px">${state.can['post.create']?`<button class="btn primary" id="newClient"><i data-lucide="plus" class="icon"></i> Novo cliente</button>`:''}</div>
    <div class="grid">${clients.map(c=>`<div class="cardbox"><h3><span class="dot" style="background:${c.color}"></span> ${esc(c.name)}</h3><p>${esc(c.ramo||'sem briefing')}</p>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-edit="${c.id}"><i data-lucide="pencil" class="icon"></i> Briefing</button>
      ${state.can['client.delete']?`<button class="btn sm danger" data-del="${c.id}"><i data-lucide="trash-2" class="icon"></i></button>`:''}</div></div>`).join('')}</div>`;
  if($('#newClient')) $('#newClient').onclick=()=>editClient(null);
  $('#view').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editClient(b.dataset.edit));
  $('#view').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Excluir cliente?'))return; await api('/api/clients/'+b.dataset.del,{method:'DELETE'}); toast('Excluido.'); viewClients(); });
  icons();
}
function editClient(id){
  const c = id ? state.clients.find(x=>x.id===id) : null;
  openModal(c?'Briefing do cliente':'Novo cliente', `
    <div class="field"><label>Nome</label><input id="cName" value="${c?esc(c.name):''}"></div>
    <div class="field"><label>Mercado</label><select id="cMarket">${['br','pt','en'].map(m=>`<option value="${m}" ${c&&c.market===m?'selected':''}>${m.toUpperCase()}</option>`).join('')}</select></div>
    <div class="field"><label>Ramo</label><input id="cRamo" value="${c?esc(c.ramo):''}"></div>
    <div class="field"><label>Assuntos</label><textarea id="cAssuntos">${c?esc(c.assuntos):''}</textarea></div>
    <div class="field"><label>Tom de voz</label><input id="cTom" value="${c?esc(c.tom):''}"></div>
    <div class="field"><label>Oferta / CTA</label><input id="cCta" value="${c?esc(c.cta):''}"></div>
  `, `<span></span><div class="right"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" id="saveC"><i data-lucide="check" class="icon"></i> Salvar</button></div>`);
  $('#saveC').onclick = async ()=>{
    const body={name:$('#cName').value.trim(),market:$('#cMarket').value,ramo:$('#cRamo').value,assuntos:$('#cAssuntos').value,tom:$('#cTom').value,cta:$('#cCta').value};
    if(!body.name){toast('Da um nome.');return;}
    if(c) await api('/api/clients/'+c.id,{method:'PATCH',body:JSON.stringify(body)});
    else await api('/api/clients',{method:'POST',body:JSON.stringify(body)});
    closeModal(); toast('Cliente salvo.'); viewClients(); renderClientPicker();
  };
  icons();
}

// -------------- SOCIAL --------------
async function viewSocial(){
  if(!state.clientId){ $('#view').innerHTML='<div class="cardbox">Escolha um cliente.</div>'; return; }
  const { accounts } = await api('/api/social/'+state.clientId);
  $('#view').innerHTML = `<div class="cardbox"><h3><i data-lucide="share-2" class="icon"></i> Contas conectadas</h3>
    <table><tbody>${accounts.map(a=>`<tr><td>${esc(a.platform)}</td><td>${esc(a.displayName||'')}</td><td><span class="badge b-${a.hasToken?'APPROVED':'PENDING_APPROVAL'}">${a.hasToken?'com token':'pendente'}</span></td>
      <td style="text-align:right">${state.can['social.connect']?`<button class="btn sm danger" data-del="${a.id}"><i data-lucide="trash-2" class="icon"></i></button>`:''}</td></tr>`).join('')||'<tr><td class="hint">Nenhuma conta ainda.</td></tr>'}</tbody></table>
    ${state.can['social.connect']?`<div class="row" style="margin-top:12px"><button class="btn primary" id="connect"><i data-lucide="plus" class="icon"></i> Conectar conta</button></div>`:''}
    <p class="hint" style="margin-top:10px">Enquanto os apps OAuth de cada rede nao estao aprovados, conecte colando o token e os ids do app (modo manual). Veja o README.</p></div>`;
  if($('#connect')) $('#connect').onclick=()=>connectSocial();
  $('#view').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ await api('/api/social/'+b.dataset.del,{method:'DELETE'}); viewSocial(); });
  icons();
}
function connectSocial(){
  openModal('Conectar conta', `
    <div class="field"><label>Rede</label><select id="sPlat">${NETWORKS.map(n=>`<option value="${n.id}">${n.label}</option>`).join('')}</select></div>
    <div class="field"><label>Nome de exibicao</label><input id="sName"></div>
    <div class="field"><label>Access token</label><input id="sTok"></div>
    <div class="field"><label>Meta JSON (ex.: {"igUserId":"...","pageId":"..."})</label><textarea id="sMeta">{}</textarea></div>
  `, `<span></span><div class="right"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" id="saveS"><i data-lucide="check" class="icon"></i> Conectar</button></div>`);
  $('#saveS').onclick=async()=>{ let meta={}; try{meta=JSON.parse($('#sMeta').value||'{}');}catch(e){toast('Meta JSON invalido.');return;}
    await api('/api/social/'+state.clientId+'/connect',{method:'POST',body:JSON.stringify({platform:$('#sPlat').value,displayName:$('#sName').value,accessToken:$('#sTok').value,meta})});
    closeModal(); toast('Conta conectada.'); viewSocial(); };
  icons();
}

// -------------- USERS --------------
async function viewUsers(){
  const { users } = await api('/api/users');
  $('#view').innerHTML = `<div class="row" style="margin-bottom:14px"><button class="btn primary" id="newUser"><i data-lucide="user-plus" class="icon"></i> Novo usuario</button></div>
    <div class="cardbox" style="padding:0;overflow:auto"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th></th></tr></thead>
    <tbody>${users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><span class="roletag">${roleLabel(u.role)}</span></td>
      <td style="text-align:right">${u.id!==state.me.id?`<button class="btn sm danger" data-del="${u.id}"><i data-lucide="trash-2" class="icon"></i></button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  $('#newUser').onclick=()=>editUser();
  $('#view').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Excluir usuario?'))return; await api('/api/users/'+b.dataset.del,{method:'DELETE'}); viewUsers(); });
  icons();
}
function editUser(){
  openModal('Novo usuario', `
    <div class="field"><label>Nome</label><input id="uName"></div>
    <div class="field"><label>E-mail</label><input id="uEmail" type="email"></div>
    <div class="field"><label>Senha</label><input id="uPass" type="text" value="mudar123"></div>
    <div class="field"><label>Papel</label><select id="uRole"><option value="COLLABORATOR">Colaborador</option><option value="ADMIN">Admin</option><option value="CLIENT">Cliente</option></select></div>
    <div class="field" id="uClientWrap" style="display:none"><label>Cliente</label><select id="uClient">${state.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
  `, `<span></span><div class="right"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" id="saveU"><i data-lucide="check" class="icon"></i> Criar</button></div>`);
  $('#uRole').onchange = e => $('#uClientWrap').style.display = e.target.value==='CLIENT'?'block':'none';
  $('#saveU').onclick=async()=>{ const body={name:$('#uName').value,email:$('#uEmail').value,password:$('#uPass').value,role:$('#uRole').value,clientId:$('#uClient')?$('#uClient').value:null};
    if(!body.email){toast('Da um e-mail.');return;}
    try{ await api('/api/users',{method:'POST',body:JSON.stringify(body)}); closeModal(); toast('Usuario criado.'); viewUsers(); }catch(e){ toast(e.data&&e.data.error==='email_em_uso'?'E-mail ja usado.':'Falhou.'); } };
  icons();
}

// -------------- modal helpers --------------
function openModal(title, body, footer){
  $('#modal').innerHTML = `<div class="mhead"><h3>${esc(title)}</h3><button class="btn sm" onclick="closeModal()"><i data-lucide="x" class="icon"></i></button></div>
    <div class="mbody">${body}</div><div class="mfoot">${footer||''}</div>`;
  $('#overlay').classList.add('open'); icons();
}
function closeModal(){ $('#overlay').classList.remove('open'); }
window.closeModal = closeModal;
function toLocalInput(iso){ const d=new Date(iso); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
$('#overlay').addEventListener('click', e=>{ if(e.target.id==='overlay') closeModal(); });

boot().catch(e=>{ console.error(e); });
