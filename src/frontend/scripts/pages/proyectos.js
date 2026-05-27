import { apiGet, apiPost, apiPatch } from "../api.js";
import { icons, esc, renderBadge, renderProgress, renderEmpty, formatDate } from "../ui.js";
import { setTopbarSection } from "../layout.js";

// Estado de la aplicación
let obras = [];
let searchTerm = "";
let currentView = "grid"; // Opciones: 'grid', 'list', 'kanban', 'gantt'
let activeProjectId = null; // ID del proyecto en "Pantalla 2" (Funcionalidad Específica)
let activeTab = null; // 'resumen', 'documentos', 'cronogramas', 'seguimientos'
let kanbanStages = [];
let kanbanStagesLoading = false;
let kanbanStagesError = "";
let kanbanStageMenuId = null;
let kanbanModal = null;
const documentosByProyecto = new Map();
const documentosLoadingByProyecto = new Map();
const documentosErrorByProyecto = new Map();
const documentosUiByProyecto = new Map();
const DOCUMENT_QUICK_BUCKETS = [
  { key: "oferta", label: "Oferta", tipo: "oferta_pdf" },
  { key: "abaco", label: "Ábaco", tipo: "abaco_lista" },
  { key: "lista_produccion", label: "Lista de producción", tipo: "lista_produccion", asociado: "lista_produccion" },
  { key: "seguimiento_fabrica", label: "Seguimiento fábrica", asociado: "seguimiento_fabrica" },
  { key: "seguimiento_obra", label: "Seguimiento obra", asociado: "seguimiento_obra" },
  { key: "otros", label: "Otros documentos", fallback: true }
];

export async function renderProyectos(container) {
  setTopbarSection("Proyectos");
  container.innerHTML = '<div class="loading">Cargando proyectos...</div>';

  try {
    obras = await apiGet("/obras").catch(() => []);
    renderMain(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

async function ensureKanbanStagesLoaded(container, force = false) {
  if ((kanbanStages.length && !force) || kanbanStagesLoading) return;
  kanbanStagesLoading = true;
  kanbanStagesError = "";
  renderMain(container);
  try {
    const stages = await apiGet("/kanban/etapas").catch(() => []);
    kanbanStages = Array.isArray(stages) ? stages : [];
  } catch (error) {
    kanbanStagesError = error.message || "No se pudieron cargar las etapas Kanban.";
  } finally {
    kanbanStagesLoading = false;
    renderMain(container);
  }
}

function renderMain(container) {
  // Si hay un proyecto activo y una pestaña seleccionada, mostramos la Vista 2 (Funcionalidad Específica)
  if (activeProjectId && activeTab) {
    return renderFuncionalidadEspecifica(container);
  }

  // De lo contrario, mostramos la Vista 1 (Listado de Proyectos)
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <div class="eyebrow">PORTAFOLIO</div>
          <h1>Proyectos</h1>
          <p class="subtitle">Gestión integral de obras y seguimiento</p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <div class="view-toggles" style="display: flex; background: var(--bg-alt); padding: 4px; border-radius: 8px;">
            <button class="btn btn-ghost btn-sm ${currentView === 'list' ? 'active' : ''}" data-view="list" title="Vista Lista (Popover)">${icons.list}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'grid' ? 'active' : ''}" data-view="grid" title="Vista Tarjetas (Acordeón)">${icons.grid}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'kanban' ? 'active' : ''}" data-view="kanban" title="Vista Kanban">${icons.kanban}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'gantt' ? 'active' : ''}" data-view="gantt" title="Vista Gantt Global">${icons.gantt_global}</button>
          </div>
        </div>
      </div>
      <div class="search-input" style="max-width: 300px; margin-top: 1rem;">
        ${icons.search}
        <input type="text" placeholder="Buscar proyecto..." id="search-proyectos" value="${esc(searchTerm)}">
      </div>
    </div>

    <div id="proyectos-view-container" style="margin-top: 1.5rem;">
      <!-- Aquí se inyectará la vista seleccionada -->
    </div>
  `;

  const viewContainer = container.querySelector("#proyectos-view-container");
  
  if (obras.length === 0 && !searchTerm) {
    viewContainer.innerHTML = renderEmpty("No hay proyectos cargados", "Crea proyectos desde Clientes.");
  } else {
    // Renderizamos la vista actual
    if (currentView === "grid") viewContainer.innerHTML = renderGridView();
    else if (currentView === "list") viewContainer.innerHTML = renderListView();
    else if (currentView === "kanban") viewContainer.innerHTML = renderKanbanView();
    else if (currentView === "gantt") viewContainer.innerHTML = renderGanttView();
  }

  if (currentView === "kanban") {
    void ensureKanbanStagesLoaded(container);
  }

  bindMainEvents(container);
}

// ==================== VISTAS PRINCIPALES ====================

function renderGridView() {
  const filtered = filterObras();
  return `
    <style>
      .accordion-card { border: 1px solid var(--border); border-radius: 12px; background: var(--card-bg); overflow: hidden; }
      .btn-module:hover { border-color: var(--primario) !important; background: var(--bg-alt) !important; transform: translateY(-2px); }
    </style>
    <div style="display: grid; gap: 1.5rem; grid-template-columns: 1fr;">
      ${filtered.map(o => `
        <div class="accordion-card" data-id="${o.id}">
          <div class="accordion-header" style="padding: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; flex-wrap: wrap;">
              <div style="min-width: 200px;">
                <h3 style="margin:0; font-size: 1.1rem; color: var(--fg)">${esc(o.nombre)}</h3>
                <p style="margin:0; font-size: 0.85rem; color: var(--muted)">Cliente: ${esc(o.cliente_nombre || "Sin cliente")}</p>
              </div>
              <div style="display:flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--muted); display: block;">Líder</span>
                  <span style="font-size: 0.85rem; font-weight: 500;">${esc(o.responsable || "No asignado")}</span>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--muted); display: block;">Fin Instalación</span>
                  <span style="font-size: 0.85rem; font-weight: 500;">${formatDate(o.fecha_fin_instalacion) || "-"}</span>
                </div>
                <div>${renderBadge(o.estado || "planificada")}</div>
                <div style="display:flex; align-items: center; gap: 0.5rem;" title="Semáforo del Proyecto">
                  <div style="width: 16px; height: 16px; border-radius: 50%; background: #6b7280; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);"></div>
                </div>
              </div>
            </div>
            <div class="accordion-icon" style="transition: transform 0.3s; color: var(--muted); margin-left: 1rem;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="accordion-body" style="display: none; padding: 1.5rem; border-top: 1px solid var(--border); background: var(--bg-alt);">
            <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem; margin-top: 0;">Módulos del Proyecto</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <button class="btn-module" data-module="resumen" data-id="${o.id}" style="padding: 1.25rem; text-align: left; cursor: pointer; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); transition: all 0.2s;">
                <h4 style="margin: 0; color: var(--primario);">Resumen</h4>
                <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--muted);">Dashboard y avance general</p>
              </button>
              <button class="btn-module" data-module="documentos" data-id="${o.id}" style="padding: 1.25rem; text-align: left; cursor: pointer; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); transition: all 0.2s;">
                <h4 style="margin: 0; color: var(--primario);">Documentos</h4>
                <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--muted);">Archivos y adjuntos</p>
              </button>
              <button class="btn-module" data-module="cronogramas" data-id="${o.id}" style="padding: 1.25rem; text-align: left; cursor: pointer; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); transition: all 0.2s;">
                <h4 style="margin: 0; color: var(--primario);">Cronogramas</h4>
                <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--muted);">Oferta, fechas e ítems</p>
              </button>
              <button class="btn-module" data-module="seguimientos" data-id="${o.id}" style="padding: 1.25rem; text-align: left; cursor: pointer; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); transition: all 0.2s;">
                <h4 style="margin: 0; color: var(--primario);">Seguimientos</h4>
                <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--muted);">Fábrica e instalación (Ábaco)</p>
              </button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderListView() {
  const filtered = filterObras();
  if (!filtered.length) {
    return renderEmpty("Sin proyectos para mostrar", "Ajusta la búsqueda o crea un nuevo proyecto.");
  }

  return `
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>Cliente</th>
              <th>Líder</th>
              <th>Fin Instalación</th>
              <th>Estado</th>
              <th>Semáforo</th>
              <th>Módulos</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(o => `
              <tr>
                <td><strong>${esc(o.nombre || "-")}</strong></td>
                <td>${esc(o.cliente_nombre || "Sin cliente")}</td>
                <td>${esc(o.responsable || "No asignado")}</td>
                <td>${esc(formatDate(o.fecha_fin_instalacion) || "-")}</td>
                <td>${renderBadge(o.estado || "planificada")}</td>
                <td>
                  <span class="status-dot dot-gray" title="Semáforo del proyecto"></span>
                </td>
                <td>
                  <details class="project-popover">
                    <summary class="btn btn-ghost btn-sm" style="list-style:none;">Ver</summary>
                    <div class="project-popover-menu">
                      <button class="btn-module" data-module="resumen" data-id="${o.id}" type="button">Resumen</button>
                      <button class="btn-module" data-module="documentos" data-id="${o.id}" type="button">Documentos</button>
                      <button class="btn-module" data-module="cronogramas" data-id="${o.id}" type="button">Cronogramas</button>
                      <button class="btn-module" data-module="seguimientos" data-id="${o.id}" type="button">Seguimientos</button>
                    </div>
                  </details>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderKanbanView() {
  if (kanbanStagesLoading) {
    return `<div class="loading">Cargando tablero Kanban...</div>`;
  }

  if (kanbanStagesError) {
    return `<div class="card"><p class="modal-status">${esc(kanbanStagesError)}</p></div>`;
  }

  if (!kanbanStages.length) {
    return `
      <div class="card">
        <div style="padding:1.25rem; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <p style="color:var(--muted);">No hay etapas Kanban configuradas.</p>
          <button class="btn btn-primary" type="button" data-kanban-action="add-stage">${icons.plus} Agregar etapa</button>
        </div>
      </div>
    `;
  }

  const filtered = filterObras();
  if (!filtered.length) {
    return `
      <div class="kanban-board">
        ${kanbanStages.map(stage => `
          <section class="kanban-column">
            <header class="kanban-column-header">
              <div class="kanban-column-title">
                <strong>${esc(stage.nombre)}</strong>
                <span class="badge">0</span>
              </div>
              ${renderKanbanStageMenu(stage)}
            </header>
            <div class="kanban-column-body" data-drop-stage="${esc(stage.id)}">
              <div class="kanban-empty">Sin proyectos</div>
            </div>
          </section>
        `).join("")}
        <button class="kanban-add-stage" type="button" data-kanban-action="add-stage">+ Agregar etapa</button>
      </div>
      ${renderKanbanModal()}
    `;
  }

  const grouped = {};
  for (const stage of kanbanStages) grouped[stage.id] = [];
  const fallbackStageId = kanbanStages[kanbanStages.length - 1]?.id || kanbanStages[0]?.id;

  for (const obra of filtered) {
    const stageId = resolveProjectStageId(obra, kanbanStages) || fallbackStageId;
    if (!grouped[stageId]) grouped[stageId] = [];
    grouped[stageId].push(obra);
  }

  return `
    <div class="kanban-board">
      ${kanbanStages.map(stage => `
        <section class="kanban-column">
          <header class="kanban-column-header">
            <div class="kanban-column-title">
              <strong>${esc(stage.nombre)}</strong>
              <span class="badge">${grouped[stage.id]?.length || 0}</span>
            </div>
            ${renderKanbanStageMenu(stage)}
          </header>
          <div class="kanban-column-body" data-drop-stage="${esc(stage.id)}">
            ${(grouped[stage.id] || []).length ? grouped[stage.id].map(o => `
              <article class="kanban-card" draggable="true" data-drag-project="${esc(o.id)}">
                <div class="kanban-card-top">
                  <h4>${esc(o.nombre || "-")}</h4>
                  ${renderSemaforoBadge(o.salud)}
                </div>
                <p><strong>Cliente:</strong> ${esc(o.cliente_nombre || "Sin cliente")}</p>
                <p><strong>Líder:</strong> ${esc(o.responsable || "No asignado")}</p>
                <p><strong>Fin instalación:</strong> ${esc(formatDate(o.fecha_fin_instalacion) || "-")}</p>
                <div class="kanban-card-actions">
                  <button class="btn btn-ghost btn-sm btn-module" data-module="resumen" data-id="${o.id}" type="button">Resumen</button>
                  <button class="btn btn-ghost btn-sm btn-module" data-module="documentos" data-id="${o.id}" type="button">Documentos</button>
                </div>
              </article>
            `).join("") : `<div class="kanban-empty">Sin proyectos</div>`}
          </div>
        </section>
      `).join("")}
      <button class="kanban-add-stage" type="button" data-kanban-action="add-stage">+ Agregar etapa</button>
    </div>
    ${renderKanbanModal()}
  `;
}

function renderGanttView() {
  return `<div style="padding: 2rem; text-align: center; color: var(--muted);">Vista Gantt Global en construcción...</div>`;
}

// ==================== VISTA FUNCIONALIDAD ESPECÍFICA ====================

function renderFuncionalidadEspecifica(container) {
  const o = obras.find(x => x.id == activeProjectId);
  if (!o) {
    activeProjectId = null;
    activeTab = null;
    return renderMain(container);
  }

  const titleMap = {
    resumen: "Resumen del Proyecto",
    documentos: "Documentos",
    cronogramas: "Cronogramas de Producción e Instalación",
    seguimientos: "Seguimiento de Fábrica y Obra"
  };

  container.innerHTML = `
    <div class="page-header" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
      <div class="page-header-row">
        <div>
          <button class="btn btn-ghost btn-sm" id="btn-volver" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; padding: 0;">
            ${icons.back} Volver al Listado
          </button>
          <div class="eyebrow">${esc(o.nombre)}</div>
          <h1>${titleMap[activeTab]}</h1>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary" id="btn-modificar-modulo">${icons.edit} Modificar</button>
          <button class="btn btn-danger" id="btn-eliminar-modulo">${icons.trash} Eliminar</button>
        </div>
      </div>
    </div>
    
    <div id="funcionalidad-content">
      ${renderContenidoModulo(activeTab, o)}
    </div>
  `;

  // Bind events for Funcionalidad Específica
  container.querySelector("#btn-volver").addEventListener("click", () => {
    activeProjectId = null;
    activeTab = null;
    renderMain(container);
  });

  container.querySelector("#btn-modificar-modulo").addEventListener("click", () => {
    alert("Modal: ¿Seguro que deseas modificar los datos de este módulo?");
  });

  container.querySelector("#btn-eliminar-modulo").addEventListener("click", () => {
    alert("Modal ROJO: ¿Seguro que deseas ELIMINAR este módulo? Acción irreversible.");
  });

  if (activeTab === "documentos") {
    bindDocumentosEvents(container, o);
    void ensureDocumentosLoaded(container, o.id);
  }
}

function renderContenidoModulo(tab, proyecto) {
  if (tab === "documentos") {
    return renderDocumentosModulo(proyecto);
  }

  if (tab === "cronogramas") {
    return `
      <div class="card">
        <div class="card-header"><h2>Gestión de Oferta y Cronograma</h2></div>
        <div style="padding: 1.5rem;">
          <p style="color:var(--muted); margin-bottom:1rem;">Carga aquí la Oferta (PDF) para extraer el total de aberturas y habilitar el desglose ítem por ítem para el Gantt del proyecto.</p>
          <div style="text-align:center; padding: 2rem; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer;">
            ${icons.plus}
            <p style="margin: 0.5rem 0 0;">Subir Archivo PDF (Oferta)</p>
          </div>
        </div>
      </div>
    `;
  }
  
  if (tab === "seguimientos") {
    return `
      <div class="card">
        <div class="card-header"><h2>Control de Avance (Ábaco)</h2></div>
        <div style="padding: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(234, 179, 8, 0.1); border-left: 4px solid var(--yellow); margin-bottom: 1.5rem; border-radius: 4px;">
            <div style="color: var(--yellow); font-size: 1.5rem;">⚠️</div>
            <div>
              <strong style="color: var(--fg); display:block;">Falta cargar el Ábaco</strong>
              <span style="font-size:0.85rem; color:var(--muted);">Sube el PDF o Excel de producción para compararlo con la oferta y habilitar el listado reordenable.</span>
            </div>
          </div>
          <button class="btn btn-primary">Subir Ábaco</button>
        </div>
      </div>
    `;
  }

  return `<div style="padding: 2rem; text-align: center; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">Contenido de ${tab} en construcción...</div>`;
}

async function ensureDocumentosLoaded(container, proyectoId, force = false) {
  const hasDocs = documentosByProyecto.has(proyectoId);
  if ((hasDocs && !force) || documentosLoadingByProyecto.get(proyectoId)) return;

  documentosLoadingByProyecto.set(proyectoId, true);
  renderFuncionalidadEspecifica(container);
  try {
    const docs = await apiGet(`/obras/${proyectoId}/documentos`).catch(() => []);
    documentosByProyecto.set(proyectoId, docs);
    documentosErrorByProyecto.delete(proyectoId);
  } catch (error) {
    documentosErrorByProyecto.set(proyectoId, error.message || "No se pudieron cargar los documentos.");
  } finally {
    documentosLoadingByProyecto.set(proyectoId, false);
    renderFuncionalidadEspecifica(container);
  }
}

function getDocumentosUiState(proyectoId) {
  if (!documentosUiByProyecto.has(proyectoId)) {
    documentosUiByProyecto.set(proyectoId, {
      currentSearchQuery: "",
      currentView: "list",
      selectedItemId: null,
      isPreviewPaneOpen: false,
      activePreviewTab: "info",
      quickFilter: "todos"
    });
  }
  return documentosUiByProyecto.get(proyectoId);
}

function renderDocumentosModulo(proyecto) {
  const state = getDocumentosUiState(proyecto.id);
  const isLoading = documentosLoadingByProyecto.get(proyecto.id);
  const error = documentosErrorByProyecto.get(proyecto.id);
  const docs = documentosByProyecto.get(proyecto.id) || [];
  const selectedDoc = docs.find(d => d.id === state.selectedItemId) || null;
  const visibleDocs = filterDocumentos(docs, state);

  if (state.selectedItemId && !selectedDoc) {
    state.selectedItemId = null;
    state.isPreviewPaneOpen = false;
  }

  return `
    <section class="docs-shell" id="docs-shell" data-proyecto-id="${esc(proyecto.id)}">
      <div class="docs-header">
        <div>
          <h2>Documentos del Proyecto</h2>
          <p>Gestiona ofertas, ábacos, listas de producción y archivos adjuntos.</p>
        </div>
        <div class="docs-toolbar">
          <label class="search-input docs-search">
            ${icons.search}
            <input id="docs-search-input" type="text" placeholder="Buscar documento..." value="${esc(state.currentSearchQuery)}">
          </label>
          <div class="docs-view-toggle">
            <button class="btn-icon ${state.currentView === "list" ? "is-active" : ""}" type="button" data-docs-view="list" title="Vista lista">${icons.list}</button>
            <button class="btn-icon ${state.currentView === "grid" ? "is-active" : ""}" type="button" data-docs-view="grid" title="Vista grilla">${icons.grid}</button>
          </div>
          <button class="btn btn-ghost" type="button" id="btn-docs-folder">${icons.folder} Nueva carpeta</button>
          <button class="btn btn-primary" type="button" id="btn-docs-upload">${icons.upload} Subir documento</button>
          <input id="docs-upload-input" type="file" hidden />
        </div>
      </div>

      <div class="docs-quick-access">
        ${renderQuickAccessCards(docs, state.quickFilter)}
      </div>

      ${error ? `<div class="card"><p class="modal-status">${esc(error)}</p></div>` : ""}
      ${isLoading ? '<div class="loading">Cargando documentos...</div>' : `
        <div class="docs-content">
          <div class="docs-file-area" id="docs-file-area">
            ${state.currentView === "list"
              ? renderDocumentosTabla(visibleDocs, state.selectedItemId)
              : renderDocumentosGrid(visibleDocs, state.selectedItemId)}
          </div>
          <div class="docs-preview-overlay ${state.isPreviewPaneOpen ? "open" : ""}" id="docs-preview-overlay"></div>
          <aside class="docs-preview-pane ${state.isPreviewPaneOpen ? "open" : ""}" id="docs-preview-pane">
            ${renderDocumentPreviewPane(selectedDoc, proyecto, state)}
          </aside>
        </div>
      `}
    </section>
  `;
}

function renderQuickAccessCards(docs, quickFilter) {
  return DOCUMENT_QUICK_BUCKETS.map(bucket => {
    const matching = docs.filter(doc => matchesQuickBucket(doc, bucket));
    const last = matching[0];
    const active = quickFilter === bucket.key ? "is-active" : "";
    const updated = last ? formatDocDate(last.actualizado_en || last.creado_en) : "-";
    const status = last ? formatEstadoDocumento(last.estado_procesamiento) : "Sin documentos";
    return `
      <button class="docs-quick-card ${active}" type="button" data-docs-quick="${bucket.key}">
        <div class="docs-quick-icon">${icons.file}</div>
        <div class="docs-quick-main">
          <strong>${bucket.label}</strong>
          <small>Última: ${updated}</small>
        </div>
        <div class="docs-quick-meta">
          <span class="badge">${matching.length}</span>
          <small>${status}</small>
        </div>
      </button>
    `;
  }).join("");
}

function renderDocumentosTabla(docs, selectedId) {
  if (!docs.length) {
    return renderEmpty("Sin documentos en esta vista", "Carga un documento o crea una carpeta para comenzar.");
  }

  return `
    <div class="card docs-table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Fecha modificada</th>
              <th>Tamaño</th>
              <th>Subido por</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${docs.map(doc => `
              <tr class="docs-row ${selectedId === doc.id ? "is-selected" : ""}" data-doc-select="${esc(doc.id)}">
                <td><div class="docs-name-cell">${icons.file}${esc(doc.nombre_archivo || "Sin nombre")}</div></td>
                <td>${esc(formatTipoDocumento(doc))}</td>
                <td>${esc(formatDocDate(doc.actualizado_en || doc.creado_en) || "-")}</td>
                <td>${esc(formatFileSize(doc))}</td>
                <td>${esc(doc.subido_por || "Sistema")}</td>
                <td>${renderBadge(doc.estado_procesamiento || "pendiente")}</td>
                <td>
                  <button class="btn-icon" type="button" title="Ver detalle" data-doc-action="ver" data-doc-id="${esc(doc.id)}">${icons.eye}</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDocumentosGrid(docs, selectedId) {
  if (!docs.length) {
    return renderEmpty("Sin documentos en esta vista", "Carga un documento o crea una carpeta para comenzar.");
  }
  return `
    <div class="docs-grid">
      ${docs.map(doc => `
        <article class="docs-grid-item ${selectedId === doc.id ? "is-selected" : ""}" data-doc-select="${esc(doc.id)}">
          <div class="docs-grid-icon">${icons.file}</div>
          <h4>${esc(doc.nombre_archivo || "Sin nombre")}</h4>
          <p>${esc(formatTipoDocumento(doc))}</p>
          <small>${esc(formatDocDate(doc.actualizado_en || doc.creado_en) || "-")}</small>
          <div>${renderBadge(doc.estado_procesamiento || "pendiente")}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDocumentPreviewPane(doc, proyecto, state) {
  if (!doc) {
    return `
      <div class="docs-preview-header">
        <h3>Detalle de archivo</h3>
      </div>
      <div class="empty-state">
        ${icons.file}
        <h3>Selecciona un documento</h3>
        <p>Haz click en una fila o tarjeta para abrir el panel lateral.</p>
      </div>
    `;
  }

  return `
    <div class="docs-preview-header">
      <h3>Detalle de archivo</h3>
      <button class="btn-icon" type="button" id="btn-doc-preview-close">${icons.close}</button>
    </div>
    <div class="docs-preview-tabs">
      <button class="tab ${state.activePreviewTab === "info" ? "active" : ""}" data-doc-preview-tab="info" type="button">Info</button>
      <button class="tab ${state.activePreviewTab === "preview" ? "active" : ""}" data-doc-preview-tab="preview" type="button">Vista previa</button>
      <button class="tab ${state.activePreviewTab === "datos" ? "active" : ""}" data-doc-preview-tab="datos" type="button">Datos</button>
    </div>
    <div class="docs-preview-content">
      ${state.activePreviewTab === "info" ? renderDocInfoTab(doc, proyecto) : ""}
      ${state.activePreviewTab === "preview" ? renderDocPreviewTab(doc) : ""}
      ${state.activePreviewTab === "datos" ? renderDocDatosTab(doc) : ""}
    </div>
  `;
}

function renderDocInfoTab(doc, proyecto) {
  return `
    <div class="docs-info-head">
      <div class="docs-info-icon">${icons.file}</div>
      <div>
        <strong>${esc(doc.nombre_archivo || "Sin nombre")}</strong>
        <p>${esc(formatTipoDocumento(doc))}</p>
      </div>
    </div>
    <ul class="docs-info-list">
      <li><span>Tipo</span><strong>${esc(formatTipoDocumento(doc))}</strong></li>
      <li><span>Tamaño</span><strong>${esc(formatFileSize(doc))}</strong></li>
      <li><span>Proyecto</span><strong>${esc(proyecto.nombre)}</strong></li>
      <li><span>Asociado a</span><strong>${esc(formatDocumentoAsociado(doc))}</strong></li>
      <li><span>Subido por</span><strong>${esc(doc.subido_por || "Sistema")}</strong></li>
      <li><span>Fecha creación</span><strong>${esc(formatDocDate(doc.creado_en) || "-")}</strong></li>
      <li><span>Fecha modificación</span><strong>${esc(formatDocDate(doc.actualizado_en || doc.creado_en) || "-")}</strong></li>
      <li><span>Estado</span><strong>${esc(formatEstadoDocumento(doc.estado_procesamiento))}</strong></li>
    </ul>
  `;
}

function renderDocPreviewTab(doc) {
  const mime = String(doc.mime_type || "").toLowerCase();
  if (mime.startsWith("image/")) {
    return `<p>No hay URL de imagen persistida en el servidor para esta vista previa.</p>`;
  }
  if (mime.includes("pdf")) {
    return `<p>Vista previa PDF disponible.</p>`;
  }
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) {
    return `<p>Archivo Excel cargado.</p>`;
  }
  return `<p>No hay vista previa disponible para este tipo de archivo.</p>`;
}

function renderDocDatosTab(doc) {
  const data = doc.datos_extraidos || {};
  return `<pre class="docs-json">${esc(JSON.stringify(data, null, 2) || "{}")}</pre>`;
}

function bindDocumentosEvents(container, proyecto) {
  const state = getDocumentosUiState(proyecto.id);
  const shell = container.querySelector("#docs-shell");
  if (!shell) return;

  shell.querySelector("#docs-search-input")?.addEventListener("input", event => {
    state.currentSearchQuery = event.target.value || "";
    renderFuncionalidadEspecifica(container);
  });

  shell.querySelectorAll("[data-docs-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentView = btn.dataset.docsView;
      renderFuncionalidadEspecifica(container);
    });
  });

  shell.querySelectorAll("[data-docs-quick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.docsQuick;
      state.quickFilter = state.quickFilter === key ? "todos" : key;
      renderFuncionalidadEspecifica(container);
    });
  });

  const uploadInput = shell.querySelector("#docs-upload-input");
  shell.querySelector("#btn-docs-upload")?.addEventListener("click", () => uploadInput?.click());

  uploadInput?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const token = sessionStorage.getItem("controlObraToken");
    const form = new FormData();
    form.append("archivo", file);
    form.append("tipo_documento", inferTipoDocumento(file));
    form.append("documento_asociado", inferDocumentoAsociado(file, state.quickFilter));
    try {
      const res = await fetch(`/api/admin/obras/${proyecto.id}/documentos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir el documento.");
      await ensureDocumentosLoaded(container, proyecto.id, true);
    } catch (error) {
      alert(error.message);
    } finally {
      uploadInput.value = "";
    }
  });

  shell.querySelector("#btn-docs-folder")?.addEventListener("click", async () => {
    const nombre = window.prompt("Nombre de la carpeta");
    if (!nombre) return;
    try {
      await apiPost(`/obras/${proyecto.id}/documentos/carpeta`, { nombre });
      await ensureDocumentosLoaded(container, proyecto.id, true);
    } catch (error) {
      alert(error.message);
    }
  });

  shell.querySelector("#docs-file-area")?.addEventListener("click", event => {
    const targetDoc = event.target.closest("[data-doc-select]");
    if (targetDoc) {
      state.selectedItemId = targetDoc.dataset.docSelect;
      state.isPreviewPaneOpen = true;
      renderFuncionalidadEspecifica(container);
      return;
    }

    const actionDoc = event.target.closest("[data-doc-action='ver']");
    if (actionDoc) {
      state.selectedItemId = actionDoc.dataset.docId;
      state.isPreviewPaneOpen = true;
      renderFuncionalidadEspecifica(container);
    }
  });

  shell.querySelector("#btn-doc-preview-close")?.addEventListener("click", () => {
    state.isPreviewPaneOpen = false;
    state.selectedItemId = null;
    renderFuncionalidadEspecifica(container);
  });

  shell.querySelector("#docs-preview-overlay")?.addEventListener("click", () => {
    state.isPreviewPaneOpen = false;
    if (!state.selectedItemId) state.activePreviewTab = "info";
    renderFuncionalidadEspecifica(container);
  });

  shell.querySelectorAll("[data-doc-preview-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activePreviewTab = btn.dataset.docPreviewTab;
      renderFuncionalidadEspecifica(container);
    });
  });
}

function inferTipoDocumento(file) {
  const name = String(file.name || "").toLowerCase();
  if (name.includes("oferta")) return "oferta_pdf";
  if (name.includes("abaco") || name.includes("ábaco")) return "abaco_lista";
  if (name.includes("produccion") || name.includes("producción")) return "lista_produccion";
  return "otro";
}

function inferDocumentoAsociado(file, quickFilter) {
  if (quickFilter && quickFilter !== "todos" && quickFilter !== "otros") return quickFilter;
  const name = String(file.name || "").toLowerCase();
  if (name.includes("oferta")) return "oferta";
  if (name.includes("abaco") || name.includes("ábaco")) return "abaco";
  if (name.includes("fabrica") || name.includes("fábrica")) return "seguimiento_fabrica";
  if (name.includes("obra")) return "seguimiento_obra";
  return "otro";
}

function matchesQuickBucket(doc, bucket) {
  if (bucket.tipo && doc.tipo_documento === bucket.tipo) return true;
  const asociado = (doc.documento_asociado || doc.datos_extraidos?.documento_asociado || "otro").toLowerCase();
  if (bucket.asociado && asociado === bucket.asociado) return true;
  if (bucket.key === "abaco" && asociado === "abaco") return true;
  if (bucket.key === "oferta" && asociado === "oferta") return true;
  if (bucket.key === "lista_produccion" && asociado === "lista_produccion") return true;
  if (bucket.fallback) {
    return !["oferta", "abaco", "lista_produccion", "seguimiento_fabrica", "seguimiento_obra"].includes(asociado);
  }
  return false;
}

function filterDocumentos(docs, state) {
  return docs.filter(doc => {
    if (state.quickFilter !== "todos") {
      const bucket = DOCUMENT_QUICK_BUCKETS.find(item => item.key === state.quickFilter) || { key: state.quickFilter };
      if (!matchesQuickBucket(doc, bucket)) return false;
    }
    const query = state.currentSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      doc.nombre_archivo,
      doc.tipo_documento,
      doc.mime_type,
      doc.subido_por,
      doc.documento_asociado
    ].some(v => String(v || "").toLowerCase().includes(query));
  });
}

function formatTipoDocumento(doc) {
  const map = {
    carpeta: "Carpeta",
    oferta_pdf: "Oferta PDF",
    abaco_lista: "Ábaco",
    lista_produccion: "Lista producción",
    seguimiento_fabrica: "Seguimiento fábrica",
    seguimiento_obra: "Seguimiento obra",
    otro: "Otro"
  };
  return map[String(doc.tipo_documento || "").toLowerCase()] || "Documento";
}

function formatDocumentoAsociado(doc) {
  const value = String(doc.documento_asociado || doc.datos_extraidos?.documento_asociado || "otro").toLowerCase();
  const map = {
    oferta: "Oferta",
    abaco: "Ábaco",
    lista_produccion: "Lista de producción",
    seguimiento_fabrica: "Seguimiento fábrica",
    seguimiento_obra: "Seguimiento obra",
    otro: "Otro"
  };
  return map[value] || "Otro";
}

function formatEstadoDocumento(estado) {
  const map = {
    pendiente: "Pendiente",
    procesado: "Procesado",
    error: "Error"
  };
  return map[String(estado || "").toLowerCase()] || "Pendiente";
}

function formatFileSize(doc) {
  const size = Number(doc.size_bytes || doc.datos_extraidos?.size_bytes || 0);
  if (!size) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatDocDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function renderKanbanStageMenu(stage) {
  const isOpen = kanbanStageMenuId === stage.id;
  return `
    <div class="kanban-stage-menu-wrap">
      <button class="btn-icon kanban-stage-options-btn" type="button" data-kanban-action="toggle-stage-menu" data-stage-id="${esc(stage.id)}" title="Opciones de etapa">${icons.more}</button>
      ${isOpen ? `
        <div class="kanban-stage-menu">
          <button type="button" data-kanban-action="rename-stage" data-stage-id="${esc(stage.id)}">Renombrar etapa</button>
          <button type="button" class="is-danger" data-kanban-action="delete-stage" data-stage-id="${esc(stage.id)}">Eliminar etapa</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderKanbanModal() {
  if (!kanbanModal) return "";
  if (kanbanModal.type === "add-stage") {
    return `
      <div class="modal-overlay open" id="kanban-modal">
        <div class="modal-card" style="max-width:480px">
          <div class="modal-header">
            <h2>Nueva etapa</h2>
            <button class="btn-icon" type="button" data-kanban-action="close-modal">${icons.close}</button>
          </div>
          <div class="form-field">
            <label>Nombre de la etapa</label>
            <input id="kanban-stage-name" type="text" value="" placeholder="Ej: Validación final">
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" data-kanban-action="close-modal">Cancelar</button>
            <button class="btn btn-primary" type="button" data-kanban-action="confirm-add-stage">Crear etapa</button>
          </div>
        </div>
      </div>
    `;
  }

  if (kanbanModal.type === "rename-stage") {
    return `
      <div class="modal-overlay open" id="kanban-modal">
        <div class="modal-card" style="max-width:480px">
          <div class="modal-header">
            <h2>Renombrar etapa</h2>
            <button class="btn-icon" type="button" data-kanban-action="close-modal">${icons.close}</button>
          </div>
          <div class="form-field">
            <label>Nombre de la etapa</label>
            <input id="kanban-stage-name" type="text" value="${esc(kanbanModal.currentName || "")}">
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" data-kanban-action="close-modal">Cancelar</button>
            <button class="btn btn-primary" type="button" data-kanban-action="confirm-rename-stage" data-stage-id="${esc(kanbanModal.stageId)}">Guardar</button>
          </div>
        </div>
      </div>
    `;
  }

  if (kanbanModal.type === "delete-stage") {
    const stage = kanbanStages.find(s => s.id === kanbanModal.stageId);
    const stageProjectsCount = countProjectsInStage(kanbanModal.stageId);
    const stageOrder = stage?.orden ?? 0;
    const sorted = [...kanbanStages].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const previous = [...sorted].reverse().find(s => s.id !== stage?.id && (s.orden || 0) < stageOrder);
    const next = sorted.find(s => s.id !== stage?.id && (s.orden || 0) > stageOrder);
    const reassignedTo = previous || next || null;

    return `
      <div class="modal-overlay open" id="kanban-modal">
        <div class="modal-card" style="max-width:520px">
          <div class="modal-header">
            <h2>Eliminar etapa</h2>
            <button class="btn-icon" type="button" data-kanban-action="close-modal">${icons.close}</button>
          </div>
          <p>¿Seguro que querés eliminar esta etapa?</p>
          <p style="margin-top:8px; color:var(--muted)">Esta acción no se puede deshacer.</p>
          ${stageProjectsCount > 0 ? `
            <p style="margin-top:10px; color:var(--texto-sec)">Esta etapa contiene proyectos. Si la eliminás, los proyectos se reasignarán automáticamente a <strong>${esc(reassignedTo?.nombre || "otra etapa")}</strong>.</p>
          ` : ""}
          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" data-kanban-action="close-modal">Cancelar</button>
            <button class="btn btn-danger" type="button" data-kanban-action="confirm-delete-stage" data-stage-id="${esc(kanbanModal.stageId)}">Eliminar</button>
          </div>
        </div>
      </div>
    `;
  }

  return "";
}

function renderSemaforoBadge(salud) {
  const key = String(salud || "").toLowerCase();
  if (key === "buena") return '<span class="badge badge-completado">En plazo</span>';
  if (key === "observacion" || key === "riesgo") return '<span class="badge badge-observacion">Atención</span>';
  if (key === "critica") return '<span class="badge badge-critica">Crítico</span>';
  return '<span class="badge badge-inactivo">Sin datos</span>';
}

function resolveProjectStageId(obra, stages) {
  if (obra.etapa_kanban_id && stages.some(s => s.id === obra.etapa_kanban_id)) {
    return obra.etapa_kanban_id;
  }
  const code = getKanbanBucket(obra.estado);
  return stages.find(s => s.codigo === code)?.id || stages.find(s => s.codigo === "otros")?.id || null;
}

function getKanbanBucket(estado) {
  const e = String(estado || "").toLowerCase();
  if (["pendiente_de_planificacion", "planificada", "planificado", "borrador", "pendiente"].includes(e)) return "planificacion";
  if (["en_ejecucion", "en_progreso", "en_diseno", "en_fabricacion", "en_instalacion", "abierto"].includes(e)) return "en_ejecucion";
  if (["en_riesgo", "riesgo", "atrasada", "atrasado", "critica", "critico", "bloqueada", "observacion", "pausada"].includes(e)) return "riesgo_bloqueo";
  if (["completada", "completado", "finalizada", "finalizado", "entregada", "cerrado"].includes(e)) return "cierre";
  return "otros";
}

function bindKanbanEvents(container, viewContainer) {
  viewContainer.addEventListener("click", async event => {
    const actionEl = event.target.closest("[data-kanban-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.kanbanAction;
    const stageId = actionEl.dataset.stageId;

    if (action === "toggle-stage-menu") {
      kanbanStageMenuId = kanbanStageMenuId === stageId ? null : stageId;
      renderMain(container);
      return;
    }

    if (action === "add-stage") {
      kanbanStageMenuId = null;
      kanbanModal = { type: "add-stage" };
      renderMain(container);
      return;
    }

    if (action === "rename-stage") {
      const stage = kanbanStages.find(s => s.id === stageId);
      if (!stage) return;
      kanbanModal = { type: "rename-stage", stageId, currentName: stage.nombre };
      kanbanStageMenuId = null;
      renderMain(container);
      return;
    }

    if (action === "delete-stage") {
      kanbanModal = { type: "delete-stage", stageId };
      kanbanStageMenuId = null;
      renderMain(container);
      return;
    }

    if (action === "close-modal") {
      kanbanModal = null;
      renderMain(container);
      return;
    }

    if (action === "confirm-add-stage") {
      const input = container.querySelector("#kanban-stage-name");
      const nombre = String(input?.value || "").trim();
      if (!nombre) {
        alert("Ingresa un nombre de etapa.");
        return;
      }
      try {
        await apiPost("/kanban/etapas", { nombre });
        kanbanModal = null;
        await ensureKanbanStagesLoaded(container, true);
      } catch (error) {
        alert(error.message);
      }
      return;
    }

    if (action === "confirm-rename-stage") {
      const input = container.querySelector("#kanban-stage-name");
      const nombre = String(input?.value || "").trim();
      if (!nombre) {
        alert("Ingresa un nombre de etapa.");
        return;
      }
      try {
        await apiPatch(`/kanban/etapas/${stageId}`, { nombre });
        kanbanModal = null;
        await ensureKanbanStagesLoaded(container, true);
      } catch (error) {
        alert(error.message);
      }
      return;
    }

    if (action === "confirm-delete-stage") {
      try {
        await apiPost(`/kanban/etapas/${stageId}/eliminar`, {});
        kanbanModal = null;
        await ensureKanbanStagesLoaded(container, true);
        obras = await apiGet("/obras").catch(() => obras);
        renderMain(container);
      } catch (error) {
        alert(error.message);
      }
    }
  });

  viewContainer.addEventListener("dragstart", event => {
    const card = event.target.closest("[data-drag-project]");
    if (!card) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.dragProject);
    card.classList.add("is-dragging");
    document.body.classList.add("is-grabbing");
  });

  viewContainer.addEventListener("dragend", event => {
    const card = event.target.closest("[data-drag-project]");
    if (card) card.classList.remove("is-dragging");
    document.body.classList.remove("is-grabbing");
    viewContainer.querySelectorAll("[data-drop-stage]").forEach(zone => zone.classList.remove("is-dragover"));
  });

  viewContainer.addEventListener("dragover", event => {
    const dropZone = event.target.closest("[data-drop-stage]");
    if (!dropZone) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dropZone.classList.add("is-dragover");
  });

  viewContainer.addEventListener("dragleave", event => {
    const dropZone = event.target.closest("[data-drop-stage]");
    if (!dropZone) return;
    dropZone.classList.remove("is-dragover");
  });

  viewContainer.addEventListener("drop", async event => {
    const dropZone = event.target.closest("[data-drop-stage]");
    if (!dropZone) return;
    event.preventDefault();
    dropZone.classList.remove("is-dragover");
    const obraId = event.dataTransfer.getData("text/plain");
    const etapaId = dropZone.dataset.dropStage;
    if (!obraId || !etapaId) return;

    const obra = obras.find(item => item.id === obraId);
    if (!obra || obra.etapa_kanban_id === etapaId) return;

    try {
      await apiPatch(`/obras/${obraId}/etapa`, { etapa_kanban_id: etapaId });
      obra.etapa_kanban_id = etapaId;
      renderMain(container);
    } catch (error) {
      alert(error.message);
    }
  });
}

function countProjectsInStage(stageId) {
  return obras.filter(obra => resolveProjectStageId(obra, kanbanStages) === stageId).length;
}

// ==================== UTILIDADES Y EVENTOS ====================

function filterObras() {
  if (!searchTerm) return obras;
  const s = searchTerm.toLowerCase();
  return obras.filter(o =>
    (o.nombre || "").toLowerCase().includes(s) ||
    (o.cliente_nombre || "").toLowerCase().includes(s) ||
    (o.responsable || "").toLowerCase().includes(s)
  );
}

function bindMainEvents(container) {
  // Cambio de Vistas
  container.querySelectorAll(".view-toggles button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentView = btn.getAttribute("data-view");
      renderMain(container);
    });
  });

  // Búsqueda
  const searchInput = container.querySelector("#search-proyectos");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      searchTerm = e.target.value;
      const viewContainer = container.querySelector("#proyectos-view-container");
      if (currentView === "grid") viewContainer.innerHTML = renderGridView();
      else if (currentView === "list") viewContainer.innerHTML = renderListView();
      else if (currentView === "kanban") viewContainer.innerHTML = renderKanbanView();
      else if (currentView === "gantt") viewContainer.innerHTML = renderGanttView();
    });
  }

  // Acordeón y Navegación a Módulos
  const viewContainer = container.querySelector("#proyectos-view-container");
  if (viewContainer) {
    if (currentView === "kanban") {
      bindKanbanEvents(container, viewContainer);
    }

    viewContainer.addEventListener("click", (e) => {
      const header = e.target.closest(".accordion-header");
      if (header) {
        const card = header.closest(".accordion-card");
        const body = card.querySelector(".accordion-body");
        const icon = card.querySelector(".accordion-icon");
        
        const isExpanded = body.style.display === "block";
        
        // Cerrar todos los demás
        viewContainer.querySelectorAll(".accordion-body").forEach(b => b.style.display = "none");
        viewContainer.querySelectorAll(".accordion-icon").forEach(i => i.style.transform = "rotate(0deg)");

        if (!isExpanded) {
          body.style.display = "block";
          icon.style.transform = "rotate(180deg)";
        }
      }
      
      const btnModule = e.target.closest(".btn-module");
      if (btnModule) {
        activeTab = btnModule.getAttribute("data-module");
        activeProjectId = btnModule.getAttribute("data-id");
        renderMain(container); // Re-renderizamos para montar la Vista 2
      }
    });
  }

}
