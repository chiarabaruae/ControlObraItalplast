// Clientes page - CRUD completo
import { apiGet, apiPost, apiPut, apiDelete } from "../api.js";
import { icons, esc, renderBadge, renderEmpty, getInitials, formatLabel } from "../ui.js";
import { setTopbarSection } from "../layout.js";
import { setSidebarClients } from "../layout.js";

let clientes = [];
let searchTerm = "";
let filtroEstado = "";

export async function renderClientes(container) {
  setTopbarSection("Clientes");
  container.innerHTML = '<div class="loading">Cargando clientes...</div>';

  try {
    clientes = await apiGet("/clientes");
    setSidebarClients(clientes);
    renderList(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

function filtered() {
  return clientes.filter(c => {
    if (filtroEstado && c.estado !== filtroEstado) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (c.nombre || "").toLowerCase().includes(s) ||
             (c.ruc || "").toLowerCase().includes(s) ||
             (c.contacto_principal || "").toLowerCase().includes(s);
    }
    return true;
  });
}

function renderList(container) {
  const activos = clientes.filter(c => c.estado === "activo").length;
  const list = filtered();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <div class="eyebrow">INICIO</div>
          <h1>Clientes</h1>
          <p class="subtitle">Gestiona los clientes y sus obras activas</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge badge-activo">${activos} activos</span>
          <span class="badge" style="background:var(--fondo);color:var(--texto-sec)">${clientes.length} total</span>
          <button class="btn btn-primary" id="btn-new-client" type="button">${icons.plus} Nuevo cliente</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="eyebrow" style="margin-bottom:2px">WORKSPACE ACTIVO</div>
          <h2>Clientes</h2>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="search-input">
            ${icons.search}
            <input type="text" placeholder="Buscar cliente..." id="search-clientes" value="${esc(searchTerm)}">
          </div>
          <select id="filtro-estado-cliente" class="btn btn-ghost" style="height:40px;font-size:13px">
            <option value="">Todos</option>
            <option value="activo" ${filtroEstado === "activo" ? "selected" : ""}>Activos</option>
            <option value="inactivo" ${filtroEstado === "inactivo" ? "selected" : ""}>Inactivos</option>
          </select>
        </div>
      </div>
      ${list.length > 0 ? `<div class="client-grid">${list.map(renderClientCard).join("")}</div>` : renderEmpty("Sin clientes cargados")}
    </div>

    ${modalHtml()}
  `;

  bindEvents(container);
}

function renderClientCard(c) {
  const obrasCount = 0; // Will be populated when we have the relation
  return `<div class="client-card" data-id="${c.id}">
    <div class="client-card-header">
      <h3>${esc(c.nombre)}</h3>
      <div style="display:flex;gap:6px;align-items:center">
        ${renderBadge(c.estado)}
        <button class="btn btn-ghost btn-sm" data-edit="${c.id}" type="button">${icons.edit}</button>
        <button class="btn btn-danger btn-sm" data-delete="${c.id}" type="button">${icons.trash}</button>
      </div>
    </div>
    ${c.industria ? `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(c.industria)}</div>` : ""}
    <div class="client-mini-cards">
      <div class="client-mini">
        <div class="mini-label">RUC</div>
        <div class="mini-value">${esc(c.ruc || "-")}</div>
      </div>
      <div class="client-mini">
        <div class="mini-label">Contacto</div>
        <div class="mini-value">${esc(c.contacto_principal || "-")}</div>
      </div>
      <div class="client-mini">
        <div class="mini-label">Teléfono</div>
        <div class="mini-value">${esc(c.telefono || "-")}</div>
      </div>
    </div>
  </div>`;
}

function modalHtml() {
  return `<div class="modal-overlay" id="modal-cliente">
    <div class="modal-card">
      <div class="modal-header">
        <h2 id="modal-titulo-cliente">Nuevo Cliente</h2>
        <button class="btn-icon" id="close-modal-cliente" type="button">${icons.close}</button>
      </div>
      <form id="form-cliente">
        <div class="form-grid">
          <div class="form-field"><label>Nombre *</label><input name="nombre" required></div>
          <div class="form-field"><label>RUC</label><input name="ruc"></div>
          <div class="form-field"><label>Industria</label><input name="industria"></div>
          <div class="form-field"><label>Estado</label>
            <select name="estado"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
          </div>
          <div class="form-field"><label>Contacto principal</label><input name="contacto_principal"></div>
          <div class="form-field"><label>Teléfono</label><input name="telefono"></div>
          <div class="form-field"><label>Email</label><input name="email" type="email"></div>
          <div class="form-field"><label>Calificación</label><input name="calificacion" type="number" min="0" max="5" step="0.5"></div>
          <div class="form-field full-width"><label>Dirección</label><textarea name="direccion" rows="2"></textarea></div>
          <div class="form-field full-width"><label>Observaciones</label><textarea name="observaciones" rows="2"></textarea></div>
        </div>
        <div class="modal-status" id="modal-status-cliente"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="cancel-modal-cliente">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <input type="hidden" id="editing-cliente-id">
    </div>
  </div>`;
}

function bindEvents(container) {
  const modal = document.getElementById("modal-cliente");
  const form = document.getElementById("form-cliente");
  const editingId = document.getElementById("editing-cliente-id");
  const status = document.getElementById("modal-status-cliente");

  const openModal = (cliente = null) => {
    editingId.value = cliente?.id || "";
    document.getElementById("modal-titulo-cliente").textContent = cliente ? "Editar Cliente" : "Nuevo Cliente";
    if (cliente) {
      form.nombre.value = cliente.nombre || "";
      form.ruc.value = cliente.ruc || "";
      form.industria.value = cliente.industria || "";
      form.estado.value = cliente.estado || "activo";
      form.contacto_principal.value = cliente.contacto_principal || "";
      form.telefono.value = cliente.telefono || "";
      form.email.value = cliente.email || "";
      form.calificacion.value = cliente.calificacion || "";
      form.direccion.value = cliente.direccion || "";
      form.observaciones.value = cliente.observaciones || "";
    } else {
      form.reset();
    }
    status.textContent = "";
    modal.classList.add("open");
  };

  const closeModal = () => modal.classList.remove("open");

  document.getElementById("btn-new-client")?.addEventListener("click", () => openModal());
  document.getElementById("close-modal-cliente")?.addEventListener("click", closeModal);
  document.getElementById("cancel-modal-cliente")?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    status.textContent = "Guardando...";
    try {
      if (editingId.value) {
        await apiPut(`/clientes/${editingId.value}`, data);
      } else {
        await apiPost("/clientes", data);
      }
      closeModal();
      renderClientes(container);
    } catch (err) {
      status.textContent = err.message;
    }
  });

  // Edit / delete
  container.addEventListener("click", async e => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");

    if (editBtn) {
      const c = clientes.find(x => x.id === editBtn.dataset.edit);
      if (c) openModal(c);
    }
    if (deleteBtn) {
      if (confirm("¿Eliminar este cliente?")) {
        await apiDelete(`/clientes/${deleteBtn.dataset.delete}`);
        renderClientes(container);
      }
    }
  });

  // Search
  document.getElementById("search-clientes")?.addEventListener("input", e => {
    searchTerm = e.target.value;
    renderList(container);
  });

  // Filter
  document.getElementById("filtro-estado-cliente")?.addEventListener("change", e => {
    filtroEstado = e.target.value;
    renderList(container);
  });
}
