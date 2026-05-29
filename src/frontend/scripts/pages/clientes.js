import { apiGet, apiPost } from "../api.js";
import { icons, esc, renderEmpty, formatDate } from "../ui.js";
import { setTopbarSection, setSidebarClients } from "../layout.js";
import { navigate } from "../router.js";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;
const CONTROL_STATUS = {
  ACTIVO: "activo",
  SIN_PROYECTO: "sin_proyecto",
  PENDIENTE: "pendiente_vinculacion",
  INACTIVO: "inactivo"
};

let allLeads = [];
let allObras = [];
let allRelaciones = [];
let activeUsers = [];
let groupedClientes = [];
let visibleCount = PAGE_SIZE;
let searchDraft = "";
let searchApplied = "";
let filterCrm = "todos";
let filterControl = "todos";
let debounceTimer = null;
let isLoading = true;
let isFiltering = false;
let isSavingProject = false;
let isUploadingOffer = false;
const loadingAccordionKeys = new Set();
const openClienteKeys = new Set();
const tagsDraftByClient = new Map();
let editingTagIndex = null;

export async function renderClientes(container) {
  setTopbarSection("Clientes");
  isLoading = true;
  container.innerHTML = renderPageSkeleton();

  try {
    await loadData();
    buildGroups();
    isLoading = false;
    renderShell(container);
    renderControls(container);
    renderList(container);
    bindEvents(container);
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(error.message)}</p></div>`;
  }
}

async function loadData() {
  const [leads, obras, relaciones, users] = await Promise.all([
    apiGet("/clientes").catch(() => []),
    apiGet("/obras").catch(() => []),
    apiGet("/clientes/relaciones").catch(() => []),
    apiGet("/usuarios/activos").catch(() => [])
  ]);

  allLeads = Array.isArray(leads) ? leads : [];
  allObras = Array.isArray(obras) ? obras : [];
  allRelaciones = Array.isArray(relaciones) ? relaciones : [];
  activeUsers = Array.isArray(users) ? users : [];

  setSidebarClients(
    dedupeByNombre(allLeads).map((lead) => ({
      nombre: lead.nombre_cliente || "-",
      estado: "activo"
    }))
  );
}

function dedupeByNombre(leads) {
  const map = new Map();
  for (const lead of leads) {
    const key = normalizeName(lead.nombre_cliente) || `LEAD_${String(lead.id_cliente_externo || Math.random())}`;
    const current = map.get(key);
    if (!current || toDateValue(lead.creado) > toDateValue(current.creado)) {
      map.set(key, lead);
    }
  }
  return [...map.values()];
}

function buildGroups() {
  const groups = new Map();

  for (const lead of allLeads) {
    const normalized = normalizeName(lead.nombre_cliente);
    const key = normalized || `LEAD_${String(lead.id_cliente_externo || Math.random())}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        nombre: lead.nombre_cliente || "Cliente sin nombre",
        normalizedName: key,
        leads: [],
        leadIds: new Set(),
        principal: null,
        crmStatus: "-"
      });
    }

    const group = groups.get(key);
    group.leads.push(lead);
    if (lead.id_cliente_externo) group.leadIds.add(String(lead.id_cliente_externo));
  }

  groupedClientes = [...groups.values()]
    .map((group) => {
      const leadsSorted = [...group.leads].sort((a, b) => toDateValue(b.creado) - toDateValue(a.creado));
      const principal = leadsSorted[0] || {};
      const computed = computeControlState(group, principal);
      const crmStatus = showValue(principal.estado_final || principal.etapa);

      return {
        ...group,
        leads: leadsSorted,
        principal,
        crmStatus,
        ...computed
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function computeControlState(group, principal) {
  const leadIds = group.leadIds;

  const confirmedByLead = allObras.filter((obra) => {
    const clientId = String(obra.cliente_externo_id || "");
    return clientId && leadIds.has(clientId);
  });

  const confirmedRelationProjectIds = new Set(
    allRelaciones
      .filter(
        (item) =>
          leadIds.has(String(item.cliente_externo_id || "")) &&
          String(item.estado_relacion || "").toLowerCase() === "confirmado"
      )
      .map((item) => String(item.proyecto_id || ""))
  );

  const confirmedByRelation = allObras.filter((obra) => confirmedRelationProjectIds.has(String(obra.id || "")));
  const confirmedProjects = uniqueProjects([...confirmedByLead, ...confirmedByRelation]);

  const rejectedProjectIds = new Set(
    allRelaciones
      .filter(
        (item) =>
          leadIds.has(String(item.cliente_externo_id || "")) &&
          String(item.estado_relacion || "").toLowerCase() === "rechazado"
      )
      .map((item) => String(item.proyecto_id || ""))
  );

  const relatedIds = new Set(confirmedProjects.map((project) => String(project.id || "")));
  const suggestionProjects = allObras.filter((obra) => {
    const obraId = String(obra.id || "");
    if (!obraId || relatedIds.has(obraId) || rejectedProjectIds.has(obraId)) return false;
    const snapshotName = normalizeName(obra.cliente_nombre_snapshot || obra.cliente_nombre || "");
    return snapshotName && snapshotName === group.normalizedName;
  });

  const crmEstado = normalizeName(principal.estado_final);
  const isGanado = ["GANADO", "EXITO", "ÉXITO"].includes(crmEstado);
  const isPerdido = ["PERDIDO", "CAIDO", "CAÍDO"].includes(crmEstado);

  let controlStatus = CONTROL_STATUS.SIN_PROYECTO;
  if (confirmedProjects.length > 0) {
    controlStatus = CONTROL_STATUS.ACTIVO;
  } else if (suggestionProjects.length > 0 || isGanado) {
    controlStatus = CONTROL_STATUS.PENDIENTE;
  } else if (isPerdido) {
    controlStatus = CONTROL_STATUS.INACTIVO;
  }

  return {
    confirmedProjects,
    suggestionProjects,
    controlStatus
  };
}

function renderShell(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1>Clientes</h1>
          <p class="subtitle">Gestiona los clientes y sus proyectos activos</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center" id="clientes-kpis"></div>
      </div>
    </div>

    <div class="card">
      <div class="clientes-toolbar">
        <div class="search-input clientes-search">
          ${icons.search}
          <input type="text" id="clientes-search-input" placeholder="Buscar cliente..." value="${esc(searchDraft)}">
        </div>
        <select id="filtro-crm" class="clientes-select"></select>
        <select id="filtro-control" class="clientes-select"></select>
      </div>
      <div id="clientes-meta" class="clientes-meta"></div>
      <div id="clientes-list" class="clientes-list"></div>
      <div id="clientes-loadmore-wrap" class="clientes-loadmore-wrap"></div>
    </div>

    ${renderCreateProjectModal()}
  `;
}

function renderControls(container) {
  const activos = groupedClientes.filter((item) => item.controlStatus === CONTROL_STATUS.ACTIVO).length;
  const total = groupedClientes.length;

  const kpiEl = container.querySelector("#clientes-kpis");
  if (kpiEl) {
    kpiEl.innerHTML = `
      <span class="badge badge-control-activo">${activos} activos</span>
      <span class="badge" style="background:var(--fondo);color:var(--texto-sec)">${total} total</span>
    `;
  }

  const crmSelect = container.querySelector("#filtro-crm");
  if (crmSelect) {
    const options = buildCrmFilterOptions();
    crmSelect.innerHTML = options
      .map((option) => `<option value="${esc(option.value)}" ${option.value === filterCrm ? "selected" : ""}>${esc(option.label)}</option>`)
      .join("");
  }

  const controlSelect = container.querySelector("#filtro-control");
  if (controlSelect) {
    const controlOptions = [
      { value: "todos", label: "Todos" },
      { value: CONTROL_STATUS.ACTIVO, label: "Activos" },
      { value: CONTROL_STATUS.SIN_PROYECTO, label: "Sin proyecto" },
      { value: CONTROL_STATUS.PENDIENTE, label: "Pendiente de vinculación" },
      { value: CONTROL_STATUS.INACTIVO, label: "Inactivos" }
    ];
    controlSelect.innerHTML = controlOptions
      .map((option) => `<option value="${esc(option.value)}" ${option.value === filterControl ? "selected" : ""}>${esc(option.label)}</option>`)
      .join("");
  }
}

function buildCrmFilterOptions() {
  const values = new Set();
  for (const item of groupedClientes) {
    if (item.crmStatus && item.crmStatus !== "-") values.add(item.crmStatus);
  }
  const dynamic = [...values].sort((a, b) => a.localeCompare(b, "es"));
  return [{ value: "todos", label: "Todos" }, ...dynamic.map((value) => ({ value, label: value }))];
}

function getFilteredGroups() {
  const search = normalizeName(searchApplied);
  return groupedClientes.filter((item) => {
    if (filterCrm !== "todos" && item.crmStatus !== filterCrm) return false;
    if (filterControl !== "todos" && item.controlStatus !== filterControl) return false;
    if (!search) return true;

    const haystack = [
      item.nombre,
      item.principal.telefono,
      item.principal.propietario,
      item.principal.embudo,
      item.principal.etapa,
      item.principal.productos,
      item.principal.producto,
      item.principal.estado_final
    ]
      .map((value) => normalizeName(value))
      .join(" ");

    return haystack.includes(search);
  });
}

function renderList(container) {
  const filtered = getFilteredGroups();
  const list = filtered.slice(0, visibleCount);
  const listEl = container.querySelector("#clientes-list");
  const meta = container.querySelector("#clientes-meta");
  const loadMoreWrap = container.querySelector("#clientes-loadmore-wrap");

  if (!listEl || !meta || !loadMoreWrap) return;

  meta.textContent = `Mostrando ${list.length} de ${filtered.length} clientes`;

  if (isLoading || isFiltering) {
    listEl.innerHTML = renderListSkeleton(6);
    loadMoreWrap.innerHTML = "";
    return;
  }

  if (!list.length) {
    listEl.innerHTML = renderEmpty("Sin clientes para los filtros seleccionados", "Ajusta filtros o búsqueda.");
    loadMoreWrap.innerHTML = "";
    return;
  }

  listEl.innerHTML = list.map((item) => renderClienteRow(item)).join("");
  if (visibleCount < filtered.length) {
    loadMoreWrap.innerHTML = `<button class="btn btn-ghost" id="btn-clientes-load-more" type="button">Cargar más</button>`;
  } else {
    loadMoreWrap.innerHTML = "";
  }
}

function renderClienteRow(item) {
  const p = item.principal || {};
  const isOpen = openClienteKeys.has(item.key);
  const isOpening = loadingAccordionKeys.has(item.key);

  return `
    <article class="cliente-row-card ${isOpen ? "is-open" : ""}" data-cliente-key="${esc(item.key)}">
      <div class="cliente-row-main">
        <div class="cliente-row-left">
          <h3>${esc(showValue(item.nombre))}</h3>
          <p><strong>Teléfono:</strong> ${esc(formatPhone(p.telefono))}</p>
          <p><strong>Propietario:</strong> ${esc(showValue(p.propietario))}</p>
          <p><strong>Embudo / etapa:</strong> ${esc(showValue(p.embudo))} · ${esc(showValue(p.etapa))}</p>
        </div>
        <div class="cliente-row-right">
          <div class="cliente-row-commercial">
            <p><strong>Producto(s):</strong> ${esc(showValue(p.productos || p.producto))}</p>
            <p><strong>Valor:</strong> ${esc(formatMoney(p.valor, p.moneda))}</p>
            <p><strong>Estado final:</strong> ${esc(showValue(p.estado_final))}</p>
          </div>
          <div class="cliente-row-meta">
            <div class="cliente-row-meta-text">
              ${renderControlBadge(item.controlStatus)}
              <small>Creado: ${esc(formatDate(p.creado) || "-")}</small>
            </div>
            <button class="btn btn-ghost btn-sm" type="button" data-action="toggle" data-key="${esc(item.key)}">
              ${isOpen ? "Ocultar proyectos" : "Ver proyectos"}
            </button>
          </div>
        </div>
      </div>
      <div class="cliente-row-accordion ${isOpen ? "is-open" : ""}">
        <div class="cliente-row-accordion-inner">
          ${isOpening ? renderListSkeleton(2) : renderAccordionContent(item)}
        </div>
      </div>
    </article>
  `;
}

function renderAccordionContent(item) {
  const related = item.confirmedProjects || [];
  const suggestions = item.suggestionProjects || [];
  const principal = item.principal || {};
  const primaryLeadId = String(principal.id_cliente_externo || "");

  if (!primaryLeadId) {
    return `<p class="modal-status">No se pudo identificar el cliente externo.</p>`;
  }

  const suggestionsHtml = suggestions.length
    ? `
      <div class="cliente-suggestions">
        ${suggestions
          .map(
            (project) => `
          <div class="cliente-suggestion-item">
            <span>Posible relación encontrada: <strong>${esc(project.nombre || "-")}</strong></span>
            <div>
              <button class="btn btn-ghost btn-sm" type="button" data-action="relacionar" data-lead-id="${esc(primaryLeadId)}" data-project-id="${esc(project.id)}">
                Relacionar
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="rechazar" data-lead-id="${esc(primaryLeadId)}" data-project-id="${esc(project.id)}">
                No relacionar
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
    : "";

  if (!related.length) {
    return `
      ${suggestionsHtml}
      <div class="cliente-empty-projects">
        <p>Sin proyectos creados</p>
        <button class="btn btn-primary btn-sm" type="button" data-action="crear-proyecto" data-key="${esc(item.key)}">
          ${icons.plus} Crear proyecto
        </button>
      </div>
    `;
  }

  return `
    ${suggestionsHtml}
    <div class="cliente-projects-head">
      <strong>Proyectos relacionados</strong>
    </div>
    <div class="cliente-projects-list">
      ${related
        .map(
          (project) => `
        <article class="cliente-project-row">
          <div>
            <strong>${esc(showValue(project.nombre))}</strong>
            <p>${esc(showValue(project.responsable || "Sin líder"))} · ${esc(formatDate(project.fecha_fin_estimada) || "-")}</p>
          </div>
          <div class="cliente-project-actions">
            <span class="badge badge-control-neutral">${esc(formatProjectEstado(project.estado || "pendiente_de_planificacion"))}</span>
            <button class="btn btn-ghost btn-sm" type="button" data-action="ver-proyecto" data-project-id="${esc(project.id)}">
              Ver proyecto
            </button>
          </div>
        </article>
      `
        )
        .join("")}
      <div class="cliente-project-create-inline">
        <button class="btn btn-primary btn-sm" type="button" data-action="crear-proyecto" data-key="${esc(item.key)}">
          ${icons.plus} Crear proyecto
        </button>
      </div>
    </div>
  `;
}

function renderCreateProjectModal() {
  return `
    <div class="modal-overlay" id="modal-proyecto-cliente">
      <div class="modal-card" style="max-width:760px">
        <div class="modal-header">
          <h2>Crear proyecto</h2>
          <button class="btn-icon" id="close-modal-proyecto-cliente" type="button">${icons.close}</button>
        </div>
        <form id="form-proyecto-cliente">
          <input type="hidden" name="cliente_externo_id" id="cliente-external-id">
          <input type="hidden" name="cliente_nombre_snapshot" id="cliente-nombre-snapshot">
          <input type="hidden" name="cliente_telefono_snapshot" id="cliente-telefono-snapshot">
          <input type="hidden" name="etiquetas" id="cliente-etiquetas-json">
          <div class="form-grid">
            <div class="form-field full-width">
              <label>Nombre del proyecto *</label>
              <input name="nombre" id="proyecto-nombre-input" required>
            </div>
            <div class="form-field">
              <label>Líder del proyecto</label>
              <select name="lider_usuario_id" id="proyecto-lider-select"></select>
            </div>
            <div class="form-field">
              <label>Subir oferta *</label>
              <div class="file-upload-control">
                <input type="file" id="proyecto-oferta-input" class="file-upload-native" accept=".pdf,application/pdf" required>
                <label for="proyecto-oferta-input" class="file-upload-trigger">
                  <span id="proyecto-oferta-filename">Adjuntar oferta en PDF</span>
                  <span class="file-upload-icon" aria-hidden="true">${icons.upload}</span>
                </label>
              </div>
            </div>
            <div class="form-field">
              <label>Fecha de firma de ábaco</label>
              <input type="date" name="fecha_firma_abaco">
            </div>
            <div class="form-field full-width">
              <label>Observaciones</label>
              <textarea name="observaciones" rows="3"></textarea>
            </div>
            <div class="form-field full-width">
              <label>Etiquetas</label>
              <div class="tags-editor">
                <input type="text" id="tag-name-input" placeholder="Nombre de etiqueta">
                <input type="color" id="tag-color-input" class="tag-color-input-native" value="#8a0fa8" aria-label="Color de etiqueta">
                <button class="tag-color-trigger" type="button" id="btn-tag-color-trigger" aria-label="Seleccionar color">
                  <span class="tag-color-trigger-dot" id="tag-color-trigger-dot" style="--tag-selected-color:#8a0fa8"></span>
                </button>
                <button class="btn btn-ghost btn-sm" type="button" id="btn-add-tag">Agregar</button>
              </div>
              <div id="tags-preview" class="tags-preview"></div>
            </div>
          </div>
          <div class="modal-status" id="modal-status-proyecto-cliente"></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" id="cancel-modal-proyecto-cliente">Cancelar</button>
            <button class="btn btn-primary" type="submit" id="btn-submit-proyecto">Crear proyecto</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindEvents(container) {
  const searchInput = container.querySelector("#clientes-search-input");
  const crmSelect = container.querySelector("#filtro-crm");
  const controlSelect = container.querySelector("#filtro-control");
  const listEl = container.querySelector("#clientes-list");
  const loadMoreWrap = container.querySelector("#clientes-loadmore-wrap");
  const modal = container.querySelector("#modal-proyecto-cliente");
  const form = container.querySelector("#form-proyecto-cliente");
  const status = container.querySelector("#modal-status-proyecto-cliente");
  const submitBtn = container.querySelector("#btn-submit-proyecto");
  const ofertaInput = form?.querySelector("#proyecto-oferta-input");
  const tagColorInput = form?.querySelector("#tag-color-input");
  let currentModalClientKey = "";

  searchInput?.addEventListener("input", (event) => {
    searchDraft = event.target.value;
    if (debounceTimer) clearTimeout(debounceTimer);
    isFiltering = true;
    renderList(container);
    debounceTimer = setTimeout(() => {
      searchApplied = searchDraft;
      visibleCount = PAGE_SIZE;
      isFiltering = false;
      renderList(container);
    }, SEARCH_DEBOUNCE_MS);
  });

  crmSelect?.addEventListener("change", (event) => {
    filterCrm = event.target.value;
    visibleCount = PAGE_SIZE;
    isFiltering = true;
    renderList(container);
    setTimeout(() => {
      isFiltering = false;
      renderList(container);
    }, 180);
  });

  controlSelect?.addEventListener("change", (event) => {
    filterControl = event.target.value;
    visibleCount = PAGE_SIZE;
    isFiltering = true;
    renderList(container);
    setTimeout(() => {
      isFiltering = false;
      renderList(container);
    }, 180);
  });

  listEl?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "toggle") {
      const key = String(button.dataset.key || "");
      if (openClienteKeys.has(key)) {
        openClienteKeys.delete(key);
        renderList(container);
        return;
      }

      loadingAccordionKeys.add(key);
      openClienteKeys.add(key);
      renderList(container);
      setTimeout(() => {
        loadingAccordionKeys.delete(key);
        renderList(container);
      }, 200);
      return;
    }

    if (action === "crear-proyecto") {
      const key = String(button.dataset.key || "");
      const item = groupedClientes.find((group) => group.key === key);
      if (!item) return;
      currentModalClientKey = key;
      openProjectModal(modal, form, status, item);
      renderLeaderOptions(form);
      renderTagsPreview(form, currentModalClientKey);
      return;
    }

    if (action === "ver-proyecto") {
      navigate("/proyectos");
      return;
    }

    if (action === "relacionar" || action === "rechazar") {
      const leadId = String(button.dataset.leadId || "");
      const projectId = String(button.dataset.projectId || "");
      if (!leadId || !projectId) return;

      const item = groupedClientes.find((group) => group.leadIds.has(leadId));
      const payload = {
        proyecto_id: projectId,
        estado_relacion: action === "relacionar" ? "confirmado" : "rechazado",
        cliente_nombre_normalizado: item?.normalizedName || null,
        cliente_nombre_snapshot: item?.nombre || null,
        cliente_telefono_snapshot: item?.principal?.telefono || null
      };

      try {
        await apiPost(`/clientes/${encodeURIComponent(leadId)}/relaciones`, payload);
        await refreshData(container);
      } catch (error) {
        alert(error.message);
      }
    }
  });

  loadMoreWrap?.addEventListener("click", (event) => {
    if (!event.target.closest("#btn-clientes-load-more")) return;
    visibleCount += PAGE_SIZE;
    renderList(container);
  });

  container.querySelector("#close-modal-proyecto-cliente")?.addEventListener("click", () => {
    modal?.classList.remove("open");
    editingTagIndex = null;
  });

  container.querySelector("#cancel-modal-proyecto-cliente")?.addEventListener("click", () => {
    modal?.classList.remove("open");
    editingTagIndex = null;
  });

  ofertaInput?.addEventListener("change", () => {
    updateOfferFileLabel(form);
  });

  form?.querySelector("#btn-tag-color-trigger")?.addEventListener("click", () => {
    tagColorInput?.click();
  });

  tagColorInput?.addEventListener("input", () => {
    syncTagColorTrigger(form);
  });

  form?.querySelector("#btn-add-tag")?.addEventListener("click", () => {
    const nameInput = form.querySelector("#tag-name-input");
    const colorInput = form.querySelector("#tag-color-input");
    const name = String(nameInput?.value || "").trim();
    const color = String(colorInput?.value || "#8a0fa8");
    if (!name || !currentModalClientKey) return;

    const current = tagsDraftByClient.get(currentModalClientKey) || [];
    current.push({ nombre: name, color });
    tagsDraftByClient.set(currentModalClientKey, current);
    editingTagIndex = null;
    if (nameInput) nameInput.value = "";
    renderTagsPreview(form, currentModalClientKey);
  });

  form?.addEventListener("click", (event) => {
    const target = event.target;
    const actionBtn = target.closest(
      "[data-remove-tag],[data-edit-tag-open],[data-edit-tag-cancel],[data-edit-tag-save],[data-tag-edit-color-open]"
    );

    if (!actionBtn) {
      if (
        editingTagIndex !== null &&
        !target.closest("[data-tag-edit-popover]")
      ) {
        editingTagIndex = null;
        renderTagsPreview(form, currentModalClientKey);
      }
      return;
    }

    const openBtn = actionBtn.closest("[data-edit-tag-open]");
    if (openBtn && currentModalClientKey) {
      editingTagIndex = Number(openBtn.dataset.editTagOpen);
      renderTagsPreview(form, currentModalClientKey);
      return;
    }

    const cancelBtn = actionBtn.closest("[data-edit-tag-cancel]");
    if (cancelBtn && currentModalClientKey) {
      editingTagIndex = null;
      renderTagsPreview(form, currentModalClientKey);
      return;
    }

    const editColorBtn = actionBtn.closest("[data-tag-edit-color-open]");
    if (editColorBtn) {
      const popover = editColorBtn.closest("[data-tag-edit-popover]");
      popover?.querySelector("[data-tag-edit-color-input]")?.click();
      return;
    }

    const saveBtn = actionBtn.closest("[data-edit-tag-save]");
    if (saveBtn && currentModalClientKey) {
      const idx = Number(saveBtn.dataset.editTagSave);
      const popover = saveBtn.closest("[data-tag-edit-popover]");
      const name = String(popover?.querySelector("[data-tag-edit-name]")?.value || "").trim();
      const color = String(popover?.querySelector("[data-tag-edit-color-input]")?.value || "#8a0fa8");
      if (!name) return;
      const current = tagsDraftByClient.get(currentModalClientKey) || [];
      if (!current[idx]) return;
      current[idx] = { nombre: name, color };
      tagsDraftByClient.set(currentModalClientKey, current);
      editingTagIndex = null;
      renderTagsPreview(form, currentModalClientKey);
      return;
    }

    const removeBtn = event.target.closest("[data-remove-tag]");
    if (!removeBtn || !currentModalClientKey) return;
    const idx = Number(removeBtn.dataset.removeTag);
    const current = tagsDraftByClient.get(currentModalClientKey) || [];
    current.splice(idx, 1);
    tagsDraftByClient.set(currentModalClientKey, current);
    editingTagIndex = null;
    renderTagsPreview(form, currentModalClientKey);
  });

  form?.addEventListener("input", (event) => {
    if (!event.target.matches("[data-tag-edit-color-input]")) return;
    const popover = event.target.closest("[data-tag-edit-popover]");
    const dot = popover?.querySelector("[data-tag-edit-color-dot]");
    if (dot) dot.style.setProperty("--tag-selected-color", event.target.value || "#8a0fa8");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const clienteExternoId = String(form.querySelector("#cliente-external-id")?.value || "");
    const ofertaFile = form.querySelector("#proyecto-oferta-input")?.files?.[0];

    if (!clienteExternoId) return;
    if (!ofertaFile) {
      if (status) status.textContent = "Debes subir la oferta para crear el proyecto.";
      return;
    }

    const payload = Object.fromEntries(new FormData(form));
    payload.estado = "pendiente_de_planificacion";
    payload.etiquetas = JSON.stringify(tagsDraftByClient.get(currentModalClientKey) || []);

    isSavingProject = true;
    if (submitBtn) {
      submitBtn.textContent = "Creando proyecto...";
      submitBtn.disabled = true;
    }
    if (status) status.textContent = "Creando proyecto...";

    try {
      const created = await apiPost(`/clientes/${encodeURIComponent(clienteExternoId)}/proyectos`, payload);
      isUploadingOffer = true;
      if (status) status.textContent = "Subiendo oferta...";
      await uploadOfertaDocumento(created.id, ofertaFile);
      isUploadingOffer = false;
      if (status) status.textContent = "";
      modal?.classList.remove("open");
      await refreshData(container);
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      isSavingProject = false;
      isUploadingOffer = false;
      if (submitBtn) {
        submitBtn.textContent = "Crear proyecto";
        submitBtn.disabled = false;
      }
    }
  });
}

function openProjectModal(modal, form, status, item) {
  const lead = item?.principal;
  if (!lead || !form) return;

  form.reset();
  editingTagIndex = null;
  if (status) status.textContent = "";
  form.querySelector("#cliente-external-id").value = String(lead.id_cliente_externo || "");
  form.querySelector("#cliente-nombre-snapshot").value = String(item.nombre || "");
  form.querySelector("#cliente-telefono-snapshot").value = String(lead.telefono || "");
  const suggestedName = `Proyecto - ${showValue(item.nombre)}`;
  form.querySelector("#proyecto-nombre-input").value = suggestedName === "Proyecto - -" ? "" : suggestedName;
  updateOfferFileLabel(form);
  syncTagColorTrigger(form);
  modal?.classList.add("open");
}

function renderLeaderOptions(form) {
  const select = form?.querySelector("#proyecto-lider-select");
  if (!select) return;
  const options = ['<option value="">Sin asignar</option>'].concat(
    activeUsers.map((user) => `<option value="${esc(user.id)}">${esc(user.display_name || user.username || "-")}</option>`)
  );
  select.innerHTML = options.join("");
}

function renderTagsPreview(form, clientKey) {
  const tags = tagsDraftByClient.get(clientKey) || [];
  const preview = form?.querySelector("#tags-preview");
  const hidden = form?.querySelector("#cliente-etiquetas-json");
  if (hidden) hidden.value = JSON.stringify(tags);
  if (!preview) return;

  preview.innerHTML = tags.length
    ? tags
        .map(
          (tag, idx) => `
      <div class="tag-chip-wrap">
        <span class="tag-chip" style="--tag-color:${esc(tag.color || "#8a0fa8")}">
          <span class="tag-chip-label">${esc(tag.nombre || "-")}</span>
          <button type="button" class="tag-chip-btn" data-edit-tag-open="${idx}" aria-label="Editar etiqueta">${icons.edit}</button>
          <button type="button" class="tag-chip-btn" data-remove-tag="${idx}" aria-label="Quitar etiqueta">×</button>
        </span>
        ${
          editingTagIndex === idx
            ? `
          <div class="tag-edit-popover" data-tag-edit-popover="${idx}">
            <label class="tag-edit-label">
              Nombre
              <input type="text" data-tag-edit-name value="${esc(tag.nombre || "")}">
            </label>
            <div class="tag-edit-color-row">
              <span>Color</span>
              <input type="color" data-tag-edit-color-input value="${esc(tag.color || "#8a0fa8")}">
              <button type="button" class="tag-color-trigger tag-color-trigger-sm" data-tag-edit-color-open aria-label="Seleccionar color">
                <span class="tag-color-trigger-dot" data-tag-edit-color-dot style="--tag-selected-color:${esc(tag.color || "#8a0fa8")}"></span>
              </button>
            </div>
            <div class="tag-edit-actions">
              <button class="btn btn-ghost btn-sm" type="button" data-edit-tag-cancel>Cancelar</button>
              <button class="btn btn-primary btn-sm" type="button" data-edit-tag-save="${idx}">Guardar</button>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `
        )
        .join("")
    : '<span style="font-size:12px;color:var(--muted)">Sin etiquetas</span>';
}

function updateOfferFileLabel(form) {
  const label = form?.querySelector("#proyecto-oferta-filename");
  const file = form?.querySelector("#proyecto-oferta-input")?.files?.[0];
  if (!label) return;
  label.textContent = file?.name ? file.name : "Adjuntar oferta en PDF";
}

function syncTagColorTrigger(form) {
  const input = form?.querySelector("#tag-color-input");
  const dot = form?.querySelector("#tag-color-trigger-dot");
  if (!dot) return;
  dot.style.setProperty("--tag-selected-color", input?.value || "#8a0fa8");
}

async function refreshData(container) {
  isLoading = true;
  renderList(container);
  await loadData();
  buildGroups();
  isLoading = false;
  renderControls(container);
  renderList(container);
}

function renderControlBadge(status) {
  if (status === CONTROL_STATUS.ACTIVO) return '<span class="badge badge-control-activo">Activo</span>';
  if (status === CONTROL_STATUS.PENDIENTE) return '<span class="badge badge-control-pendiente">Pendiente de vinculación</span>';
  if (status === CONTROL_STATUS.INACTIVO) return '<span class="badge badge-control-inactivo">Inactivo</span>';
  return '<span class="badge badge-control-sinproyecto">Sin proyecto</span>';
}

function normalizeName(value) {
  const text = showValue(value);
  if (text === "-") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function showValue(value) {
  if (value === undefined || value === null) return "-";
  const text = String(value).trim();
  if (!text) return "-";
  const lower = text.toLowerCase();
  if (lower === "null" || lower === "undefined") return "-";
  return text;
}

function toDateValue(value) {
  if (!value) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function uniqueProjects(projects) {
  const seen = new Set();
  const unique = [];
  for (const project of projects) {
    const id = String(project.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(project);
  }
  return unique;
}

function formatMoney(value, currency) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  const hasDecimals = Math.abs(number % 1) > 0 && Math.abs(number % 1) !== 0;
  const formatter = new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  });
  const formatted = formatter.format(number).replace(/,/g, ".");
  const curr = showValue(currency);
  return curr === "-" ? formatted : `${formatted} ${curr}`;
}

function formatPhone(value) {
  const raw = showValue(value);
  if (raw === "-") return "-";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("595") && digits.length >= 9) {
    const body = digits.slice(3);
    if (body.length >= 6) {
      const prefix = body.slice(0, 3);
      const rest = body.slice(3);
      return `+595 ${prefix} ${rest}`;
    }
    return `+595 ${body}`;
  }
  if (digits.startsWith("54") && digits.length > 6) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.startsWith("55") && digits.length > 6) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  return raw;
}

function formatProjectEstado(value) {
  const key = normalizeName(value).replace(/\s+/g, "_");
  if (key === "PENDIENTE_DE_PLANIFICACION") return "Pendiente de planificación";
  if (key === "EN_PROGRESO") return "En progreso";
  if (key === "PLANIFICADA") return "Planificada";
  if (key === "FINALIZADA") return "Finalizada";
  if (key === "CANCELADA") return "Cancelada";
  return showValue(value);
}

function renderPageSkeleton() {
  return `
    <section class="skeleton-view">
      <div class="skeleton-row">
        <div class="skeleton-block h-28 w-32"></div>
        <div class="skeleton-block h-28 w-20"></div>
      </div>
      <div class="skeleton-block h-88"></div>
      <div class="skeleton-grid cols-2">
        <div class="skeleton-block h-140"></div>
        <div class="skeleton-block h-140"></div>
      </div>
    </section>
  `;
}

function renderListSkeleton(rows = 4) {
  return Array.from({ length: rows })
    .map(
      () => `
    <div class="skeleton-block" style="height:110px;border-radius:12px"></div>
  `
    )
    .join("");
}

async function uploadOfertaDocumento(proyectoId, file) {
  const token = sessionStorage.getItem("controlObraToken");
  const form = new FormData();
  const loadingDetail = {
    source: "request",
    method: "POST",
    path: `/obras/${encodeURIComponent(proyectoId)}/documentos/oferta`
  };
  form.append("archivo", file);
  form.append("tipo_documento", "oferta_pdf");
  form.append("documento_asociado", "oferta");

  window.dispatchEvent(new CustomEvent("co:loading:start", { detail: loadingDetail }));
  const response = await fetch(`/api/admin/obras/${encodeURIComponent(proyectoId)}/documentos/oferta`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  }).finally(() => {
    window.dispatchEvent(new CustomEvent("co:loading:end", { detail: loadingDetail }));
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "No se pudo subir la oferta.");
  }
  return data;
}
