const API_BASE = '/api';
const PREVIEW_MODE = new URLSearchParams(window.location.search).get('preview') === '1';

const PREVIEW_PEOPLE = [
  { id: 1, nombre: 'Melisa Fernández', email: 'melisa@dhnn.com', rol_puesto: 'People & Operations', area: 'Shared Services', banda: 'Management', seniority: 'Líder', lider_id: 3, lider_nombre: 'Lucas Davison', es_admin: true, tipo: 'interno', autoevaluados: 4, total: 5 },
  { id: 2, nombre: 'Sofía Méndez', email: 'sofia@partner.com', rol_puesto: 'Motion Designer', area: 'Diseño', banda: 'Freelance', seniority: 'Senior', lider_id: null, lider_nombre: null, es_admin: false, tipo: 'freelance', autoevaluados: 4, total: 5 },
  { id: 3, nombre: 'Lucas Davison', email: 'lucas@dhnn.com', rol_puesto: 'CEO', area: 'Liderazgo', banda: 'Management', seniority: 'Líder', lider_id: null, lider_nombre: null, es_admin: true, tipo: 'interno', autoevaluados: 3, total: 5 },
  { id: 4, nombre: 'Nicolás Ruiz', email: 'nicolas@partner.com', rol_puesto: 'Backend Developer', area: 'Tech', banda: 'Freelance', seniority: 'Ssr', lider_id: null, lider_nombre: null, es_admin: false, tipo: 'freelance', autoevaluados: 0, total: 0 },
];
const PREVIEW_SKILLS = [
  { id: 1, nombre: 'Dirección de arte', categoria: 'Diseño', tipo: 'dura' },
  { id: 2, nombre: 'Motion graphics', categoria: 'Diseño', tipo: 'dura' },
  { id: 3, nombre: 'Comunicación', categoria: 'Habilidades blandas', tipo: 'blanda' },
  { id: 4, nombre: 'Gestión de proyectos', categoria: 'Management', tipo: 'dura' },
  { id: 5, nombre: 'IA generativa', categoria: 'Tecnología', tipo: 'ia' },
];
const PREVIEW_SKILLS_BY_PERSON = {
  1: [1, 3, 4, 5].map((id, index) => previewSkill(id, index + 2, 4, index < 3 ? 'core' : 'desarrollar')),
  2: [1, 2, 3, 5].map((id, index) => previewSkill(id, index + 2, 4, index === 2 ? 'blandas' : 'core')),
  3: [3, 4, 5].map((id, index) => previewSkill(id, index + 2, 4, 'core')),
  4: [],
};

function previewSkill(id, current, target, bucket) {
  const skill = PREVIEW_SKILLS.find(item => item.id === id);
  return { id: id, skill_id: id, nombre: skill.nombre, categoria: skill.categoria, tipo: skill.tipo, bucket, nivel_actual: current, nivel_objetivo: target, autoeval_fecha: '2026-09-20', lider_validacion_fecha: null, lider_ajusto: false };
}

function previewPerson(id) { return PREVIEW_PEOPLE.find(person => person.id === Number(id)); }
function previewTeam() { return PREVIEW_PEOPLE.map(person => ({ ...person })); }
function previewProfile(id) { const persona = previewPerson(id); return { persona, skills: PREVIEW_SKILLS_BY_PERSON[Number(id)] || [] }; }

async function previewApi(path, opts = {}) {
  const method = opts.method || 'GET';
  const match = path.match(/^\/team\/(\d+)$/);
  if (path === '/me') return previewProfile(1);
  if (path === '/team') return previewTeam();
  if (match && method === 'GET') return previewProfile(match[1]);
  if (path === '/admin/people') return previewTeam();
  if (path === '/admin/skills') return PREVIEW_SKILLS;
  if (path === '/admin/skills-overview') return { sin_autoevaluar: 1, cubiertas: 8, a_desarrollar: 3 };
  if (path.match(/^\/admin\/people\/\d+\/skills$/)) return previewProfile(path.split('/')[3]).skills;
  if (path === '/admin/team-builder') return { resumen: 'Equipo de preview armado combinando diseño y tecnología.', equipo: [PREVIEW_PEOPLE[1], PREVIEW_PEOPLE[3]].map(person => ({ person_id: person.id, nombre: person.nombre, tipo: person.tipo, rol_en_equipo: person.rol_puesto, justificacion: 'Perfil de muestra con skills relevantes.' })), gaps: 'Validar disponibilidad antes de asignar.' };
  if (path.match(/^\/admin\/people\/\d+\/cv$/)) return { resumen: 'Perfil detectado desde CV de preview.', skills_detectadas: PREVIEW_SKILLS.slice(0, 3).map(skill => ({ skill_id: skill.id, nombre: skill.nombre, nivel_estimado: 3, evidencia: 'Experiencia relevante en el perfil.' })) };
  return { ok: true, id: 99 };
}

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
  if (PREVIEW_MODE) {
    setSession({ token: 'local-preview-token', nombre: 'Preview Admin', es_lider: true, es_admin: true });
    return;
  }
  if (!getToken()) { window.location.href = 'login.html'; throw new Error('no auth'); }
}
function logout() { clearSession(); window.location.href = 'login.html'; }

async function api(path, opts = {}) {
  if (PREVIEW_MODE) return previewApi(path, opts);
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
const LEVEL_DESCRIPTIONS = [
  'Todavía no evaluaste tu nivel en esta habilidad.',
  'Conocimientos básicos o teóricos; necesitás guía constante para aplicarlo.',
  'Podés aplicarlo en tareas simples, con supervisión.',
  'Lo aplicás de forma autónoma en tu trabajo diario.',
  'Dominás la habilidad y podés ayudar o guiar a otros.',
  'Sos referente: definís buenas prácticas y formás a otros.',
];
const STALE_DAYS = 90;

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
}
function isStale(dateStr) { return daysSince(dateStr) > STALE_DAYS; }
function lastUpdateLabel(dateStr) {
  if (!dateStr) return 'nunca autoevaluada';
  const d = daysSince(dateStr);
  if (d === 0) return 'hoy';
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
}
const BUCKET_META = {
  core: { label: 'Core', color: '#3448F0' },
  blandas: { label: 'Habilidades blandas', color: '#7A3FF0' },
  desarrollar: { label: 'A desarrollar', color: '#FF8A3D' },
};

function initials(name) { return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }

const AVATAR_BG = {
  'melisa fernandez': '#e6f7b0',
  'sofia mendez': '#ddd3ff',
  'lucas davison': '#cfdcff',
  'nicolas ruiz': '#ffdcc4',
};
function normName(name) { return (name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function avatarBg(name) { return AVATAR_BG[normName(name)] || 'var(--surface2)'; }
function ringSvg(pct, opts) {
  opts = opts || {};
  const size = opts.size || 40, stroke = opts.stroke || 4.5, color = opts.color || 'var(--core)', track = opts.track || 'var(--track)';
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `
    <span style="position:relative;display:inline-grid;place-items:center;width:${size}px;height:${size}px;flex:none;">
      <svg width="${size}" height="${size}" style="position:absolute;inset:0;transform:rotate(-90deg);">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>
      </svg>
      <span style="position:relative;">${opts.label != null ? opts.label : Math.round(p * 100) + '%'}</span>
    </span>
  `;
}

const ICON_ATTRS = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  map: `<svg ${ICON_ATTRS}><polygon points="12 2.5 20.5 7.25 20.5 16.75 12 21.5 3.5 16.75 3.5 7.25"/><polygon points="12 8 15.5 10 15.5 14 12 16 8.5 14 8.5 10"/></svg>`,
  team: `<svg ${ICON_ATTRS}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  admin: `<svg ${ICON_ATTRS}><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/></svg>`,
  partners: `<svg ${ICON_ATTRS}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  ai: `<svg ${ICON_ATTRS}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/></svg>`,
  logout: `<svg ${ICON_ATTRS}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  check: `<svg ${ICON_ATTRS}><path d="M20 6 9 17l-5-5"/></svg>`,
  clock: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  layers: `<svg ${ICON_ATTRS}><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>`,
  target: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
};

function renderSidebarShell(activeItem, user) {
  const isLiderOrAdmin = user.esLider || user.esAdmin;
  const previewSuffix = PREVIEW_MODE ? '?preview=1' : '';
  const items = [
    { id: 'dashboard', href: 'dashboard.html', label: 'Mi mapa de habilidades', icon: ICONS.map, show: true },
    { id: 'team', href: 'team.html', label: 'Mi equipo', icon: ICONS.team, show: isLiderOrAdmin },
    { id: 'admin', href: 'admin.html', label: 'Administración', icon: ICONS.admin, show: user.esAdmin },
    { id: 'ecosistema', href: 'ecosistema.html', label: 'Ecosistema de partners', icon: ICONS.partners, show: user.esAdmin },
    { id: 'teambuilder', href: 'teambuilder.html', label: 'Armado de equipos', icon: ICONS.ai, show: user.esAdmin, ai: true },
  ];
  return `
    <div class="rail-brand">
      <span class="rail-logo">DH</span>
      <span class="lbl rail-brandtext"><b>DHNN</b>SKILL MAP</span>
    </div>
    <nav class="rail-nav">
      ${items.filter(it => it.show).map(it => `
        <a class="navi ${activeItem === it.id ? 'on' : ''}" href="${it.href}${previewSuffix}">
          ${it.icon}<span class="lbl">${it.label}${it.ai ? '<span class="ai-badge">IA</span>' : ''}</span>
        </a>
      `).join('')}
    </nav>
    <div class="rail-footer">
      <div class="navi navi-user"><span class="rail-avatar">${initials(user.nombre)}</span><span class="lbl">${user.nombre}</span></div>
      <a class="navi" onclick="logout()">${ICONS.logout}<span class="lbl">Cerrar sesión</span></a>
    </div>
  `;
}
