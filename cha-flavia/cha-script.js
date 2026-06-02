// ══ DATA STORE ══
const ADMINS = ['júlia', 'flávia', 'victor'];
const EVENT_DATE = new Date('2025-06-28T12:00:00');

function getData() {
  try { return JSON.parse(localStorage.getItem('cha_data') || '{}'); } catch { return {}; }
}
function saveData(d) { localStorage.setItem('cha_data', JSON.stringify(d)); }

function getState() {
  const d = getData();
  const defaultRsvp = { 'júlia': 'sim', 'flávia': 'sim', 'victor': 'sim' };
  return {
    guests: d.guests || [
      { name: 'Júlia', relation: 'Titi Organizadora' },
      { name: 'Flávia', relation: 'Mamãe' },
      { name: 'Victor', relation: 'Papai' },
      { name: 'Jaqueline', relation: 'Vovó' },
      { name: 'Sayonara', relation: 'Vovó' },
      { name: 'Ricardo', relation: 'Vovô' }
    ],
    votes: d.votes || {},
    rsvp: d.rsvp || defaultRsvp,
    reveal: d.reveal || 'locked',
    location: d.location || '',
    photos: d.photos || [],
    devices: d.devices || {}
  };
}
function setState(updates) {
  const s = getState();
  const next = { ...s, ...updates };
  saveData(next);
}

// ══ CURRENT USER ══
let currentUser = null;

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('device_id', id); }
  return id;
}

function normalizeStr(s) { return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function isAdmin(name) { return ADMINS.some(a => normalizeStr(a) === normalizeStr(name)); }

// ══ LOGIN ══
document.getElementById('login-name').addEventListener('input', function() {
  const val = this.value.trim();
  const s = getState();
  const guest = s.guests.find(g => g.name.toLowerCase() === val.toLowerCase());
  const el = document.getElementById('login-greeting');
  if (val.length < 2) { el.textContent = ''; return; }
  if (guest) {
    el.innerHTML = `<span style="color:var(--gold)">✓ Olá, ${guest.relation}!</span>`;
  } else {
    el.innerHTML = `<span style="color:#e08080">✗ Nome não encontrado na lista</span>`;
  }
});

function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  if (!name) { showToast('Digite seu nome!'); return; }
  const s = getState();
  const guest = s.guests.find(g => g.name.toLowerCase() === name.toLowerCase());
  if (!guest) { showToast('Nome não encontrado. Fale com a Júlia! 🌸'); return; }

  const deviceId = getDeviceId();
  const devices = s.devices || {};

  // Check if name is already linked to another device
  const linkedDevice = devices[name.toLowerCase()];
  if (linkedDevice && linkedDevice !== deviceId) {
    showToast('Esse nome já foi acessado em outro dispositivo!'); return;
  }

  // Link device
  devices[name.toLowerCase()] = deviceId;
  setState({ devices });

  currentUser = guest;
  localStorage.setItem('current_user', JSON.stringify(guest));

  const voted = s.votes[name.toLowerCase()];
  if (!voted) {
    // Everyone votes first, including admins
    document.getElementById('vote-name').textContent = guest.name;
    // Store that after voting, admin goes to admin screen
    localStorage.setItem('post_vote_screen', isAdmin(name) ? 'admin' : 'home');
    showScreen('vote');
  } else if (isAdmin(name)) {
    showScreen('admin');
    refreshAdmin();
  } else {
    showScreen('home');
    refreshHome();
  }
}

// ══ VOTE ══
let selectedVote = null;
function selectVote(choice, el) {
  selectedVote = choice;
  document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('vote-btn');
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
}

function submitVote() {
  if (!selectedVote || !currentUser) return;
  const s = getState();
  const votes = { ...s.votes };
  votes[currentUser.name.toLowerCase()] = selectedVote;
  setState({ votes });
  const postVote = localStorage.getItem('post_vote_screen') || 'home';
  localStorage.removeItem('post_vote_screen');
  if (postVote === 'admin') {
    showScreen('admin');
    refreshAdmin();
  } else {
    showScreen('home');
    refreshHome();
  }
}

// ══ HOME ══
function refreshHome() {
  if (!currentUser) return;
  document.getElementById('home-name').textContent = `Olá, ${currentUser.name}! 👋`;
  document.getElementById('home-relation').textContent = currentUser.relation;
  document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

  updateCountdown();
  setInterval(updateCountdown, 60000);

  const s = getState();
  // Reveal badge
  const badge = document.getElementById('reveal-badge');
  if (s.reveal === 'menino') {
    badge.className = 'reveal-badge revealed-m';
    badge.textContent = '💙 É MENINO!';
  } else if (s.reveal === 'menina') {
    badge.className = 'reveal-badge revealed-f';
    badge.textContent = '🌸 É MENINA!';
  } else {
    badge.className = 'reveal-badge locked';
    badge.textContent = '🔒 A revelação ainda está guardada...';
  }

  // Location
  if (s.location) document.getElementById('event-location').textContent = s.location;

  // RSVP
  const myRsvp = s.rsvp[currentUser.name.toLowerCase()];
  if (myRsvp) {
    document.querySelectorAll('.rsvp-btn').forEach(b => b.classList.remove('selected'));
    const btn = document.querySelector(`.rsvp-btn.${myRsvp === 'sim' ? 'yes' : 'no'}`);
    if (btn) btn.classList.add('selected');
    document.getElementById('rsvp-status').textContent = myRsvp === 'sim' ? '✓ Presença confirmada!' : 'Que pena! Te esperamos na próxima 💛';
  }

  // Vote results
  const votes = s.votes;
  const total = Object.keys(votes).length;
  const meninos = Object.values(votes).filter(v => v === 'menino').length;
  const meninas = total - meninos;
  const el = document.getElementById('vote-results-display');
  if (total === 0) {
    el.innerHTML = '<p style="color:var(--soft); font-size:0.85rem; text-align:center; padding:16px;">Ninguém votou ainda!</p>';
  } else {
    const pm = Math.round((meninos / total) * 100);
    const pf = 100 - pm;
    el.innerHTML = `
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
          <span>💙 Menino</span><span style="font-weight:500">${pm}% (${meninos})</span>
        </div>
        <div style="background:rgba(184,216,232,0.2); border-radius:50px; height:10px;">
          <div style="width:${pm}%; background:linear-gradient(90deg,var(--sky),#8ab8d0); height:100%; border-radius:50px;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
          <span>🌸 Menina</span><span style="font-weight:500">${pf}% (${meninas})</span>
        </div>
        <div style="background:rgba(242,196,196,0.2); border-radius:50px; height:10px;">
          <div style="width:${pf}%; background:linear-gradient(90deg,var(--blush),#e89898); height:100%; border-radius:50px;"></div>
        </div>
      </div>
      <p style="text-align:center; font-size:0.75rem; color:var(--soft); margin-top:12px;">${total} palpite${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}</p>
    `;
  }
}

function updateCountdown() {
  const now = new Date();
  const diff = EVENT_DATE - now;
  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '🎉';
    document.getElementById('cd-hours').textContent = '🎉';
    document.getElementById('cd-mins').textContent = '🎉';
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  document.getElementById('cd-days').textContent = days;
  document.getElementById('cd-hours').textContent = hours;
  document.getElementById('cd-mins').textContent = mins;
}

// ══ RSVP ══
function setRSVP(choice, el) {
  if (!currentUser) return;
  const s = getState();
  const rsvp = { ...s.rsvp };
  rsvp[currentUser.name.toLowerCase()] = choice;
  setState({ rsvp });
  document.querySelectorAll('.rsvp-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const msg = choice === 'sim' ? '✓ Presença confirmada! Te esperamos 💛' : 'Que pena! Você fará falta 💛';
  document.getElementById('rsvp-status').textContent = msg;
  showToast(choice === 'sim' ? '✓ Presença confirmada!' : 'Registrado!');
}

// ══ PHOTOS ══
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

function sendPhotos() {
  if (!pendingPhotos.length) return;
  const s = getState();
  let remaining = pendingPhotos.length;
  pendingPhotos.forEach(f => {
    const reader = new FileReader();
    reader.onload = ev => {
      const photos = [...(s.photos || [])];
      photos.push({ data: ev.target.result, by: currentUser.name, ts: Date.now() });
      setState({ photos });
      remaining--;
      if (remaining === 0) {
        showToast('📸 Fotos enviadas! Obrigada!');
        document.getElementById('photo-preview-grid').innerHTML = '';
        pendingPhotos = [];
        document.getElementById('send-photos-btn-wrap').style.display = 'none';
        refreshAdminPhotos();
      }
    };
    reader.readAsDataURL(f);
  });
}

// ══ ADMIN ══
function refreshAdmin() {
  if (!currentUser) return;
  document.querySelector('#screen-admin .avatar-badge').textContent = currentUser.name.charAt(0).toUpperCase();
  const s = getState();

  document.getElementById('admin-total-guests').textContent = s.guests.length;
  document.getElementById('admin-confirmed').textContent = Object.values(s.rsvp).filter(v => v === 'sim').length;
  document.getElementById('admin-votes').textContent = Object.keys(s.votes).length;

  // Vote bars
  const total = Object.keys(s.votes).length;
  const meninos = Object.values(s.votes).filter(v => v === 'menino').length;
  const meninas = total - meninos;
  const pm = total ? Math.round((meninos / total) * 100) : 0;
  const pf = 100 - pm;
  document.getElementById('admin-vote-bars').innerHTML = `
    <div class="vote-bar-row"><span class="vote-bar-label">💙 Menino</span>
      <div style="flex:1; background:rgba(184,216,232,0.2); border-radius:50px; height:10px;">
        <div class="vote-bar-fill m" style="width:${pm}%; height:100%; border-radius:50px;"></div>
      </div>
      <span class="vote-bar-pct">${pm}%</span></div>
    <div class="vote-bar-row"><span class="vote-bar-label">🌸 Menina</span>
      <div style="flex:1; background:rgba(242,196,196,0.15); border-radius:50px; height:10px;">
        <div class="vote-bar-fill f" style="width:${pf}%; height:100%; border-radius:50px;"></div>
      </div>
      <span class="vote-bar-pct">${pf}%</span></div>
    <p style="font-size:0.75rem; color:var(--soft); margin-top:8px;">${meninos} menino · ${meninas} menina · ${total} total</p>
  `;

  // Reveal
  document.querySelectorAll('.reveal-opt').forEach(b => b.classList.remove('selected'));
  const map = { locked: 'ro-locked', menino: 'ro-m', menina: 'ro-f' };
  if (map[s.reveal]) document.getElementById(map[s.reveal]).classList.add('selected');

  // Location
  if (s.location) document.getElementById('location-input').value = s.location;

  // Guest list
  refreshGuestList();

  // RSVP list
  const rsvpEl = document.getElementById('admin-rsvp-list');
  rsvpEl.innerHTML = s.guests.map(g => {
    const r = s.rsvp[g.name.toLowerCase()];
    const tag = r === 'sim' ? '<span class="rsvp-tag yes">Confirmada</span>' :
                r === 'nao' ? '<span class="rsvp-tag no">Não vai</span>' :
                '<span class="rsvp-tag pending">Pendente</span>';
    return `<div class="rsvp-person"><div><div class="name">${g.name}</div><div class="rel">${g.relation}</div></div>${tag}</div>`;
  }).join('');

  refreshAdminPhotos();
}

function refreshGuestList() {
  const s = getState();
  const el = document.getElementById('guest-list-admin');
  el.innerHTML = s.guests.map((g, i) => `
    <div class="guest-row">
      <div><div class="gname">${g.name}</div><div class="grel">${g.relation}</div></div>
      <button class="del-btn" onclick="removeGuest(${i})">✕</button>
    </div>`).join('');
}

function addGuest() {
  const name = document.getElementById('new-guest-name').value.trim();
  const rel = document.getElementById('new-guest-rel').value;
  if (!name) { showToast('Digite um nome!'); return; }
  const s = getState();
  if (s.guests.find(g => g.name.toLowerCase() === name.toLowerCase())) { showToast('Já cadastrada!'); return; }
  const guests = [...s.guests, { name, relation: rel }];
  setState({ guests });
  document.getElementById('new-guest-name').value = '';
  refreshGuestList();
  document.getElementById('admin-total-guests').textContent = guests.length;
  showToast(`✓ ${name} adicionada!`);
}

function removeGuest(i) {
  const s = getState();
  const guests = [...s.guests];
  const removed = guests.splice(i, 1)[0];
  setState({ guests });
  refreshGuestList();
  document.getElementById('admin-total-guests').textContent = guests.length;
  showToast(`${removed.name} removida`);
}

function setReveal(choice) {
  setState({ reveal: choice });
  document.querySelectorAll('.reveal-opt').forEach(b => b.classList.remove('selected'));
  const map = { locked: 'ro-locked', menino: 'ro-m', menina: 'ro-f' };
  if (map[choice]) document.getElementById(map[choice]).classList.add('selected');
  const msgs = { locked: '🔒 Revelação oculta', menino: '💙 É MENINO! Revelado!', menina: '🌸 É MENINA! Revelado!' };
  showToast(msgs[choice]);
}

function saveLocation() {
  const loc = document.getElementById('location-input').value.trim();
  if (!loc) return;
  setState({ location: loc });
  document.getElementById('event-location').textContent = loc;
  showToast('✓ Local salvo!');
}

function refreshAdminPhotos() {
  const s = getState();
  const el = document.getElementById('admin-photo-grid');
  if (!s.photos.length) {
    el.innerHTML = '<div class="empty-photos" style="grid-column:1/-1">Nenhuma foto enviada ainda</div>';
    return;
  }
  el.innerHTML = s.photos.map((p, i) => `
    <div class="photo-admin-item">
      <img src="${p.data}">
      <button class="dl-btn" onclick="downloadPhoto(${i})">⬇</button>
    </div>`).join('');
}

function downloadPhoto(i) {
  const s = getState();
  const p = s.photos[i];
  const a = document.createElement('a');
  a.href = p.data;
  a.download = `foto_cha_${i + 1}.jpg`;
  a.click();
}

// ══ NAVIGATION ══
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
  if (name === 'palpites') refreshHome();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('current_user');
  document.getElementById('login-name').value = '';
  document.getElementById('login-greeting').textContent = '';
  showScreen('login');
}

// ══ TOAST ══
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ══ INIT ══
window.onload = function() {
  const saved = localStorage.getItem('current_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      const deviceId = getDeviceId();
      const s = getState();
      const linkedDevice = s.devices[currentUser.name.toLowerCase()];
      if (linkedDevice && linkedDevice !== deviceId) {
        localStorage.removeItem('current_user');
        currentUser = null;
        showScreen('login');
        return;
      }
      const voted = s.votes[currentUser.name.toLowerCase()];
      if (!voted) {
        document.getElementById('vote-name').textContent = currentUser.name;
        localStorage.setItem('post_vote_screen', isAdmin(currentUser.name) ? 'admin' : 'home');
        showScreen('vote');
      } else if (isAdmin(currentUser.name)) {
        showScreen('admin');
        refreshAdmin();
      } else {
        showScreen('home');
        refreshHome();
      }
    } catch { showScreen('login'); }
  }
};
