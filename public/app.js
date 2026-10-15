const USER_KEY = 'billable.userId';

const state = {
  users: [],
  projects: [],
};

const els = {
  userSelect: document.querySelector('#user-select'),
  projectsBody: document.querySelector('#projects-table tbody'),
  entryForm: document.querySelector('#entry-form'),
  entryProject: document.querySelector('#entry-project'),
  entryDate: document.querySelector('#entry-date'),
  entryHours: document.querySelector('#entry-hours'),
  entryDescription: document.querySelector('#entry-description'),
  entryMessage: document.querySelector('#entry-message'),
  entrySubmit: document.querySelector('#entry-form button[type="submit"]'),
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

function todayIso() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function projectLabel(project) {
  return `${project.client} — ${project.name}`;
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

function renderProjectOptions() {
  const selected = els.entryProject.value;
  els.entryProject.innerHTML = state.projects
    .map((p) => `<option value="${p.id}">${escapeHtml(projectLabel(p))}</option>`)
    .join('');
  if (selected) {
    els.entryProject.value = selected;
  }
}

async function loadProjects() {
  state.projects = await api('/api/projects');
  renderProjects();
  renderProjectOptions();
}

function showEntryMessage(kind, text) {
  els.entryMessage.className = `form-message is-${kind}`;
  els.entryMessage.textContent = text;
}

function describeError(err) {
  if (!err.details) {
    return err.message;
  }
  return Object.values(err.details).join(' ');
}

els.entryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(els.entryForm);
  const payload = {
    projectId: form.get('projectId'),
    userId: currentUserId(),
    date: form.get('date'),
    hours: els.entryHours.valueAsNumber,
    description: form.get('description'),
  };

  els.entrySubmit.disabled = true;
  let entry;
  try {
    entry = await api('/api/entries', { method: 'POST', body: JSON.stringify(payload) });
  } catch (err) {
    showEntryMessage('error', describeError(err));
    return;
  } finally {
    els.entrySubmit.disabled = false;
  }

  const project = state.projects.find((p) => p.id === entry.projectId);
  showEntryMessage('success', `Logged ${entry.hours} h to ${projectLabel(project)}.`);
  els.entryHours.value = '';
  els.entryDescription.value = '';
  await loadProjects();
});

els.userSelect.addEventListener('change', () => {
  localStorage.setItem(USER_KEY, currentUserId());
});

async function init() {
  state.users = await api('/api/users');
  renderUsers();
  els.entryDate.value = todayIso();
  await loadProjects();
}

init();
