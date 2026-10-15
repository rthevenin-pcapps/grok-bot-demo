import { sumHours } from '/src/timesheet.js';

const USER_KEY = 'billable.userId';

const state = {
  users: [],
  projects: [],
  currentProject: null,
  currentEntries: [],
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
  detail: document.querySelector('#project-detail'),
  detailHeading: document.querySelector('#detail-heading'),
  detailCode: document.querySelector('#detail-code'),
  detailRate: document.querySelector('#detail-rate'),
  entriesBody: document.querySelector('#entries-table tbody'),
  totalHours: document.querySelector('#total-hours'),
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

function userName(id) {
  return state.users.find((u) => u.id === id)?.name ?? 'Unknown';
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
        <tr data-project-id="${p.id}" class="${p.id === state.currentProject?.id ? 'is-selected' : ''}">
          <td>${escapeHtml(p.client)}</td>
          <td>
            <button type="button" class="link-button" data-open-project="${p.id}">${escapeHtml(p.name)}</button>
          </td>
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

function renderEntries(entries) {
  if (entries.length === 0) {
    return '<tr class="empty-row"><td colspan="4">No time logged yet.</td></tr>';
  }
  return entries
    .map(
      (e) => `
        <tr>
          <td>${e.date}</td>
          <td>${escapeHtml(userName(e.userId))}</td>
          <td>${escapeHtml(e.description)}</td>
          <td class="num">${e.hours}</td>
        </tr>`,
    )
    .join('');
}

function renderDetail() {
  const project = state.currentProject;
  els.detailHeading.textContent = projectLabel(project);
  els.detailCode.textContent = project.code;
  els.detailRate.textContent = `${rateFormat.format(project.hourlyRate)}/hr`;
  els.entriesBody.innerHTML = renderEntries(state.currentEntries);
  els.totalHours.textContent = sumHours(state.currentEntries);
  els.detail.hidden = false;
}

async function openProject(projectId) {
  const { entries, ...project } = await api(`/api/projects/${encodeURIComponent(projectId)}`);
  state.currentProject = project;
  state.currentEntries = entries;
  renderDetail();
  renderProjects();
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
  if (state.currentProject?.id === entry.projectId) {
    await openProject(entry.projectId);
  }
});

els.projectsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-open-project]');
  if (!button) {
    return;
  }
  const projectId = button.dataset.openProject;
  els.entryProject.value = projectId;
  await openProject(projectId);
  els.detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
