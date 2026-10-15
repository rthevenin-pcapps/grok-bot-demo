# Billable

Timesheets and invoicing for the consulting team. Consultants log hours against
client projects, and engagement managers generate invoices from the logged time.

## Requirements

- Node.js 20 or newer (see `.nvmrc`)
- No npm packages: the server, tests, and frontend use only Node built-ins and
  browser-native ES modules, so there is no install or build step.

## Getting started

```bash
npm start
```

The app runs at http://localhost:3000. Set `PORT` to use a different port:

```bash
PORT=4000 npm start
```

Run the unit tests:

```bash
npm test
```

## How it works

- `server.js` serves the API, the static frontend in `public/`, and the shared
  modules in `src/`.
- `src/` holds the business logic (entry validation, timesheet helpers, invoice
  calculation) as plain ES modules. The browser imports them directly and the
  tests in `tests/` import the same files.
- Data is kept in memory. It is loaded from `data/seed.json` every time the
  server starts, so restarting gives you a clean slate. `POST /api/reset`
  restores the seed data without a restart.
- There is no login. Pick who you are from the **Signed in as** menu in the
  top bar; new time entries are recorded for that person.
- Invoices add 8% tax to the subtotal and are calculated in the browser.

## Seed data

Users:

| Name        | Role               |
| ----------- | ------------------ |
| Priya Shah  | Senior Consultant  |
| Marcus Lee  | Consultant         |
| Dana Okafor | Engagement Manager |

Projects:

| Client    | Project                  | Code        | Rate    |
| --------- | ------------------------ | ----------- | ------- |
| Globex    | Customer Portal Redesign | GLBX-PORTAL | $150/hr |
| Initech   | Security Audit           | INIT-AUDIT  | $195/hr |
| Northwind | API Migration            | NWND-API    | $160/hr |
| Acme Corp | Discovery Phase          | ACME-DISC   | $175/hr |

## API

All endpoints accept and return JSON.

| Method | Path                | Description                                   |
| ------ | ------------------- | --------------------------------------------- |
| GET    | `/api/health`       | Health check. Returns `{"ok": true}`.         |
| GET    | `/api/users`        | List users.                                   |
| GET    | `/api/projects`     | List projects with their entry counts.        |
| GET    | `/api/projects/:id` | One project with its time entries.            |
| POST   | `/api/entries`      | Log a time entry (see below).                 |
| POST   | `/api/reset`        | Restore the seed data.                        |

`POST /api/entries` body:

```json
{
  "projectId": "p-globex-portal",
  "userId": "u-priya",
  "date": "2026-10-05",
  "hours": 2.5,
  "description": "Sprint planning"
}
```

Returns `201` with the saved entry, or `422` with a `details` object keyed by
field name when validation fails.

## License

MIT
