// Thin wrapper around fetch so the UI code only deals with data and ApiError.
class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    throw new ApiError(payload?.error || `Request failed (${res.status})`, res.status, payload?.details);
  }
  return payload;
}

const api = {
  listEmployees(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v != null) qs.set(k, v);
    });
    return request(`/employees?${qs}`);
  },
  listDepartments: () => request('/departments'),
  createEmployee: (body) => request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id, body) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
};
