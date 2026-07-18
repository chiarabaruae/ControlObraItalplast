import { apiDelete, apiGet, apiPatch, apiPost } from "../api.js";
import { setTopbarSection } from "../layout.js";
import { esc, formatDate, icons, renderBadge } from "../ui.js";

const ROLE_LABELS = {
  administrator: "Administrador",
  supervisor: "Supervisor",
  viewer: "Visualizador"
};

let state = {
  activeCount: 0,
  users: [],
  loading: true,
  status: ""
};

export function renderAjustesUsuarios(container, currentUser) {
  setTopbarSection("Ajustes");
  state = { activeCount: 0, users: [], loading: true, status: "" };
  draw(container, currentUser);
  loadUsers(container, currentUser);
}

async function loadUsers(container, currentUser) {
  try {
    const data = await apiGet("/usuarios");
    state = {
      ...state,
      activeCount: data.activeCount ?? 0,
      users: data.users ?? [],
      loading: false
    };
  } catch (error) {
    state = { ...state, loading: false, status: error.message };
  }
  draw(container, currentUser);
}

function draw(container, currentUser) {
  container.innerHTML = `
    <div class="page-header-row settings-header">
      <div class="page-header">
        <div class="eyebrow">AJUSTES</div>
        <h1>Usuarios</h1>
        <p class="subtitle">Alta y administración de accesos del sistema.</p>
      </div>
      <div class="settings-tabs" aria-label="Ajustes">
        <button class="tab active" type="button">${icons.users}<span>Usuarios</span></button>
      </div>
    </div>

    <div class="settings-grid">
      <section class="card user-form-card">
        <div class="card-header">
          <div>
            <h2>Crear usuario</h2>
            <p>El usuario inicia sesión con el valor de Usuario.</p>
          </div>
        </div>
        <form id="user-create-form" class="form-grid">
          <div class="form-field full-width">
            <label for="user-username">Usuario</label>
            <input id="user-username" name="username" type="email" autocomplete="username" placeholder="correo@empresa.com" required>
          </div>
          <div class="form-field">
            <label for="user-first-name">Nombre</label>
            <input id="user-first-name" name="firstName" autocomplete="given-name" required>
          </div>
          <div class="form-field">
            <label for="user-last-name">Apellido</label>
            <input id="user-last-name" name="lastName" autocomplete="family-name" required>
          </div>
          <div class="form-field">
            <label for="user-password">Contraseña</label>
            <input id="user-password" name="password" type="password" autocomplete="new-password" minlength="8" required>
          </div>
          <div class="form-field">
            <label for="user-role">Rol</label>
            <select id="user-role" name="role" required>
              <option value="viewer">Visualizador</option>
              <option value="supervisor">Supervisor</option>
              <option value="administrator">Administrador</option>
            </select>
          </div>
          <div class="full-width user-form-actions">
            <button class="btn btn-primary" type="submit">${icons.plus}<span>Crear usuario</span></button>
            <p class="modal-status" id="user-form-status">${esc(state.status)}</p>
          </div>
        </form>
      </section>

      <aside class="user-summary">
        <div class="kpi-card user-count-card">
          <div class="kpi-icon">${icons.users}</div>
          <div class="kpi-value">${state.loading ? "..." : state.activeCount}</div>
          <div class="kpi-label">Usuarios activos</div>
        </div>
        <section class="card">
          <div class="card-header">
            <div>
              <h2>Accesos</h2>
              <p>${state.loading ? "Cargando usuarios..." : `${state.users.length} usuarios registrados`}</p>
            </div>
          </div>
          <div class="user-card-list">
            ${renderUsers(currentUser)}
          </div>
        </section>
      </aside>
    </div>
  `;

  bindEvents(container, currentUser);
}

function renderUsers(currentUser) {
  if (state.loading) {
    return `<div class="loading">Cargando...</div>`;
  }

  if (!state.users.length) {
    return `<div class="empty-state">${icons.users}<h3>Sin usuarios</h3><p>Crea el primer acceso administrativo.</p></div>`;
  }

  return state.users.map((user) => {
    const isSelf = user.id === currentUser.id;
    const inactiveClass = user.is_active ? "" : "is-inactive";
    return `
      <article class="user-access-card ${inactiveClass}">
        <div class="user-access-main">
          <div class="user-access-avatar">${initials(user.display_name)}</div>
          <div>
            <h3>${esc(user.display_name)}</h3>
            <p>${esc(user.username)}</p>
            <div class="user-access-meta">
              ${renderBadge(ROLE_LABELS[user.role] ?? user.role)}
              ${renderBadge(user.is_active ? "Activo" : "Inactivo")}
            </div>
          </div>
        </div>
        <div class="user-access-actions">
          <small>${user.created_at ? formatDate(user.created_at.slice(0, 10)) : ""}</small>
          <div>
            <button class="btn btn-ghost btn-sm" data-action="archive" data-id="${esc(user.id)}" ${!user.is_active || isSelf ? "disabled" : ""} type="button" title="Archivar usuario">
              ${icons.archive}<span>Archivar</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(user.id)}" ${isSelf ? "disabled" : ""} type="button" title="Eliminar usuario">
              ${icons.trash}<span>Eliminar</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function bindEvents(container, currentUser) {
  document.getElementById("user-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById("user-form-status");
    const button = form.querySelector("button[type='submit']");
    const body = Object.fromEntries(new FormData(form).entries());

    status.textContent = "Creando usuario...";
    button.disabled = true;

    try {
      await apiPost("/usuarios", body);
      form.reset();
      status.textContent = "Usuario creado.";
      await loadUsers(container, currentUser);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  container.querySelector(".user-card-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    const user = state.users.find((item) => item.id === id);
    if (!user) return;

    if (action === "archive") {
      await runUserAction(container, currentUser, () => apiPatch(`/usuarios/${id}/archive`));
      return;
    }

    if (action === "delete" && confirm(`Eliminar definitivamente a ${user.display_name}?`)) {
      await runUserAction(container, currentUser, () => apiDelete(`/usuarios/${id}`));
    }
  });
}

async function runUserAction(container, currentUser, action) {
  try {
    await action();
    await loadUsers(container, currentUser);
  } catch (error) {
    state = { ...state, status: error.message };
    draw(container, currentUser);
  }
}

function initials(name) {
  return String(name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}
