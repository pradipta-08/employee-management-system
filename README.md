# Employee Management System (CRUD)

A small HR tool for keeping employee records: add, search/sort, edit and delete people through a web UI backed by a REST API and a relational database.

- **Frontend:** plain HTML / CSS / JavaScript (no build step)
- **Backend:** Node.js + Express
- **Database:** SQLite (built into Node.js 22.5+, module `node:sqlite`), schema in `db/schema.sql`
- **API testing:** Postman collection in `postman/`, automated tests in `test/`

## Setup

Requires Node.js 22.5 or newer (Node 24 is fine).

```bash
npm install
npm run seed     # optional: loads 15 sample employees
npm start        # http://localhost:3000
```

The database file is created automatically at `data/employees.db` on first start (the schema is applied idempotently on boot). Set `PORT` or `DB_PATH` to override defaults.

Other scripts: `npm run dev` (auto-restart on change), `npm test` (API tests, uses an in-memory DB).

## Project layout

```
server.js            Express app: JSON parsing, /api routes, static files, error handler
src/
  db.js              Opens SQLite and applies db/schema.sql
  employeeRepo.js    All SQL lives here (queries, sort whitelist, pagination)
  routes.js          REST endpoints
  validate.js        Server-side input validation
  errors.js          ApiError, 404 and error-handling middleware
db/
  schema.sql         Tables, constraints, indexes, department seed
  seed.js            Sample employees
public/              index.html, css/styles.css, js/api.js (fetch wrapper), js/app.js (UI)
postman/             Importable Postman collection
test/api.test.js     node:test integration tests
```

## Database design

- `departments(id, name UNIQUE)` — fixed lookup table
- `employees(id, name, department_id → departments.id, role, salary, join_date, created_at, updated_at)`
- CHECK constraints on lengths and `salary > 0`; foreign key enforced
- Indexes on `department_id`, `name` (case-insensitive) and `join_date`, matching the filter/sort options in the UI

To use MySQL or PostgreSQL, the schema ports with small changes (see the comment at the top of `schema.sql`); only `src/db.js` and `src/employeeRepo.js` would need adapting.

## REST API

Base URL: `http://localhost:3000/api`

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/employees` | List with search, filter, sort, pagination | 200 |
| GET | `/employees/:id` | Single employee | 200 |
| POST | `/employees` | Create | 201 |
| PUT | `/employees/:id` | Update | 200 |
| DELETE | `/employees/:id` | Delete | 204 |
| GET | `/departments` | Department names | 200 |

**List query params:** `q` (matches name, role, department), `department`, `sort` (`name`, `department`, `role`, `salary`, `joinDate`), `order` (`asc`/`desc`), `page`, `limit` (max 100). The response is `{ data: [...], meta: { total, page, pages, limit, sort, order } }`.

**Employee body:**

```json
{ "name": "Nisha Verma", "department": "Engineering", "role": "Data Engineer", "salary": 1150000, "joinDate": "2024-01-15" }
```

**Validation rules:** name 2–80 chars (letters, spaces, `. ' -`); department must exist; role 2–60 chars; salary > 0, ≤ 100,000,000, max 2 decimals; join date a real `YYYY-MM-DD` between 1970 and 90 days from today.

**Errors** are always JSON: `{ "error": "message" }`. Validation failures return **422** with per-field `details`; bad ids and malformed JSON return **400**; unknown ids and routes return **404**; anything unexpected returns **500** with a generic message (details are logged, not leaked).

## Testing the API

1. **Postman / Thunder Client:** import `postman/employee-manager.postman_collection.json`, start the server, and run the collection top to bottom. The create request stores the new id in `{{employeeId}}` for the update/get/delete requests, and each request has assertions.
2. **Automated:** `npm test`

## UI features

- Sortable columns (click a header again to reverse), debounced search, department filter, page-size selector, pagination
- Add / edit in a modal form (edit is pre-filled), inline per-field errors from both client-side and server-side validation
- Delete behind a confirmation dialog
- Loading message, empty state, error state with retry, and toast messages for success/failure
- Stale-response protection (an older slow request can't overwrite newer results)

## Deliverables checklist

- [x] Source code (frontend + backend)
- [x] Schema file (`db/schema.sql`)
- [x] Postman collection
- [ ] Screenshots / screen recording of Create, Read, Update, Delete (record these on your machine after `npm start`)
