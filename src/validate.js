const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;
const ROLE_RE = /^[\p{L}\p{N}][\p{L}\p{N}\s.,&/()'+#-]*$/u;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MIN_DATE = '1970-01-01';
const MAX_SALARY = 100_000_000;

function isRealDate(str) {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

function todayPlus(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Validates an employee payload.
 * Returns { value, errors } - `errors` is an object keyed by field name
 * (empty when everything is fine), `value` is the cleaned payload.
 */
function validateEmployee(body, validDepartments) {
  const errors = {};
  const src = body && typeof body === 'object' ? body : {};

  const name = typeof src.name === 'string' ? src.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2-80 characters';
  else if (!NAME_RE.test(name)) errors.name = 'Name can only contain letters, spaces, . \' and -';

  const department = typeof src.department === 'string' ? src.department.trim() : '';
  if (!department) errors.department = 'Department is required';
  else if (!validDepartments.includes(department)) errors.department = 'Unknown department';

  const role = typeof src.role === 'string' ? src.role.trim().replace(/\s+/g, ' ') : '';
  if (!role) errors.role = 'Role is required';
  else if (role.length < 2 || role.length > 60) errors.role = 'Role must be 2-60 characters';
  else if (!ROLE_RE.test(role)) errors.role = 'Role contains unsupported characters';

  let salary = src.salary;
  if (typeof salary === 'string' && salary.trim() !== '') salary = Number(salary);
  if (salary === undefined || salary === null || salary === '') errors.salary = 'Salary is required';
  else if (typeof salary !== 'number' || !Number.isFinite(salary)) errors.salary = 'Salary must be a number';
  else if (salary <= 0) errors.salary = 'Salary must be greater than zero';
  else if (salary > MAX_SALARY) errors.salary = `Salary cannot exceed ${MAX_SALARY.toLocaleString('en-IN')}`;
  else if (Math.round(salary * 100) !== salary * 100 && Math.abs(Math.round(salary * 100) - salary * 100) > 1e-6) {
    errors.salary = 'Salary can have at most 2 decimal places';
  }

  const joinDate = typeof src.joinDate === 'string' ? src.joinDate.trim() : '';
  if (!joinDate) errors.joinDate = 'Join date is required';
  else if (!isRealDate(joinDate)) errors.joinDate = 'Join date must be a real date (YYYY-MM-DD)';
  else if (joinDate < MIN_DATE) errors.joinDate = 'Join date cannot be before 1970';
  else if (joinDate > todayPlus(90)) errors.joinDate = 'Join date cannot be more than 90 days in the future';

  return {
    errors,
    value: { name, department, role, salary: Number(salary), joinDate },
  };
}

module.exports = { validateEmployee };
