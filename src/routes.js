const express = require('express');
const repo = require('./employeeRepo');
const { validateEmployee } = require('./validate');
const { ApiError } = require('./errors');

const router = express.Router();

function parseId(raw) {
  if (!/^\d+$/.test(raw)) throw new ApiError(400, 'Employee id must be a positive integer');
  return Number(raw);
}

function intParam(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function checkedPayload(body) {
  const { value, errors } = validateEmployee(body, repo.listDepartments());
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed', errors);
  return value;
}

// GET /api/employees?q=&department=&sort=&order=&page=&limit=
router.get('/employees', (req, res) => {
  const sort = Object.hasOwn(repo.SORT_COLUMNS, req.query.sort) ? req.query.sort : 'name';
  const order = req.query.order === 'desc' ? 'desc' : 'asc';
  const result = repo.list({
    q: typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '',
    department: typeof req.query.department === 'string' ? req.query.department : '',
    sort,
    order,
    page: intParam(req.query.page, 1, 1, 1_000_000),
    limit: intParam(req.query.limit, 10, 1, 100),
  });
  res.json({ data: result.rows, meta: { ...result.meta, sort, order } });
});

// GET /api/employees/:id
router.get('/employees/:id', (req, res) => {
  const emp = repo.get(parseId(req.params.id));
  if (!emp) throw new ApiError(404, 'Employee not found');
  res.json({ data: emp });
});

// POST /api/employees
router.post('/employees', (req, res) => {
  const created = repo.create(checkedPayload(req.body));
  res.status(201).location(`/api/employees/${created.id}`).json({ data: created });
});

// PUT /api/employees/:id  (full replacement of the editable fields)
router.put('/employees/:id', (req, res) => {
  const id = parseId(req.params.id);
  const payload = checkedPayload(req.body);
  const updated = repo.updateById(id, payload);
  if (!updated) throw new ApiError(404, 'Employee not found');
  res.json({ data: updated });
});

// DELETE /api/employees/:id
router.delete('/employees/:id', (req, res) => {
  const ok = repo.removeById(parseId(req.params.id));
  if (!ok) throw new ApiError(404, 'Employee not found');
  res.status(204).end();
});

// GET /api/departments
router.get('/departments', (req, res) => {
  res.json({ data: repo.listDepartments() });
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
