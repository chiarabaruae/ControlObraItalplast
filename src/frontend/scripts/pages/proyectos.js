import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "../api.js";
import { icons, esc, renderBadge, renderProgress, renderEmpty, formatDate } from "../ui.js";
import { setTopbarSection } from "../layout.js";

// Estado de la aplicación
let obras = [];
let searchTerm = "";
let currentView = "gantt"; // Opciones: 'grid', 'list', 'kanban', 'gantt'
let activeProjectId = null; // ID del proyecto en "Pantalla 2" (Funcionalidad Específica)
let activeTab = null; // 'resumen', 'documentos', 'cronogramas', 'seguimientos', 'todo'
let kanbanStages = [];
let kanbanStagesLoading = false;
let kanbanStagesError = "";
let kanbanStageMenuId = null;
let kanbanModal = null;
const documentosByProyecto = new Map();
const documentosLoadingByProyecto = new Map();
const documentosErrorByProyecto = new Map();
const documentosUiByProyecto = new Map();
const documentosParentByProyecto = new Map();
const documentosCategoryByProyecto = new Map();
const DOCUMENT_QUICK_BUCKETS = [
  { key: "oferta", label: "Oferta", tipo: "oferta_pdf" },
  { key: "abaco", label: "Ábaco", tipo: "abaco_lista" },
  { key: "seguimiento_fabrica", label: "Seguimiento fábrica", asociado: "seguimiento_fabrica" },
  { key: "seguimiento_obra", label: "Seguimiento obra", asociado: "seguimiento_obra" },
  { key: "otros", label: "Otros documentos", fallback: true }
];
const DOC_CATEGORY_OPTIONS = [
  { value: "oferta", label: "Oferta" },
  { value: "abaco", label: "Ábaco" },
  { value: "seguimiento_fabrica", label: "Seguimiento fábrica" },
  { value: "seguimiento_obra", label: "Seguimiento obra" },
  { value: "otro", label: "Otros documentos" }
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
<<<<<<< HEAD
          <div class="view-toggles">
            <button class="btn btn-ghost btn-sm ${currentView === 'list' ? 'active' : ''}" data-view="list" title="Vista Lista (Popover)">${icons.list}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'grid' ? 'active' : ''}" data-view="grid" title="Vista Tarjetas (Acordeón)">${icons.grid}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'kanban' ? 'active' : ''}" data-view="kanban" title="Vista Kanban">${icons.kanban}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'gantt' ? 'active' : ''}" data-view="gantt" title="Vista Gantt Global">${icons.gantt_global}</button>
=======
          <div class="view-toggles" style="display: flex; background: var(--bg-alt); padding: 4px; border-radius: 8px;">
            <button class="btn btn-ghost btn-sm ${currentView === 'gantt' ? 'active' : ''}" data-view="gantt" title="Vista Gantt / Cronograma">${icons.gantt}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'grid' ? 'active' : ''}" data-view="grid" title="Vista Tarjetas">${icons.grid}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'list' ? 'active' : ''}" data-view="list" title="Vista Lista">${icons.list}</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'kanban' ? 'active' : ''}" data-view="kanban" title="Vista Kanban">${icons.kanban}</button>
>>>>>>> 3399dfd (feat: agregar funcionalidad de Gantt y migraciones relacionadas)
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
    if (currentView === "grid") viewContainer.innerHTML = renderGridView();
    else if (currentView === "list") viewContainer.innerHTML = renderListView();
    else if (currentView === "kanban") viewContainer.innerHTML = renderKanbanView();
    else if (currentView === "gantt") {
      viewContainer.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Cargando Gantt Global...</div>';
      renderGanttView(viewContainer);
    }
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
    <div class="accordion-list">
      ${filtered.map(o => `
        <div class="accordion-card" data-id="${o.id}">
          <div class="accordion-header">
            <div class="accordion-summary">
              <div class="accordion-project-meta">
                <h3>${esc(o.nombre)}</h3>
                <p>Cliente: ${esc(o.cliente_nombre || "Sin cliente")}</p>
              </div>
              <div class="accordion-facts">
                <div class="accordion-fact">
                  <span>Líder</span>
                  <strong>${esc(o.responsable || "No asignado")}</strong>
                </div>
                <div class="accordion-fact">
                  <span>Fin Instalación</span>
                  <strong>${formatDate(o.fecha_fin_instalacion) || "-"}</strong>
                </div>
                <div>${renderBadge(o.estado || "planificada")}</div>
                <div class="accordion-signal" title="Semáforo del Proyecto">
                  <span class="accordion-dot"></span>
                  <small>Semáforo</small>
                </div>
              </div>
            </div>
            <div class="accordion-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="accordion-body">
            <div class="accordion-body-inner">
              <p class="accordion-body-intro">Módulos del proyecto</p>
              <div class="accordion-module-grid">
                <button class="accordion-module-btn btn-module" data-module="resumen" data-id="${o.id}" type="button">
                  <h4>Resumen</h4>
                  <p>Dashboard y avance general</p>
                </button>
                <button class="accordion-module-btn btn-module" data-module="documentos" data-id="${o.id}" type="button">
                  <h4>Documentos</h4>
                  <p>Archivos y adjuntos</p>
                </button>
                <button class="accordion-module-btn btn-module" data-module="cronogramas" data-id="${o.id}" type="button">
                  <h4>Cronogramas</h4>
                  <p>Oferta, fechas e ítems</p>
                </button>
                <button class="accordion-module-btn btn-module" data-module="seguimientos" data-id="${o.id}" type="button">
                  <h4>Seguimientos</h4>
                  <p>Fábrica e instalación (Ábaco)</p>
                </button>
              </div>
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

async function renderGanttView(container) {
  try {
    const ganttData = await apiGet("/gantt/global");
    
    if (ganttData.length === 0) {
      container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted);">No hay proyectos con cronograma para mostrar en el Gantt.</div>`;
      return;
    }

    const today = new Date();
    // Fechas límites del Gantt basadas en los datos (simplificado)
    const minDate = new Date(Math.min(...ganttData.map(d => new Date(d.fecha_limite_firma_abaco || d.inicio_fabrica || today).getTime())));
    const maxDate = new Date(Math.max(...ganttData.map(d => new Date(d.fin_instalacion || today).getTime())));
    
    // Add some padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    const dayWidth = 20; // px por día
    const ganttWidth = totalDays * dayWidth;

    // Helper positions
    const getPos = (dateStr) => {
      if (!dateStr) return 0;
      const d = new Date(dateStr);
      return Math.max(0, Math.ceil((d - minDate) / (1000 * 60 * 60 * 24)) * dayWidth);
    };

    const getWidth = (startStr, endStr) => {
      if (!startStr || !endStr) return dayWidth;
      const start = new Date(startStr);
      const end = new Date(endStr);
      return Math.max(dayWidth, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) * dayWidth);
    };

    const todayPos = getPos(today);

    let rowsHtml = ganttData.map(p => {
      // Row principal
      const mainRow = `
        <div class="gantt-row main-row" onclick="this.parentElement.classList.toggle('collapsed')" style="display:flex; border-bottom: 1px solid var(--border); background: var(--card-bg); cursor: pointer;">
          <div class="gantt-side" style="width: 350px; flex-shrink: 0; padding: 0.5rem; border-right: 1px solid var(--border); display: flex; align-items: center; gap: 0.5rem;">
            <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s"><polyline points="6 9 12 15 18 9"></polyline></svg>
            <div style="flex:1; overflow:hidden;">
              <div style="font-weight: 500; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${esc(p.nombre_proyecto)}</div>
              <div style="font-size: 0.75rem; color: var(--muted);">${esc(p.cliente_nombre || 'Sin cliente')} | Oferta: ${esc(p.oferta_nro || '-')}</div>
            </div>
            ${renderBadge(p.semaforo || 'gris')}
          </div>
          <div class="gantt-timeline-area" style="position: relative; width: ${ganttWidth}px; min-height: 40px;">
            <!-- Barra resumen (visible cuando colapsado) -->
            <div class="summary-bar" style="position: absolute; top: 12px; left: ${getPos(p.fecha_limite_firma_abaco || p.inicio_fabrica)}px; width: ${getWidth(p.fecha_limite_firma_abaco || p.inicio_fabrica, p.fin_instalacion)}px; height: 16px; background: var(--border); border-radius: 8px;"></div>
          </div>
        </div>
      `;

      // Sub rows
      const renderSubRow = (title, type, color, start, end) => `
        <div class="gantt-subrow" style="display:flex; border-bottom: 1px dashed var(--border); background: var(--bg-alt); min-height: 32px;">
          <div class="gantt-side" style="width: 350px; flex-shrink: 0; padding: 0.25rem 0.5rem 0.25rem 2.5rem; border-right: 1px solid var(--border); display: flex; align-items: center; font-size: 0.85rem; color: var(--muted);">
            ${title}
          </div>
          <div class="gantt-timeline-area" style="position: relative; width: ${ganttWidth}px;">
            ${start ? (type === 'hito' ? 
              `<div class="gantt-hito" style="position: absolute; top: 8px; left: ${getPos(start) - 6}px; width: 12px; height: 12px; background: ${color}; transform: rotate(45deg); cursor: pointer;" title="${title}: ${formatDate(start)}"></div>` 
              : 
              `<div class="gantt-bar" style="position: absolute; top: 6px; left: ${getPos(start)}px; width: ${getWidth(start, end)}px; height: 20px; background: ${color}; border-radius: 4px; cursor: pointer; opacity: 0.8;" title="${title}: ${formatDate(start)} - ${formatDate(end)}"></div>`
            ) : `<span style="font-size:0.75rem; color: var(--muted); padding-left: 10px; line-height: 32px;">No definido</span>`}
          </div>
        </div>
      `;

      const subRows = `
        <div class="gantt-subrows">
          ${renderSubRow('1. Firma de ábaco', 'hito', '#3b82f6', p.fecha_limite_firma_abaco)}
          ${renderSubRow('2. Producción en fábrica', 'barra', '#8b5cf6', p.inicio_fabrica, p.fecha_compromiso_fin_produccion)}
          ${renderSubRow('3. Compromiso fin producción', 'hito', '#ef4444', p.fecha_compromiso_fin_produccion)}
          ${renderSubRow('4. Inicio instalación', 'hito', '#eab308', p.fecha_comprometida_inicio_instalacion)}
          ${renderSubRow('5. Instalación en obra', 'barra', '#10b981', p.fecha_comprometida_inicio_instalacion, p.fin_instalacion)}
          ${renderSubRow('6. Fin instalación', 'hito', '#10b981', p.fin_instalacion)}
        </div>
      `;

      return `<div class="gantt-project-group">${mainRow}${subRows}</div>`;
    }).join("");

    container.innerHTML = `
      <style>
        .gantt-container { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
        .gantt-header { display: flex; background: var(--bg-alt); border-bottom: 2px solid var(--border); font-weight: 500; font-size: 0.85rem; color: var(--muted); }
        .gantt-body { overflow-x: auto; overflow-y: hidden; display: flex; flex-direction: column; position: relative; }
        .gantt-project-group.collapsed .gantt-subrows { display: none; }
        .gantt-project-group.collapsed .collapse-icon { transform: rotate(-90deg); }
        .gantt-project-group:not(.collapsed) .summary-bar { display: none; }
        .gantt-project-group:hover .main-row { background: var(--bg) !important; }
        .gantt-bar:hover, .gantt-hito:hover { opacity: 1 !important; filter: brightness(1.2); }
      </style>
      <div class="card" style="padding: 1rem; margin-bottom: 1rem;">
        <div style="display:flex; justify-content: space-between; align-items: center;">
          <div style="display:flex; gap: 1rem;">
            <select class="btn btn-ghost" style="border: 1px solid var(--border)"><option>Escala: Día</option><option>Escala: Semana</option></select>
          </div>
          <div>
            <button class="btn btn-secondary">${icons.download} Exportar</button>
          </div>
        </div>
      </div>

      <div class="gantt-container">
        <div class="gantt-header">
          <div style="width: 350px; flex-shrink: 0; padding: 0.75rem; border-right: 1px solid var(--border);">Proyecto / Obra</div>
          <div style="position: relative; width: ${ganttWidth}px; overflow: hidden; display: flex; align-items: center; background-image: repeating-linear-gradient(to right, transparent, transparent ${dayWidth-1}px, var(--border) ${dayWidth-1}px, var(--border) ${dayWidth}px);">
            <!-- Días/Meses podrían ir aquí en el futuro -->
            <div style="position: absolute; left: ${todayPos}px; top: 0; bottom: 0; width: 2px; background: rgba(239, 68, 68, 0.5); z-index: 10;" title="Hoy"></div>
          </div>
        </div>
        <div class="gantt-body" style="width: 100%;">
          <div style="display: flex; min-width: max-content;">
            <div style="display: flex; flex-direction: column; width: 100%;">
              <div style="position: absolute; left: calc(350px + ${todayPos}px); top: 0; bottom: 0; width: 2px; background: rgba(239, 68, 68, 0.5); z-index: 1;" title="Hoy"></div>
              ${rowsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error cargando Gantt</h3><p>${esc(err.message)}</p></div>`;
  }
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
    seguimientos: "Seguimiento de Fábrica y Obra",
    todo: "To-Do del Proyecto"
  };
  const isDocsTab = activeTab === "documentos";

  container.innerHTML = `
    <div class="page-header docs-page-header">
      <button class="btn btn-ghost btn-sm docs-back-btn" id="btn-volver" type="button">
        ${icons.back} Volver al Listado
      </button>
      <div class="page-header-row">
        <div>
          <div class="eyebrow">${esc(o.nombre)}</div>
          <h1>${titleMap[activeTab]}</h1>
        </div>
        ${
          isDocsTab
            ? ""
            : `
          <div style="display:flex;gap:.5rem;">
            <button class="btn btn-secondary" id="btn-modificar-modulo">${icons.edit} Modificar</button>
            <button class="btn btn-danger" id="btn-eliminar-modulo">${icons.trash} Eliminar</button>
          </div>
        `
        }
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

  if (!isDocsTab) {
    container.querySelector("#btn-modificar-modulo")?.addEventListener("click", () => {
      alert("Modal: ¿Seguro que deseas modificar los datos de este módulo?");
    });

    container.querySelector("#btn-eliminar-modulo")?.addEventListener("click", () => {
      alert("Modal ROJO: ¿Seguro que deseas ELIMINAR este módulo? Acción irreversible.");
    });
  }

  if (activeTab === "documentos") {
    bindDocumentosEvents(container, o);
    void ensureDocumentosLoaded(container, o.id);
  }

  if (activeTab === "todo") {
    bindTodoModulo(container, o.id);
  }
}

function renderContenidoModulo(tab, proyecto) {
  if (tab === "documentos") {
    return renderDocumentosModulo(proyecto);
  }

  if (tab === "todo") {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h2>To-Do</h2>
            <p style="color:var(--muted)">Tareas del proyecto</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-tarea-proyecto" type="button">${icons.plus} Nueva tarea</button>
        </div>
        <div id="todo-proyecto-body" style="padding: 1.5rem;">
          <div class="loading">Cargando tareas...</div>
        </div>
      </div>
      ${renderModalTareaProyecto(proyecto.id)}
    `;
  }

  if (tab === "cronogramas") {
    return `
      <div class="card">
        <div class="card-header"><h2>Gestión de Oferta y Cronograma</h2></div>
        <div style="padding: 1.5rem;">
          <p style="color:var(--muted); margin-bottom:1rem;">Carga aquí la Oferta (PDF) para extraer el total de aberturas y habilitar el desglose ítem por ítem para el Gantt del proyecto.</p>
          <input type="file" id="file-oferta" accept=".pdf" style="display:none;" />
          <div style="text-align:center; padding: 2rem; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer;" onclick="document.getElementById('file-oferta').click()">
            ${icons.plus}
            <p style="margin: 0.5rem 0 0;">Subir Archivo PDF (Oferta)</p>
          </div>
          <div id="status-oferta" style="margin-top:1rem; text-align:center; font-size:0.85rem;"></div>
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
          <input type="file" id="file-abaco" accept=".xlsx,.csv" style="display:none;" />
          <button class="btn btn-primary" onclick="document.getElementById('file-abaco').click()">${icons.plus} Subir Ábaco</button>
          <div id="status-abaco" style="margin-top:1rem; font-size:0.85rem;"></div>
        </div>
      </div>
    `;
  }

  return `<div style="padding: 2rem; text-align: center; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">Contenido de ${tab} en construcción...</div>`;
}

function renderModalTareaProyecto(obraId) {
  return `
    <div class="modal-overlay" id="modal-tarea-proyecto">
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="modal-titulo-tarea-proyecto">Nueva tarea</h2>
          <button class="btn-icon" id="close-modal-tarea-proyecto" type="button">${icons.close}</button>
        </div>
        <form id="form-tarea-proyecto">
          <input type="hidden" name="obra_id" value="${esc(obraId)}">
          <div class="form-grid">
            <div class="form-field full-width"><label>Título *</label><input name="titulo" required></div>
            <div class="form-field"><label>Fecha inicio *</label><input name="fecha_inicio" type="date" required></div>
            <div class="form-field"><label>Fecha fin *</label><input name="fecha_fin" type="date" required></div>
            <div class="form-field"><label>Estado</label>
              <select name="estado">
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En progreso</option>
                <option value="bloqueada">Bloqueada</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>
            <div class="form-field"><label>Prioridad</label>
              <select name="prioridad">
                <option value="baja">Baja</option>
                <option value="media" selected>Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div class="form-field"><label>Avance %</label><input name="avance" type="number" min="0" max="100" value="0"></div>
            <div class="form-field full-width"><label>Descripción</label><textarea name="descripcion" rows="2"></textarea></div>
          </div>
          <div class="modal-status" id="modal-status-tarea-proyecto"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="cancel-modal-tarea-proyecto">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
        <input type="hidden" id="editing-tarea-proyecto-id">
      </div>
    </div>
  `;
}

function bindTodoModulo(container, obraId) {
  const body = container.querySelector("#todo-proyecto-body");
  const modal = container.querySelector("#modal-tarea-proyecto");
  const form = container.querySelector("#form-tarea-proyecto");
  const editingId = container.querySelector("#editing-tarea-proyecto-id");
  const status = container.querySelector("#modal-status-tarea-proyecto");
  const content = container.querySelector("#funcionalidad-content");

  const refresh = async () => {
    const tareas = await apiGet(`/tareas?obraId=${encodeURIComponent(obraId)}`).catch(() => []);
    if (!body) return;
    if (!tareas.length) {
      body.innerHTML = renderEmpty("Sin tareas", "Crea la primera tarea del proyecto.");
      return;
    }

    body.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>Tarea</th><th>Estado</th><th>Prioridad</th><th>Fin</th><th>Validado por</th><th></th></tr></thead>
        <tbody>
          ${tareas.map(t => {
            const done = t.estado === "finalizada";
            return `<tr>
              <td><button class="btn-icon" data-toggle-tarea-proy="${t.id}" type="button" title="${done ? "Reabrir" : "Completar"}">
                ${done ? icons.check : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'}
              </button></td>
              <td style="${done ? "text-decoration:line-through;opacity:.6" : ""}"><strong>${esc(t.titulo)}</strong></td>
              <td>${renderBadge(t.estado)}</td>
              <td>${renderBadge(t.prioridad)}</td>
              <td>${formatDate(t.fecha_fin)}</td>
              <td>${esc(t.completada_por_name || "-")}</td>
              <td class="row-actions">
                <button class="btn btn-ghost btn-sm" data-edit-tarea-proy="${t.id}" type="button">${icons.edit}</button>
                <button class="btn btn-danger btn-sm" data-delete-tarea-proy="${t.id}" type="button">${icons.trash}</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>
    `;
  };

  const openModal = (t = null) => {
    editingId.value = t?.id || "";
    container.querySelector("#modal-titulo-tarea-proyecto").textContent = t ? "Editar tarea" : "Nueva tarea";
    if (t) {
      form.titulo.value = t.titulo || "";
      form.fecha_inicio.value = t.fecha_inicio?.slice(0, 10) || "";
      form.fecha_fin.value = t.fecha_fin?.slice(0, 10) || "";
      form.estado.value = t.estado || "pendiente";
      form.prioridad.value = t.prioridad || "media";
      form.avance.value = t.avance || 0;
      form.descripcion.value = t.descripcion || "";
    } else {
      form.reset();
    }
    status.textContent = "";
    modal.classList.add("open");
  };
  const closeModal = () => modal.classList.remove("open");

  container.querySelector("#btn-new-tarea-proyecto")?.addEventListener("click", () => openModal());
  container.querySelector("#close-modal-tarea-proyecto")?.addEventListener("click", closeModal);
  container.querySelector("#cancel-modal-tarea-proyecto")?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Guardando...";
    try {
      if (editingId.value) await apiPut(`/tareas/${editingId.value}`, data);
      else await apiPost("/tareas", data);
      closeModal();
      await refresh();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  const handleClick = async (event) => {
    const toggleBtn = event.target.closest("[data-toggle-tarea-proy]");
    const editBtn = event.target.closest("[data-edit-tarea-proy]");
    const deleteBtn = event.target.closest("[data-delete-tarea-proy]");
    if (!toggleBtn && !editBtn && !deleteBtn) return;

    const tareas = await apiGet(`/tareas?obraId=${encodeURIComponent(obraId)}`).catch(() => []);

    if (editBtn) {
      const t = tareas.find(x => x.id === editBtn.dataset.editTareaProy);
      if (t) openModal(t);
      return;
    }

    if (deleteBtn) {
      if (confirm("Eliminar esta tarea?")) {
        await apiDelete(`/tareas/${deleteBtn.dataset.deleteTareaProy}`);
        await refresh();
      }
      return;
    }

    if (toggleBtn) {
      const t = tareas.find(x => x.id === toggleBtn.dataset.toggleTareaProy);
      if (t) {
        const newEstado = t.estado === "finalizada" ? "pendiente" : "finalizada";
        await apiPut(`/tareas/${t.id}`, { ...t, estado: newEstado, avance: newEstado === "finalizada" ? 100 : t.avance });
        await refresh();
      }
    }
  };

  if (content) {
    content.removeEventListener("click", content._todoHandler);
    content._todoHandler = handleClick;
    content.addEventListener("click", handleClick);
  }

  void refresh();
}

async function ensureDocumentosLoaded(container, proyectoId, force = false) {
  const hasDocs = documentosByProyecto.has(proyectoId);
  if ((hasDocs && !force) || documentosLoadingByProyecto.get(proyectoId)) return;

  documentosLoadingByProyecto.set(proyectoId, true);
  renderFuncionalidadEspecifica(container);
  try {
    const docs = await apiGet(`/obras/${proyectoId}/documentos`).catch(() => []);
    hydrateDocumentMeta(proyectoId, docs);
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
      quickFilter: "todos",
      currentFolderId: null,
      isFolderModalOpen: false,
      folderNameDraft: "",
      folderError: "",
      folderSubmitting: false,
      docsActionError: ""
    });
  }
  return documentosUiByProyecto.get(proyectoId);
}

function renderDocumentosModulo(proyecto) {
  const state = getDocumentosUiState(proyecto.id);
  const isLoading = documentosLoadingByProyecto.get(proyecto.id);
  const error = documentosErrorByProyecto.get(proyecto.id);
  const docs = getProyectoDocs(proyecto.id);
  const docsInFolder = getDocsInCurrentFolder(proyecto.id, docs, state.currentFolderId);
  const hasDocs = docs.length > 0;
  const selectedDoc = docs.find(d => String(d.id) === String(state.selectedItemId)) || null;
  const visibleDocs = filterDocumentos(docsInFolder, state, proyecto.id);
  const breadcrumbs = getDocumentBreadcrumbs(proyecto.id, docs, state.currentFolderId, selectedDoc);

  if (state.selectedItemId && !selectedDoc) {
    state.selectedItemId = null;
    state.isPreviewPaneOpen = false;
  }

  return `
    <section class="docs-shell" id="docs-shell" data-proyecto-id="${esc(proyecto.id)}">
      <nav class="docs-breadcrumbs" aria-label="Ruta de documentos">
        ${breadcrumbs
          .map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return `
              ${index > 0 ? '<span class="docs-crumb-sep">&gt;</span>' : ""}
              ${isLast
                ? `<span class="docs-crumb-current">${esc(crumb.label)}</span>`
                : `<button type="button" class="docs-crumb" data-docs-nav="${esc(crumb.id || "root")}">${esc(crumb.label)}</button>`}
            `;
          })
          .join("")}
      </nav>
      <div class="docs-toolbar docs-toolbar-standalone">
        <label class="search-input docs-search">
          ${icons.search}
          <input id="docs-search-input" type="text" placeholder="Buscar documento..." value="${esc(state.currentSearchQuery)}">
        </label>
        <div class="docs-view-toggle" role="tablist" aria-label="Modo de vista">
          <button class="btn-icon ${state.currentView === "list" ? "is-active" : ""}" type="button" data-docs-view="list" title="Vista lista" aria-label="Vista lista">${renderDocsViewIcon("list")}</button>
          <button class="btn-icon ${state.currentView === "grid" ? "is-active" : ""}" type="button" data-docs-view="grid" title="Vista grilla" aria-label="Vista grilla">${renderDocsViewIcon("grid")}</button>
        </div>
        <button class="btn btn-ghost" type="button" id="btn-docs-folder">${icons.folder} Nueva carpeta</button>
        <button class="btn btn-primary" type="button" id="btn-docs-upload">${icons.upload} Subir documento</button>
        <input id="docs-upload-input" type="file" hidden />
      </div>

      ${hasDocs ? `
        <div class="docs-quick-access">
          ${renderQuickAccessCards(docs, state.quickFilter)}
        </div>
      ` : ""}

      ${error ? `<div class="card"><p class="modal-status">${esc(error)}</p></div>` : ""}
      ${state.docsActionError ? `<div class="card"><p class="modal-status">${esc(state.docsActionError)}</p></div>` : ""}
      ${isLoading ? '<div class="loading">Cargando documentos...</div>' : `
        <div class="docs-content">
          <div class="docs-file-area" id="docs-file-area">
            ${state.currentView === "list"
              ? renderDocumentosTabla(visibleDocs, state.selectedItemId, docs.length, state.currentSearchQuery, state.quickFilter, state.currentFolderId, proyecto.id)
              : renderDocumentosGrid(visibleDocs, state.selectedItemId, docs.length, state.currentSearchQuery, state.quickFilter, state.currentFolderId)}
          </div>
          ${hasDocs ? `
            <div class="docs-preview-overlay ${state.isPreviewPaneOpen ? "open" : ""}" id="docs-preview-overlay"></div>
            <aside class="docs-preview-pane ${state.isPreviewPaneOpen ? "open" : ""}" id="docs-preview-pane">
              ${renderDocumentPreviewPane(selectedDoc, proyecto, state)}
            </aside>
          ` : ""}
        </div>
      `}

      ${renderFolderModal(state)}
    </section>
  `;
}

function renderQuickAccessCards(docs, quickFilter) {
  return DOCUMENT_QUICK_BUCKETS.map(bucket => {
    const matching = docs.filter(doc => matchesQuickBucket(doc, bucket));
    const last = matching[0];
    const active = quickFilter === bucket.key ? "is-active" : "";
    const updated = last ? formatDocDate(last.actualizado_en || last.creado_en) : "-";
    const icon = getDocKindIcon(bucketIconKind(bucket.key), "sm");
    return `
      <button class="docs-quick-card ${active}" type="button" data-docs-quick="${bucket.key}">
        <div class="docs-quick-icon ${bucketIconKind(bucket.key)}">${icon}</div>
        <div class="docs-quick-main">
          <strong>${bucket.label}</strong>
          <small>Última: ${updated}</small>
        </div>
        <div class="docs-quick-meta">
          <span class="badge">${matching.length}</span>
          <small>${matching.length === 1 ? "archivo" : "archivos"}</small>
        </div>
      </button>
    `;
  }).join("");
}

function renderDocumentosTabla(docs, selectedId, totalDocsCount = 0, searchQuery = "", quickFilter = "todos", currentFolderId = null, proyectoId = "") {
  if (!docs.length) {
    return renderDocsEmptyState(totalDocsCount, searchQuery, quickFilter, currentFolderId);
  }

  return `
    <div class="card docs-table-card">
      <div class="table-wrap">
        <table class="docs-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Fecha de carga</th>
              <th>Tamaño</th>
              <th>Subido por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${docs.map(doc => `
              <tr class="docs-row ${String(selectedId) === String(doc.id) ? "is-selected" : ""}" data-doc-select="${esc(doc.id)}">
                <td>
                  <div class="docs-name-cell">
                    <span class="docs-kind-icon ${getDocKind(doc)}">${getDocKindIcon(getDocKind(doc), "sm")}</span>
                    <div class="docs-name-block">
                      <strong>${esc(doc.nombre_archivo || "Sin nombre")}</strong>
                      <small>${esc(doc.mime_type || "Archivo")}</small>
                    </div>
                  </div>
                </td>
                <td>${esc(formatTipoDocumento(doc))}</td>
                <td>${renderCategorySelect(doc, proyectoId)}</td>
                <td>${esc(formatDocDate(doc.actualizado_en || doc.creado_en) || "-")}</td>
                <td>${esc(formatFileSize(doc))}</td>
                <td>${esc(doc.subido_por || "Sistema")}</td>
                <td>
                  <button class="btn-icon docs-open-action" type="button" title="Abrir detalle" data-doc-action="ver" data-doc-id="${esc(doc.id)}">${icons.panelRightOpen || icons.eye}</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDocumentosGrid(docs, selectedId, totalDocsCount = 0, searchQuery = "", quickFilter = "todos", currentFolderId = null) {
  if (!docs.length) {
    return renderDocsEmptyState(totalDocsCount, searchQuery, quickFilter, currentFolderId);
  }
  return `
    <div class="docs-grid">
      ${docs.map(doc => `
        <article class="docs-grid-item ${String(selectedId) === String(doc.id) ? "is-selected" : ""}" data-doc-select="${esc(doc.id)}">
          <header class="docs-grid-head">
            <div class="docs-grid-icon ${getDocKind(doc)}">${getDocKindIcon(getDocKind(doc), "md")}</div>
            <button class="btn-icon docs-grid-action" type="button" title="Ver detalle" data-doc-action="ver" data-doc-id="${esc(doc.id)}">${icons.eye}</button>
          </header>
          <h4 title="${esc(doc.nombre_archivo || "Sin nombre")}">${esc(doc.nombre_archivo || "Sin nombre")}</h4>
          <p>${esc(formatTipoDocumento(doc))}</p>
          <small>${esc(formatDocumentoAsociado(doc, null))}</small>
          <footer class="docs-grid-foot">
            <small>${esc(formatDocDate(doc.actualizado_en || doc.creado_en) || "-")}</small>
            <small>${esc(formatFileSize(doc))}</small>
          </footer>
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
      <div class="docs-preview-title">
        <span class="docs-kind-icon ${getDocKind(doc)}">${getDocKindIcon(getDocKind(doc), "sm")}</span>
        <h3>Detalle de archivo</h3>
      </div>
      <button class="btn-icon" type="button" id="btn-doc-preview-close">${icons.close}</button>
    </div>
    <div class="docs-preview-tabs">
      <button class="docs-preview-tab ${state.activePreviewTab === "info" ? "active" : ""}" data-doc-preview-tab="info" type="button">Info</button>
      <button class="docs-preview-tab ${state.activePreviewTab === "preview" ? "active" : ""}" data-doc-preview-tab="preview" type="button">Vista previa</button>
      <button class="docs-preview-tab ${state.activePreviewTab === "datos" ? "active" : ""}" data-doc-preview-tab="datos" type="button">Datos</button>
    </div>
    <div class="docs-preview-content">
      ${state.activePreviewTab === "info" ? renderDocInfoTab(doc, proyecto) : ""}
      ${state.activePreviewTab === "preview" ? renderDocPreviewTab(doc) : ""}
      ${state.activePreviewTab === "datos" ? renderDocDatosTab(doc) : ""}
    </div>
  `;
}

function renderDocInfoTab(doc, proyecto) {
  const isFolder = isDocumentFolder(doc);
  return `
    <div class="docs-info-head">
      <div class="docs-info-icon ${getDocKind(doc)}">${getDocKindIcon(getDocKind(doc), "lg")}</div>
      <div>
        <strong>${esc(doc.nombre_archivo || "Sin nombre")}</strong>
        <p>${esc(formatTipoDocumento(doc))}</p>
      </div>
    </div>
    <ul class="docs-info-list">
      <li><span>Tipo</span><strong>${esc(isFolder ? "Carpeta" : formatTipoDocumento(doc))}</strong></li>
      <li><span>Tamaño</span><strong>${esc(formatFileSize(doc))}</strong></li>
      <li><span>Proyecto</span><strong>${esc(proyecto.nombre)}</strong></li>
      <li><span>Categoría</span><strong>${esc(formatDocumentoAsociado(doc, proyecto.id))}</strong></li>
      <li><span>Subido por</span><strong>${esc(doc.subido_por || "Sistema")}</strong></li>
      <li><span>Fecha creación</span><strong>${esc(formatDocDate(doc.creado_en) || "-")}</strong></li>
      <li><span>Fecha modificación</span><strong>${esc(formatDocDate(doc.actualizado_en || doc.creado_en) || "-")}</strong></li>
    </ul>
  `;
}

function renderDocPreviewTab(doc) {
  if (isDocumentFolder(doc)) {
    return `<p>Las carpetas no tienen vista previa.</p>`;
  }
  const mime = String(doc.mime_type || "").toLowerCase();
  const fileName = String(doc.nombre_archivo || "").toLowerCase();
  const fileUrl = getDocFileUrl(doc);
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(fileName)) {
    if (!fileUrl) {
      return `<p>No hay vista previa disponible para este archivo.</p>`;
    }
    return `<img src="${esc(fileUrl)}" alt="${esc(doc.nombre_archivo || "Vista previa")}" class="docs-preview-image">`;
  }
  if (mime.includes("pdf") || /\.pdf$/i.test(fileName)) {
    if (fileUrl) {
      return `
        <div class="docs-preview-embed-wrap">
          <iframe class="docs-preview-embed" src="${esc(fileUrl)}" title="Vista previa PDF"></iframe>
          <a class="btn btn-ghost btn-sm" href="${esc(fileUrl)}" target="_blank" rel="noopener noreferrer">${icons.eye} Abrir archivo</a>
        </div>
      `;
    }
    return `
      <p>Vista previa PDF disponible.</p>
      <p style="color:var(--muted);font-size:12px">No se encontró URL de descarga para este documento.</p>
    `;
  }
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv") || /\.(xlsx?|csv)$/i.test(fileName)) {
    return `<p>Archivo Excel cargado.</p>`;
  }
  return `<p>No hay vista previa disponible para este tipo de archivo.</p>`;
}

function renderDocDatosTab(doc) {
  const data = doc.datos_extraidos || {};
  if (!data || !Object.keys(data).length) {
    return `<p>Sin datos extraídos.</p>`;
  }
  return `<pre class="docs-json">${esc(JSON.stringify(data, null, 2))}</pre>`;
}

function renderFolderModal(state) {
  if (!state.isFolderModalOpen) return "";
  const name = String(state.folderNameDraft || "");
  const trimmed = name.trim();
  const disabled = state.folderSubmitting || !trimmed;
  return `
    <div class="modal-overlay open" id="docs-folder-modal-overlay">
      <div class="modal-card docs-folder-modal-card" role="dialog" aria-modal="true" aria-labelledby="docs-folder-modal-title">
        <div class="modal-header">
          <h2 id="docs-folder-modal-title">Crear nueva carpeta</h2>
          <button class="btn-icon" type="button" id="btn-docs-folder-modal-close" aria-label="Cerrar">${icons.close}</button>
        </div>
        <p class="docs-folder-modal-text">Ingresá el nombre de la carpeta que querés crear para organizar los documentos del proyecto.</p>
        <div class="form-field">
          <label for="docs-folder-name-input">Nombre de la carpeta</label>
          <input id="docs-folder-name-input" type="text" placeholder="Ej: Ofertas, Ábacos, Seguimiento obra" value="${esc(name)}" maxlength="120">
        </div>
        ${state.folderError ? `<p class="modal-status">${esc(state.folderError)}</p>` : '<p class="modal-status"></p>'}
        <div class="modal-footer">
          <button class="btn btn-ghost" type="button" id="btn-docs-folder-cancel">Cancelar</button>
          <button class="btn btn-primary" type="button" id="btn-docs-folder-create" ${disabled ? "disabled" : ""}>
            ${state.folderSubmitting ? "Creando carpeta..." : "Crear carpeta"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindDocumentosEvents(container, proyecto) {
  const state = getDocumentosUiState(proyecto.id);
  const shell = container.querySelector("#docs-shell");
  if (!shell) return;

  shell.querySelector("#docs-search-input")?.addEventListener("input", event => {
    state.currentSearchQuery = event.target.value || "";
    refreshDocumentosShell(shell, proyecto, state);
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
  shell.querySelectorAll("[data-docs-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = String(btn.dataset.docsNav || "root");
      state.currentFolderId = targetId === "root" ? null : targetId;
      state.selectedItemId = null;
      state.isPreviewPaneOpen = false;
      renderFuncionalidadEspecifica(container);
    });
  });

  uploadInput?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.docsActionError = "";
    const token = sessionStorage.getItem("controlObraToken");
    const loadingDetail = {
      source: "request",
      method: "POST",
      path: `/obras/${proyecto.id}/documentos`
    };
    const form = new FormData();
    form.append("archivo", file);
    form.append("tipo_documento", inferTipoDocumento(file));
    form.append("documento_asociado", inferDocumentoAsociado(file, state.quickFilter));
    try {
      window.dispatchEvent(new CustomEvent("co:loading:start", { detail: loadingDetail }));
      const res = await fetch(`/api/admin/obras/${proyecto.id}/documentos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      }).finally(() => {
        window.dispatchEvent(new CustomEvent("co:loading:end", { detail: loadingDetail }));
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir el documento.");
      const uploadedId = data.documento_id ? String(data.documento_id) : "";
      if (uploadedId) {
        setDocParent(proyecto.id, uploadedId, state.currentFolderId || null);
        setDocCategory(proyecto.id, uploadedId, normalizeCategoryValue(inferDocumentoAsociado(file, state.quickFilter)));
      }
      await ensureDocumentosLoaded(container, proyecto.id, true);
    } catch (error) {
      state.docsActionError = error.message || "No se pudo subir el documento.";
      renderFuncionalidadEspecifica(container);
    } finally {
      uploadInput.value = "";
    }
  });

  shell.querySelector("#btn-docs-folder")?.addEventListener("click", () => {
    state.docsActionError = "";
    state.folderNameDraft = "";
    state.folderError = "";
    state.folderSubmitting = false;
    state.isFolderModalOpen = true;
    renderFuncionalidadEspecifica(container);
  });

  const folderOverlay = shell.querySelector("#docs-folder-modal-overlay");
  const folderInput = shell.querySelector("#docs-folder-name-input");
  const closeFolderModal = () => {
    state.isFolderModalOpen = false;
    state.folderError = "";
    state.folderSubmitting = false;
    renderFuncionalidadEspecifica(container);
  };

  folderOverlay?.addEventListener("click", event => {
    if (event.target === folderOverlay && !state.folderSubmitting) closeFolderModal();
  });

  shell.querySelector("#btn-docs-folder-modal-close")?.addEventListener("click", closeFolderModal);
  shell.querySelector("#btn-docs-folder-cancel")?.addEventListener("click", closeFolderModal);

  folderInput?.addEventListener("input", event => {
    state.folderNameDraft = event.target.value || "";
    state.folderError = "";
    const createBtn = shell.querySelector("#btn-docs-folder-create");
    if (createBtn) createBtn.disabled = !state.folderNameDraft.trim() || state.folderSubmitting;
  });

  folderInput?.addEventListener("keydown", event => {
    if (event.key === "Escape" && !state.folderSubmitting) {
      event.preventDefault();
      closeFolderModal();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      shell.querySelector("#btn-docs-folder-create")?.click();
    }
  });

  shell.addEventListener("keydown", event => {
    if (event.key === "Escape" && state.isFolderModalOpen && !state.folderSubmitting) {
      event.preventDefault();
      closeFolderModal();
    }
  });

  shell.querySelector("#btn-docs-folder-create")?.addEventListener("click", async () => {
    const nombre = String(state.folderNameDraft || "").trim();
    if (!nombre) return;

    const docs = getProyectoDocs(proyecto.id);
    const exists = docs.some(doc => {
      const tipo = String(doc.tipo_documento || "").toLowerCase();
      const folderName = String(doc.nombre_archivo || doc.nombre || "").trim().toLowerCase();
      return tipo === "carpeta" && folderName === nombre.toLowerCase();
    });

    if (exists) {
      state.folderError = "Ya existe una carpeta con ese nombre en este proyecto.";
      renderFuncionalidadEspecifica(container);
      return;
    }

    state.folderSubmitting = true;
    state.folderError = "";
    renderFuncionalidadEspecifica(container);
    try {
      const data = await apiPost(`/obras/${proyecto.id}/documentos/carpeta`, { nombre });
      const folderId = data?.documento_id ? String(data.documento_id) : "";
      if (folderId) {
        setDocParent(proyecto.id, folderId, state.currentFolderId || null);
        setDocCategory(proyecto.id, folderId, "otro");
      }
      state.isFolderModalOpen = false;
      state.folderNameDraft = "";
      state.folderError = "";
      state.folderSubmitting = false;
      await ensureDocumentosLoaded(container, proyecto.id, true);
    } catch (error) {
      state.folderSubmitting = false;
      state.folderError = error.message || "No se pudo crear la carpeta.";
      renderFuncionalidadEspecifica(container);
    }
  });

  shell.querySelector("#docs-file-area")?.addEventListener("click", event => {
    if (event.target.closest(".docs-category-select")) return;
    const targetDoc = event.target.closest("[data-doc-select]");
    if (targetDoc) {
      state.selectedItemId = String(targetDoc.dataset.docSelect || "");
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

  shell.querySelector("#docs-file-area")?.addEventListener("dblclick", event => {
    if (event.target.closest(".docs-category-select")) return;
    const targetDoc = event.target.closest("[data-doc-select]");
    if (!targetDoc) return;
    const docId = String(targetDoc.dataset.docSelect || "");
    const doc = getProyectoDocs(proyecto.id).find(item => String(item.id) === docId);
    if (!doc) return;

    if (isDocumentFolder(doc)) {
      state.currentFolderId = docId;
      state.selectedItemId = docId;
      state.isPreviewPaneOpen = true;
      state.activePreviewTab = "info";
      renderFuncionalidadEspecifica(container);
      return;
    }

    state.selectedItemId = docId;
    state.isPreviewPaneOpen = true;
    state.activePreviewTab = "preview";
    renderFuncionalidadEspecifica(container);
  });

  shell.querySelector("#docs-file-area")?.addEventListener("change", event => {
    const select = event.target.closest("[data-doc-category]");
    if (!select) return;
    const docId = String(select.dataset.docCategory || "");
    const value = normalizeCategoryValue(select.value);
    if (!docId) return;
    setDocCategory(proyecto.id, docId, value);
    refreshDocumentosShell(shell, proyecto, state);
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

  if (state.isFolderModalOpen) {
    const input = shell.querySelector("#docs-folder-name-input");
    if (input) {
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    }
  }
}

function refreshDocumentosShell(shell, proyecto, state) {
  const docs = getProyectoDocs(proyecto.id);
  const docsInFolder = getDocsInCurrentFolder(proyecto.id, docs, state.currentFolderId);
  const visibleDocs = filterDocumentos(docsInFolder, state, proyecto.id);
  const selectedDoc = docs.find(d => String(d.id) === String(state.selectedItemId)) || null;

  if (state.selectedItemId && !selectedDoc) {
    state.selectedItemId = null;
    state.isPreviewPaneOpen = false;
  }

  const fileArea = shell.querySelector("#docs-file-area");
  if (fileArea) {
    fileArea.innerHTML = state.currentView === "list"
      ? renderDocumentosTabla(visibleDocs, state.selectedItemId, docs.length, state.currentSearchQuery, state.quickFilter, state.currentFolderId, proyecto.id)
      : renderDocumentosGrid(visibleDocs, state.selectedItemId, docs.length, state.currentSearchQuery, state.quickFilter, state.currentFolderId);
  }

  const hasDocs = docs.length > 0;
  const overlay = shell.querySelector("#docs-preview-overlay");
  const pane = shell.querySelector("#docs-preview-pane");
  if (!hasDocs || !overlay || !pane) return;

  const isOpen = Boolean(state.isPreviewPaneOpen && selectedDoc);
  overlay.classList.toggle("open", isOpen);
  pane.classList.toggle("open", isOpen);
  pane.innerHTML = renderDocumentPreviewPane(selectedDoc, proyecto, state);
}

function inferTipoDocumento(file) {
  const name = String(file.name || "").toLowerCase();
  if (name.includes("oferta")) return "oferta_pdf";
  if (name.includes("abaco") || name.includes("ábaco")) return "abaco_lista";
  if (name.includes("produccion") || name.includes("producción")) return "abaco_lista";
  return "otro";
}

function inferDocumentoAsociado(file, quickFilter) {
  if (quickFilter && quickFilter !== "todos" && quickFilter !== "otros") return quickFilter;
  const name = String(file.name || "").toLowerCase();
  if (name.includes("oferta")) return "oferta";
  if (name.includes("abaco") || name.includes("ábaco")) return "abaco";
  if (name.includes("fabrica") || name.includes("fábrica")) return "seguimiento_fabrica";
  if (name.includes("obra")) return "seguimiento_obra";
  if (name.includes("produccion") || name.includes("producción")) return "abaco";
  return "otro";
}

function matchesQuickBucket(doc, bucket) {
  if (bucket.tipo && doc.tipo_documento === bucket.tipo) return true;
  const asociado = normalizeCategoryValue(doc.documento_asociado || doc.datos_extraidos?.documento_asociado || "otro");
  if (bucket.asociado && asociado === bucket.asociado) return true;
  if (bucket.key === "abaco" && asociado === "abaco") return true;
  if (bucket.key === "oferta" && asociado === "oferta") return true;
  if (bucket.fallback) {
    return !["oferta", "abaco", "seguimiento_fabrica", "seguimiento_obra"].includes(asociado);
  }
  return false;
}

function filterDocumentos(docs, state, proyectoId = null) {
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
      doc.documento_asociado,
      proyectoId ? formatDocumentoAsociado(doc, proyectoId) : ""
    ].some(v => String(v || "").toLowerCase().includes(query));
  });
}

function renderDocsEmptyState(totalDocsCount, searchQuery, quickFilter, currentFolderId = null) {
  if (!totalDocsCount) {
    return renderEmpty("Sin documentos en esta vista", "Carga un documento o crea una carpeta para comenzar.");
  }

  if ((searchQuery || "").trim()) {
    return renderEmpty("No se encontraron documentos.", "Prueba con otro término de búsqueda.");
  }

  if (currentFolderId) {
    return renderEmpty("Esta carpeta está vacía", "Carga un documento o crea una carpeta para comenzar.");
  }

  if (quickFilter && quickFilter !== "todos") {
    return renderEmpty("Sin documentos en esta vista", "No hay documentos para la categoría seleccionada.");
  }

  return renderEmpty("Sin documentos en esta vista", "Carga un documento o crea una carpeta para comenzar.");
}

function getDocsInCurrentFolder(proyectoId, docs, folderId) {
  const parentMap = getDocParentMap(proyectoId);
  return docs.filter(doc => {
    const id = String(doc.id || "");
    const parentId = parentMap.get(id) ?? null;
    if (!folderId) return !parentId;
    return String(parentId || "") === String(folderId);
  });
}

function getDocumentBreadcrumbs(proyectoId, docs, currentFolderId, selectedDoc) {
  const parentMap = getDocParentMap(proyectoId);
  const byId = new Map(docs.map(doc => [String(doc.id || ""), doc]));
  const crumbs = [{ id: "root", label: "Documentos" }];

  let cursor = currentFolderId ? String(currentFolderId) : "";
  const seen = new Set();
  const chain = [];
  while (cursor && byId.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    const current = byId.get(cursor);
    chain.push({ id: cursor, label: current?.nombre_archivo || "Carpeta" });
    cursor = String(parentMap.get(cursor) || "");
  }
  chain.reverse().forEach(item => crumbs.push(item));

  if (selectedDoc && !isDocumentFolder(selectedDoc)) {
    crumbs.push({ id: null, label: selectedDoc.nombre_archivo || "Archivo" });
  }
  return crumbs;
}

function getProyectoDocs(proyectoId) {
  const docs = documentosByProyecto.get(proyectoId);
  if (!Array.isArray(docs)) return [];
  return docs;
}

function getDocParentMap(proyectoId) {
  if (!documentosParentByProyecto.has(proyectoId)) {
    documentosParentByProyecto.set(proyectoId, new Map());
  }
  return documentosParentByProyecto.get(proyectoId);
}

function getDocCategoryMap(proyectoId) {
  if (!documentosCategoryByProyecto.has(proyectoId)) {
    documentosCategoryByProyecto.set(proyectoId, new Map());
  }
  return documentosCategoryByProyecto.get(proyectoId);
}

function hydrateDocumentMeta(proyectoId, docs) {
  const parentMap = getDocParentMap(proyectoId);
  const categoryMap = getDocCategoryMap(proyectoId);
  for (const doc of docs) {
    const id = String(doc.id || "");
    if (!id) continue;
    if (!parentMap.has(id)) {
      const parent = doc.parent_id || doc.carpeta_padre_id || doc.datos_extraidos?.parent_id || null;
      parentMap.set(id, parent ? String(parent) : null);
    }
    if (!categoryMap.has(id)) {
      const raw = doc.documento_asociado || doc.datos_extraidos?.documento_asociado || "otro";
      categoryMap.set(id, normalizeCategoryValue(raw));
    }
  }
}

function setDocParent(proyectoId, docId, parentId) {
  const map = getDocParentMap(proyectoId);
  map.set(String(docId), parentId ? String(parentId) : null);
}

function getDocCategory(doc, proyectoId) {
  const map = getDocCategoryMap(proyectoId);
  const id = String(doc.id || "");
  const persisted = map.get(id);
  if (persisted) return normalizeCategoryValue(persisted);
  return normalizeCategoryValue(doc.documento_asociado || doc.datos_extraidos?.documento_asociado || "otro");
}

function setDocCategory(proyectoId, docId, value) {
  const map = getDocCategoryMap(proyectoId);
  map.set(String(docId), normalizeCategoryValue(value));
}

function normalizeCategoryValue(value) {
  const v = String(value || "otro").trim().toLowerCase();
  if (v === "lista_produccion") return "abaco";
  if (DOC_CATEGORY_OPTIONS.some(option => option.value === v)) return v;
  return "otro";
}

function renderCategorySelect(doc, proyectoId) {
  const selected = getDocCategory(doc, proyectoId);
  const options = DOC_CATEGORY_OPTIONS.map(option => (
    `<option value="${esc(option.value)}" ${option.value === selected ? "selected" : ""}>${esc(option.label)}</option>`
  )).join("");
  return `<select class="docs-category-select" data-doc-category="${esc(doc.id)}">${options}</select>`;
}

function getDocFileUrl(doc) {
  const direct = doc.url_archivo || doc.archivo_url || doc.file_url || doc.download_url || doc.url || null;
  if (!direct) return null;
  const raw = String(direct).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
  return `/${raw}`;
}

function getQuickFilterLabel(key) {
  const bucket = DOCUMENT_QUICK_BUCKETS.find(item => item.key === key);
  return bucket?.label || "Filtro";
}

function getDocKind(doc) {
  const tipo = String(doc?.tipo_documento || "").toLowerCase();
  const mime = String(doc?.mime_type || "").toLowerCase();
  const file = String(doc?.nombre_archivo || "").toLowerCase();
  if (isDocumentFolder(doc)) return "folder";
  if (mime.includes("pdf") || file.endsWith(".pdf") || tipo === "oferta_pdf") return "pdf";
  if (mime.includes("sheet") || mime.includes("excel") || /\.(xlsx?|csv)$/i.test(file) || tipo === "abaco_lista" || tipo === "lista_produccion") return "excel";
  if (mime.includes("word") || /\.(docx?)$/i.test(file)) return "word";
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file)) return "image";
  return "file";
}

function isDocumentFolder(doc) {
  const tipo = String(doc?.tipo_documento || "").toLowerCase();
  return tipo === "carpeta" || Boolean(doc?.es_carpeta) || Boolean(doc?.datos_extraidos?.es_carpeta);
}

function bucketIconKind(key) {
  if (key === "oferta") return "pdf";
  if (key === "abaco") return "excel";
  if (key === "seguimiento_fabrica" || key === "seguimiento_obra") return "file";
  if (key === "otros") return "folder";
  return "file";
}

function getDocKindIcon(kind, size = "sm") {
  const cls = `docs-svg docs-svg-${size}`;
  const base = {
    folder: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7z"/><path d="M3 10h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"/></svg>`,
    pdf: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 15h2.2a1.8 1.8 0 0 0 0-3.6H8V17"/><path d="M12 17v-5.6h1.6a2.8 2.8 0 1 1 0 5.6H12z"/><path d="M17 11.4h-2V17"/></svg>`,
    excel: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 11l3 6"/><path d="M11 11l-3 6"/><path d="M13.5 13h3.5"/><path d="M13.5 16h3.5"/></svg>`,
    word: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 11l1.2 6L11 13l1.8 4 1.2-6"/></svg>`,
    image: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.4"/><path d="M20 16l-4.2-4.2a1.3 1.3 0 0 0-1.8 0L7 19"/></svg>`,
    file: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/></svg>`
  };
  return base[kind] || base.file;
}

function renderDocsViewIcon(mode) {
  if (mode === "list") {
    return '<svg class="docs-svg docs-svg-md" viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="7" x2="20" y2="7"/><line x1="6" y1="12" x2="20" y2="12"/><line x1="6" y1="17" x2="20" y2="17"/><circle cx="3.5" cy="7" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="17" r="1"/></svg>';
  }
  return '<svg class="docs-svg docs-svg-md" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>';
}

function formatTipoDocumento(doc) {
  const map = {
    carpeta: "Carpeta",
    oferta_pdf: "Oferta PDF",
    abaco_lista: "Ábaco",
    lista_produccion: "Ábaco",
    seguimiento_fabrica: "Seguimiento fábrica",
    seguimiento_obra: "Seguimiento obra",
    otro: "Otro"
  };
  return map[String(doc.tipo_documento || "").toLowerCase()] || "Documento";
}

function formatDocumentoAsociado(doc, proyectoId = null) {
  const base = proyectoId ? getDocCategory(doc, proyectoId) : (doc.documento_asociado || doc.datos_extraidos?.documento_asociado || "otro");
  const value = normalizeCategoryValue(base);
  const map = {
    oferta: "Oferta",
    abaco: "Ábaco",
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
        const isExpanded = card.classList.contains("is-open");

        viewContainer.querySelectorAll(".accordion-card.is-open").forEach(openCard => {
          openCard.classList.remove("is-open");
        });

        if (!isExpanded) {
          card.classList.add("is-open");
        }
        return;
      }
      
      const btnModule = e.target.closest(".btn-module");
      if (btnModule) {
        activeTab = btnModule.getAttribute("data-module");
        activeProjectId = btnModule.getAttribute("data-id");
        renderMain(container); // Re-renderizamos para montar la Vista 2
      }
    });
  }

<<<<<<< HEAD
=======
  // Modal de Nuevo Proyecto
  const modal = container.querySelector("#modal-proyecto");
  const form = container.querySelector("#form-proyecto");
  
  if (modal && form) {
    const openModal = () => {
      form.reset();
      container.querySelector("#modal-status-proyecto").textContent = "";
      modal.classList.add("open");
    };
    const closeModal = () => modal.classList.remove("open");

    container.querySelector("#btn-new-proyecto")?.addEventListener("click", openModal);
    container.querySelector("#close-modal-proyecto")?.addEventListener("click", closeModal);
    container.querySelector("#cancel-modal-proyecto")?.addEventListener("click", closeModal);

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      container.querySelector("#modal-status-proyecto").textContent = "Guardando...";
      try {
        await apiPost("/obras", data);
        closeModal();
        renderProyectos(container); // Recargar todo
      } catch (err) {
        container.querySelector("#modal-status-proyecto").textContent = err.message;
      }
    });
  }

  // Upload Oferta
  const fileOferta = container.querySelector("#file-oferta");
  if (fileOferta) {
    fileOferta.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const status = container.querySelector("#status-oferta");
      status.textContent = "Subiendo archivo y extrayendo datos...";
      
      const formData = new FormData();
      formData.append("archivo", file);
      
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`/api/admin/obras/${activeProjectId}/documentos/oferta`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        
        status.style.color = "var(--green)";
        status.textContent = "✅ Oferta procesada: " + (result.datos_extraidos?.oferta_nro || 'OK');
        
        // Timeout para refrescar y ver los cambios si queremos
        setTimeout(() => renderProyectos(container), 2000);
      } catch (error) {
        status.style.color = "var(--red)";
        status.textContent = "❌ Error: " + error.message;
      }
    });
  }

  // Upload Abaco
  const fileAbaco = container.querySelector("#file-abaco");
  if (fileAbaco) {
    fileAbaco.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const status = container.querySelector("#status-abaco");
      status.textContent = "Subiendo ábaco y procesando ítems...";
      
      const formData = new FormData();
      formData.append("archivo", file);
      
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`/api/admin/obras/${activeProjectId}/documentos/abaco`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        
        status.style.color = "var(--green)";
        status.textContent = "✅ Ábaco procesado. " + result.total_aberturas + " aberturas cargadas.";
        
        setTimeout(() => renderProyectos(container), 2000);
      } catch (error) {
        status.style.color = "var(--red)";
        status.textContent = "❌ Error: " + error.message;
      }
    });
  }
>>>>>>> 3399dfd (feat: agregar funcionalidad de Gantt y migraciones relacionadas)
}
