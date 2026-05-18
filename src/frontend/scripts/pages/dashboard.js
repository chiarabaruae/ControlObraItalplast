// Dashboard page
import { apiGet } from "../api.js";
import { icons, renderKpi, renderBadge, renderProgress, esc, formatLabel, getInitials } from "../ui.js";
import { setTopbarSection } from "../layout.js";

export async function renderDashboard(container, user) {
  setTopbarSection("Dashboard");
  container.innerHTML = '<div class="loading">Cargando dashboard...</div>';

  try {
    const data = await apiGet("/dashboard");
    const r = data.resumen;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

    container.innerHTML = `
      <div class="page-header">
        <div class="eyebrow">INICIO</div>
        <h1>${greeting}, ${esc(user.displayName)}</h1>
        <p class="subtitle">Resumen operativo de Control Obras</p>
      </div>

      <div class="kpi-grid">
        ${renderKpi("briefcase", r.obras, "Proyectos activos")}
        ${renderKpi("activity", r.obras_en_progreso, "Obras en ejecución")}
        ${renderKpi("alert", 0, "Obras en riesgo")}
        ${renderKpi("users", 0, "Responsables")}
      </div>

      <div class="pipeline-grid">
        <div class="pipeline-card">
          <div class="pipe-value">${r.clientes}</div>
          <div class="pipe-label">Clientes</div>
        </div>
        <div class="pipeline-card">
          <div class="pipe-value">${r.obras}</div>
          <div class="pipe-label">Proyectos</div>
        </div>
        <div class="pipeline-card">
          <div class="pipe-value">${r.obras_en_progreso}</div>
          <div class="pipe-label">Obras</div>
        </div>
        <div class="pipeline-card">
          <div class="pipe-value">${r.tareas}</div>
          <div class="pipe-label">Tareas</div>
        </div>
      </div>

      <div class="cols-65-35">
        <div class="card">
          <div class="card-header">
            <div><h2>Estado de Obras</h2><p>${r.obras} obras registradas</p></div>
          </div>
          <div id="dash-obras-list"></div>
        </div>
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="card-header"><div><h2>Productividad</h2></div></div>
            <div style="margin-bottom:12px;font-size:14px;color:var(--texto-sec);font-weight:600">
              ${r.tareas_finalizadas} de ${r.tareas} tareas finalizadas
            </div>
            ${renderProgress(r.tareas > 0 ? Math.round(r.tareas_finalizadas / r.tareas * 100) : 0)}
          </div>
          <div class="card">
            <div class="card-header"><div><h2>Alertas</h2></div></div>
            <div style="padding:16px 0;text-align:center;color:var(--muted);font-size:13px">
              Sin alertas activas
            </div>
          </div>
        </div>
      </div>
    `;

    // Load obras list
    try {
      const obras = await apiGet("/obras");
      const listEl = document.getElementById("dash-obras-list");
      if (listEl) {
        if (obras.length === 0) {
          listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Sin obras cargadas</div>';
        } else {
          listEl.innerHTML = `<div class="table-wrap"><table>
            <thead><tr><th>Obra</th><th>Cliente</th><th>Estado</th><th>Avance</th></tr></thead>
            <tbody>${obras.slice(0, 10).map(o => `<tr>
              <td><strong>${esc(o.nombre)}</strong></td>
              <td>${esc(o.cliente_nombre || "-")}</td>
              <td>${renderBadge(o.estado)}</td>
              <td>${renderProgress(o.avance, "120px")}</td>
            </tr>`).join("")}</tbody>
          </table></div>`;
        }
      }
    } catch { /* silent */ }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error al cargar dashboard</h3><p>${esc(err.message)}</p></div>`;
  }
}
