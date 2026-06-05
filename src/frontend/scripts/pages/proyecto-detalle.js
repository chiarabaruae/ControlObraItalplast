import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../api.js";
import { icons, esc, renderBadge, renderProgress, renderEmpty, formatDate } from "../ui.js";
import { setTopbarSection } from "../layout.js";
import { canAccessProjectWorkspace } from "../authz.js";

const SECTION_LABELS = {
  resumen: "Resumen",
  todo: "To-Do",
  documentos: "Documentos",
  cronogramas: "Cronogramas",
  seguimiento: "Seguimiento"
};

let state = {
  currentSection: "resumen",
  currentUser: null,
  projectEditing: false,
  projectDraft: null,
  cronogramaEditing: false,
  proyecto: null,
  cronograma: null,
  aberturas: [],
  seguimientoFabrica: null,
  seguimientoObra: null,
  usuariosActivos: [],
  tareas: [],
  documentos: [],
  docsView: "list",
  docsSearch: "",
  docsActionError: "",
  docsCurrentFolderId: null,
  docsSelectedId: null,
  docsFolderModalOpen: false,
  docsFolderName: "",
  docsFolderSubmitting: false,
  loading: true
};

export async function renderProyectoDetalle(container, id, currentUser = null, initialSection = "resumen") {
  if (!canAccessProjectWorkspace(currentUser?.role)) {
    setTopbarSection("Acceso restringido");
    container.innerHTML = `
      <div class="empty-state">
        <h3>Acceso restringido</h3>
        <p>Tu perfil no puede ver el detalle del proyecto. Usá la vista To-Do lateral.</p>
      </div>
    `;
    return;
  }

  setTopbarSection("Detalle de Proyecto");
  state = {
    ...state,
    currentUser,
    currentSection: initialSection || "resumen",
    projectEditing: false,
    projectDraft: null,
    cronogramaEditing: false,
    docsActionError: "",
    docsCurrentFolderId: state.docsCurrentFolderId || null,
    docsSelectedId: state.docsSelectedId || null,
    docsFolderModalOpen: false,
    docsFolderName: "",
    docsFolderSubmitting: false,
    loading: true
  };
  container.innerHTML = '<div class="loading">Cargando proyecto...</div>';

  try {
    const [proyecto, cronograma, aberturas, seguimientoFabrica, seguimientoObra, usuariosActivos, tareas, documentos] = await Promise.all([
      apiGet(`/obras/${id}`),
      apiGet(`/obras/${id}/cronograma`).catch(() => null),
      apiGet(`/obras/${id}/aberturas`).catch(() => []),
      apiGet(`/obras/${id}/seguimiento/fabrica`).catch(() => null),
      apiGet(`/obras/${id}/seguimiento/obra`).catch(() => null),
      apiGet("/usuarios/activos").catch(() => []),
      apiGet(`/tareas?obraId=${encodeURIComponent(id)}`).catch(() => []),
      apiGet(`/obras/${id}/documentos`).catch(() => [])
    ]);

    state = {
      ...state,
      proyecto,
      cronograma,
      aberturas,
      seguimientoFabrica,
      seguimientoObra,
      usuariosActivos,
      tareas,
      documentos,
      loading: false
    };
    renderWorkspace(container, id);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

function renderWorkspace(container, proyectoId) {
  const {
    currentSection,
    currentUser,
    projectEditing,
    projectDraft,
    proyecto,
    cronograma,
    aberturas,
    seguimientoFabrica,
    seguimientoObra,
    usuariosActivos,
    tareas,
    documentos
  } = state;

  const liderUsuario = usuariosActivos.find(u => String(u.id) === String(proyecto?.lider_usuario_id || ""));
  const etapaLabel = proyecto?.estado || "planificada";
  const canEditProject = currentUser?.role === "administrator";
  const canManageProject = canManageProjectWorkspace(proyecto, currentUser);
  const draft = projectDraft || proyecto || {};
  const liderPrincipal = proyecto?.lider_nombre || liderUsuario?.display_name || proyecto?.responsable || "No asignado";
  const showHeaderMeta = currentSection !== "resumen";
  const formatInputDate = (value) => {
    if (!value) return "";
    const str = String(value);
    return str.includes("T") ? str.slice(0, 10) : str.slice(0, 10);
  };

  container.innerHTML = `
    <div class="project-workspace">
      <div class="page-header project-page-header">
        <button class="btn btn-ghost btn-sm project-back-button" id="btn-volver-proyectos" type="button">${icons.back} Volver al listado</button>
        <div class="project-hero-row ${showHeaderMeta ? "" : "project-hero-row--summary"}">
          <div class="project-identity-card">
            <div class="eyebrow">PROYECTO</div>
            ${
              projectEditing
                ? `
                  <div class="project-edit-stack">
                    <div class="form-field">
                      <label>Nombre del proyecto</label>
                      <input id="project-name" type="text" value="${esc(draft.nombre || "")}" />
                    </div>
                    <div class="form-field">
                      <label>Descripción</label>
                      <textarea id="project-description" rows="2">${esc(draft.descripcion || "")}</textarea>
                    </div>
                  </div>
                `
                : `
                  <div class="project-title-row">
                    <h1>${esc(proyecto?.nombre || "-")}</h1>
                    ${
                      canEditProject
                        ? `<button class="project-inline-edit-button project-inline-edit-button-icon" id="btn-editar-proyecto" type="button" aria-label="Editar proyecto" title="Editar proyecto">${icons.edit}</button>`
                        : ""
                    }
                  </div>
                  <p class="subtitle">${esc(proyecto?.descripcion || "Sin descripción")}</p>
                `
            }
          </div>

          ${
            showHeaderMeta
              ? `
                <div class="project-header-meta">
                  <div>
                    <span class="project-meta-label">Cliente</span>
                    <strong>${esc(proyecto?.cliente_nombre || "Sin cliente")}</strong>
                  </div>
                  <div>
                    <span class="project-meta-label">Líder</span>
                    ${
                      projectEditing && canEditProject
                        ? `
                          <div class="form-field project-meta-field">
                            <select id="lider-usuario" name="lider_usuario_id">
                              <option value="">Sin asignar</option>
                              ${(usuariosActivos || []).map(u => `<option value="${esc(u.id)}" ${String(u.id) === String((draft.lider_usuario_id ?? proyecto?.lider_usuario_id) || "") ? "selected" : ""}>${esc(u.display_name)}</option>`).join("")}
                            </select>
                          </div>
                        `
                        : `<strong>${esc(liderPrincipal)}</strong>`
                    }
                  </div>
                  <div>
                    <span class="project-meta-label">Fin</span>
                    ${
                      projectEditing
                        ? `<div class="form-field project-meta-field"><input id="project-end-date" type="date" value="${esc(formatInputDate(draft.fecha_fin_estimada || proyecto?.fecha_fin_estimada))}"></div>`
                        : `<strong>${esc(formatDate(proyecto?.fecha_fin_estimada) || "-")}</strong>`
                    }
                  </div>
                  <div>
                    <span class="project-meta-label">Etapa</span>
                    ${renderBadge(etapaLabel)}
                  </div>
                </div>
              `
              : ""
          }

          ${
            canEditProject && projectEditing
              ? `
                <div class="project-header-actions">
                  <button class="btn btn-ghost btn-sm" id="btn-cancelar-edicion-proyecto" type="button">Cancelar</button>
                  <button class="btn btn-primary btn-sm" id="btn-guardar-proyecto" type="button">Guardar cambios</button>
                  <div class="modal-status" id="status-proyecto"></div>
                </div>
              `
              : ""
          }
        </div>
      </div>

      <div class="project-module-bar" role="navigation" aria-label="Menú de proyecto">
        ${menuButton("resumen", currentSection)}
        ${menuButton("todo", currentSection)}
        ${menuButton("documentos", currentSection)}
        ${menuButton("cronogramas", currentSection)}
        ${menuButton("seguimiento", currentSection)}
      </div>

      <div class="project-content">
        ${renderSection(currentSection, { proyecto, cronograma, aberturas, seguimientoFabrica, seguimientoObra, usuariosActivos, tareas, documentos, proyectoId, currentUser, canManageProject })}
      </div>
    </div>
  `;

  bindWorkspaceEvents(container, proyectoId);
}

function menuButton(section, currentSection) {
  const active = section === currentSection ? "is-active" : "";
  return `<button class="project-module-button ${active}" type="button" data-project-section="${section}">
    <span>${SECTION_LABELS[section]}</span>
  </button>`;
}

function renderSection(section, data) {
  if (section === "todo") return renderTodoSection(data);
  if (section === "documentos") return renderDocumentosSection(data);
  if (section === "cronogramas") return renderCronogramasSection(data);
  if (section === "seguimiento") return renderSeguimientoSection(data);
  return renderResumenSection(data);
}

function isProjectLeader(proyecto, currentUser) {
  return Boolean(proyecto?.lider_usuario_id && currentUser?.id && String(proyecto.lider_usuario_id) === String(currentUser.id));
}

function canManageProjectWorkspace(proyecto, currentUser) {
  return currentUser?.role === "administrator" || isProjectLeader(proyecto, currentUser);
}

function renderResumenSection({ proyecto, usuariosActivos, tareas }) {
  const liderUsuario = usuariosActivos.find(u => String(u.id) === String(proyecto?.lider_usuario_id || ""));
  const totalTasks = tareas.length;
  const doneTasks = tareas.filter(t => t.estado === "finalizada").length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const liderPrincipal = proyecto?.lider_nombre || liderUsuario?.display_name || proyecto?.responsable || "No asignado";

  return `
    <section class="project-section">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>Resumen del proyecto</h2>
            <p>Dashboard y avance general</p>
          </div>
        </div>
        <div class="project-summary-grid">
          <div>
            <p class="project-summary-label">Cliente</p>
            <p><strong>${esc(proyecto?.cliente_nombre || "-")}</strong></p>
          </div>
          <div>
            <p class="project-summary-label">Líder / Responsable</p>
            <p><strong>${esc(liderPrincipal)}</strong></p>
          </div>
          <div>
            <p class="project-summary-label">Fechas</p>
            <p><strong>${esc(formatDate(proyecto?.fecha_inicio) || "-")} a ${esc(formatDate(proyecto?.fecha_fin_estimada) || "-")}</strong></p>
          </div>
          <div>
            <p class="project-summary-label">Avance General</p>
            ${renderProgress(proyecto?.avance || 0)}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-header">
          <div>
            <h2>Estado operativo</h2>
            <p>${totalTasks} tareas, ${doneTasks} finalizadas</p>
          </div>
        </div>
        <div style="padding: 1.25rem;">
          ${renderProgress(taskPct)}
        </div>
      </div>
    </section>
  `;
}

function renderTodoSection({ tareas, usuariosActivos, proyectoId, currentUser }) {
  const canManageTasks = currentUser?.role === "administrator";
  return `
    <section class="project-section">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>To-Do del proyecto</h2>
            <p>${tareas.length} tareas</p>
          </div>
          ${canManageTasks ? `<button class="btn btn-primary btn-sm" id="btn-new-tarea-proyecto" type="button">${icons.plus} Nueva</button>` : ""}
        </div>
        ${tareas.length ? renderTareasProyecto(tareas, canManageTasks) : renderEmpty("Sin tareas", "Crea la primera tarea del proyecto.")}
      </div>
      ${renderModalTareaProyecto(proyectoId, usuariosActivos)}
    </section>
  `;
}

function renderDocumentosSection({ documentos, canManageProject }) {
  const docsContext = getProjectDocumentsContext(documentos);
  const filtered = filterProjectDocuments(docsContext.visibleDocuments, state.docsSearch);
  const breadcrumbs = getProjectDocsBreadcrumbs(documentos, state.docsSelectedId || state.docsCurrentFolderId);

  return `
    <section class="project-section">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>Documentos</h2>
            <p>Archivos y adjuntos del proyecto</p>
          </div>
        </div>
        <div class="project-docs-shell">
          ${breadcrumbs.length ? renderProjectDocsBreadcrumbs(breadcrumbs) : ""}
          <div class="docs-toolbar docs-toolbar-standalone project-docs-toolbar">
            <label class="search-input docs-search">
              ${icons.search}
              <input id="docs-search-input" type="text" placeholder="Buscar archivos..." value="${esc(state.docsSearch)}">
            </label>
            <div class="docs-view-toggle" role="tablist" aria-label="Modo de vista">
              <button class="btn-icon ${state.docsView === "list" ? "is-active" : ""}" type="button" data-docs-view="list" title="Vista lista" aria-label="Vista lista">${renderDocsViewIcon("list")}</button>
              <button class="btn-icon ${state.docsView === "grid" ? "is-active" : ""}" type="button" data-docs-view="grid" title="Vista grilla" aria-label="Vista grilla">${renderDocsViewIcon("grid")}</button>
            </div>
            ${
              canManageProject
                ? `<button class="btn btn-ghost project-docs-folder-button" id="btn-docs-folder" type="button">${icons.folder} Nueva carpeta</button>`
                : ""
            }
            ${
              canManageProject
                ? `<button class="btn btn-primary" id="btn-docs-upload" type="button">${icons.upload} Subir</button>`
                : ""
            }
            <input id="docs-upload-input" type="file" hidden accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx,.webp,.gif,.svg" />
          </div>
          ${
            state.docsActionError
              ? `<div class="project-docs-status"><p class="modal-status">${esc(state.docsActionError)}</p></div>`
              : ""
          }
          ${
            !canManageProject
              ? `<p class="project-docs-readonly-note">Solo el líder asignado o el administrador pueden subir archivos y crear carpetas.</p>`
              : ""
          }
          <div class="docs-file-area project-docs-file-area">
            ${
              state.docsView === "grid"
                ? renderProjectDocumentsGrid(filtered)
                : renderProjectDocumentsTable(filtered)
            }
          </div>
        </div>
        ${renderProjectDocsFolderModal()}
      </div>
    </section>
  `;
}

function renderCronogramasSection({ proyecto, cronograma, proyectoId, currentUser, seguimientoFabrica, seguimientoObra }) {
  const c = cronograma || {};
  const fecha = c.fecha_comprometida_inicio_instalacion ? String(c.fecha_comprometida_inicio_instalacion).slice(0, 10) : "";
  const diasFabrica = c.dias_fabrica ?? "";
  const diasInstalacion = c.dias_instalacion ?? "";
  const canEditCronograma = canManageProjectWorkspace(proyecto, currentUser);
  const editing = Boolean(state.cronogramaEditing);
  const disabled = !editing || !canEditCronograma;

  return `
    <section class="project-section">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div>
            <h2>Ajustes de cronograma</h2>
            <p>Puedes completar estos campos mas adelante.</p>
          </div>
        </div>
        <form id="form-cronograma-editor" class="project-schedule-form">
          <div class="project-schedule-grid">
            <div class="form-field">
              <label>Fecha inicio instalación</label>
              <input name="fecha_comprometida_inicio_instalacion" type="date" value="${esc(fecha)}" ${disabled ? "disabled" : ""}>
            </div>
            <div class="form-field">
              <label>Días de fábrica</label>
              <input name="dias_fabrica" type="number" min="1" value="${esc(diasFabrica)}" ${disabled ? "disabled" : ""}>
            </div>
            <div class="form-field">
              <label>Días de instalación</label>
              <input name="dias_instalacion" type="number" min="0" value="${esc(diasInstalacion)}" ${disabled ? "disabled" : ""}>
            </div>
            <div class="project-schedule-actions">
              ${
                canEditCronograma && editing
                  ? `
                    <button class="btn btn-ghost btn-sm" id="btn-cancelar-edicion-cronograma" type="button">Cancelar</button>
                    <button class="btn btn-primary btn-sm" type="submit">Guardar ajustes</button>
                  `
                  : canEditCronograma
                    ? `<button class="project-inline-edit-button" id="btn-editar-cronograma-inline" type="button">${icons.edit} Editar</button>`
                    : ""
              }
              <div class="modal-status" id="status-cronograma"></div>
            </div>
          </div>
        </form>
      </div>

      ${cronograma ? renderCronogramaActivo(c, seguimientoFabrica, seguimientoObra) : renderCronogramaVacio(proyectoId)}
    </section>
  `;
}

function renderSeguimientoSection({ proyecto, cronograma, aberturas, seguimientoFabrica, seguimientoObra, proyectoId, currentUser, canManageProject }) {
  const hasAbaco = Boolean(aberturas && aberturas.length);
  return `
    <section class="project-section">
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div>
            <h2>Seguimiento</h2>
            <p>Fábrica y obra</p>
          </div>
        </div>
        <div style="padding:1.25rem; display:grid; gap:1rem;">
          ${renderAbacoUploadCard(hasAbaco, canManageProject)}
          ${hasAbaco ? renderAbacoExtractedTable(aberturas) : ""}
          ${!cronograma ? renderEmpty("Falta cronograma", "Primero generá el cronograma del proyecto.") : ""}
          ${cronograma && hasAbaco && !seguimientoFabrica ? renderSeguimientoStarter("fabrica", aberturas, "Seguimiento de fábrica", "Generar seguimiento", canManageProject) : cronograma && hasAbaco ? renderSeguimientoTable(seguimientoFabrica, canManageProject) : ""}
          ${cronograma && hasAbaco && !seguimientoObra ? renderSeguimientoStarter("obra", aberturas, "Seguimiento de obra", "Generar seguimiento", canManageProject) : cronograma && hasAbaco ? renderSeguimientoTable(seguimientoObra, canManageProject) : ""}
        </div>
      </div>
    </section>
  `;
}

function renderAbacoUploadCard(hasAbaco, canManageProject) {
  return `
    <div class="card" style="border-style:${hasAbaco ? "solid" : "dashed"};">
      <div class="card-header">
        <div>
          <h2>${hasAbaco ? "Ábaco cargado" : "Ábaco"}</h2>
          <p>${hasAbaco ? "Podés reemplazar el PDF si necesitás volver a generar el seguimiento." : "Sube el PDF del ábaco para extraer los componentes y habilitar fábrica y obra."}</p>
        </div>
      </div>
      <div style="padding:1.25rem; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <input type="file" id="file-abaco" accept=".pdf" style="display:none;">
        ${
          canManageProject
            ? `<button class="btn btn-primary" id="btn-subir-abaco" type="button">${icons.upload} ${hasAbaco ? "Reemplazar PDF del ábaco" : "Subir PDF del ábaco"}</button>`
            : `<span class="project-docs-readonly-note">Solo el líder asignado o el administrador pueden cargar o reemplazar el PDF del ábaco.</span>`
        }
        <div class="modal-status" id="status-abaco"></div>
      </div>
    </div>
  `;
}

function renderCronogramaVacio(proyectoId) {
  return `
    <div class="card" id="oferta-upload-container">
      <div class="card-header"><h2>Cronograma</h2></div>
      <div style="padding: 1.25rem;">
        ${renderEmpty("No hay oferta cargada", "Subir oferta PDF para generar el cronograma.")}
        <div style="margin-top: 1rem; display:flex; gap: 12px; flex-wrap: wrap;">
          <input type="file" id="file-oferta" accept=".pdf" style="display:none">
          <button class="btn btn-primary" id="btn-subir-oferta" type="button">${icons.upload} Subir oferta PDF</button>
        </div>
        <div style="margin-top:12px" class="modal-status" id="status-oferta"></div>
      </div>
    </div>
    <div class="card" id="wizard-cronograma" style="display:none; margin-top:16px;">
      <div class="card-header">
        <h2>Wizard de Cronograma</h2>
        <p style="color:var(--muted); font-size: 0.875rem;">Estos son los datos detectados de la oferta. ¿Deseás corregir algo antes de generar el cronograma?</p>
      </div>
      <form id="form-cronograma" style="padding: 1.25rem;">
        <input type="hidden" id="wizard-doc-id" name="documento_oferta_id">
        <div class="form-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="form-field"><label>Nro. Oferta</label><input name="oferta_nro" id="wiz-oferta"></div>
          <div class="form-field"><label>Cliente</label><input name="cliente" id="wiz-cliente"></div>
          <div class="form-field"><label>Proyecto</label><input name="nombre_proyecto" id="wiz-proyecto"></div>
          <div class="form-field"><label>Serie(s)</label><input name="serie" id="wiz-serie"></div>
          <div class="form-field"><label>Total Aberturas</label><input name="total_aberturas" type="number" id="wiz-aberturas"></div>
          <div class="form-field"><label>Líder del proyecto</label><input name="lider_proyecto" required></div>
          <div class="form-field"><label>Días de fábrica</label><input type="number" name="dias_fabrica" value="15" required></div>
          <div class="form-field"><label>Días instalación</label><input type="number" name="dias_instalacion" value="5" required></div>
          <div class="form-field full-width"><label>Fecha comprometida inicio instalación *</label><input type="date" name="fecha_comprometida_inicio_instalacion" required></div>
        </div>
        <div style="margin-top: 1.5rem; text-align: right;">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-cronograma">Cancelar</button>
          <button type="submit" class="btn btn-primary">Confirmar y Generar</button>
        </div>
      </form>
    </div>
  `;
}

function renderCronogramaActivo(c, seguimientoFabrica, seguimientoObra) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h2>Cronograma del proyecto</h2>
          <p>Resumen operativo y vista temporal basada en seguimiento.</p>
        </div>
      </div>
      <div class="project-schedule-summary">
        <div class="project-schedule-summary-item project-schedule-summary-item-highlight">
          <span>Nro. Oferta</span>
          <strong>${esc(c.oferta_nro || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Cliente</span>
          <strong>${esc(c.cliente || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Líder del proyecto</span>
          <strong>${esc(c.lider_proyecto || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Serie</span>
          <strong>${esc(c.serie || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Total aberturas</span>
          <strong>${esc(c.total_aberturas || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Días fábrica</span>
          <strong>${esc(c.dias_fabrica ?? "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Días instalación</span>
          <strong>${esc(c.dias_instalacion ?? "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Límite firma ábaco</span>
          <strong>${esc(c.fecha_limite_firma_abaco?.slice(0, 10) || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Inicio fábrica</span>
          <strong>${esc(c.inicio_fabrica?.slice(0, 10) || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Fin producción</span>
          <strong>${esc(c.fecha_compromiso_fin_produccion?.slice(0, 10) || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Inicio instalación</span>
          <strong>${esc(c.fecha_comprometida_inicio_instalacion?.slice(0, 10) || "-")}</strong>
        </div>
        <div class="project-schedule-summary-item">
          <span>Fin instalación</span>
          <strong>${esc(c.fin_instalacion?.slice(0, 10) || "-")}</strong>
        </div>
      </div>
      ${renderProjectTimelineGantt(c, seguimientoFabrica, seguimientoObra)}
    </div>
  `;
}

function renderSeguimientoStarter(tipo, aberturas, title, buttonLabel, canManageProject) {
  if (!aberturas || !aberturas.length) {
    return renderEmpty("No hay ábaco cargado", "Sube el PDF del ábaco para continuar.");
  }

  return `
    <div class="project-followup-card">
      <div>
        <h3 style="margin-bottom:6px;">${esc(title)}</h3>
        <p style="color:var(--muted); margin:0;">Ábaco cargado con ${aberturas.length} componentes listos para generar etapas.</p>
      </div>
      ${
        canManageProject
          ? `<button class="btn btn-primary" type="button" data-seguimiento-tipo="${esc(tipo)}">${esc(buttonLabel)}</button>`
          : `<span class="project-docs-readonly-note">Solo el líder asignado o el administrador pueden generarlo.</span>`
      }
    </div>
  `;
}

function renderSeguimientoTable(data, canManageProject) {
  if (!data) return "";
  if (!data.etapas || !data.avances_aberturas) return "<p>Error: Datos incompletos</p>";

  const headers = data.etapas.map(e => `<th>${esc(e.nombre)}</th>`).join("");
  const rows = data.avances_aberturas.map(ab => {
    const celdasEtapas = data.etapas.map(e => {
      const etapaData = ab.etapas_estado?.find(ee => ee.etapa_seguimiento_id === e.id);
      if (!etapaData) return `<td>-</td>`;
      const color = etapaData.estado === "completada" ? "var(--exito)" : (etapaData.estado === "en_proceso" ? "var(--alerta)" : "var(--borde)");
      const label = etapaData.estado === "completada" ? "C" : (etapaData.estado === "en_proceso" ? "P" : "-");
      return `<td style="text-align:center;"><button class="btn-etapa-toggle" data-id="${etapaData.id}" data-estado="${etapaData.estado}" ${canManageProject ? "" : "disabled"} style="width:100%; padding:0.5rem; background:${color}; border:none; border-radius:4px; color:${etapaData.estado === "pendiente" ? "var(--texto-sec)" : "#fff"}; cursor:${canManageProject ? "pointer" : "not-allowed"}; font-weight:bold;">${label}</button></td>`;
    }).join("");

    return `<tr>
      <td><strong>${ab.numero}</strong></td>
      <td>${esc(ab.cod_posicion)}</td>
      <td>${esc(ab.ambiente)}</td>
      <td>${ab.cantidad}</td>
      <td>${ab.ancho_mm}x${ab.largo_mm}</td>
      ${celdasEtapas}
    </tr>`;
  }).join("");

  return `
    <div class="project-followup-card">
      <div>
        <h3 style="margin-bottom:6px;">Seguimiento ${esc(data.tipo || "").toLowerCase()}</h3>
        <p style="font-size:0.875rem; color:var(--muted)">Haz clic en las celdas para cambiar el estado: <strong>[-]</strong> Pendiente, <strong>[P]</strong> En proceso, <strong>[C]</strong> Completado.</p>
      </div>
      ${
        canManageProject
          ? ""
          : `<span class="project-docs-readonly-note">Solo lectura para este perfil.</span>`
      }
    </div>
    <div class="table-wrap">
      <table class="tabla-seguimiento" style="min-width:800px;">
        <thead>
          <tr>
            <th>Nº</th><th>Cod</th><th>Ambiente</th><th>Cant</th><th>Medidas</th>
            ${headers}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTareasProyecto(list, canManageTasks) {
  return `<div class="table-wrap"><table>
    <thead><tr><th></th><th>Tarea</th><th>Responsable</th><th>Estado</th><th>Prioridad</th><th>Fin</th><th>Validado por</th><th></th></tr></thead>
    <tbody>${list.map(t => {
      const done = t.estado === "finalizada";
      return `<tr>
        <td><button class="btn-icon" data-toggle-tarea-proy="${t.id}" data-complete="${done}" type="button" title="${done ? "Reabrir" : "Completar"}" ${canManageTasks ? "" : "disabled"}>
          ${done ? icons.check : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'}
        </button></td>
        <td style="${done ? "text-decoration:line-through;opacity:.6" : ""}"><strong>${esc(t.titulo)}</strong></td>
        <td>${esc(t.responsable_name || t.responsable || "-")}</td>
        <td>${renderBadge(t.estado)}</td>
        <td>${renderBadge(t.prioridad)}</td>
        <td>${formatDate(t.fecha_fin)}</td>
        <td>${esc(t.completada_por_name || "-")}</td>
        <td class="row-actions">
          ${canManageTasks ? `<button class="btn btn-ghost btn-sm" data-edit-tarea-proy="${t.id}" type="button">${icons.edit}</button>` : ""}
          ${canManageTasks ? `<button class="btn btn-danger btn-sm" data-delete-tarea-proy="${t.id}" type="button">${icons.trash}</button>` : ""}
        </td>
      </tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function renderModalTareaProyecto(obraId, usuariosActivos) {
  const responsableOpts = (usuariosActivos || [])
    .map(u => `<option value="${esc(u.id)}">${esc(u.display_name)} (${esc(u.username)})</option>`)
    .join("");

  return `<div class="modal-overlay" id="modal-tarea-proyecto">
    <div class="modal-card">
      <div class="modal-header">
        <h2 id="modal-titulo-tarea-proyecto">Nueva tarea</h2>
        <button class="btn-icon" id="close-modal-tarea-proyecto" type="button">${icons.close}</button>
      </div>
      <form id="form-tarea-proyecto">
        <input type="hidden" name="obra_id" value="${esc(obraId)}">
        <div class="form-grid">
          <div class="form-field full-width"><label>Título *</label><input name="titulo" required></div>
          <div class="form-field full-width">
            <label>Responsable</label>
            <select name="responsable_id" id="responsable-tarea-proyecto">
              <option value="">Sin asignar</option>
              ${responsableOpts}
            </select>
          </div>
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
  </div>`;
}

function renderProjectDocumentsTable(documentos) {
  if (!documentos.length) {
    return renderEmpty("Sin documentos", "Carga un documento o crea una carpeta para comenzar.");
  }

  return `
    <div class="table-wrap">
      <table class="docs-table project-docs-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Fecha modificación</th>
            <th>Tamaño</th>
            <th>Propietario</th>
          </tr>
        </thead>
        <tbody>
          ${documentos.map(doc => {
            const kind = getProjectDocKind(doc);
            const isFolder = isProjectDocumentFolder(doc);
            const rowClass = `${isFolder ? "project-doc-row is-folder" : "project-doc-row is-file"} ${String(state.docsSelectedId || "") === String(doc.id || "") ? "is-selected" : ""}`;
            return `
              <tr class="${rowClass}" data-doc-select="${esc(doc.id)}">
                <td>
                  <div class="docs-name-cell">
                    <span class="docs-kind-icon ${kind}">${renderProjectDocKindIcon(kind, "sm")}</span>
                    <div class="docs-name-block">
                      <button
                        class="project-doc-link"
                        type="button"
                        ${isFolder ? `data-doc-enter="${esc(doc.id)}"` : `data-doc-open="${esc(doc.id)}"`}
                      >
                        ${esc(doc.nombre_archivo || "Sin nombre")}
                      </button>
                      <small>${esc(isProjectDocumentFolder(doc) ? "Carpeta" : formatProjectDocumentType(doc))}</small>
                    </div>
                  </div>
                </td>
                <td>${esc(formatProjectDocDate(doc.actualizado_en || doc.creado_en) || "-")}</td>
                <td>${esc(formatProjectDocSize(doc))}</td>
                <td>${esc(doc.subido_por || "Sistema")}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAbacoExtractedTable(aberturas) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h2>Componentes detectados del ábaco</h2>
          <p>Vista previa del PDF procesado para fábrica, cronograma y seguimiento.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="project-docs-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Posición</th>
              <th>Ambiente</th>
              <th>Cantidad</th>
              <th>Ancho</th>
              <th>Largo</th>
              <th>Serie</th>
              <th>Color</th>
              <th>Tipo de vidrio</th>
            </tr>
          </thead>
          <tbody>
            ${aberturas.map((ab) => `
              <tr>
                <td>${esc(ab.numero || "-")}</td>
                <td><strong>${esc(ab.cod_posicion || "-")}</strong></td>
                <td>${esc(ab.ambiente || "-")}</td>
                <td>${esc(ab.cantidad || 0)}</td>
                <td>${esc(ab.ancho_mm || "-")}</td>
                <td>${esc(ab.largo_mm || "-")}</td>
                <td>${esc(ab.serie || "-")}</td>
                <td>${esc(ab.color || "-")}</td>
                <td>${esc(ab.tipo_vidrio || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProjectTimelineGantt(cronograma, seguimientoFabrica, seguimientoObra) {
  const lanes = buildProjectTimelineLanes(cronograma, seguimientoFabrica, seguimientoObra);
  if (!lanes.length) {
    return `
      <div class="project-timeline-empty">
        ${renderEmpty("Aún no hay etapas de seguimiento", "Genera el seguimiento de fábrica u obra para ver el Gantt del proyecto aquí.")}
      </div>
    `;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const timestamps = lanes.flatMap((lane) => [lane.start.getTime(), lane.end.getTime()]);
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));
  minDate.setDate(minDate.getDate() - 1);
  maxDate.setDate(maxDate.getDate() + 1);

  const totalDays = Math.max(1, Math.round((maxDate - minDate) / dayMs) + 1);
  const timelineWidth = totalDays * 28;
  const dayCells = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(minDate);
    date.setDate(minDate.getDate() + index);
    return `<span>${date.getDate()}</span>`;
  }).join("");

  const renderRow = (lane) => {
    const left = Math.max(0, Math.round((lane.start - minDate) / dayMs)) * 28;
    const width = Math.max(28, (Math.round((lane.end - lane.start) / dayMs) + 1) * 28);
    return `
      <div class="project-timeline-row">
        <div class="project-timeline-side">
          <strong>${esc(lane.label)}</strong>
          <small>${esc(lane.group)}</small>
        </div>
        <div class="project-timeline-track" style="width:${timelineWidth}px;">
          <div class="project-timeline-bar ${lane.variant}" style="left:${left}px; width:${width}px;">
            <span>${esc(lane.label)}</span>
          </div>
        </div>
      </div>
    `;
  };

  return `
    <div class="project-timeline-card">
      <div class="project-timeline-head">
        <div>
          <h3>Vista Gantt del proyecto</h3>
          <p>Las etapas se distribuyen sobre las ventanas planificadas de fábrica y obra.</p>
        </div>
      </div>
      <div class="project-timeline-wrap">
        <div class="project-timeline-header">
          <div class="project-timeline-side project-timeline-side-header">Etapa</div>
          <div class="project-timeline-scale" style="width:${timelineWidth}px;">${dayCells}</div>
        </div>
        <div class="project-timeline-body">
          ${lanes.map(renderRow).join("")}
        </div>
      </div>
    </div>
  `;
}

function buildProjectTimelineLanes(cronograma, seguimientoFabrica, seguimientoObra) {
  const lanes = [];
  lanes.push(...buildTimelineStages("Fábrica", seguimientoFabrica?.etapas || [], cronograma?.inicio_fabrica, cronograma?.fecha_compromiso_fin_produccion, "factory"));
  lanes.push(...buildTimelineStages("Obra", seguimientoObra?.etapas || [], cronograma?.fecha_comprometida_inicio_instalacion, cronograma?.fin_instalacion, "site"));
  return lanes;
}

function buildTimelineStages(group, etapas, startValue, endValue, variant) {
  const start = parseDateValue(startValue);
  const end = parseDateValue(endValue);
  if (!start || !end || !etapas.length) return [];

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((end - start) / dayMs) + 1);

  return etapas.map((etapa, index) => {
    const startOffset = Math.floor((totalDays * index) / etapas.length);
    const endOffset = Math.max(startOffset, Math.floor((totalDays * (index + 1)) / etapas.length) - 1);
    const laneStart = new Date(start);
    laneStart.setDate(start.getDate() + startOffset);
    const laneEnd = new Date(start);
    laneEnd.setDate(start.getDate() + endOffset);

    return {
      group,
      label: etapa.nombre || `Etapa ${index + 1}`,
      start: laneStart,
      end: laneEnd,
      variant: `${variant}-${index % 4}`
    };
  });
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function renderProjectDocumentsGrid(documentos) {
  if (!documentos.length) {
    return renderEmpty("Sin documentos", "Carga un documento o crea una carpeta para comenzar.");
  }

  return `
    <div class="docs-grid project-docs-grid">
      ${documentos.map(doc => {
        const kind = getProjectDocKind(doc);
        const isFolder = isProjectDocumentFolder(doc);
        const isSelected = String(state.docsSelectedId || "") === String(doc.id || "");
        return `
          <article class="docs-grid-item project-docs-grid-item ${isSelected ? "is-selected" : ""}" data-doc-select="${esc(doc.id)}">
            <header class="docs-grid-head">
              <div class="docs-grid-icon ${kind}">${renderProjectDocKindIcon(kind, "md")}</div>
            </header>
            <button
              class="project-doc-link project-doc-link-grid"
              type="button"
              title="${esc(doc.nombre_archivo || "Sin nombre")}"
              ${isFolder ? `data-doc-enter="${esc(doc.id)}"` : `data-doc-open="${esc(doc.id)}"`}
            >
              ${esc(doc.nombre_archivo || "Sin nombre")}
            </button>
            <p>${esc(isProjectDocumentFolder(doc) ? "Carpeta" : formatProjectDocumentType(doc))}</p>
            <footer class="docs-grid-foot">
              <small>${esc(formatProjectDocDate(doc.actualizado_en || doc.creado_en) || "-")}</small>
              <small>${esc(formatProjectDocSize(doc))}</small>
            </footer>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderProjectDocsBreadcrumbs(breadcrumbs) {
  const items = breadcrumbs.map((crumb, index) => {
    const isLast = index === breadcrumbs.length - 1;
    if (isLast) {
      return `<span class="project-docs-crumb is-current">${esc(crumb.nombre_archivo || "Sin nombre")}</span>`;
    }
    return `<button class="project-docs-crumb" type="button" data-docs-crumb="${esc(crumb.id)}">${esc(crumb.nombre_archivo || "Sin nombre")}</button>`;
  }).join('<span class="project-docs-crumb-sep">/</span>');

  return `
    <div class="project-docs-breadcrumbs">
      <span class="project-docs-breadcrumb-label">Ruta</span>
      <div class="project-docs-breadcrumb-trail">
        <button class="project-docs-crumb" type="button" data-docs-root>Inicio</button>
        <span class="project-docs-crumb-sep">/</span>
        ${items}
      </div>
    </div>
  `;
}

function renderProjectDocsFolderModal() {
  if (!state.docsFolderModalOpen) return "";

  return `
    <div class="modal-overlay open" id="docs-folder-modal-overlay">
      <div class="modal-card docs-folder-modal-card" role="dialog" aria-modal="true" aria-labelledby="docs-folder-modal-title">
        <div class="modal-header">
          <h2 id="docs-folder-modal-title">Crear nueva carpeta</h2>
          <button class="btn-icon" type="button" id="btn-docs-folder-modal-close" aria-label="Cerrar">${icons.close}</button>
        </div>
        <p class="docs-folder-modal-text">Ingresa el nombre de la carpeta que quieres crear dentro de este proyecto.</p>
        <div class="form-field">
          <label for="docs-folder-name-input">Nombre de la carpeta</label>
          <input
            id="docs-folder-name-input"
            type="text"
            placeholder="Ej: Contratos, Fotos, Avances"
            value="${esc(state.docsFolderName)}"
            maxlength="120"
          >
        </div>
        <div class="modal-status" id="status-docs-folder"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" type="button" id="btn-docs-folder-cancel">Cancelar</button>
          <button class="btn btn-primary" type="button" id="btn-docs-folder-create" ${state.docsFolderSubmitting || !String(state.docsFolderName || "").trim() ? "disabled" : ""}>
            ${state.docsFolderSubmitting ? "Creando..." : "Crear carpeta"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function getProjectDocumentsContext(documentos = []) {
  const allDocuments = documentos || [];
  const currentFolder = allDocuments.find((doc) => String(doc.id) === String(state.docsCurrentFolderId || ""));
  if (state.docsCurrentFolderId && !currentFolder) {
    state.docsCurrentFolderId = null;
  }

  const visibleDocuments = sortProjectDocuments(
    allDocuments.filter((doc) => String(getProjectDocumentParentId(doc) || "") === String(state.docsCurrentFolderId || ""))
  );

  return {
    currentFolder,
    visibleDocuments
  };
}

function getProjectDocumentParentId(doc) {
  return doc?.parent_folder_id || doc?.datos_extraidos?.parent_folder_id || null;
}

function getProjectDocsBreadcrumbs(documentos = [], targetId = null) {
  if (!targetId) return [];

  const docMap = new Map((documentos || []).map((doc) => [String(doc.id), doc]));
  const breadcrumbs = [];
  let current = docMap.get(String(targetId));
  const visited = new Set();

  while (current && !visited.has(String(current.id))) {
    breadcrumbs.unshift(current);
    visited.add(String(current.id));
    const parentId = getProjectDocumentParentId(current);
    current = parentId ? docMap.get(String(parentId)) : null;
  }

  return breadcrumbs;
}

function sortProjectDocuments(documentos = []) {
  return [...(documentos || [])].sort((a, b) => {
    const folderDiff = Number(isProjectDocumentFolder(b)) - Number(isProjectDocumentFolder(a));
    if (folderDiff !== 0) return folderDiff;
    const dateA = new Date(a?.actualizado_en || a?.creado_en || 0).getTime();
    const dateB = new Date(b?.actualizado_en || b?.creado_en || 0).getTime();
    return dateB - dateA;
  });
}

function filterProjectDocuments(documentos = [], search = "") {
  const query = String(search || "").trim().toLowerCase();
  if (!query) return documentos;
  return documentos.filter(doc => (
    [
      doc.nombre_archivo,
      doc.tipo_documento,
      doc.mime_type,
      doc.subido_por
    ].some(value => String(value || "").toLowerCase().includes(query))
  ));
}

function renderDocsViewIcon(mode) {
  if (mode === "list") {
    return '<svg class="docs-svg docs-svg-md" viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="7" x2="20" y2="7"/><line x1="6" y1="12" x2="20" y2="12"/><line x1="6" y1="17" x2="20" y2="17"/><circle cx="3.5" cy="7" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="17" r="1"/></svg>';
  }
  return '<svg class="docs-svg docs-svg-md" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>';
}

function getProjectDocKind(doc) {
  const tipo = String(doc?.tipo_documento || "").toLowerCase();
  const mime = String(doc?.mime_type || "").toLowerCase();
  const file = String(doc?.nombre_archivo || "").toLowerCase();
  if (isProjectDocumentFolder(doc)) return "folder";
  if (mime.includes("pdf") || file.endsWith(".pdf") || tipo === "oferta_pdf" || tipo === "abaco_lista") return "pdf";
  if (mime.includes("sheet") || mime.includes("excel") || /\.(xlsx?|csv)$/i.test(file)) return "excel";
  if (mime.includes("word") || /\.(docx?)$/i.test(file)) return "word";
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file)) return "image";
  return "file";
}

function isProjectDocumentFolder(doc) {
  const tipo = String(doc?.tipo_documento || "").toLowerCase();
  return tipo === "carpeta" || Boolean(doc?.es_carpeta) || Boolean(doc?.datos_extraidos?.es_carpeta);
}

function renderProjectDocKindIcon(kind, size = "sm") {
  const cls = `docs-svg docs-svg-${size}`;
  const iconsByKind = {
    folder: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7z"/><path d="M3 10h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"/></svg>`,
    pdf: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 15h2.2a1.8 1.8 0 0 0 0-3.6H8V17"/><path d="M12 17v-5.6h1.6a2.8 2.8 0 1 1 0 5.6H12z"/><path d="M17 11.4h-2V17"/></svg>`,
    excel: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 11l3 6"/><path d="M11 11l-3 6"/><path d="M13.5 13h3.5"/><path d="M13.5 16h3.5"/></svg>`,
    word: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 11l1.2 6L11 13l1.8 4 1.2-6"/></svg>`,
    image: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.4"/><path d="M20 16l-4.2-4.2a1.3 1.3 0 0 0-1.8 0L7 19"/></svg>`,
    file: `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/></svg>`
  };
  return iconsByKind[kind] || iconsByKind.file;
}

function formatProjectDocumentType(doc) {
  const map = {
    carpeta: "Carpeta",
    oferta_pdf: "Oferta PDF",
    abaco_lista: "Ábaco PDF",
    seguimiento_fabrica: "Seguimiento fábrica",
    seguimiento_obra: "Seguimiento obra",
    otro: "Documento"
  };
  return map[String(doc?.tipo_documento || "").toLowerCase()] || "Documento";
}

function formatProjectDocSize(doc) {
  if (isProjectDocumentFolder(doc)) return "--";
  const size = Number(doc?.size_bytes || doc?.datos_extraidos?.size_bytes || 0);
  if (!size) return "--";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatProjectDocDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function bindWorkspaceEvents(container, proyectoId) {
  container.querySelector("#btn-volver-proyectos")?.addEventListener("click", () => {
    window.history.back();
  });

  container.querySelectorAll("[data-project-section]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentSection = btn.dataset.projectSection;
      renderWorkspace(container, proyectoId);
    });
  });

  container.querySelector("#btn-editar-proyecto")?.addEventListener("click", () => {
    state.projectEditing = true;
    state.projectDraft = {
      nombre: state.proyecto?.nombre || "",
      descripcion: state.proyecto?.descripcion || "",
      lider_usuario_id: state.proyecto?.lider_usuario_id || "",
      fecha_fin_estimada: state.proyecto?.fecha_fin_estimada || ""
    };
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#btn-cancelar-edicion-proyecto")?.addEventListener("click", () => {
    state.projectEditing = false;
    state.projectDraft = null;
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#btn-guardar-proyecto")?.addEventListener("click", async () => {
    const status = container.querySelector("#status-proyecto");
    const name = container.querySelector("#project-name")?.value?.trim() || "";
    const description = container.querySelector("#project-description")?.value?.trim() || "";
    const liderUsuarioId = container.querySelector("#lider-usuario")?.value || "";
    const fechaFinEstimada = container.querySelector("#project-end-date")?.value || "";

    if (!name) {
      status.textContent = "El nombre del proyecto es obligatorio.";
      return;
    }
    if (!fechaFinEstimada) {
      status.textContent = "La fecha de fin es obligatoria.";
      return;
    }

    status.textContent = "Guardando...";
    try {
      const payload = {
        ...state.proyecto,
        nombre: name,
        descripcion: description,
        lider_usuario_id: liderUsuarioId,
        fecha_fin_estimada: fechaFinEstimada
      };
      await apiPut(`/obras/${proyectoId}`, payload);
      const refreshed = await apiGet(`/obras/${proyectoId}`);
      state.proyecto = refreshed;
      state.projectEditing = false;
      state.projectDraft = null;
      renderWorkspace(container, proyectoId);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  container.querySelector("#form-cronograma-editor")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = container.querySelector("#status-cronograma");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Guardando...";
    try {
      await apiPost(`/obras/${proyectoId}/cronograma`, data);
      state.cronograma = await apiGet(`/obras/${proyectoId}/cronograma`).catch(() => null);
      state.cronogramaEditing = false;
      renderWorkspace(container, proyectoId);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  container.querySelector("#btn-editar-cronograma-inline")?.addEventListener("click", () => {
    state.cronogramaEditing = true;
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#btn-cancelar-edicion-cronograma")?.addEventListener("click", () => {
    state.cronogramaEditing = false;
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#btn-subir-oferta")?.addEventListener("click", () => {
    container.querySelector("#file-oferta")?.click();
  });

  container.querySelector("#file-oferta")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const status = container.querySelector("#status-oferta");
    const uploadContainer = container.querySelector("#oferta-upload-container");
    const wizardContainer = container.querySelector("#wizard-cronograma");
    const btn = container.querySelector("#btn-subir-oferta");
    const originalText = btn?.textContent || "";
    if (btn) {
      btn.textContent = "Procesando PDF...";
      btn.disabled = true;
    }
    status.textContent = "Subiendo archivo y extrayendo datos...";

    try {
      const token = sessionStorage.getItem("controlObraToken");
      const formData = new FormData();
      formData.append("archivo", file);
      const res = await fetch(`/api/admin/obras/${proyectoId}/documentos/oferta`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir oferta");
      const d = data.datos_extraidos || {};
      container.querySelector("#wizard-doc-id").value = data.documento_id;
      container.querySelector("#wiz-oferta").value = d.oferta_nro || "";
      container.querySelector("#wiz-cliente").value = d.cliente || "";
      container.querySelector("#wiz-proyecto").value = d.nombre_proyecto || "";
      container.querySelector("#wiz-serie").value = d.serie || "";
      container.querySelector("#wiz-aberturas").value = d.total_aberturas || 0;
      uploadContainer.style.display = "none";
      wizardContainer.style.display = "block";
    } catch (err) {
      status.textContent = err.message;
    } finally {
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
      e.target.value = "";
    }
  });

  container.querySelector("#btn-cancelar-cronograma")?.addEventListener("click", () => {
    container.querySelector("#wizard-cronograma").style.display = "none";
    container.querySelector("#oferta-upload-container").style.display = "block";
  });

  container.querySelector("#form-cronograma")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = container.querySelector("#form-cronograma .btn-primary");
    const originalText = btn?.textContent || "";
    if (btn) {
      btn.textContent = "Generando...";
      btn.disabled = true;
    }
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      await apiPost(`/obras/${proyectoId}/cronograma`, data);
      renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
    } catch (err) {
      alert(err.message);
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  });

  const docsSearchInput = container.querySelector("#docs-search-input");
  docsSearchInput?.addEventListener("input", event => {
    const value = event.target.value || "";
    state.docsSearch = value;
    renderWorkspace(container, proyectoId);
    const refreshed = container.querySelector("#docs-search-input");
    refreshed?.focus();
    refreshed?.setSelectionRange(value.length, value.length);
  });

  container.querySelectorAll("[data-docs-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.docsView = btn.dataset.docsView || "list";
      renderWorkspace(container, proyectoId);
    });
  });

  container.querySelector("#btn-docs-upload")?.addEventListener("click", () => {
    container.querySelector("#docs-upload-input")?.click();
  });

  container.querySelector("#docs-upload-input")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    state.docsActionError = "";
    try {
      const token = sessionStorage.getItem("controlObraToken");
      const formData = new FormData();
      formData.append("archivo", file);
      if (state.docsCurrentFolderId) {
        formData.append("parent_folder_id", state.docsCurrentFolderId);
      }
      const res = await fetch(`/api/admin/obras/${proyectoId}/documentos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al subir documento");
      state.documentos = await apiGet(`/obras/${proyectoId}/documentos`).catch(() => []);
      state.docsActionError = "";
      renderWorkspace(container, proyectoId);
    } catch (error) {
      state.docsActionError = error.message || "Error al subir documento.";
      renderWorkspace(container, proyectoId);
    } finally {
      event.target.value = "";
    }
  });

  container.querySelector("#btn-docs-folder")?.addEventListener("click", () => {
    state.docsFolderModalOpen = true;
    state.docsFolderName = "";
    state.docsActionError = "";
    state.docsFolderSubmitting = false;
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#btn-docs-folder-modal-close")?.addEventListener("click", () => {
    state.docsFolderModalOpen = false;
    state.docsFolderName = "";
    state.docsFolderSubmitting = false;
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#btn-docs-folder-cancel")?.addEventListener("click", () => {
    state.docsFolderModalOpen = false;
    state.docsFolderName = "";
    state.docsFolderSubmitting = false;
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#docs-folder-modal-overlay")?.addEventListener("click", event => {
    if (event.target?.id !== "docs-folder-modal-overlay" || state.docsFolderSubmitting) return;
    state.docsFolderModalOpen = false;
    state.docsFolderName = "";
    renderWorkspace(container, proyectoId);
  });

  container.querySelector("#docs-folder-name-input")?.addEventListener("input", event => {
    state.docsFolderName = event.target.value || "";
    const createButton = container.querySelector("#btn-docs-folder-create");
    if (createButton) {
      createButton.disabled = state.docsFolderSubmitting || !String(state.docsFolderName || "").trim();
    }
  });

  container.querySelector("#docs-folder-name-input")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      container.querySelector("#btn-docs-folder-create")?.click();
    }
  });

  container.querySelector("#btn-docs-folder-create")?.addEventListener("click", async () => {
    const nombre = String(state.docsFolderName || "").trim();
    if (!nombre) return;

    const status = container.querySelector("#status-docs-folder");
    state.docsFolderSubmitting = true;
    if (status) status.textContent = "Creando carpeta...";
    const button = container.querySelector("#btn-docs-folder-create");
    if (button) button.disabled = true;

    try {
      await apiPost(`/obras/${proyectoId}/documentos/carpeta`, { nombre, parent_folder_id: state.docsCurrentFolderId || null });
      state.documentos = await apiGet(`/obras/${proyectoId}/documentos`).catch(() => []);
      state.docsActionError = "";
      state.docsFolderModalOpen = false;
      state.docsFolderName = "";
      state.docsFolderSubmitting = false;
      renderWorkspace(container, proyectoId);
    } catch (error) {
      state.docsFolderSubmitting = false;
      if (status) status.textContent = error.message;
      if (button) button.disabled = false;
    }
  });

  container.querySelector("#btn-subir-abaco")?.addEventListener("click", () => {
    container.querySelector("#file-abaco")?.click();
  });

  container.querySelector("#file-abaco")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const status = container.querySelector("#status-abaco");
    const btn = container.querySelector("#btn-subir-abaco");
    const originalText = btn?.textContent || "";
    if (btn) {
      btn.textContent = "Procesando...";
      btn.disabled = true;
    }
    status.textContent = "Subiendo PDF del ábaco y procesando componentes...";

    try {
      const token = sessionStorage.getItem("controlObraToken");
      const formData = new FormData();
      formData.append("archivo", file);

      const res = await fetch(`/api/admin/obras/${proyectoId}/documentos/abaco`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir ábaco");

      status.textContent = `Ábaco cargado. ${data.total_aberturas || 0} componentes procesados desde el PDF.`;
      renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
    } catch (err) {
      status.textContent = err.message;
    } finally {
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
      e.target.value = "";
    }
  });

  container.querySelectorAll("[data-seguimiento-tipo]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tipo = btn.dataset.seguimientoTipo;
      try {
        const etapas = await apiGet(`/configuracion-etapas/${tipo}`);
        const seleccionadas = (etapas || []).map(e => e.id);
        if (!seleccionadas.length) {
          alert("No hay etapas configuradas.");
          return;
        }
        await apiPost(`/obras/${proyectoId}/seguimiento/${tipo}`, { etapas_seleccionadas: seleccionadas });
        renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
  });

  container.querySelector("#form-tarea-proyecto")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const editingId = container.querySelector("#editing-tarea-proyecto-id")?.value || "";
    const status = container.querySelector("#modal-status-tarea-proyecto");
    const data = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Guardando...";
    try {
      if (editingId) await apiPut(`/tareas/${editingId}`, { ...data, obra_id: proyectoId });
      else await apiPost("/tareas", data);
      renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  container.querySelector("#btn-new-tarea-proyecto")?.addEventListener("click", () => {
    const modal = container.querySelector("#modal-tarea-proyecto");
    if (modal) modal.classList.add("open");
  });

  container.querySelector("#close-modal-tarea-proyecto")?.addEventListener("click", () => {
    container.querySelector("#modal-tarea-proyecto")?.classList.remove("open");
  });
  container.querySelector("#cancel-modal-tarea-proyecto")?.addEventListener("click", () => {
    container.querySelector("#modal-tarea-proyecto")?.classList.remove("open");
  });

  container.querySelectorAll("[data-edit-tarea-proy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tareasActuales = await apiGet(`/tareas?obraId=${encodeURIComponent(proyectoId)}`).catch(() => []);
      const task = (tareasActuales || []).find(x => x.id === btn.dataset.editTareaProy);
      if (!task) return;
      const modal = container.querySelector("#modal-tarea-proyecto");
      const form = container.querySelector("#form-tarea-proyecto");
      const editing = container.querySelector("#editing-tarea-proyecto-id");
      editing.value = task.id;
      form.titulo.value = task.titulo || "";
      form.responsable_id.value = task.responsable_id || "";
      form.fecha_inicio.value = task.fecha_inicio?.slice(0, 10) || "";
      form.fecha_fin.value = task.fecha_fin?.slice(0, 10) || "";
      form.estado.value = task.estado || "pendiente";
      form.prioridad.value = task.prioridad || "media";
      form.avance.value = task.avance || 0;
      form.descripcion.value = task.descripcion || "";
      modal?.classList.add("open");
    });
  });

  container.querySelectorAll("[data-delete-tarea-proy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Eliminar esta tarea?")) {
        await apiDelete(`/tareas/${btn.dataset.deleteTareaProy}`);
        renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
      }
    });
  });

  container.querySelectorAll("[data-toggle-tarea-proy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tareasActuales = await apiGet(`/tareas?obraId=${encodeURIComponent(proyectoId)}`).catch(() => []);
      const task = (tareasActuales || []).find(x => x.id === btn.dataset.toggleTareaProy);
      if (!task) return;
      const newEstado = task.estado === "finalizada" ? "pendiente" : "finalizada";
      await apiPut(`/tareas/${task.id}`, { ...task, estado: newEstado, avance: newEstado === "finalizada" ? 100 : task.avance });
      renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
    });
  });

  container.querySelectorAll("[data-doc-open]").forEach(node => {
    node.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.docsSelectedId = node.dataset.docOpen;
      renderWorkspace(container, proyectoId);
      void openDocumentPreview(proyectoId, node.dataset.docOpen);
    });
  });

  container.querySelectorAll("[data-doc-enter]").forEach(node => {
    node.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      state.docsCurrentFolderId = node.dataset.docEnter;
      state.docsSelectedId = node.dataset.docEnter;
      state.docsSearch = "";
      renderWorkspace(container, proyectoId);
    });
  });

  container.querySelectorAll("[data-doc-select]").forEach(node => {
    node.addEventListener("click", () => {
      state.docsSelectedId = node.dataset.docSelect;
      renderWorkspace(container, proyectoId);
    });
  });

  container.querySelectorAll("[data-docs-crumb]").forEach(node => {
    node.addEventListener("click", () => {
      state.docsCurrentFolderId = node.dataset.docsCrumb;
      state.docsSelectedId = node.dataset.docsCrumb;
      state.docsSearch = "";
      renderWorkspace(container, proyectoId);
    });
  });

  container.querySelector("[data-docs-root]")?.addEventListener("click", () => {
    state.docsCurrentFolderId = null;
    state.docsSelectedId = null;
    state.docsSearch = "";
    renderWorkspace(container, proyectoId);
  });

  container.querySelectorAll(".btn-etapa-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const currentState = btn.getAttribute("data-estado");
      let newState = "pendiente";
      if (currentState === "pendiente") newState = "en_proceso";
      else if (currentState === "en_proceso") newState = "completada";
      else if (currentState === "completada") newState = "pendiente";

      try {
        await apiPatch(`/avance-etapas/${id}`, { estado: newState });
        renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
      } catch (error) {
        alert("Error al actualizar etapa: " + error.message);
      }
    });
  });

  if (state.docsFolderModalOpen) {
    const input = container.querySelector("#docs-folder-name-input");
    if (input) {
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    }
  }
}

async function openDocumentPreview(proyectoId, documentoId) {
  try {
    const token = sessionStorage.getItem("controlObraToken");
    const previewWindow = window.open("", "_blank", "noopener,noreferrer");
    if (previewWindow) {
      previewWindow.document.write("<p style='font-family:sans-serif;padding:24px'>Cargando documento...</p>");
    }

    const res = await fetch(`/api/admin/obras/${proyectoId}/documentos/${documentoId}/archivo`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo abrir el documento.");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (previewWindow) {
      previewWindow.location = url;
      previewWindow.focus?.();
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    alert(error.message);
  }
}
