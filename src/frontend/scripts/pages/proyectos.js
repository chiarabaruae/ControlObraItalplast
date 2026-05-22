import { apiGet, apiPost, apiPut, apiDelete } from "../api.js";
import { icons, esc, renderBadge, renderProgress, renderEmpty, formatDate } from "../ui.js";
import { setTopbarSection } from "../layout.js";

// Estado de la aplicación
let obras = [];
let clientesList = [];
let searchTerm = "";
let currentView = "grid"; // Opciones: 'grid', 'list', 'kanban', 'gantt'
let activeProjectId = null; // ID del proyecto en "Pantalla 2" (Funcionalidad Específica)
let activeTab = null; // 'resumen', 'documentos', 'cronogramas', 'seguimientos'

export async function renderProyectos(container) {
  setTopbarSection("Proyectos");
  container.innerHTML = '<div class="loading">Cargando proyectos...</div>';

  try {
    [obras, clientesList] = await Promise.all([
      apiGet("/obras").catch(() => []),
      apiGet("/clientes").catch(() => [])
    ]);
    renderMain(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
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
            <button class="btn btn-ghost btn-sm ${currentView === 'kanban' ? 'active' : ''}" data-view="kanban" title="Vista Kanban">K</button>
            <button class="btn btn-ghost btn-sm ${currentView === 'gantt' ? 'active' : ''}" data-view="gantt" title="Vista Gantt Global">G</button>
          </div>
          <button class="btn btn-primary" id="btn-new-proyecto" type="button">${icons.plus} Nuevo Proyecto</button>
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
    
    ${renderModalNuevoProyecto()}
  `;

  const viewContainer = container.querySelector("#proyectos-view-container");
  
  if (obras.length === 0 && !searchTerm) {
    viewContainer.innerHTML = renderEmpty("No hay proyectos cargados", "Crea un nuevo proyecto para comenzar");
  } else {
    // Renderizamos la vista actual
    if (currentView === "grid") viewContainer.innerHTML = renderGridView();
    else if (currentView === "list") viewContainer.innerHTML = renderListView();
    else if (currentView === "kanban") viewContainer.innerHTML = renderKanbanView();
    else if (currentView === "gantt") viewContainer.innerHTML = renderGanttView();
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
  return `<div class="card"><div style="padding: 2rem; text-align: center; color: var(--muted);">Vista Lista (Popover) en construcción...</div></div>`;
}

function renderKanbanView() {
  return `<div style="padding: 2rem; text-align: center; color: var(--muted);">Vista Kanban en construcción...</div>`;
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
}

function renderContenidoModulo(tab, proyecto) {
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

function renderModalNuevoProyecto() {
  const clienteOpts = clientesList.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("");
  
  return `
    <div class="modal-overlay" id="modal-proyecto">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h2 id="modal-titulo-proyecto">Nuevo Proyecto</h2>
          <button class="btn-icon" id="close-modal-proyecto" type="button">${icons.close}</button>
        </div>
        <form id="form-proyecto">
          <div class="form-grid">
            <div class="form-field full-width"><label>Nombre del Proyecto *</label><input name="nombre" required></div>
            <div class="form-field"><label>Cliente</label><select name="cliente_id"><option value="">Seleccionar</option>${clienteOpts}</select></div>
            
            <div class="form-field full-width" style="margin-top:1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">
              <h3 style="font-size:0.9rem; margin:0; color: var(--muted);">Fechas Previstas (Opcional)</h3>
            </div>
            
            <div class="form-field"><label>Días de fábrica</label><input name="dias_fabrica" type="number"></div>
            <div class="form-field"><label>Inicio de Instalación (Comprometida)</label><input name="fecha_comprometida_inicio_instalacion" type="date"></div>
            <div class="form-field"><label>Días de instalación</label><input name="dias_instalacion" type="number"></div>
            <div class="form-field"><label>Fecha fin instalación</label><input name="fecha_fin_instalacion" type="date"></div>
          </div>
          <div class="modal-status" id="modal-status-proyecto"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="cancel-modal-proyecto">Cancelar</button>
            <button type="submit" class="btn btn-primary">Crear Proyecto</button>
          </div>
        </form>
      </div>
    </div>
  `;
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
      // faltan binds si hubiera lógica extra en las otras vistas
    });
  }

  // Acordeón y Navegación a Módulos
  const viewContainer = container.querySelector("#proyectos-view-container");
  if (viewContainer) {
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
}
