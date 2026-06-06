// ══════════════════════════════════════════════
// CHÁ DE REVELAÇÃO DA FLÁVIA — cha-script.js
// ══════════════════════════════════════════════

const API = 'api.php';
const EVENT_DATE = new Date('2026-06-28T15:00:00');
let currentUser = null;

// ── UTILITÁRIOS ──────────────────────────────

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('device_id', id); }
  return id;
}

async function api(acao, metodo = 'GET', body = null) {
  const url = `${API}?acao=${acao}`;
  const opts = { method: metodo, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  return res.json();
}

async function apiGet(acao, params = {}) {
  const query = new URLSearchParams({ acao, ...params }).toString();
  const res = await fetch(`${API}?${query}`);
  return res.json();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (name === 'home') refreshHome();
  if (name === 'admin') refreshAdmin();
}

function showTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  el.classList.add('active');
  if (name === 'palpites') renderVoteResults();
}

// ── LOGIN ─────────────────────────────────────

document.getElementById('login-name').addEventListener('input', async function () {
  const val = this.value.trim();
  const el = document.getElementById('login-greeting');
  if (val.length < 2) { el.textContent = ''; return; }
  try {
    const data = await apiGet('login', { nome: val, device_id: getDeviceId() });
    if (data.erro) {
      el.innerHTML = data.erro.includes('outro dispositivo')
        ? `<span style="color:#e08080">✗ Esse nome já foi acessado em outro celular</span>`
        : `<span style="color:#e08080">✗ Nome não encontrado na lista</span>`;
    } else {
      el.innerHTML = `<span style="color:var(--gold)">✓ Olá, ${data.relacao}!</span>`;
    }
  } catch { el.innerHTML = `<span style="color:#e08080">✗ Erro ao conectar</span>`; }
});

async function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  if (!name) { showToast('Digite seu nome!'); return; }
  try {
    const data = await apiGet('login', { nome: name, device_id: getDeviceId() });
    if (data.erro) {
      showToast(data.erro.includes('outro dispositivo')
        ? 'Esse nome já foi acessado em outro dispositivo!'
        : 'Nome não encontrado. Fale com a Júlia! 🌸');
      return;
    }
    currentUser = data;
    localStorage.setItem('current_user', JSON.stringify(data));
    if (!data.votou) {
      document.getElementById('vote-name').textContent = data.nome;
      localStorage.setItem('post_vote_screen', data.is_admin ? 'admin' : 'home');
      showScreen('vote');
    } else if (data.is_admin) {
      showScreen('admin'); refreshAdmin();
    } else {
      showScreen('home'); refreshHome();
    }
  } catch { showToast('Erro ao conectar com o servidor.'); }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('current_user');
  document.getElementById('login-name').value = '';
  document.getElementById('login-greeting').textContent = '';
  showScreen('login');
}

// ── VOTAÇÃO ──────────────────────────────────

let selectedVote = null;

function selectVote(choice, el) {
  selectedVote = choice;
  document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('vote-btn');
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
}

async function submitVote() {
  if (!selectedVote || !currentUser) return;
  try {
    const data = await api('votar', 'POST', { convidado_id: currentUser.id, voto: selectedVote });
    if (data.erro) { showToast('Erro ao salvar palpite.'); return; }
    currentUser.votou = true; currentUser.voto = selectedVote;
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    const postVote = localStorage.getItem('post_vote_screen') || 'home';
    localStorage.removeItem('post_vote_screen');
    if (postVote === 'admin') { showScreen('admin'); refreshAdmin(); }
    else { showScreen('home'); refreshHome(); }
  } catch { showToast('Erro ao conectar com o servidor.'); }
}

// ── HOME ─────────────────────────────────────

async function refreshHome() {
  if (!currentUser) return;
  document.getElementById('home-name').textContent = `Olá, ${currentUser.nome}! 👋`;
  document.getElementById('home-relation').textContent = currentUser.relacao;
  document.getElementById('user-avatar').textContent = currentUser.nome.charAt(0).toUpperCase();
  updateCountdown();
  setInterval(updateCountdown, 60000);
  try {
    const estado = await apiGet('estado');
    const badge = document.getElementById('reveal-badge');
    if (estado.revelacao === 'menino') {
      badge.className = 'reveal-badge revealed-m'; badge.textContent = '💙 É MENINO!';
    } else if (estado.revelacao === 'menina') {
      badge.className = 'reveal-badge revealed-f'; badge.textContent = '🌸 É MENINA!';
    } else {
      badge.className = 'reveal-badge locked'; badge.textContent = '🔒 A revelação ainda está guardada...';
    }
    if (estado.local_evento) document.getElementById('event-location').textContent = estado.local_evento;
    if (currentUser.presenca) {
      document.querySelectorAll('.rsvp-btn').forEach(b => b.classList.remove('selected'));
      const btn = document.querySelector(`.rsvp-btn.${currentUser.presenca === 'sim' ? 'yes' : 'no'}`);
      if (btn) btn.classList.add('selected');
      document.getElementById('rsvp-status').textContent = currentUser.presenca === 'sim'
        ? '✓ Presença confirmada!' : 'Que pena! Te esperamos na próxima 💛';
    }
    renderVoteResultsFromData(estado.votos, estado.total_votos);
  } catch { showToast('Erro ao carregar dados.'); }
}

function updateCountdown() {
  const now = new Date();
  const diff = EVENT_DATE - now;
  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins'].forEach(id => document.getElementById(id).textContent = '🎉');
    return;
  }
  document.getElementById('cd-days').textContent  = Math.floor(diff / 86400000);
  document.getElementById('cd-hours').textContent = Math.floor((diff % 86400000) / 3600000);
  document.getElementById('cd-mins').textContent  = Math.floor((diff % 3600000) / 60000);
}

async function renderVoteResults() {
  try { const e = await apiGet('estado'); renderVoteResultsFromData(e.votos, e.total_votos); } catch {}
}

function renderVoteResultsFromData(votos, total) {
  const el = document.getElementById('vote-results-display');
  if (!el) return;
  if (!total) { el.innerHTML = '<p style="color:var(--soft);font-size:0.85rem;text-align:center;padding:16px;">Ninguém votou ainda!</p>'; return; }
  const meninos = votos.menino || 0, meninas = votos.menina || 0;
  const pm = Math.round((meninos / total) * 100), pf = 100 - pm;
  el.innerHTML = `
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
        <span>💙 Menino</span><span style="font-weight:500">${pm}% (${meninos})</span></div>
      <div style="background:rgba(184,216,232,0.2);border-radius:50px;height:10px;">
        <div style="width:${pm}%;background:linear-gradient(90deg,var(--sky),#8ab8d0);height:100%;border-radius:50px;"></div></div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
        <span>🌸 Menina</span><span style="font-weight:500">${pf}% (${meninas})</span></div>
      <div style="background:rgba(242,196,196,0.2);border-radius:50px;height:10px;">
        <div style="width:${pf}%;background:linear-gradient(90deg,var(--blush),#e89898);height:100%;border-radius:50px;"></div></div>
    </div>
    <p style="text-align:center;font-size:0.75rem;color:var(--soft);margin-top:12px;">${total} palpite${total!==1?'s':''} registrado${total!==1?'s':''}</p>`;
}

// ── PRESENÇA ─────────────────────────────────

async function setRSVP(choice, el) {
  if (!currentUser) return;
  try {
    const data = await api('presenca', 'POST', { convidado_id: currentUser.id, confirmado: choice });
    if (data.erro) { showToast('Erro ao salvar presença.'); return; }
    currentUser.presenca = choice;
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    document.querySelectorAll('.rsvp-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('rsvp-status').textContent = choice === 'sim'
      ? '✓ Presença confirmada! Te esperamos 💛' : 'Que pena! Você fará falta 💛';
    showToast(choice === 'sim' ? '✓ Presença confirmada!' : 'Registrado!');
  } catch { showToast('Erro ao conectar com o servidor.'); }
}

// ── FOTOS ────────────────────────────────────

let pendingPhotos = [];

function handlePhotoUpload(e) {
  const files = Array.from(e.target.files).slice(0, 5);
  pendingPhotos = files;
  const grid = document.getElementById('photo-preview-grid');
  grid.innerHTML = '';
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement('div');
      div.className = 'photo-thumb';
      div.innerHTML = `<img src="${ev.target.result}">`;
      grid.appendChild(div);
    };
    reader.readAsDataURL(f);
  });
  document.getElementById('send-photos-btn-wrap').style.display = files.length ? 'block' : 'none';
}

async function sendPhotos() {
  if (!pendingPhotos.length || !currentUser) return;
  let enviadas = 0;
  for (const file of pendingPhotos) {
    const formData = new FormData();
    formData.append('convidado_id', currentUser.id);
    formData.append('foto', file);
    try {
      const res = await fetch(`${API}?acao=enviar_foto`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.erro) enviadas++;
    } catch {}
  }
  if (enviadas > 0) {
    showToast(`📸 ${enviadas} foto(s) enviada(s)! Obrigada!`);
    document.getElementById('photo-preview-grid').innerHTML = '';
    pendingPhotos = [];
    document.getElementById('send-photos-btn-wrap').style.display = 'none';
  } else { showToast('Erro ao enviar fotos.'); }
}

// ── ADMIN ────────────────────────────────────

async function refreshAdmin() {
  if (!currentUser) return;
  document.querySelector('#screen-admin .avatar-badge').textContent = currentUser.nome.charAt(0).toUpperCase();
  try {
    const [estado, convidados, fotos] = await Promise.all([
      apiGet('estado'), apiGet('convidados'), apiGet('fotos')
    ]);

    // Contagem de presença levando em conta filhos
    // Cada convidado confirmado conta por (1 + número de filhos)
    const totalPessoas = convidados
      .filter(c => c.confirmado === 'sim')
      .reduce((acc, c) => acc + c.peso_presenca, 0);

    document.getElementById('admin-total-guests').textContent = convidados.length;
    document.getElementById('admin-confirmed').textContent = totalPessoas;
    document.getElementById('admin-votes').textContent = estado.total_votos;

    // Vote bars
    const total = estado.total_votos;
    const meninos = estado.votos.menino || 0, meninas = estado.votos.menina || 0;
    const pm = total ? Math.round((meninos / total) * 100) : 0, pf = 100 - pm;
    document.getElementById('admin-vote-bars').innerHTML = `
      <div class="vote-bar-row"><span class="vote-bar-label">💙 Menino</span>
        <div style="flex:1;background:rgba(184,216,232,0.2);border-radius:50px;height:10px;">
          <div class="vote-bar-fill m" style="width:${pm}%;height:100%;border-radius:50px;"></div></div>
        <span class="vote-bar-pct">${pm}%</span></div>
      <div class="vote-bar-row"><span class="vote-bar-label">🌸 Menina</span>
        <div style="flex:1;background:rgba(242,196,196,0.15);border-radius:50px;height:10px;">
          <div class="vote-bar-fill f" style="width:${pf}%;height:100%;border-radius:50px;"></div></div>
        <span class="vote-bar-pct">${pf}%</span></div>
      <p style="font-size:0.75rem;color:var(--soft);margin-top:8px;">${meninos} menino · ${meninas} menina · ${total} total</p>`;

    // Reveal
    document.querySelectorAll('.reveal-opt').forEach(b => b.classList.remove('selected'));
    const map = { locked: 'ro-locked', menino: 'ro-m', menina: 'ro-f' };
    if (map[estado.revelacao]) document.getElementById(map[estado.revelacao]).classList.add('selected');

    // Local
    if (estado.local_evento) document.getElementById('location-input').value = estado.local_evento;

    // Lista convidados
    renderGuestList(convidados);

    // RSVP list com filhos
    const rsvpEl = document.getElementById('admin-rsvp-list');
    rsvpEl.innerHTML = convidados.map(g => {
      const nomesFilhos = g.filhos && g.filhos.length
        ? ` <span style="font-size:0.75rem;color:var(--soft)">+ ${g.filhos.map(f => f.nome).join(', ')}</span>` : '';
      const pessoasStr = g.confirmado === 'sim' && g.peso_presenca > 1
        ? ` <span style="font-size:0.7rem;color:var(--gold)">(${g.peso_presenca} pessoas)</span>` : '';
      const tag = g.confirmado === 'sim' ? '<span class="rsvp-tag yes">Confirmada</span>' :
                  g.confirmado === 'nao' ? '<span class="rsvp-tag no">Não vai</span>' :
                  '<span class="rsvp-tag pending">Pendente</span>';
      return `<div class="rsvp-person">
        <div>
          <div class="name">${g.nome}${nomesFilhos}${pessoasStr}</div>
          <div class="rel">${g.relacao}</div>
        </div>${tag}</div>`;
    }).join('');

    renderAdminPhotos(fotos);
  } catch { showToast('Erro ao carregar painel admin.'); }
}

function renderGuestList(convidados) {
  const el = document.getElementById('guest-list-admin');
  el.innerHTML = convidados.map(g => {
    const filhosHtml = g.filhos && g.filhos.length
      ? `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
          ${g.filhos.map(f => `
            <span style="background:rgba(201,169,110,0.1);border-radius:20px;padding:2px 10px;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
              👶 ${f.nome}
              ${!g.is_admin ? `<button onclick="removeFilho(${f.id}, ${g.id})" style="background:none;border:none;color:#e08080;cursor:pointer;font-size:0.75rem;padding:0;margin-left:2px;">✕</button>` : ''}
            </span>`).join('')}
          ${!g.is_admin ? `<button onclick="showAddFilhoForm(${g.id})" style="background:none;border:1.5px dashed rgba(201,169,110,0.4);border-radius:20px;padding:2px 10px;font-size:0.72rem;color:var(--gold);cursor:pointer;">+ filho</button>` : ''}
        </div>`
      : (!g.is_admin ? `<div style="margin-top:4px;"><button onclick="showAddFilhoForm(${g.id})" style="background:none;border:1.5px dashed rgba(201,169,110,0.4);border-radius:20px;padding:2px 10px;font-size:0.72rem;color:var(--gold);cursor:pointer;">+ adicionar filho</button></div>` : '');

    return `<div class="guest-row" id="guest-row-${g.id}">
      <div style="flex:1;">
        <div class="gname">${g.nome}</div>
        <div class="grel">${g.relacao}</div>
        ${filhosHtml}
        <div id="add-filho-form-${g.id}" style="display:none;margin-top:6px;display:none;">
          <div style="display:flex;gap:6px;margin-top:4px;">
            <input type="text" id="filho-input-${g.id}" placeholder="Nome do filho..." style="flex:1;padding:6px 10px;border:1.5px solid rgba(201,169,110,0.3);border-radius:8px;font-size:0.8rem;">
            <button onclick="addFilho(${g.id})" style="background:var(--gold);color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:0.8rem;">✓</button>
            <button onclick="hideAddFilhoForm(${g.id})" style="background:none;border:1px solid #ccc;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.8rem;">✕</button>
          </div>
        </div>
      </div>
      ${!g.is_admin ? `<button class="del-btn" onclick="removeGuest(${g.id})">✕</button>` : ''}
    </div>`;
  }).join('');
}

function showAddFilhoForm(convidadoId) {
  const form = document.getElementById(`add-filho-form-${convidadoId}`);
  if (form) { form.style.display = 'block'; document.getElementById(`filho-input-${convidadoId}`).focus(); }
}

function hideAddFilhoForm(convidadoId) {
  const form = document.getElementById(`add-filho-form-${convidadoId}`);
  if (form) { form.style.display = 'none'; document.getElementById(`filho-input-${convidadoId}`).value = ''; }
}

async function addFilho(convidadoId) {
  const input = document.getElementById(`filho-input-${convidadoId}`);
  const nome = input ? input.value.trim() : '';
  if (!nome) { showToast('Digite o nome do filho!'); return; }
  try {
    const data = await api('adicionar_filho', 'POST', { convidado_id: convidadoId, nome });
    if (data.erro) { showToast(data.erro); return; }
    showToast(`👶 ${nome} adicionado!`);
    await refreshAdmin();
  } catch { showToast('Erro ao adicionar filho.'); }
}

async function removeFilho(filhoId, convidadoId) {
  try {
    const res = await fetch(`${API}?acao=remover_filho&id=${filhoId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.erro) { showToast(data.erro); return; }
    showToast('Filho removido.');
    await refreshAdmin();
  } catch { showToast('Erro ao remover filho.'); }
}

async function refreshGuestList() {
  try {
    const convidados = await apiGet('convidados');
    renderGuestList(convidados);
    document.getElementById('admin-total-guests').textContent = convidados.length;
  } catch {}
}

// filhos na hora de adicionar convidado
let novosFilhos = [];

function addFilhoNovo() {
  const input = document.getElementById('novo-filho-input');
  const nome = input ? input.value.trim() : '';
  if (!nome) return;
  novosFilhos.push(nome);
  input.value = '';
  renderNovosFilhos();
}

function removeFilhoNovo(i) {
  novosFilhos.splice(i, 1);
  renderNovosFilhos();
}

function renderNovosFilhos() {
  const el = document.getElementById('novos-filhos-lista');
  if (!el) return;
  el.innerHTML = novosFilhos.map((n, i) => `
    <span style="background:rgba(201,169,110,0.1);border-radius:20px;padding:3px 10px;font-size:0.78rem;display:inline-flex;align-items:center;gap:6px;">
      👶 ${n}
      <button onclick="removeFilhoNovo(${i})" style="background:none;border:none;color:#e08080;cursor:pointer;font-size:0.8rem;">✕</button>
    </span>`).join('');
}

async function addGuest() {
  const name = document.getElementById('new-guest-name').value.trim();
  const rel  = document.getElementById('new-guest-rel').value;
  const isAdmin = document.getElementById('new-guest-admin').checked;
  if (!name) { showToast('Digite um nome!'); return; }
  try {
    const data = await api('adicionar_convidado', 'POST', { nome: name, relacao: rel, is_admin: isAdmin, filhos: novosFilhos });
    if (data.erro) { showToast(data.erro); return; }
    document.getElementById('new-guest-name').value = '';
    document.getElementById('new-guest-admin').checked = false;
    novosFilhos = [];
    renderNovosFilhos();
    await refreshAdmin();
    showToast(`✓ ${name} adicionada!`);
  } catch { showToast('Erro ao adicionar convidada.'); }
}

async function removeGuest(id) {
  try {
    const res = await fetch(`${API}?acao=remover_convidado&id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.erro) { showToast(data.erro); return; }
    await refreshAdmin();
    showToast('Convidada removida.');
  } catch { showToast('Erro ao remover convidada.'); }
}

async function setReveal(choice) {
  try {
    await api('configurar', 'POST', { chave: 'revelacao', valor: choice });
    document.querySelectorAll('.reveal-opt').forEach(b => b.classList.remove('selected'));
    const map = { locked: 'ro-locked', menino: 'ro-m', menina: 'ro-f' };
    if (map[choice]) document.getElementById(map[choice]).classList.add('selected');
    const msgs = { locked: '🔒 Revelação oculta', menino: '💙 É MENINO! Revelado!', menina: '🌸 É MENINA! Revelado!' };
    showToast(msgs[choice]);
  } catch { showToast('Erro ao salvar revelação.'); }
}

async function saveLocation() {
  const loc = document.getElementById('location-input').value.trim();
  if (!loc) return;
  try {
    await api('configurar', 'POST', { chave: 'local_evento', valor: loc });
    document.getElementById('event-location').textContent = loc;
    showToast('✓ Local salvo!');
  } catch { showToast('Erro ao salvar local.'); }
}

function renderAdminPhotos(fotos) {
  const el = document.getElementById('admin-photo-grid');
  if (!fotos.length) {
    el.innerHTML = '<div class="empty-photos" style="grid-column:1/-1">Nenhuma foto enviada ainda</div>';
    return;
  }
  el.innerHTML = fotos.map(p => `
    <div class="photo-admin-item">
      <img src="${p.caminho}" onerror="this.src=''">
      <a class="dl-btn" href="${p.caminho}" download>⬇</a>
    </div>`).join('');
}

// ── INIT ─────────────────────────────────────

window.onload = async function () {
  const saved = localStorage.getItem('current_user');
  if (!saved) return;
  try {
    const user = JSON.parse(saved);
    const data = await apiGet('login', { nome: user.nome, device_id: getDeviceId() });
    if (data.erro) { localStorage.removeItem('current_user'); return; }
    currentUser = data;
    localStorage.setItem('current_user', JSON.stringify(data));
    if (!data.votou) {
      document.getElementById('vote-name').textContent = data.nome;
      localStorage.setItem('post_vote_screen', data.is_admin ? 'admin' : 'home');
      showScreen('vote');
    } else if (data.is_admin) {
      showScreen('admin'); refreshAdmin();
    } else {
      showScreen('home'); refreshHome();
    }
  } catch { showScreen('login'); }
};
