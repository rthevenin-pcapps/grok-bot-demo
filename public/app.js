const USER_KEY = 'billable.userId';

const state = {
  users: [],
  projects: [],
};

const els = {
  userSelect: document.querySelector('#user-select'),
  projectsBody: document.querySelector('#projects-table tbody'),
};

const rateFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body.error ?? `Request failed (${res.status})`);
    err.details = body.details;
    throw err;
  }
  return body;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function currentUserId() {
  return els.userSelect.value;
}

function renderUsers() {
  const saved = localStorage.getItem(USER_KEY);
  els.userSelect.innerHTML = state.users
    .map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`)
    .join('');
  if (state.users.some((u) => u.id === saved)) {
    els.userSelect.value = saved;
  }
}

function renderProjects() {
  els.projectsBody.innerHTML = state.projects
    .map(
      (p) => `
        <tr data-project-id="${p.id}">
          <td>${escapeHtml(p.client)}</td>
          <td>${escapeHtml(p.name)}</td>
          <td class="num">${rateFormat.format(p.hourlyRate)}/hr</td>
          <td class="num">${p.entryCount}</td>
        </tr>`,
    )
    .join('');
}

async function loadProjects() {
  state.projects = await api('/api/projects');
  renderProjects();
}

els.userSelect.addEventListener('change', () => {
  localStorage.setItem(USER_KEY, currentUserId());
});

async function init() {
  state.users = await api('/api/users');
  renderUsers();
  await loadProjects();
}

init();
