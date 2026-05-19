import { apiGet, apiPost, api } from "../api.js";
import { icons, esc, renderBadge, renderProgress, renderEmpty } from "../ui.js";
import { setTopbarSection } from "../layout.js";

export async function renderProyectoDetalle(container, id) {
  setTopbarSection("Detalle de Proyecto");
  container.innerHTML = '<div class="loading">Cargando proyecto...</div>';

  try {
    const proyecto = await apiGet(`/obras/${id}`);
    const cronograma = await apiGet(`/obras/${id}/cronograma`).catch(() => null);
    const aberturas = await apiGet(`/obras/${id}/aberturas`).catch(() => []);
    const seguimientoFabrica = await apiGet(`/obras/${id}/seguimiento/fabrica`).catch(() => null);
    const seguimientoObra = await apiGet(`/obras/${id}/seguimiento/obra`).catch(() => null);
    renderView(container, proyecto, cronograma, aberturas, seguimientoFabrica, seguimientoObra);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

function renderView(container, proyecto, cronograma, aberturas, segFabrica, segObra) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  
  // Agregamos algo de CSS inline temporal para las tabs (se puede mover a app.css luego)
  container.innerHTML = `
    <style>
      .tabs-nav {
        display: flex;
        gap: 1.5rem;
        border-bottom: 1px solid var(--border);
        margin-bottom: 1.5rem;
        overflow-x: auto;
      }
      .tab-btn {
        background: none;
        border: none;
        color: var(--muted);
        font-weight: 500;
        padding: 0.75rem 0;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .tab-btn:hover {
        color: var(--fg);
      }
      .tab-btn.active {
        color: var(--primario);
        border-bottom-color: var(--primario);
      }
      .tab-content {
        display: none;
      }
      .tab-content.active {
        display: block;
      }
    </style>
    
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <button class="btn btn-ghost btn-sm" onclick="window.history.back()" style="margin-bottom: 8px;">${icons.back} Volver</button>
          <div class="eyebrow">PROYECTO</div>
          <h1>${esc(proyecto.nombre)}</h1>
          <p class="subtitle">${esc(proyecto.descripcion || "Sin descripción")}</p>
        </div>
        <div>
          ${renderBadge(proyecto.estado)}
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-nav">
        <button class="tab-btn active" data-target="tab-resumen">Resumen</button>
        <button class="tab-btn" data-target="tab-cronograma">Cronograma</button>
        <button class="tab-btn" data-target="tab-fabrica">Seguimiento Fábrica</button>
        <button class="tab-btn" data-target="tab-obra">Seguimiento Obra</button>
        <button class="tab-btn" data-target="tab-informe">Informe de Avance</button>
        <button class="tab-btn" data-target="tab-documentos">Documentos</button>
      </div>

      <div class="tab-content active" id="tab-resumen">
        <div class="card">
          <div class="card-header"><h2>Detalles Generales</h2></div>
          <div style="padding: 1.5rem; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div>
              <p style="color:var(--muted); font-size:0.875rem">Responsable</p>
              <p><strong>${esc(proyecto.responsable || "-")}</strong></p>
            </div>
            <div>
              <p style="color:var(--muted); font-size:0.875rem">Fechas</p>
              <p><strong>${esc(proyecto.fecha_inicio)} a ${esc(proyecto.fecha_fin_estimada)}</strong></p>
            </div>
            <div>
              <p style="color:var(--muted); font-size:0.875rem">Avance General</p>
              ${renderProgress(proyecto.avance)}
            </div>
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-cronograma">
        ${cronograma ? renderCronogramaActivo(cronograma) : `
        <div class="card" id="oferta-upload-container">
          <div class="card-header"><h2>Cronograma</h2></div>
          <div style="padding: 1.5rem;">
            ${renderEmpty("No hay oferta cargada", "Subir oferta PDF para generar el cronograma.")}
            <div style="margin-top: 1rem; text-align: center;">
              <input type="file" id="file-oferta" accept=".pdf" style="display:none">
              <button class="btn btn-primary" onclick="document.getElementById('file-oferta').click()">Subir oferta PDF</button>
            </div>
          </div>
        </div>

        <div class="card" id="wizard-cronograma" style="display: none;">
          <div class="card-header">
            <h2>Wizard de Cronograma</h2>
            <p style="color:var(--muted); font-size: 0.875rem;">Estos son los datos detectados de la oferta. ¿Deseás corregir algo antes de generar el cronograma?</p>
          </div>
          <form id="form-cronograma" style="padding: 1.5rem;">
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
              <button type="button" class="btn btn-ghost" onclick="document.getElementById('wizard-cronograma').style.display='none'; document.getElementById('oferta-upload-container').style.display='block';">Cancelar</button>
              <button type="submit" class="btn btn-primary">Confirmar y Generar</button>
            </div>
          </form>
        </div>
        `}
      </div>

      <div class="tab-content" id="tab-fabrica">
        <div class="card" id="abaco-upload-container">
          <div class="card-header"><h2>Seguimiento de Fábrica</h2></div>
          <div style="padding: 1.5rem; overflow-x: auto;">
            ${!cronograma ? renderEmpty("Falta cronograma", "Primero generá el cronograma del proyecto.") : 
              segFabrica ? renderGrillaSeguimiento(segFabrica) :
              (aberturas && aberturas.length > 0) ? `
                <div style="text-align: center; margin-bottom: 1.5rem;" id="fabrica-wizard-start">
                  <p>Ábaco cargado correctamente con <strong>${aberturas.length}</strong> aberturas.</p>
                  <button class="btn btn-primary" id="btn-generar-fabrica" style="margin-top: 1rem;">Seleccionar Etapas y Generar Seguimiento</button>
                </div>
                <div id="fabrica-etapas-wizard" style="display:none; text-align:left;">
                  <h3>Selecciona las etapas de fábrica</h3>
                  <div id="etapas-fabrica-list" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top:1rem;"></div>
                  <button class="btn btn-primary" id="btn-confirmar-fabrica" style="margin-top: 1.5rem;">Generar</button>
                </div>
              ` : `
                ${renderEmpty("No hay ábaco cargado", "Sube el archivo Excel/CSV del ábaco para continuar.")}
                <div style="margin-top: 1rem; text-align: center;">
                  <input type="file" id="file-abaco" accept=".xlsx,.xls,.csv" style="display:none">
                  <button class="btn btn-primary" onclick="document.getElementById('file-abaco').click()">Subir Ábaco</button>
                </div>
              `
            }
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-obra">
        <div class="card">
          <div class="card-header"><h2>Seguimiento de Instalación en Obra</h2></div>
          <div style="padding: 1.5rem; overflow-x: auto;">
            ${!cronograma ? renderEmpty("Falta cronograma", "Primero generá el cronograma del proyecto.") : 
              segObra ? renderGrillaSeguimiento(segObra) :
              (aberturas && aberturas.length > 0) ? `
                <div style="text-align: center; margin-bottom: 1.5rem;" id="obra-wizard-start">
                  <p>Proyecto listo para seguimiento en obra.</p>
                  <button class="btn btn-primary" id="btn-generar-obra" style="margin-top: 1rem;">Seleccionar Etapas y Generar Seguimiento</button>
                </div>
                <div id="obra-etapas-wizard" style="display:none; text-align:left;">
                  <h3>Selecciona las etapas de instalación</h3>
                  <div id="etapas-obra-list" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top:1rem;"></div>
                  <button class="btn btn-primary" id="btn-confirmar-obra" style="margin-top: 1.5rem;">Generar</button>
                </div>
              ` : `
                ${renderEmpty("No hay aberturas", "Se requiere haber cargado el ábaco en el paso anterior.")}
              `
            }
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-informe">
        <div class="card">
          <div class="card-header"><h2>Informe de Avance</h2></div>
          <div style="padding: 1.5rem;">
            ${renderInforme(cronograma, segFabrica, segObra)}
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-documentos">
        <div class="card">
          <div class="card-header"><h2>Documentos del Proyecto</h2></div>
          <div style="padding: 1.5rem;">
            ${renderEmpty("Sin documentos", "No hay documentos cargados aún.")}
          </div>
        </div>
      </div>
    </div>
  `;

  bindTabs(container);
  if (!cronograma) bindOfertaUpload(container, proyecto.id);
  if (cronograma && aberturas.length === 0) bindAbacoUpload(container, proyecto.id);
  if (cronograma && aberturas.length > 0 && !segFabrica) bindSeguimientoWizard(container, proyecto.id, 'fabrica');
  if (cronograma && aberturas.length > 0 && !segObra) bindSeguimientoWizard(container, proyecto.id, 'obra');
  if (segFabrica || segObra) bindGrillaInteractions(container, proyecto.id);
}

function renderGrillaSeguimiento(seg) {
  if (!seg.etapas || !seg.avances_aberturas) return "<p>Error: Datos incompletos</p>";
  
  const headers = seg.etapas.map(e => `<th>${esc(e.nombre)}</th>`).join("");
  
  const rows = seg.avances_aberturas.map(ab => {
    const celdasEtapas = seg.etapas.map(e => {
      const etapaData = ab.etapas_estado?.find(ee => ee.etapa_seguimiento_id === e.id);
      if (!etapaData) return `<td>-</td>`;
      const color = etapaData.estado === 'completada' ? 'var(--green)' : (etapaData.estado === 'en_proceso' ? 'var(--yellow)' : 'var(--border)');
      const label = etapaData.estado === 'completada' ? 'C' : (etapaData.estado === 'en_proceso' ? 'P' : '-');
      return `<td style="text-align:center;">
        <button class="btn-etapa-toggle" data-id="${etapaData.id}" data-estado="${etapaData.estado}" style="width:100%; padding:0.5rem; background:${color}; border:none; border-radius:4px; color:#fff; cursor:pointer; font-weight:bold;">${label}</button>
      </td>`;
    }).join("");

    return `
      <tr>
        <td><strong>${ab.numero}</strong></td>
        <td>${esc(ab.cod_posicion)}</td>
        <td>${esc(ab.ambiente)}</td>
        <td>${ab.cantidad}</td>
        <td>${ab.ancho_mm}x${ab.largo_mm}</td>
        ${celdasEtapas}
      </tr>
    `;
  }).join("");

  return `
    <style>
      .tabla-seguimiento { width: 100%; border-collapse: collapse; min-width: 800px; }
      .tabla-seguimiento th, .tabla-seguimiento td { border: 1px solid var(--border); padding: 0.5rem; font-size: 0.875rem; }
      .tabla-seguimiento th { background: var(--bg-alt); text-align: center; }
    </style>
    <div style="margin-bottom:1rem;">
      <p style="font-size:0.875rem; color:var(--muted)">Haz clic en las celdas para cambiar el estado: <span style="color:var(--border); font-weight:bold;">[-] Pendiente</span> &rarr; <span style="color:var(--yellow); font-weight:bold;">[P] En Proceso</span> &rarr; <span style="color:var(--green); font-weight:bold;">[C] Completado</span></p>
    </div>
    <table class="tabla-seguimiento">
      <thead>
        <tr>
          <th>Nº</th><th>Cod</th><th>Ambiente</th><th>Cant</th><th>Medidas</th>
          ${headers}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function bindTabs(container) {
  // ... (unchanged code inside bindTabs)
  const tabBtns = container.querySelectorAll(".tab-btn");
  const tabContents = container.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      const targetContent = container.querySelector("#" + targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });
}

function bindOfertaUpload(container, proyectoId) {
  const fileInput = container.querySelector("#file-oferta");
  const uploadContainer = container.querySelector("#oferta-upload-container");
  const wizardContainer = container.querySelector("#wizard-cronograma");
  
  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("archivo", file);

    const token = sessionStorage.getItem("controlObraToken");
    
    // Cambiar texto de boton temporalmente
    const btn = uploadContainer.querySelector(".btn-primary");
    const originalText = btn.textContent;
    btn.textContent = "Procesando PDF...";
    btn.disabled = true;

    try {
      const res = await fetch(`/api/admin/obras/${proyectoId}/documentos/oferta`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Error al subir oferta");

      // Llenar wizard
      const d = data.datos_extraidos || {};
      container.querySelector("#wizard-doc-id").value = data.documento_id;
      container.querySelector("#wiz-oferta").value = d.oferta_nro || "";
      container.querySelector("#wiz-cliente").value = d.cliente || "";
      container.querySelector("#wiz-proyecto").value = d.nombre_proyecto || "";
      container.querySelector("#wiz-serie").value = d.serie || "";
      container.querySelector("#wiz-aberturas").value = d.total_aberturas || 0;

      // Mostrar wizard
      uploadContainer.style.display = "none";
      wizardContainer.style.display = "block";

    } catch (err) {
      alert(err.message);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
      fileInput.value = ""; // reset
    }
  });

  const formCronograma = container.querySelector("#form-cronograma");
  formCronograma.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formCronograma.querySelector(".btn-primary");
    const originalText = btn.textContent;
    btn.textContent = "Generando...";
    btn.disabled = true;

    try {
      const data = Object.fromEntries(new FormData(formCronograma));
      await apiPost(`/obras/${proyectoId}/cronograma`, data);
      
      // Recargar la vista completa
      import("./proyecto-detalle.js").then(m => m.renderProyectoDetalle(container, proyectoId));
    } catch (err) {
      alert(err.message);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

function bindAbacoUpload(container, proyectoId) {
  const fileInput = container.querySelector("#file-abaco");
  const uploadContainer = container.querySelector("#abaco-upload-container");
  
  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("archivo", file);

    const token = sessionStorage.getItem("controlObraToken");
    
    const btn = uploadContainer.querySelector(".btn-primary");
    const originalText = btn.textContent;
    btn.textContent = "Procesando Ábaco...";
    btn.disabled = true;

    try {
      const res = await fetch(`/api/admin/obras/${proyectoId}/documentos/abaco`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Error al subir ábaco");

      // Recargar la vista completa
      import("./proyecto-detalle.js").then(m => m.renderProyectoDetalle(container, proyectoId));
    } catch (err) {
      alert(err.message);
      btn.textContent = originalText;
      btn.disabled = false;
      fileInput.value = "";
    }
  });
}

function renderCronogramaActivo(c) {
  return `
    <div class="card">
      <div class="card-header">
        <h2>Cronograma del Proyecto</h2>
        <button class="btn btn-ghost btn-sm">${icons.edit} Editar</button>
      </div>
      <div style="padding: 1.5rem; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
        <div><p style="color:var(--muted); font-size:0.875rem">Nro. Oferta</p><p><strong>${esc(c.oferta_nro || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Cliente</p><p><strong>${esc(c.cliente || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Líder del proyecto</p><p><strong>${esc(c.lider_proyecto || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Serie</p><p><strong>${esc(c.serie || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Total Aberturas</p><p><strong>${esc(c.total_aberturas || "-")}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Días fábrica</p><p><strong>${esc(c.dias_fabrica)}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Días instalación</p><p><strong>${esc(c.dias_instalacion)}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Límite firma ábaco</p><p><strong>${esc(c.fecha_limite_firma_abaco?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Inicio fábrica</p><p><strong>${esc(c.inicio_fabrica?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Fin producción (compromiso)</p><p><strong>${esc(c.fecha_compromiso_fin_produccion?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Inicio instalación (compromiso)</p><p><strong>${esc(c.fecha_comprometida_inicio_instalacion?.slice(0,10))}</strong></p></div>
        <div><p style="color:var(--muted); font-size:0.875rem">Fin instalación</p><p><strong>${esc(c.fin_instalacion?.slice(0,10))}</strong></p></div>
      </div>
    </div>
  `;
}

function bindSeguimientoWizard(container, proyectoId, tipo) {
  const btnGenerar = container.querySelector(`#btn-generar-${tipo}`);
  const startDiv = container.querySelector(`#${tipo}-wizard-start`);
  const wizardDiv = container.querySelector(`#${tipo}-etapas-wizard`);
  const listDiv = container.querySelector(`#etapas-${tipo}-list`);
  const btnConfirmar = container.querySelector(`#btn-confirmar-${tipo}`);

  if (!btnGenerar) return;

  btnGenerar.addEventListener("click", async () => {
    btnGenerar.disabled = true;
    btnGenerar.textContent = "Cargando etapas...";
    try {
      const etapas = await apiGet(`/configuracion-etapas/${tipo}`);
      listDiv.innerHTML = etapas.map(e => `
        <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:6px; cursor:pointer; background:var(--card-bg);">
          <input type="checkbox" value="${e.id}" checked> ${esc(e.nombre)}
        </label>
      `).join("");
      startDiv.style.display = "none";
      wizardDiv.style.display = "block";
    } catch (err) {
      alert("Error al cargar etapas: " + err.message);
      btnGenerar.disabled = false;
      btnGenerar.textContent = "Seleccionar Etapas y Generar Seguimiento";
    }
  });

  if (!btnConfirmar) return;

  btnConfirmar.addEventListener("click", async () => {
    const checkboxes = listDiv.querySelectorAll("input[type=checkbox]:checked");
    const seleccionadas = Array.from(checkboxes).map(cb => cb.value);
    if (seleccionadas.length === 0) {
      return alert("Seleccioná al menos una etapa.");
    }
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Generando...";
    try {
      await apiPost(`/obras/${proyectoId}/seguimiento/${tipo}`, {
        etapas_seleccionadas: seleccionadas
      });
      import("./proyecto-detalle.js").then(m => m.renderProyectoDetalle(container, proyectoId));
    } catch (err) {
      alert("Error: " + err.message);
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Generar";
    }
  });
}

function bindGrillaInteractions(container, proyectoId) {
  container.querySelectorAll(".btn-etapa-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const currentState = btn.getAttribute("data-estado");
      let newState = "pendiente";
      if (currentState === "pendiente") newState = "en_proceso";
      else if (currentState === "en_proceso") newState = "completada";
      else if (currentState === "completada") newState = "pendiente";

      btn.style.opacity = "0.5";
      try {
        await api(`/avance-etapas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: newState })
        });
        btn.setAttribute("data-estado", newState);
        const colors = { completada: "var(--green, #22c55e)", en_proceso: "var(--yellow, #eab308)", pendiente: "var(--muted, #6b7280)" };
        const labels = { completada: "C", en_proceso: "P", pendiente: "-" };
        btn.style.background = colors[newState];
        btn.textContent = labels[newState];
      } catch (err) {
        alert("Error al actualizar etapa: " + err.message);
      } finally {
        btn.style.opacity = "1";
      }
    });
  });
}

function renderInforme(cronograma, segFabrica, segObra) {
  // Checklist de pendientes si falta algo
  const checks = [
    { label: "Oferta / Cronograma generado", ok: !!cronograma },
    { label: "Seguimiento de Fábrica generado", ok: !!segFabrica },
    { label: "Seguimiento de Obra generado", ok: !!segObra },
  ];
  const allOk = checks.every(c => c.ok);

  if (!allOk) {
    return `
      <h3 style="margin-bottom:1rem;">Pasos pendientes para habilitar el informe completo</h3>
      <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:0.75rem;">
        ${checks.map(c => `
          <li style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; border:1px solid var(--border); border-radius:8px;">
            <span style="width:24px; height:24px; border-radius:50%; background:${c.ok ? '#22c55e' : 'var(--border)'}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; flex-shrink:0;">
              ${c.ok ? '✓' : '○'}
            </span>
            <span style="color:${c.ok ? 'var(--fg)' : 'var(--muted)'};">${c.label}</span>
          </li>
        `).join("")}
      </ul>
    `;
  }

  // Calcular semáforo
  const hoy = new Date();
  const finFabrica = cronograma.fecha_compromiso_fin_produccion ? new Date(cronograma.fecha_compromiso_fin_produccion) : null;
  const finObra = cronograma.fin_instalacion ? new Date(cronograma.fin_instalacion) : null;
  const pctFab = segFabrica ? parseFloat(segFabrica.porcentaje_avance) : 0;
  const pctObra = segObra ? parseFloat(segObra.porcentaje_avance) : 0;
  const pctTotal = (pctFab + pctObra) / 2;

  let semaforo = "gris";
  let semaforoColor = "#6b7280";
  let semaforoLabel = "Sin datos suficientes";

  if (finObra) {
    const diasRestantes = Math.ceil((finObra - hoy) / 86400000);
    if (pctTotal >= 100) {
      semaforo = "verde"; semaforoColor = "#22c55e"; semaforoLabel = "Proyecto finalizado";
    } else if (diasRestantes < 0) {
      semaforo = "rojo"; semaforoColor = "#ef4444"; semaforoLabel = `Vencido hace ${Math.abs(diasRestantes)} días`;
    } else if (diasRestantes <= 3) {
      semaforo = "amarillo"; semaforoColor = "#eab308"; semaforoLabel = `Vence en ${diasRestantes} días hábiles`;
    } else {
      semaforo = "verde"; semaforoColor = "#22c55e"; semaforoLabel = `${diasRestantes} días restantes`;
    }
  }

  // Calcular KPIs de fábrica
  const totalAb = segFabrica?.avances_aberturas?.length || 0;
  const fabCompletadas = segFabrica?.avances_aberturas?.filter(a => a.estado_general === 'completada').length || 0;
  const fabEnProceso = segFabrica?.avances_aberturas?.filter(a => a.estado_general === 'en_proceso').length || 0;
  const fabPendientes = totalAb - fabCompletadas - fabEnProceso;

  const totalAbObra = segObra?.avances_aberturas?.length || 0;
  const obraCompletadas = segObra?.avances_aberturas?.filter(a => a.estado_general === 'completada').length || 0;
  const obraEnProceso = segObra?.avances_aberturas?.filter(a => a.estado_general === 'en_proceso').length || 0;
  const obraPendientes = totalAbObra - obraCompletadas - obraEnProceso;

  const fmtDate = d => d ? new Date(d).toLocaleDateString("es-PY") : "-";

  return `
    <style>
      .informe-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }
      .informe-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; }
      .informe-card h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 0.75rem; }
      .kpi-row { display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
      .kpi-row:last-child { border-bottom: none; }
      .kpi-val { font-weight: 700; }
      .semaforo-dot { width: 18px; height: 18px; border-radius: 50%; display: inline-block; margin-right: 8px; vertical-align: middle; }
      .progress-mini { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; margin-top: 6px; }
      .progress-mini-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
    </style>

    <!-- SEMÁFORO -->
    <div style="display:flex; align-items:center; gap:1rem; padding:1rem 1.5rem; background:var(--card-bg); border:2px solid ${semaforoColor}; border-radius:12px; margin-bottom:1.5rem;">
      <div style="width:48px; height:48px; border-radius:50%; background:${semaforoColor}; flex-shrink:0;"></div>
      <div>
        <p style="font-size:0.8rem; text-transform:uppercase; color:var(--muted); margin:0;">Estado del Proyecto</p>
        <p style="font-size:1.25rem; font-weight:700; margin:0; color:${semaforoColor};">${semaforoLabel}</p>
        <p style="font-size:0.85rem; color:var(--muted); margin:0;">Avance general: ${pctTotal.toFixed(1)}% · Fábrica ${pctFab.toFixed(1)}% · Obra ${pctObra.toFixed(1)}%</p>
      </div>
    </div>

    <div class="informe-grid">
      <!-- CRONOGRAMA -->
      <div class="informe-card">
        <h4>Cronograma</h4>
        <div class="kpi-row"><span>Límite firma ábaco</span><span class="kpi-val">${fmtDate(cronograma.fecha_limite_firma_abaco)}</span></div>
        <div class="kpi-row"><span>Inicio Fábrica</span><span class="kpi-val">${fmtDate(cronograma.inicio_fabrica)}</span></div>
        <div class="kpi-row"><span>Fin Producción (compromiso)</span><span class="kpi-val">${fmtDate(cronograma.fecha_compromiso_fin_produccion)}</span></div>
        <div class="kpi-row"><span>Inicio Instalación</span><span class="kpi-val">${fmtDate(cronograma.fecha_comprometida_inicio_instalacion)}</span></div>
        <div class="kpi-row"><span>Fin Instalación</span><span class="kpi-val">${fmtDate(cronograma.fin_instalacion)}</span></div>
      </div>

      <!-- FÁBRICA -->
      <div class="informe-card">
        <h4>Seguimiento Fábrica</h4>
        <div style="font-size:2rem; font-weight:800; color:var(--primario);">${pctFab.toFixed(0)}%</div>
        <div class="progress-mini"><div class="progress-mini-fill" style="width:${pctFab}%; background:#22c55e;"></div></div>
        <div style="margin-top:0.75rem;">
          <div class="kpi-row"><span>Total aberturas</span><span class="kpi-val">${totalAb}</span></div>
          <div class="kpi-row"><span>✅ Completadas</span><span class="kpi-val" style="color:#22c55e;">${fabCompletadas}</span></div>
          <div class="kpi-row"><span>🔄 En proceso</span><span class="kpi-val" style="color:#eab308;">${fabEnProceso}</span></div>
          <div class="kpi-row"><span>⏳ Pendientes</span><span class="kpi-val" style="color:var(--muted);">${fabPendientes}</span></div>
        </div>
      </div>

      <!-- OBRA -->
      <div class="informe-card">
        <h4>Seguimiento Obra</h4>
        <div style="font-size:2rem; font-weight:800; color:var(--primario);">${pctObra.toFixed(0)}%</div>
        <div class="progress-mini"><div class="progress-mini-fill" style="width:${pctObra}%; background:#3b82f6;"></div></div>
        <div style="margin-top:0.75rem;">
          <div class="kpi-row"><span>Total aberturas</span><span class="kpi-val">${totalAbObra}</span></div>
          <div class="kpi-row"><span>✅ Completadas</span><span class="kpi-val" style="color:#22c55e;">${obraCompletadas}</span></div>
          <div class="kpi-row"><span>🔄 En proceso</span><span class="kpi-val" style="color:#eab308;">${obraEnProceso}</span></div>
          <div class="kpi-row"><span>⏳ Pendientes</span><span class="kpi-val" style="color:var(--muted);">${obraPendientes}</span></div>
        </div>
      </div>
    </div>
  `;
}
