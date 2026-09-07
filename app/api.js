const API_BASE = 'http://127.0.0.1:8420';

function getToken() { return localStorage.getItem('skillmap_token'); }
function setSession(data) {
  localStorage.setItem('skillmap_token', data.token);
  localStorage.setItem('skillmap_nombre', data.nombre);
  localStorage.setItem('skillmap_es_lider', data.es_lider ? '1' : '');
  localStorage.setItem('skillmap_es_admin', data.es_admin ? '1' : '');
}
function clearSession() { localStorage.clear(); }
function currentUser() {
  return {
    nombre: localStorage.getItem('skillmap_nombre'),
    esLider: !!localStorage.getItem('skillmap_es_lider'),
    esAdmin: !!localStorage.getItem('skillmap_es_admin'),
  };
}
function requireAuth() {
  if (!getToken()) { window.location.href = 'login.html'; throw new Error('no auth'); }
}
function logout() { clearSession(); window.location.href = 'login.html'; }

async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
  if (res.status === 401) { clearSession(); window.location.href = 'login.html'; throw new Error('401'); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || ('Error ' + res.status));
  return body;
}

const LEVELS = ['Sin autoevaluar', 'Aprendiz', 'Iniciado', 'Competente', 'Avanzado', 'Maestro'];
const LEVEL_COLORS = ['#e1e0d9', '#cde2fb', '#86b6ef', '#3987e5', '#256abf', '#0d366b'];
const BUCKET_META = {
  core: { label: 'Core', color: '#2a78d6' },
  blandas: { label: 'Habilidades blandas', color: '#1baf7a' },
  desarrollar: { label: 'A desarrollar', color: '#eb9c00' },
};

function initials(name) { return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }

function renderSidebarShell(activeItem, user) {
  const isLiderOrAdmin = user.esLider || user.esAdmin;
  return `
    <div class="sidebar-brand">
      <div class="brand-name">DHNN</div>
      <div class="brand-sub">Skill Map</div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-sec-label">Navegación</div>
      <a class="nav-item ${activeItem === 'dashboard' ? 'active' : ''}" href="dashboard.html">Mi mapa de habilidades</a>
      ${isLiderOrAdmin ? `<a class="nav-item ${activeItem === 'team' ? 'active' : ''}" href="team.html">Mi equipo</a>` : ''}
      ${user.esAdmin ? `<a class="nav-item ${activeItem === 'admin' ? 'active' : ''}" href="admin.html">Administración</a>` : ''}
    </div>
    <div class="sidebar-footer">
      ${user.nombre}<br>
      <a onclick="logout()">Cerrar sesión</a>
    </div>
  `;
}
