const form = document.querySelector("#login-form");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const statusMessage = document.querySelector("#form-status");
const togglePassword = document.querySelector("#toggle-password");
const loginShell = document.querySelector("#login-shell");
const appShell = document.querySelector("#app-shell");
const userChip = document.querySelector("#user-chip");
const workspace = document.querySelector("#workspace");
const title = document.querySelector("#main-title");
const eyebrow = document.querySelector("#main-eyebrow");
const navItems = [...document.querySelectorAll(".side-nav-item")];
const refreshButton = document.querySelector("#refresh-view");
const newRecordButton = document.querySelector("#new-record");
const modal = document.querySelector("#record-modal");
const modalTitle = document.querySelector("#modal-title");
const modalEyebrow = document.querySelector("#modal-eyebrow");
const modalFields = document.querySelector("#modal-fields");
const modalStatus = document.querySelector("#modal-status");
const recordForm = document.querySelector("#record-form");
const closeModal = document.querySelector("#close-modal");
const cancelModal = document.querySelector("#cancel-modal");

const state = {
  view: "dashboard",
  user: null,
  editing: null,
  collections: {
    clientes: [],
    obras: [],
    tareas: []
  }
};

const views = {
  dashboard: { title: "Dashboard", eyebrow: "Panel operativo" },
  clientes: { title: "Clientes", eyebrow: "Administracion" },
  obras: { title: "Obras", eyebrow: "Instalaciones" },
  tareas: { title: "Tareas", eyebrow: "Ejecucion" },
  gantt: { title: "Gantt", eyebrow: "Cronograma" }
};

const configs = {
  clientes: {
    endpoint: "clientes",
    title: "Cliente",
    fields: [
      field("nombre", "Nombre", "text", true),
      field("ruc", "RUC"),
      field("telefono", "Telefono"),
      field("email", "Email", "email"),
      field("contacto_principal", "Contacto principal"),
      field("direccion", "Direccion", "textarea"),
      select("estado", "Estado", ["activo", "inactivo"], true)
    ],
    columns: ["nombre", "ruc", "telefono", "contacto_principal", "estado"]
  },
  obras: {
    endpoint: "obras",
    title: "Obra",
    fields: [
      field("nombre", "Nombre", "text", true),
      select("cliente_id", "Cliente", [], false, "clientes"),
      field("ubicacion", "Ubicacion"),
      field("responsable", "Responsable"),
      field("fecha_inicio", "Fecha inicio", "date", true),
      field("fecha_fin_estimada", "Fecha fin estimada", "date", true),
      field("fecha_fin_real", "Fecha fin real", "date"),
      select("estado", "Estado", ["planificada", "en_progreso", "pausada", "finalizada", "cancelada"], true),
      field("avance", "Avance %", "number"),
      field("descripcion", "Descripcion", "textarea")
    ],
    columns: ["nombre", "cliente_nombre", "responsable", "fecha_inicio", "fecha_fin_estimada", "estado", "avance"]
  },
  tareas: {
    endpoint: "tareas",
    title: "Tarea",
    fields: [
      select("obra_id", "Obra", [], true, "obras"),
      field("titulo", "Titulo", "text", true),
      field("responsable", "Responsable"),
      field("fecha_inicio", "Fecha inicio", "date", true),
      field("fecha_fin", "Fecha fin", "date", true),
      select("estado", "Estado", ["pendiente", "en_progreso", "bloqueada", "finalizada"], true),
      select("prioridad", "Prioridad", ["baja", "media", "alta", "urgente"], true),
      field("avance", "Avance %", "number"),
      field("orden", "Orden", "number"),
      field("descripcion", "Descripcion", "textarea")
    ],
    columns: ["titulo", "obra_nombre", "responsable", "fecha_inicio", "fecha_fin", "estado", "prioridad", "avance"]
  }
};

const setStatus = (message, type = "") => {
  statusMessage.textContent = message;
  statusMessage.className = `form-status${type ? ` is-${type}` : ""}`;
};

togglePassword.addEventListener("click", () => {
  const isHidden = password.type === "password";
  password.type = isHidden ? "text" : "password";
  togglePassword.setAttribute("aria-label", isHidden ? "Ocultar contraseña" : "Mostrar contraseña");
});

const showMainPage = (user) => {
  state.user = user;
  sessionStorage.setItem("controlObraUser", JSON.stringify(user));
  userChip.textContent = user.displayName;
  loginShell.hidden = true;
  appShell.hidden = false;
  loadView(state.view);
};

const storedUser = sessionStorage.getItem("controlObraUser");

if (sessionStorage.getItem("controlObraToken") && storedUser) {
  try {
    showMainPage(JSON.parse(storedUser));
  } catch {
    sessionStorage.removeItem("controlObraUser");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const credentials = {
    username: username.value.trim(),
    password: password.value
  };

  if (!credentials.username || !credentials.password) {
    setStatus("Ingresa usuario y contraseña.", "error");
    return;
  }

  if (window.location.protocol === "file:") {
    setStatus("Levanta el backend para iniciar sesion.", "error");
    return;
  }

  setStatus("Validando acceso...");

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setStatus(result.error ?? "No se pudo iniciar sesion.", "error");
      return;
    }

    sessionStorage.setItem("controlObraToken", result.token);
    showMainPage(result.user);
  } catch {
    setStatus("No se pudo conectar con la API.", "error");
  }
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    state.view = item.dataset.view;
    loadView(state.view);
  });
});

refreshButton.addEventListener("click", () => loadView(state.view));

newRecordButton.addEventListener("click", () => openModal(state.view));
closeModal.addEventListener("click", () => modal.close());
cancelModal.addEventListener("click", () => modal.close());

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveRecord();
});

workspace.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const collection = configs[state.view]?.endpoint;
    const record = state.collections[collection].find((item) => item.id === editButton.dataset.edit);
    openModal(state.view, record);
  }

  if (deleteButton) {
    const config = configs[state.view];
    if (!config || !confirm("Eliminar registro?")) {
      return;
    }

    await api(`/${config.endpoint}/${deleteButton.dataset.delete}`, { method: "DELETE" });
    await loadView(state.view);
  }
});

async function loadView(view) {
  const meta = views[view];
  title.textContent = meta.title;
  eyebrow.textContent = meta.eyebrow;
  newRecordButton.hidden = !configs[view];
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  workspace.innerHTML = `<div class="loading-card">Cargando ${meta.title.toLowerCase()}...</div>`;

  try {
    if (view === "dashboard") {
      await renderDashboard();
    } else if (view === "gantt") {
      await renderGantt();
    } else {
      await renderCrud(view);
    }
  } catch (error) {
    workspace.innerHTML = `<div class="empty-state"><h2>No se pudo cargar</h2><p>${error.message}</p></div>`;
  }
}

async function renderDashboard() {
  const data = await api("/dashboard");
  const resumen = data.resumen;

  workspace.innerHTML = `
    <section class="stats-grid">
      ${statCard("Clientes", resumen.clientes)}
      ${statCard("Obras", resumen.obras)}
      ${statCard("En progreso", resumen.obras_en_progreso)}
      ${statCard("Avance prom.", `${resumen.avance_promedio}%`)}
    </section>
    <section class="panel-grid">
      <article class="data-card">
        <div class="card-header"><h2>Estado de obras</h2></div>
        ${data.estados.length ? renderStatusList(data.estados) : emptySmall("Sin obras cargadas")}
      </article>
      <article class="data-card">
        <div class="card-header"><h2>Productividad</h2></div>
        <div class="progress-block">
          <span>${resumen.tareas_finalizadas} de ${resumen.tareas} tareas finalizadas</span>
          <div class="progress-track">
            <span style="width: ${percentOf(resumen.tareas_finalizadas, resumen.tareas)}%"></span>
          </div>
        </div>
      </article>
    </section>
  `;
}

async function renderCrud(view) {
  const config = configs[view];
  await hydrateLookups();
  const rows = await api(`/${config.endpoint}`);
  state.collections[config.endpoint] = rows;

  workspace.innerHTML = `
    <article class="data-card full-card">
      <div class="card-header">
        <div>
          <h2>${views[view].title}</h2>
          <p>${rows.length} registros</p>
        </div>
      </div>
      ${rows.length ? renderTable(config, rows) : emptyState(`Sin ${views[view].title.toLowerCase()} cargados`)}
    </article>
  `;
}

async function renderGantt() {
  await hydrateLookups();
  const rows = await api("/gantt");

  if (!rows.length) {
    workspace.innerHTML = emptyState("Sin tareas para cronograma");
    return;
  }

  const dates = rows.flatMap((row) => [dateOnly(row.fecha_inicio), dateOnly(row.fecha_fin)]);
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  const totalDays = Math.max(1, daysBetween(min, max) + 1);

  workspace.innerHTML = `
    <article class="data-card full-card">
      <div class="card-header">
        <div>
          <h2>Gantt de instalaciones</h2>
          <p>${formatDate(min)} - ${formatDate(max)}</p>
        </div>
      </div>
      <div class="gantt">
        ${rows.map((row) => renderGanttRow(row, min, totalDays)).join("")}
      </div>
    </article>
  `;
}

function renderGanttRow(row, min, totalDays) {
  const start = dateOnly(row.fecha_inicio);
  const end = dateOnly(row.fecha_fin);
  const offset = daysBetween(min, start);
  const duration = daysBetween(start, end) + 1;
  const left = (offset / totalDays) * 100;
  const width = Math.max(4, (duration / totalDays) * 100);

  return `
    <div class="gantt-row">
      <div class="gantt-label">
        <strong>${escapeHtml(row.titulo)}</strong>
        <span>${escapeHtml(row.obra_nombre ?? "")}</span>
      </div>
      <div class="gantt-track">
        <div class="gantt-bar status-${row.estado}" style="left:${left}%;width:${width}%">
          <span>${formatDate(start)} - ${formatDate(end)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderTable(config, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${config.columns.map((column) => `<th>${label(column)}</th>`).join("")}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${config.columns.map((column) => `<td>${cell(row, column)}</td>`).join("")}
                  <td class="row-actions">
                    <button class="ghost-button compact" type="button" data-edit="${row.id}">Editar</button>
                    <button class="danger-button compact" type="button" data-delete="${row.id}">Eliminar</button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function openModal(view, record = null) {
  const config = configs[view];
  if (!config) {
    return;
  }

  state.editing = record;
  modalStatus.textContent = "";
  modalTitle.textContent = record ? `Editar ${config.title}` : `Nuevo ${config.title}`;
  modalEyebrow.textContent = views[view].title;
  modalFields.innerHTML = config.fields.map((item) => renderField(item, record)).join("");
  modal.showModal();
}

async function saveRecord() {
  const config = configs[state.view];
  const formData = new FormData(recordForm);
  const payload = Object.fromEntries(formData.entries());
  const method = state.editing ? "PUT" : "POST";
  const path = state.editing ? `/${config.endpoint}/${state.editing.id}` : `/${config.endpoint}`;

  modalStatus.textContent = "Guardando...";

  try {
    await api(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    modal.close();
    await loadView(state.view);
  } catch (error) {
    modalStatus.textContent = error.message;
    modalStatus.className = "form-status is-error";
  }
}

function renderField(item, record) {
  const value = record?.[item.name] ?? "";
  const required = item.required ? "required" : "";

  if (item.type === "textarea") {
    return `
      <label class="field">
        <span>${item.label}</span>
        <textarea name="${item.name}" ${required}>${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  if (item.type === "select") {
    const options = item.source ? sourceOptions(item.source) : item.options.map((option) => ({ value: option, label: label(option) }));
    return `
      <label class="field">
        <span>${item.label}</span>
        <select name="${item.name}" ${required}>
          <option value="">Seleccionar</option>
          ${options
            .map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
    `;
  }

  return `
    <label class="field">
      <span>${item.label}</span>
      <input name="${item.name}" type="${item.type}" value="${escapeHtml(value)}" ${required} />
    </label>
  `;
}

async function hydrateLookups() {
  const [clientes, obras] = await Promise.all([api("/clientes"), api("/obras")]);
  state.collections.clientes = clientes;
  state.collections.obras = obras;
}

async function api(path, options = {}) {
  const token = sessionStorage.getItem("controlObraToken");
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    }
  });

  if (response.status === 204) {
    return null;
  }

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

function field(name, labelText, type = "text", required = false) {
  return { name, label: labelText, type, required };
}

function select(name, labelText, options, required = false, source = null) {
  return { name, label: labelText, type: "select", options, required, source };
}

function sourceOptions(source) {
  return state.collections[source].map((item) => ({
    value: item.id,
    label: item.nombre
  }));
}

function statCard(name, value) {
  return `<article class="stat-card"><span>${name}</span><strong>${value}</strong></article>`;
}

function renderStatusList(rows) {
  return `<div class="status-list">${rows.map((row) => `<span><b>${label(row.estado)}</b>${row.total}</span>`).join("")}</div>`;
}

function emptyState(message) {
  return `<div class="empty-state"><h2>${message}</h2><p>Carga manual desde el boton Nuevo.</p></div>`;
}

function emptySmall(message) {
  return `<div class="empty-small">${message}</div>`;
}

function cell(row, column) {
  const value = row[column];

  if (column === "estado" || column === "prioridad") {
    return `<span class="badge status-${value}">${label(value)}</span>`;
  }

  if (column.includes("fecha")) {
    return value ? formatDate(dateOnly(value)) : "";
  }

  if (column === "avance") {
    return `${Number(value ?? 0)}%`;
  }

  return escapeHtml(value ?? "");
}

function label(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percentOf(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function dateOnly(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(start, end) {
  return Math.round((dateOnly(end) - dateOnly(start)) / 86400000);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
