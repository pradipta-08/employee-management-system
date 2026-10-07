process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(() => server.close());

const good = {
  name: 'Test Person',
  department: 'Engineering',
  role: 'QA Engineer',
  salary: 600000,
  joinDate: '2023-04-10',
};

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test('full CRUD lifecycle', async () => {
  const created = await call('POST', '/employees', good);
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal(created.body.data.department, 'Engineering');

  const fetched = await call('GET', `/employees/${id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.name, 'Test Person');

  const updated = await call('PUT', `/employees/${id}`, { ...good, role: 'Senior QA Engineer', salary: 750000 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.role, 'Senior QA Engineer');
  assert.equal(updated.body.data.salary, 750000);

  const removed = await call('DELETE', `/employees/${id}`);
  assert.equal(removed.status, 204);

  const gone = await call('GET', `/employees/${id}`);
  assert.equal(gone.status, 404);
});

test('validation rejects bad input with field-level details', async () => {
  const res = await call('POST', '/employees', {
    name: '',
    department: 'Nope',
    role: 'x',
    salary: -5,
    joinDate: '2023-02-31',
  });
  assert.equal(res.status, 422);
  assert.deepEqual(Object.keys(res.body.details).sort(), ['department', 'joinDate', 'name', 'role', 'salary']);
});

test('search, sort and pagination', async () => {
  for (const [name, salary] of [['Zed Alpha', 100], ['Amy Beta', 300], ['Max Gamma', 200]]) {
    await call('POST', '/employees', { ...good, name, salary });
  }
  const bySalary = await call('GET', '/employees?sort=salary&order=desc&limit=2');
  assert.equal(bySalary.body.data.length, 2);
  assert.ok(bySalary.body.data[0].salary >= bySalary.body.data[1].salary);
  assert.ok(bySalary.body.meta.total >= 3);

  const search = await call('GET', '/employees?q=amy%20b');
  assert.equal(search.body.data.length, 1);
  assert.equal(search.body.data[0].name, 'Amy Beta');

  // LIKE wildcards in the query must be treated literally
  const wildcard = await call('GET', '/employees?q=%25');
  assert.equal(wildcard.body.data.length, 0);

  // unknown sort key falls back safely instead of reaching SQL
  const badSort = await call('GET', '/employees?sort=salary;DROP%20TABLE%20employees');
  assert.equal(badSort.status, 200);
});

test('error handling', async () => {
  assert.equal((await call('GET', '/employees/abc')).status, 400);
  assert.equal((await call('PUT', '/employees/99999', good)).status, 404);
  assert.equal((await call('DELETE', '/employees/99999')).status, 404);
  assert.equal((await call('GET', '/nothing-here')).status, 404);

  const res = await fetch(`${base}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
});
