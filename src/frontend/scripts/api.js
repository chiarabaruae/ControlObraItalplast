// API client for Control Obras
const BASE = "/api/admin";

function getToken() {
  return sessionStorage.getItem("controlObraToken");
}

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    }
  });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.clear();
      location.reload();
    }
    throw new Error(data.error ?? "Error de API");
  }

  return data;
}

export async function apiGet(path) {
  return api(path);
}

export async function apiPost(path, body) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function apiPut(path, body) {
  return api(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function apiPatch(path, body = {}) {
  return api(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function apiDelete(path) {
  return api(path, { method: "DELETE" });
}
