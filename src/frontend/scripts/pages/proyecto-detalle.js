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
  proyecto: null,
  cronograma: null,
  aberturas: [],
  seguimientoFabrica: null,
  seguimientoObra: null,
  usuariosActivos: [],
  tareas: [],
  documentos: [],
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
  const draft = projectDraft || proyecto || {};
  const formatInputDate = (value) => {
    if (!value) return "";
    const str = String(value);
    return str.includes("T") ? str.slice(0, 10) : str.slice(0, 10);
  };

  container.innerHTML = `
    <div class="project-workspace">
      <div class="page-header">
        <div class="page-header-row" style="align-items:flex-start; gap:16px;">
          <div style="min-width:0;">
            <button class="btn btn-ghost btn-sm" id="btn-volver-proyectos" type="button" style="margin-bottom: 8px;">${icons.back} Volver al listado</button>
            <div class="eyebrow">PROYECTO</div>
            ${
              projectEditing
                ? `<div class="form-field" style="max-width: 560px;">
                    <label>Nombre del proyecto</label>
                    <input id="project-name" type="text" value="${esc(draft.nombre || "")}" />
                  </div>`
                : `<h1 style="margin-bottom:4px;">${esc(proyecto?.nombre || "-")}</h1>`
            }
            ${
              projectEditing
                ? `<div class="form-field" style="max-width: 820px; margin-top:10px;">
                    <label>Descripción</label>
                    <textarea id="project-description" rows="2">${esc(draft.descripcion || "")}</textarea>
                  </div>`
                : `<p class="subtitle">${esc(proyecto?.descripcion || "Sin descripción")}</p>`
            }
          </div>
          <div class="project-header-meta">
            <div><span class="project-meta-label">Cliente</span><strong>${esc(proyecto?.cliente_nombre || "Sin cliente")}</strong></div>
            <div>
              <span class="project-meta-label">Líder</span>
              ${
                projectEditing && canEditProject
                  ? `
                    <div class="form-field">
                      <select id="lider-usuario" name="lider_usuario_id">
                        <option value="">Sin asignar</option>
                        ${(usuariosActivos || []).map(u => `<option value="${esc(u.id)}" ${String(u.id) === String((draft.lider_usuario_id ?? proyecto?.lider_usuario_id) || "") ? "selected" : ""}>${esc(u.display_name)}</option>`).join("")}
                      </select>
                    </div>
                  `
                  : `<strong>${esc(proyecto?.lider_nombre || liderUsuario?.display_name || "No asignado")}</strong>`
              }
            </div>
            <div>
              <span class="project-meta-label">Fin</span>
              ${
                projectEditing
                  ? `<div class="form-field"><input id="project-end-date" type="date" value="${esc(formatInputDate(draft.fecha_fin_estimada || proyecto?.fecha_fin_estimada))}"></div>`
                  : `<strong>${esc(formatDate(proyecto?.fecha_fin_estimada) || "-")}</strong>`
              }
            </div>
            <div><span class="project-meta-label">Etapa</span>${renderBadge(etapaLabel)}</div>
          </div>
          ${
            canEditProject
              ? `
                <div style="min-width: 180px; display:flex; justify-content:flex-end; gap:8px; align-items:flex-start; flex-wrap:wrap;">
                  ${
                    projectEditing
                      ? `
                        <button class="btn btn-ghost btn-sm" id="btn-cancelar-edicion-proyecto" type="button">Cancelar</button>
                        <button class="btn btn-primary btn-sm" id="btn-guardar-proyecto" type="button">Guardar cambios</button>
                        <div class="modal-status" id="status-proyecto"></div>
                      `
                      : `<button class="btn btn-ghost btn-sm" id="btn-editar-proyecto" type="button">${icons.edit} Editar</button>`
                  }
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
        ${renderSection(currentSection, { proyecto, cronograma, aberturas, seguimientoFabrica, seguimientoObra, usuariosActivos, tareas, documentos, proyectoId, currentUser })}
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

function renderResumenSection({ proyecto, usuariosActivos, cronograma, tareas, currentUser }) {
  const liderUsuario = usuariosActivos.find(u => String(u.id) === String(proyecto?.lider_usuario_id || ""));
  const totalTasks = tareas.length;
  const doneTasks = tareas.filter(t => t.estado === "finalizada").length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return `
    <section class="project-section">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>Resumen del proyecto</h2>
            <p>Dashboard y avance general</p>
          </div>
        </div>
        <div style="padding: 1.25rem; display:grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
          <div>
            <p style="color:var(--muted); font-size:0.875rem">Responsable</p>
            <p><strong>${esc(proyecto?.responsable || "-")}</strong></p>
          </div>
          <div>
            <p style="color:var(--muted); font-size:0.875rem">Líder</p>
            <p><strong>${esc(proyecto?.lider_nombre || liderUsuario?.display_name || "No asignado")}</strong></p>
          </div>
          <div>
            <p style="color:var(--muted); font-size:0.875rem">Fechas</p>
            <p><strong>${esc(formatDate(proyecto?.fecha_inicio) || "-")} a ${esc(formatDate(proyecto?.fecha_fin_estimada) || "-")}</strong></p>
          </div>
          <div>
            <p style="color:var(--muted); font-size:0.875rem">Avance General</p>
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

function renderTodoSection({ tareas, usuariosActivos, proyectoId }) {
  return `
    <section class="project-section">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>To-Do del proyecto</h2>
            <p>${tareas.length} tareas</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-tarea-proyecto" type="button">${icons.plus} Nueva</button>
        </div>
        ${tareas.length ? renderTareasProyecto(tareas) : renderEmpty("Sin tareas", "Crea la primera tarea del proyecto.")}
      </div>
      ${renderModalTareaProyecto(proyectoId, usuariosActivos)}
    </section>
  `;
}

function renderDocumentosSection({ documentos, proyectoId }) {
  return `
    <section class="project-section">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>Documentos</h2>
            <p>Archivos y adjuntos del proyecto</p>
          </div>
        </div>
        <div style="padding:1.25rem; display:grid; gap:1rem;">
          <div class="form-grid">
            <div class="form-field full-width">
              <label>Archivo</label>
              <input type="file" id="documento-archivo" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" />
            </div>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-subir-documento" type="button">${icons.upload} Subir documento</button>
            <div class="modal-status" id="status-documento"></div>
          </div>
          ${documentsTable(documentos)}
        </div>
      </div>
    </section>
  `;
}

function renderCronogramasSection({ proyecto, cronograma, proyectoId }) {
  const c = cronograma || {};
  const fecha = c.fecha_comprometida_inicio_instalacion ? String(c.fecha_comprometida_inicio_instalacion).slice(0, 10) : "";
  const diasFabrica = c.dias_fabrica ?? "";
  const diasInstalacion = c.dias_instalacion ?? "";

  return `
    <section class="project-section">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div>
            <h2>Ajustes de cronograma</h2>
            <p>Puedes completar estos campos mas adelante.</p>
          </div>
        </div>
        <form id="form-cronograma-editor" class="form-grid" style="padding:1.25rem;">
          <div class="form-field">
            <label>Fecha inicio instalación</label>
            <input name="fecha_comprometida_inicio_instalacion" type="date" value="${esc(fecha)}">
          </div>
          <div class="form-field">
            <label>Días de fábrica</label>
            <input name="dias_fabrica" type="number" min="1" value="${esc(diasFabrica)}">
          </div>
          <div class="form-field">
            <label>Días de instalación</label>
            <input name="dias_instalacion" type="number" min="1" value="${esc(diasInstalacion)}">
          </div>
          <div class="form-field full-width">
            <button class="btn btn-primary" type="submit">Guardar ajustes</button>
            <div class="modal-status" id="status-cronograma"></div>
          </div>
        </form>
      </div>

      ${cronograma ? renderCronogramaActivo(c) : renderCronogramaVacio(proyectoId)}
    </section>
  `;
}

function renderSeguimientoSection({ cronograma, aberturas, seguimientoFabrica, seguimientoObra, proyectoId }) {
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
          ${renderAbacoUploadCard(hasAbaco)}
          ${!cronograma ? renderEmpty("Falta cronograma", "Primero generá el cronograma del proyecto.") : ""}
          ${cronograma && hasAbaco && !seguimientoFabrica ? renderSeguimientoStarter("fabrica", aberturas, "Seguimiento de Fábrica", "Seleccionar etapas y generar seguimiento") : cronograma && hasAbaco ? renderSeguimientoTable(seguimientoFabrica) : ""}
          ${cronograma && hasAbaco && !seguimientoObra ? renderSeguimientoStarter("obra", aberturas, "Seguimiento de Obra", "Seleccionar etapas y generar seguimiento") : cronograma && hasAbaco ? renderSeguimientoTable(seguimientoObra) : ""}
        </div>
      </div>
    </section>
  `;
}

function renderAbacoUploadCard(hasAbaco) {
  return `
    <div class="card" style="border-style:${hasAbaco ? "solid" : "dashed"};">
      <div class="card-header">
        <div>
          <h2>${hasAbaco ? "Ábaco cargado" : "Ábaco"}</h2>
          <p>${hasAbaco ? "Podés reemplazar el archivo si necesitás volver a generar el seguimiento." : "Sube el Excel/CSV del ábaco para habilitar fábrica y obra."}</p>
        </div>
      </div>
      <div style="padding:1.25rem; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <input type="file" id="file-abaco" accept=".xlsx,.xls,.csv" style="display:none;">
        <button class="btn btn-primary" id="btn-subir-abaco" type="button">${icons.upload} ${hasAbaco ? "Reemplazar ábaco" : "Subir ábaco"}</button>
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

function renderCronogramaActivo(c) {
  return `
    <div class="card">
      <div class="card-header">
        <h2>Cronograma del Proyecto</h2>
      </div>
      <div style="padding: 1.25rem; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
        <div><p style="color:var(--muted); font-size:0.875rem">Nro. Oferta</p><p><strong>${esc(c.oferta_nro || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Cliente</p><p><strong>${esc(c.cliente || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Líder del proyecto</p><p><strong>${esc(c.lider_proyecto || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Serie</p><p><strong>${esc(c.serie || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Total Aberturas</p><p><strong>${esc(c.total_aberturas || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Días fábrica</p><p><strong>${esc(c.dias_fabrica ?? "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Días instalación</p><p><strong>${esc(c.dias_instalacion ?? "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Límite firma ábaco</p><p><strong>${esc(c.fecha_limite_firma_abaco?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Inicio fábrica</p><p><strong>${esc(c.inicio_fabrica?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Fin producción</p><p><strong>${esc(c.fecha_compromiso_fin_produccion?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Inicio instalación</p><p><strong>${esc(c.fecha_comprometida_inicio_instalacion?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Fin instalación</p><p><strong>${esc(c.fin_instalacion?.slice(0,10))}</strong></p></div>
      </div>
    </div>
  `;
}

function renderSeguimientoStarter(tipo, aberturas, title, buttonLabel) {
  if (!aberturas || !aberturas.length) {
    return renderEmpty("No hay ábaco cargado", "Sube el archivo Excel/CSV del ábaco para continuar.");
  }

  return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <div>
        <h3 style="margin-bottom:6px;">${esc(title)}</h3>
        <p style="color:var(--muted); margin:0;">Ábaco cargado con ${aberturas.length} aberturas.</p>
      </div>
      <button class="btn btn-primary" type="button" data-seguimiento-tipo="${esc(tipo)}">${esc(buttonLabel)}</button>
    </div>
  `;
}

function renderSeguimientoTable(data) {
  if (!data) return "";
  if (!data.etapas || !data.avances_aberturas) return "<p>Error: Datos incompletos</p>";

  const headers = data.etapas.map(e => `<th>${esc(e.nombre)}</th>`).join("");
  const rows = data.avances_aberturas.map(ab => {
    const celdasEtapas = data.etapas.map(e => {
      const etapaData = ab.etapas_estado?.find(ee => ee.etapa_seguimiento_id === e.id);
      if (!etapaData) return `<td>-</td>`;
      const color = etapaData.estado === "completada" ? "var(--green)" : (etapaData.estado === "en_proceso" ? "var(--yellow)" : "var(--border)");
      const label = etapaData.estado === "completada" ? "C" : (etapaData.estado === "en_proceso" ? "P" : "-");
      return `<td style="text-align:center;"><button class="btn-etapa-toggle" data-id="${etapaData.id}" data-estado="${etapaData.estado}" style="width:100%; padding:0.5rem; background:${color}; border:none; border-radius:4px; color:#fff; cursor:pointer; font-weight:bold;">${label}</button></td>`;
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
    <div style="margin-bottom:1rem;">
      <p style="font-size:0.875rem; color:var(--muted)">Haz clic en las celdas para cambiar el estado: <span style="color:var(--border); font-weight:bold;">[-] Pendiente</span> &rarr; <span style="color:var(--yellow); font-weight:bold;">[P] En Proceso</span> &rarr; <span style="color:var(--green); font-weight:bold;">[C] Completado</span></p>
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

function renderTareasProyecto(list) {
  return `<div class="table-wrap"><table>
    <thead><tr><th></th><th>Tarea</th><th>Responsable</th><th>Estado</th><th>Prioridad</th><th>Fin</th><th>Validado por</th><th></th></tr></thead>
    <tbody>${list.map(t => {
      const done = t.estado === "finalizada";
      return `<tr>
        <td><button class="btn-icon" data-toggle-tarea-proy="${t.id}" data-complete="${done}" type="button" title="${done ? "Reabrir" : "Completar"}">
          ${done ? icons.check : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'}
        </button></td>
        <td style="${done ? "text-decoration:line-through;opacity:.6" : ""}"><strong>${esc(t.titulo)}</strong></td>
        <td>${esc(t.responsable_name || t.responsable || "-")}</td>
        <td>${renderBadge(t.estado)}</td>
        <td>${renderBadge(t.prioridad)}</td>
        <td>${formatDate(t.fecha_fin)}</td>
        <td>${esc(t.completada_por_name || "-")}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-tarea-proy="${t.id}" type="button">${icons.edit}</button>
          <button class="btn btn-danger btn-sm" data-delete-tarea-proy="${t.id}" type="button">${icons.trash}</button>
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

function documentsTable(documentos) {
  if (!documentos || !documentos.length) {
    return renderEmpty("Sin documentos", "No hay documentos cargados aún.");
  }

  return `<div class="table-wrap"><table>
    <thead><tr><th>Archivo</th><th>Subido por</th><th></th></tr></thead>
    <tbody>
      ${documentos.map(doc => `
        <tr>
          <td><strong>${esc(doc.nombre_archivo || "-")}</strong></td>
          <td>${esc(doc.subido_por || "-")}</td>
          <td><button class="btn btn-ghost btn-sm" type="button" data-doc-open="${esc(doc.id)}">${icons.eye}</button></td>
        </tr>
      `).join("")}
    </tbody>
  </table></div>`;
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
      status.textContent = "Ajustes guardados.";
    } catch (error) {
      status.textContent = error.message;
    }
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

  container.querySelector("#btn-subir-documento")?.addEventListener("click", async () => {
    const file = container.querySelector("#documento-archivo")?.files?.[0];
    const status = container.querySelector("#status-documento");
    if (!file) {
      status.textContent = "Seleccioná un archivo.";
      return;
    }
    status.textContent = "Subiendo documento...";
    try {
      const token = sessionStorage.getItem("controlObraToken");
      const formData = new FormData();
      formData.append("archivo", file);
      const res = await fetch(`/api/admin/obras/${proyectoId}/documentos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir documento");
      status.textContent = "Documento cargado.";
      renderProyectoDetalle(container, proyectoId, state.currentUser, state.currentSection);
    } catch (err) {
      status.textContent = err.message;
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
    status.textContent = "Subiendo ábaco y procesando ítems...";

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

      status.textContent = `Ábaco cargado. ${data.total_aberturas || 0} aberturas procesadas.`;
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

  container.querySelectorAll("[data-doc-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      void openDocumentPreview(proyectoId, btn.dataset.docOpen);
    });
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
