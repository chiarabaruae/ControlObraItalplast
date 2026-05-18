// To-Do page
import { apiGet, apiPost, apiPut, apiDelete } from "../api.js";
import { icons, esc, renderBadge, renderEmpty, formatDate, formatLabel } from "../ui.js";
import { setTopbarSection } from "../layout.js";

let tareas = [];
let obras = [];
let obraSeleccionada = "";
let filtro = "todas";
let searchTerm = "";

export async function renderTodo(container) {
  setTopbarSection("To-Do");
  container.innerHTML = '<div class="loading">Cargando tareas...</div>';

  try {
    [tareas, obras] = await Promise.all([apiGet("/tareas"), apiGet("/obras")]);
    renderPage(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

function filteredTareas() {
  return tareas.filter(t => {
    if (obraSeleccionada && t.obra_id !== obraSeleccionada) return false;
    if (filtro === "pendientes" && t.estado === "finalizada") return false;
    if (filtro === "completadas" && t.estado !== "finalizada") return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (t.titulo || "").toLowerCase().includes(s);
    }
    return true;
  });
}

function renderPage(container) {
  const list = filteredTareas();
  const obraName = obraSeleccionada ? (obras.find(o => o.id === obraSeleccionada)?.nombre || "Obra") : "Todas las obras";

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:260px 1fr;gap:20px;min-height:calc(100vh - var(--topbar-h) - 48px)">
      <div class="card" style="padding:16px;align-self:start">
        <div class="eyebrow" style="margin-bottom:12px">OBRAS</div>
        <div class="search-input" style="margin-bottom:12px">
          ${icons.search}
          <input type="text" placeholder="Buscar obra..." id="search-todo-obra" style="height:36px;font-size:13px">
        </div>
        <div id="todo-obra-list" style="display:grid;gap:4px">
          <button class="nav-item ${!obraSeleccionada ? "active" : ""}" data-todo-obra="" type="button">
            ${icons.obras} <span>Todas</span>
          </button>
          ${obras.map(o => `
            <button class="nav-item ${obraSeleccionada === o.id ? "active" : ""}" data-todo-obra="${o.id}" type="button">
              <span style="flex:1;text-align:left">${esc(o.nombre)}</span>
              <span class="badge" style="background:var(--fondo);font-size:10px">${tareas.filter(t => t.obra_id === o.id).length}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="page-header">
          <div class="page-header-row">
            <div>
              <div class="eyebrow">TAREAS</div>
              <h1>${esc(obraName)}</h1>
            </div>
            <button class="btn btn-primary" id="btn-new-tarea" type="button">${icons.plus} Nueva tarea</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          <button class="btn ${filtro === "todas" ? "btn-primary" : "btn-ghost"} btn-sm" data-filtro="todas" type="button">Todas</button>
          <button class="btn ${filtro === "pendientes" ? "btn-primary" : "btn-ghost"} btn-sm" data-filtro="pendientes" type="button">Pendientes</button>
          <button class="btn ${filtro === "completadas" ? "btn-primary" : "btn-ghost"} btn-sm" data-filtro="completadas" type="button">Completadas</button>
          <div class="search-input" style="margin-left:auto">
            ${icons.search}
            <input type="text" placeholder="Buscar tareas..." id="search-tareas" value="${esc(searchTerm)}" style="height:36px;font-size:13px">
          </div>
        </div>
        <div class="card">
          ${list.length > 0 ? renderTareasList(list) : renderEmpty(
            `No hay tareas aún${obraSeleccionada ? " en " + obraName : ""}`,
            "Crea una tarea desde el botón Nueva tarea"
          )}
        </div>
      </div>
    </div>
    ${modalTarea()}
  `;
  bindTodoEvents(container);
}

function renderTareasList(list) {
  return `<div class="table-wrap"><table>
    <thead><tr><th></th><th>Tarea</th><th>Obra</th><th>Estado</th><th>Prioridad</th><th>Fecha fin</th><th></th></tr></thead>
    <tbody>${list.map(t => {
      const isComplete = t.estado === "finalizada";
      return `<tr>
        <td><button class="btn-icon" data-toggle-tarea="${t.id}" data-complete="${isComplete}" type="button" title="${isComplete ? "Reabrir" : "Completar"}">
          ${isComplete ? icons.check : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'}
        </button></td>
        <td style="${isComplete ? "text-decoration:line-through;opacity:.5" : ""}"><strong>${esc(t.titulo)}</strong></td>
        <td>${esc(t.obra_nombre || "-")}</td>
        <td>${renderBadge(t.estado)}</td>
        <td>${renderBadge(t.prioridad)}</td>
        <td>${formatDate(t.fecha_fin)}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-tarea="${t.id}" type="button">${icons.edit}</button>
          <button class="btn btn-danger btn-sm" data-delete-tarea="${t.id}" type="button">${icons.trash}</button>
        </td>
      </tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function modalTarea() {
  const obraOpts = obras.map(o => `<option value="${o.id}">${esc(o.nombre)}</option>`).join("");
  return `<div class="modal-overlay" id="modal-tarea">
    <div class="modal-card">
      <div class="modal-header">
        <h2 id="modal-titulo-tarea">Nueva Tarea</h2>
        <button class="btn-icon" id="close-modal-tarea" type="button">${icons.close}</button>
      </div>
      <form id="form-tarea">
        <div class="form-grid">
          <div class="form-field"><label>Obra *</label><select name="obra_id" required><option value="">Seleccionar</option>${obraOpts}</select></div>
          <div class="form-field"><label>Título *</label><input name="titulo" required></div>
          <div class="form-field"><label>Responsable</label><input name="responsable"></div>
          <div class="form-field"><label>Fecha inicio *</label><input name="fecha_inicio" type="date" required></div>
          <div class="form-field"><label>Fecha fin *</label><input name="fecha_fin" type="date" required></div>
          <div class="form-field"><label>Estado</label>
            <select name="estado"><option value="pendiente">Pendiente</option><option value="en_progreso">En progreso</option><option value="bloqueada">Bloqueada</option><option value="finalizada">Finalizada</option></select>
          </div>
          <div class="form-field"><label>Prioridad</label>
            <select name="prioridad"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select>
          </div>
          <div class="form-field"><label>Avance %</label><input name="avance" type="number" min="0" max="100" value="0"></div>
          <div class="form-field full-width"><label>Descripción</label><textarea name="descripcion" rows="2"></textarea></div>
        </div>
        <div class="modal-status" id="modal-status-tarea"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="cancel-modal-tarea">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <input type="hidden" id="editing-tarea-id">
    </div>
  </div>`;
}

function bindTodoEvents(container) {
  const modal = document.getElementById("modal-tarea");
  const form = document.getElementById("form-tarea");
  const editingId = document.getElementById("editing-tarea-id");
  const status = document.getElementById("modal-status-tarea");

  const openModal = (t = null) => {
    editingId.value = t?.id || "";
    document.getElementById("modal-titulo-tarea").textContent = t ? "Editar Tarea" : "Nueva Tarea";
    if (t) {
      form.obra_id.value = t.obra_id || "";
      form.titulo.value = t.titulo || "";
      form.responsable.value = t.responsable || "";
      form.fecha_inicio.value = t.fecha_inicio?.slice(0, 10) || "";
      form.fecha_fin.value = t.fecha_fin?.slice(0, 10) || "";
      form.estado.value = t.estado || "pendiente";
      form.prioridad.value = t.prioridad || "media";
      form.avance.value = t.avance || 0;
      form.descripcion.value = t.descripcion || "";
    } else {
      form.reset();
      if (obraSeleccionada) form.obra_id.value = obraSeleccionada;
    }
    status.textContent = "";
    modal.classList.add("open");
  };

  const closeModal = () => modal.classList.remove("open");

  document.getElementById("btn-new-tarea")?.addEventListener("click", () => openModal());
  document.getElementById("close-modal-tarea")?.addEventListener("click", closeModal);
  document.getElementById("cancel-modal-tarea")?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    status.textContent = "Guardando...";
    try {
      if (editingId.value) await apiPut(`/tareas/${editingId.value}`, data);
      else await apiPost("/tareas", data);
      closeModal();
      renderTodo(container);
    } catch (err) { status.textContent = err.message; }
  });

  // Obra sidebar clicks
  container.addEventListener("click", async e => {
    const obraBtn = e.target.closest("[data-todo-obra]");
    if (obraBtn) { obraSeleccionada = obraBtn.dataset.todoObra; renderPage(container); return; }

    const editBtn = e.target.closest("[data-edit-tarea]");
    if (editBtn) { const t = tareas.find(x => x.id === editBtn.dataset.editTarea); if (t) openModal(t); return; }

    const deleteBtn = e.target.closest("[data-delete-tarea]");
    if (deleteBtn) {
      if (confirm("¿Eliminar esta tarea?")) { await apiDelete(`/tareas/${deleteBtn.dataset.deleteTarea}`); renderTodo(container); }
      return;
    }

    const toggleBtn = e.target.closest("[data-toggle-tarea]");
    if (toggleBtn) {
      const t = tareas.find(x => x.id === toggleBtn.dataset.toggleTarea);
      if (t) {
        const newEstado = t.estado === "finalizada" ? "pendiente" : "finalizada";
        await apiPut(`/tareas/${t.id}`, { ...t, estado: newEstado, avance: newEstado === "finalizada" ? 100 : t.avance });
        renderTodo(container);
      }
      return;
    }

    const filtroBtn = e.target.closest("[data-filtro]");
    if (filtroBtn) { filtro = filtroBtn.dataset.filtro; renderPage(container); }
  });

  document.getElementById("search-tareas")?.addEventListener("input", e => { searchTerm = e.target.value; renderPage(container); });
}
