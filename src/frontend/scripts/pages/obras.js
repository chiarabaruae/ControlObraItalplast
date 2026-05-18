// Obras page - CRUD completo
import { apiGet, apiPost, apiPut, apiDelete } from "../api.js";
import { icons, esc, renderBadge, renderProgress, renderEmpty, formatLabel, formatDate } from "../ui.js";
import { setTopbarSection } from "../layout.js";
import { navigate } from "../router.js";

let obras = [];
let clientesList = [];
let searchTerm = "";

export async function renderObras(container) {
  setTopbarSection("Obras");
  container.innerHTML = '<div class="loading">Cargando obras...</div>';

  try {
    [obras, clientesList] = await Promise.all([apiGet("/obras"), apiGet("/clientes")]);
    renderList(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

function filtered() {
  if (!searchTerm) return obras;
  const s = searchTerm.toLowerCase();
  return obras.filter(o =>
    (o.nombre || "").toLowerCase().includes(s) ||
    (o.cliente_nombre || "").toLowerCase().includes(s) ||
    (o.responsable || "").toLowerCase().includes(s)
  );
}

function renderList(container) {
  const list = filtered();
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <div class="eyebrow">INSTALACIONES</div>
          <h1>Obras</h1>
          <p class="subtitle">Gestiona las obras de instalación de aberturas</p>
        </div>
        <button class="btn btn-primary" id="btn-new-obra" type="button">${icons.plus} Nueva obra</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div><h2>Todas las obras</h2><p>${obras.length} registros</p></div>
        <div class="search-input">
          ${icons.search}
          <input type="text" placeholder="Buscar obra..." id="search-obras" value="${esc(searchTerm)}">
        </div>
      </div>
      ${list.length > 0 ? renderTable(list) : renderEmpty("Sin obras cargadas")}
    </div>

    ${modalHtml()}
  `;
  bindEvents(container);
}

function renderTable(list) {
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>Nombre</th><th>Cliente</th><th>Responsable</th><th>Estado</th>
      <th>Salud</th><th>Inicio</th><th>Fin est.</th><th>Avance</th><th></th>
    </tr></thead>
    <tbody>${list.map(o => `<tr style="cursor:pointer" data-view-obra="${o.id}">
      <td><strong>${esc(o.nombre)}</strong>${o.codigo ? `<br><small style="color:var(--muted)">${esc(o.codigo)}</small>` : ""}</td>
      <td>${esc(o.cliente_nombre || "-")}</td>
      <td>${esc(o.responsable || "-")}</td>
      <td>${renderBadge(o.estado)}</td>
      <td>${renderBadge(o.salud || "buena")}</td>
      <td>${formatDate(o.fecha_inicio)}</td>
      <td>${formatDate(o.fecha_fin_estimada)}</td>
      <td>${renderProgress(o.avance, "100px")}</td>
      <td class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit-obra="${o.id}" type="button">${icons.edit}</button>
        <button class="btn btn-danger btn-sm" data-delete-obra="${o.id}" type="button">${icons.trash}</button>
      </td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function modalHtml() {
  const clienteOpts = clientesList.map(c =>
    `<option value="${c.id}">${esc(c.nombre)}</option>`
  ).join("");

  return `<div class="modal-overlay" id="modal-obra">
    <div class="modal-card">
      <div class="modal-header">
        <h2 id="modal-titulo-obra">Nueva Obra</h2>
        <button class="btn-icon" id="close-modal-obra" type="button">${icons.close}</button>
      </div>
      <form id="form-obra">
        <div class="form-grid">
          <div class="form-field"><label>Nombre *</label><input name="nombre" required></div>
          <div class="form-field"><label>Cliente</label><select name="cliente_id"><option value="">Seleccionar</option>${clienteOpts}</select></div>
          <div class="form-field"><label>Ubicación</label><input name="ubicacion"></div>
          <div class="form-field"><label>Responsable</label><input name="responsable"></div>
          <div class="form-field"><label>Fecha inicio *</label><input name="fecha_inicio" type="date" required></div>
          <div class="form-field"><label>Fecha fin estimada *</label><input name="fecha_fin_estimada" type="date" required></div>
          <div class="form-field"><label>Estado</label>
            <select name="estado">
              <option value="planificada">Planificada</option>
              <option value="en_progreso">En progreso</option>
              <option value="pausada">Pausada</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div class="form-field"><label>Avance %</label><input name="avance" type="number" min="0" max="100" value="0"></div>
          <div class="form-field full-width"><label>Descripción</label><textarea name="descripcion" rows="2"></textarea></div>
        </div>
        <div class="modal-status" id="modal-status-obra"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="cancel-modal-obra">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <input type="hidden" id="editing-obra-id">
    </div>
  </div>`;
}

function bindEvents(container) {
  const modal = document.getElementById("modal-obra");
  const form = document.getElementById("form-obra");
  const editingId = document.getElementById("editing-obra-id");
  const status = document.getElementById("modal-status-obra");

  const openModal = (obra = null) => {
    editingId.value = obra?.id || "";
    document.getElementById("modal-titulo-obra").textContent = obra ? "Editar Obra" : "Nueva Obra";
    if (obra) {
      form.nombre.value = obra.nombre || "";
      form.cliente_id.value = obra.cliente_id || "";
      form.ubicacion.value = obra.ubicacion || "";
      form.responsable.value = obra.responsable || "";
      form.fecha_inicio.value = obra.fecha_inicio?.slice(0, 10) || "";
      form.fecha_fin_estimada.value = obra.fecha_fin_estimada?.slice(0, 10) || "";
      form.estado.value = obra.estado || "planificada";
      form.avance.value = obra.avance || 0;
      form.descripcion.value = obra.descripcion || "";
    } else {
      form.reset();
    }
    status.textContent = "";
    modal.classList.add("open");
  };

  const closeModal = () => modal.classList.remove("open");

  document.getElementById("btn-new-obra")?.addEventListener("click", () => openModal());
  document.getElementById("close-modal-obra")?.addEventListener("click", closeModal);
  document.getElementById("cancel-modal-obra")?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    status.textContent = "Guardando...";
    try {
      if (editingId.value) await apiPut(`/obras/${editingId.value}`, data);
      else await apiPost("/obras", data);
      closeModal();
      renderObras(container);
    } catch (err) { status.textContent = err.message; }
  });

  container.addEventListener("click", async e => {
    const editBtn = e.target.closest("[data-edit-obra]");
    const deleteBtn = e.target.closest("[data-delete-obra]");
    const viewBtn = e.target.closest("[data-view-obra]");

    if (editBtn) {
      e.stopPropagation();
      const o = obras.find(x => x.id === editBtn.dataset.editObra);
      if (o) openModal(o);
    } else if (deleteBtn) {
      e.stopPropagation();
      if (confirm("¿Eliminar esta obra?")) {
        await apiDelete(`/obras/${deleteBtn.dataset.deleteObra}`);
        renderObras(container);
      }
    } else if (viewBtn && !e.target.closest("button")) {
      navigate(`/proyectos/${viewBtn.dataset.viewObra}`);
    }
  });

  document.getElementById("search-obras")?.addEventListener("input", e => {
    searchTerm = e.target.value;
    renderList(container);
  });
}
