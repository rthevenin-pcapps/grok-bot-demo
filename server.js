import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { entriesForProject } from './src/timesheet.js';
import { validateEntry } from './src/validation.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const SEED_PATH = path.join(ROOT, 'data', 'seed.json');

let db;

function loadSeed() {
  db = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
}

function projectSummary(project) {
  const entryCount = db.entries.filter((e) => e.projectId === project.id).length;
  return { ...project, entryCount };
}

const STATIC_DIRS = [
  ['/src/', path.join(ROOT, 'src')],
  ['/', path.join(ROOT, 'public')],
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

async function serveStatic(res, pathname) {
  const [prefix, dir] = STATIC_DIRS.find(([p]) => pathname.startsWith(p));
  let relative;
  try {
    relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
  } catch {
    return sendNotFound(res);
  }

  const filePath = path.join(dir, relative);
  if (!filePath.startsWith(dir + path.sep)) {
    return sendNotFound(res);
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    sendNotFound(res);
  }
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/users') {
    return sendJson(res, 200, db.users);
  }

  if (req.method === 'GET' && pathname === '/api/projects') {
    return sendJson(res, 200, db.projects.map(projectSummary));
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (req.method === 'GET' && projectMatch) {
    const project = db.projects.find((p) => p.id === decodeURIComponent(projectMatch[1]));
    if (!project) {
      return sendJson(res, 404, { error: 'Project not found' });
    }
    return sendJson(res, 200, {
      ...projectSummary(project),
      entries: entriesForProject(db.entries, project.id),
    });
  }

  if (req.method === 'POST' && pathname === '/api/entries') {
    let input;
    try {
      input = await readJson(req);
    } catch {
      return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    }
    if (typeof input !== 'object' || input === null) {
      return sendJson(res, 400, { error: 'Request body must be a JSON object.' });
    }

    const { valid, errors } = validateEntry(input, db);
    if (!valid) {
      return sendJson(res, 422, { error: 'Entry could not be saved.', details: errors });
    }

    const entry = {
      id: `e-${randomUUID().slice(0, 8)}`,
      projectId: input.projectId,
      userId: input.userId,
      date: input.date,
      hours: input.hours,
      description: input.description.trim(),
    };
    db.entries.push(entry);
    return sendJson(res, 201, entry);
  }

  sendJson(res, 404, { error: 'Not found' });
}

loadSeed();

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, pathname);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method not allowed');
  }
  return serveStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log(`Billable running at http://localhost:${PORT}`);
});
