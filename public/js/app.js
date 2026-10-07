(() => {
  const $ = (sel) => document.querySelector(sel);

  const state = {
    q: '',
    department: '',
    sort: 'name',
    order: 'asc',
    page: 1,
    limit: 10,
    rows: [],
    meta: null,
    editingId: null,
    deletingId: null,
  };

  const el = {
    tbody: $('#tbody'),
    stateBox: $('#stateBox'),
    summary: $('#summary'),
    search: $('#search'),
    deptFilter: $('#deptFilter'),
    pageSize: $('#pageSize'),
    rangeText: $('#rangeText'),
    pageText: $('#pageText'),
    prev: $('#prevBtn'),
    next: $('#nextBtn'),
    formDialog: $('#formDialog'),
    form: $('#empForm'),
    formTitle: $('#formTitle'),
    formError: $('#formError'),
    saveBtn: $('#saveBtn'),
    fDept: $('#f-department'),
    confirmDialog: $('#confirmDialog'),
    confirmText: $('#confirmText'),
    confirmError: $('#confirmError'),
    confirmBtn: $('#confirmDelete'),
    toasts: $('#toasts'),
  };

  // ---------- helpers ----------
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }

  function toast(message, type = 'ok') {
    const t = document.createElement('div');
    t.className = `toast ${type === 'error' ? 'error' : ''}`;
    t.textContent = message;
    el.toasts.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ---------- table rendering ----------
  function showSkeleton() {
    el.stateBox.hidden = true;
    el.tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading…</td></tr>';
  }

  function showState(title, text, { error = false, retry = false } = {}) {
    el.tbody.innerHTML = '';
    el.stateBox.hidden = false;
    el.stateBox.className = `state-box${error ? ' is-error' : ''}`;
    el.stateBox.innerHTML = `<strong>${esc(title)}</strong>${esc(text)}${
      retry ? '<br><button class="btn btn-ghost" id="retryBtn" type="button">Retry</button>' : ''
    }`;
    if (retry) $('#retryBtn').addEventListener('click', loadEmployees);
  }

  function renderRows() {
    el.stateBox.hidden = true;
    el.tbody.innerHTML = state.rows
      .map(
        (r) => `
      <tr data-id="${r.id}">
        <td class="name">${esc(r.name)}</td>
        <td>${esc(r.department)}</td>
        <td>${esc(r.role)}</td>
        <td class="num">${inr.format(r.salary)}</td>
        <td>${fmtDate(r.joinDate)}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" data-action="edit" type="button">Edit</button>
          <button class="btn btn-sm btn-del" data-action="delete" type="button">Delete</button>
        </td>
      </tr>`
      )
      .join('');
  }

  function renderMeta() {
    const m = state.meta;
    const filtered = state.q || state.department;
    el.summary.textContent = filtered
      ? `Matching employees: ${m.total}`
      : `Total employees: ${m.total}`;

    const from = m.total === 0 ? 0 : (m.page - 1) * m.limit + 1;
    const to = Math.min(m.page * m.limit, m.total);
    el.rangeText.textContent = m.total ? `Showing ${from} to ${to} of ${m.total}` : '';
    el.pageText.textContent = m.total ? `Page ${m.page} of ${m.pages}` : '';
    el.prev.disabled = m.page <= 1;
    el.next.disabled = m.page >= m.pages;

    document.querySelectorAll('.sort').forEach((b) => {
      b.dataset.dir = b.dataset.sort === state.sort ? state.order : '';
    });
  }

  // ---------- data loading ----------
  let requestCounter = 0;

  async function loadEmployees() {
    const myRequest = ++requestCounter;
    showSkeleton();
    try {
      const res = await api.listEmployees({
        q: state.q,
        department: state.department,
        sort: state.sort,
        order: state.order,
        page: state.page,
        limit: state.limit,
      });
      if (myRequest !== requestCounter) return; // a newer request superseded this one
      state.rows = res.data;
      state.meta = res.meta;
      state.page = res.meta.page; // server may clamp the page
      renderMeta();
      if (res.data.length === 0) {
        const filtered = state.q || state.department;
        showState(
          filtered ? 'No matching employees' : 'No employees found',
          filtered ? 'Change the search text or the department filter.' : 'Click “Add Employee” to create the first record.'
        );
      } else {
        renderRows();
      }
    } catch (err) {
      if (myRequest !== requestCounter) return;
      showState('Could not load employees', err.message, { error: true, retry: true });
      el.summary.textContent = 'Unable to load data';
      el.rangeText.textContent = '';
      el.pageText.textContent = '';
      el.prev.disabled = el.next.disabled = true;
    }
  }

  async function loadDepartments() {
    try {
      const { data } = await api.listDepartments();
      const opts = data.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
      el.deptFilter.insertAdjacentHTML('beforeend', opts);
      el.fDept.innerHTML = `<option value="">Select…</option>${opts}`;
    } catch (err) {
      toast(`Could not load departments: ${err.message}`, 'error');
    }
  }

  // ---------- toolbar events ----------
  el.search.addEventListener(
    'input',
    debounce(() => {
      state.q = el.search.value.trim();
      state.page = 1;
      loadEmployees();
    }, 300)
  );

  el.deptFilter.addEventListener('change', () => {
    state.department = el.deptFilter.value;
    state.page = 1;
    loadEmployees();
  });

  el.pageSize.addEventListener('change', () => {
    state.limit = Number(el.pageSize.value);
    state.page = 1;
    loadEmployees();
  });

  document.querySelectorAll('.sort').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (state.sort === key) state.order = state.order === 'asc' ? 'desc' : 'asc';
      else {
        state.sort = key;
        state.order = 'asc';
      }
      state.page = 1;
      loadEmployees();
    })
  );

  el.prev.addEventListener('click', () => {
    state.page -= 1;
    loadEmployees();
  });
  el.next.addEventListener('click', () => {
    state.page += 1;
    loadEmployees();
  });

  // ---------- form: validation ----------
  const FIELDS = ['name', 'department', 'role', 'salary', 'joinDate'];
  const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;

  function readForm() {
    const f = el.form.elements;
    return {
      name: f.name.value.trim().replace(/\s+/g, ' '),
      department: f.department.value,
      role: f.role.value.trim().replace(/\s+/g, ' '),
      salary: f.salary.value === '' ? '' : Number(f.salary.value),
      joinDate: f.joinDate.value,
    };
  }

  function validateClient(v) {
    const e = {};
    if (!v.name) e.name = 'Name is required';
    else if (v.name.length < 2 || v.name.length > 80) e.name = 'Name must be 2–80 characters';
    else if (!NAME_RE.test(v.name)) e.name = "Use letters, spaces, . ' and - only";

    if (!v.department) e.department = 'Select a department';

    if (!v.role) e.role = 'Role is required';
    else if (v.role.length < 2 || v.role.length > 60) e.role = 'Role must be 2–60 characters';

    if (v.salary === '') e.salary = 'Salary is required';
    else if (!Number.isFinite(v.salary) || v.salary <= 0) e.salary = 'Enter an amount greater than zero';
    else if (v.salary > 100000000) e.salary = 'Salary cannot exceed 10,00,00,000';
    else if (Math.abs(Math.round(v.salary * 100) - v.salary * 100) > 1e-6) e.salary = 'Max 2 decimal places';

    if (!v.joinDate) e.joinDate = 'Join date is required';
    else {
      const max = new Date();
      max.setDate(max.getDate() + 90);
      if (v.joinDate < '1970-01-01') e.joinDate = 'Date cannot be before 1970';
      else if (v.joinDate > max.toISOString().slice(0, 10)) e.joinDate = 'Join date cannot be more than 90 days in the future';
    }
    return e;
  }

  function showFieldErrors(errors) {
    FIELDS.forEach((name) => {
      const msg = errors[name] || '';
      const p = el.form.querySelector(`.err[data-for="${name}"]`);
      p.textContent = msg;
      el.form.elements[name].closest('.field').classList.toggle('invalid', Boolean(msg));
    });
  }

  // clear a field's error as soon as the user edits it
  FIELDS.forEach((name) => {
    el.form.elements[name].addEventListener('input', () => {
      el.form.querySelector(`.err[data-for="${name}"]`).textContent = '';
      el.form.elements[name].closest('.field').classList.remove('invalid');
    });
  });

  // ---------- form: open / submit ----------
  function openForm(emp) {
    state.editingId = emp ? emp.id : null;
    el.form.reset();
    showFieldErrors({});
    el.formError.hidden = true;
    el.formTitle.textContent = emp ? 'Edit Employee' : 'Add Employee';
    el.saveBtn.textContent = emp ? 'Update' : 'Save';

    if (emp) {
      const f = el.form.elements;
      f.name.value = emp.name;
      f.department.value = emp.department;
      f.role.value = emp.role;
      f.salary.value = emp.salary;
      f.joinDate.value = emp.joinDate;
    }
    el.formDialog.showModal();
    el.form.elements.name.focus();
  }

  el.form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    el.formError.hidden = true;

    const values = readForm();
    const errors = validateClient(values);
    showFieldErrors(errors);
    if (Object.keys(errors).length) {
      el.form.querySelector('.invalid input, .invalid select')?.focus();
      return;
    }

    const editing = state.editingId !== null;
    el.saveBtn.disabled = true;
    el.saveBtn.textContent = 'Saving…';
    try {
      if (editing) await api.updateEmployee(state.editingId, values);
      else await api.createEmployee(values);
      el.formDialog.close();
      toast(editing ? 'Employee updated successfully' : 'Employee added successfully');
      if (!editing) state.page = 1;
      await loadEmployees();
    } catch (err) {
      if (err.details) showFieldErrors(err.details);
      else {
        el.formError.textContent = err.message;
        el.formError.hidden = false;
      }
      // someone else may have deleted the record while the form was open
      if (err.status === 404) loadEmployees();
    } finally {
      el.saveBtn.disabled = false;
      el.saveBtn.textContent = editing ? 'Update' : 'Save';
    }
  });

  $('#addBtn').addEventListener('click', () => openForm(null));
  $('#cancelForm').addEventListener('click', () => el.formDialog.close());

  // ---------- row actions ----------
  el.tbody.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.closest('tr').dataset.id);
    const emp = state.rows.find((r) => r.id === id);
    if (!emp) return;

    if (btn.dataset.action === 'edit') openForm(emp);
    else openDelete(emp);
  });

  // ---------- delete flow ----------
  function openDelete(emp) {
    state.deletingId = emp.id;
    el.confirmText.textContent = `Are you sure you want to delete ${emp.name} (${emp.role}, ${emp.department})? This action cannot be undone.`;
    el.confirmError.hidden = true;
    el.confirmDialog.showModal();
  }

  $('#cancelDelete').addEventListener('click', () => el.confirmDialog.close());

  el.confirmBtn.addEventListener('click', async () => {
    el.confirmBtn.disabled = true;
    el.confirmBtn.textContent = 'Deleting…';
    try {
      await api.deleteEmployee(state.deletingId);
      el.confirmDialog.close();
      toast('Employee deleted successfully');
      await loadEmployees();
    } catch (err) {
      if (err.status === 404) {
        el.confirmDialog.close();
        toast('This employee no longer exists', 'error');
        loadEmployees();
      } else {
        el.confirmError.textContent = err.message;
        el.confirmError.hidden = false;
      }
    } finally {
      el.confirmBtn.disabled = false;
      el.confirmBtn.textContent = 'Delete';
    }
  });

  // ---------- boot ----------
  loadDepartments();
  loadEmployees();
})();
