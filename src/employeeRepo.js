const db = require('./db');

// Whitelist: query-string sort keys -> real SQL expressions.
// User input never gets concatenated into SQL, only looked up here.
const SORT_COLUMNS = {
  name: 'e.name COLLATE NOCASE',
  department: 'd.name COLLATE NOCASE',
  role: 'e.role COLLATE NOCASE',
  salary: 'e.salary',
  joinDate: 'e.join_date',
};

const SELECT_BASE = `
  SELECT e.id, e.name, d.name AS department, e.role, e.salary,
         e.join_date AS joinDate, e.created_at AS createdAt, e.updated_at AS updatedAt
  FROM employees e
  JOIN departments d ON d.id = e.department_id
`;

const stmts = {
  deptList: db.prepare('SELECT name FROM departments ORDER BY name'),
  deptByName: db.prepare('SELECT id FROM departments WHERE name = ?'),
  byId: db.prepare(`${SELECT_BASE} WHERE e.id = ?`),
  insert: db.prepare(
    `INSERT INTO employees (name, department_id, role, salary, join_date)
     VALUES (@name, @departmentId, @role, @salary, @joinDate)`
  ),
  update: db.prepare(
    `UPDATE employees
        SET name = @name, department_id = @departmentId, role = @role,
            salary = @salary, join_date = @joinDate, updated_at = datetime('now')
      WHERE id = @id`
  ),
  remove: db.prepare('DELETE FROM employees WHERE id = ?'),
};

function listDepartments() {
  return stmts.deptList.all().map((r) => r.name);
}

function escapeLike(s) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function list({ q, department, sort, order, page, limit }) {
  const where = [];
  const params = {};

  if (q) {
    where.push(`(e.name LIKE @q ESCAPE '\\' OR e.role LIKE @q ESCAPE '\\' OR d.name LIKE @q ESCAPE '\\')`);
    params.q = `%${escapeLike(q)}%`;
  }
  if (department) {
    where.push('d.name = @department');
    params.department = department;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM employees e JOIN departments d ON d.id = e.department_id ${whereSql}`)
    .get(params);

  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pages);

  const sortExpr = SORT_COLUMNS[sort] || SORT_COLUMNS.name;
  const dir = order === 'desc' ? 'DESC' : 'ASC';

  const rows = db
    .prepare(`${SELECT_BASE} ${whereSql} ORDER BY ${sortExpr} ${dir}, e.id ASC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset: (safePage - 1) * limit });

  return { rows, meta: { total, page: safePage, limit, pages } };
}

function get(id) {
  return stmts.byId.get(id);
}

// Bind exactly the named parameters each statement declares (no extras).
function toParams(data, departmentId) {
  return {
    name: data.name,
    departmentId,
    role: data.role,
    salary: data.salary,
    joinDate: data.joinDate,
  };
}

function create(data) {
  const dept = stmts.deptByName.get(data.department);
  const info = stmts.insert.run(toParams(data, dept.id));
  return get(Number(info.lastInsertRowid));
}

function updateById(id, data) {
  const dept = stmts.deptByName.get(data.department);
  const info = stmts.update.run({ ...toParams(data, dept.id), id });
  return info.changes ? get(id) : null;
}

function removeById(id) {
  return stmts.remove.run(id).changes > 0;
}

module.exports = { listDepartments, list, get, create, updateById, removeById, SORT_COLUMNS };
