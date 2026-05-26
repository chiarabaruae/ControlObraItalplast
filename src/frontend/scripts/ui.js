// Reusable UI helpers for Control Obras

// ============ ICONS (inline SVG) ============
export const icons = {
  dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  clientes: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  obras: '<svg viewBox="0 0 24 24"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-6h6v6"/></svg>',
  tareas: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  gantt: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="12" height="4" rx="1"/><rect x="3" y="16" width="15" height="4" rx="1"/></svg>',
  list: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  kanban: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="5" height="14" rx="1"/><rect x="10" y="5" width="5" height="9" rx="1"/><rect x="17" y="5" width="4" height="11" rx="1"/></svg>',
  gantt_global: '<svg viewBox="0 0 24 24"><line x1="3" y1="4" x2="3" y2="20"/><line x1="3" y1="20" x2="21" y2="20"/><rect x="6" y="7" width="8" height="3" rx="1"/><rect x="10" y="12" width="9" height="3" rx="1"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  personalizar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  close: '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v13h14V7"/><path d="M10 12h4"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  back: '<svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  activity: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  list: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  kanban: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  collapse: '<svg viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>',
};

// ============ HELPERS ============
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatLabel(value) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function formatDate(value) {
  if (!value) return "";
  let d;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    d = new Date(normalized);

    if (Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      d = new Date(`${raw}T00:00:00`);
    }
  } else {
    d = new Date(value);
  }

  if (!d || Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function daysBetween(a, b) {
  const d1 = new Date(a); const d2 = new Date(b);
  return Math.round((d2 - d1) / 86400000);
}

export function percentOf(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

export function getInitials(name) {
  return String(name ?? "").split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
}

export function progressColor(pct) {
  if (pct >= 80) return "green";
  if (pct >= 40) return "yellow";
  if (pct > 0) return "red";
  return "";
}

export function saludDotClass(salud) {
  const map = { buena: "dot-green", observacion: "dot-yellow", riesgo: "dot-yellow", critica: "dot-red" };
  return map[salud] || "dot-gray";
}

// ============ UI COMPONENTS ============
export function renderBadge(value) {
  const cls = String(value ?? "").toLowerCase().replace(/ /g, "_");
  return `<span class="badge badge-${esc(cls)}">${esc(formatLabel(value))}</span>`;
}

export function renderProgress(pct, width = "") {
  const n = Number(pct) || 0;
  const style = width ? `style="width:${width}"` : "";
  return `<div class="obra-progress" ${style}>
    <div class="progress-bar"><div class="fill ${progressColor(n)}" style="width:${n}%"></div></div>
    <span>${n}%</span>
  </div>`;
}

export function renderKpi(icon, value, label) {
  return `<div class="kpi-card">
    <div class="kpi-icon">${icons[icon] || icons.target}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-label">${label}</div>
  </div>`;
}

export function renderEmpty(message, sub = "Carga manual desde el botón Nuevo.") {
  return `<div class="empty-state">
    ${icons.tareas}
    <h3>${esc(message)}</h3>
    <p>${esc(sub)}</p>
  </div>`;
}

let routeLoading = false;
let requestLoadingCount = 0;
let overlayVisible = false;
let overlayTimer = null;

const ROUTE_OVERLAY_DELAY_MS = 110;
const REQUEST_OVERLAY_DELAY_MS = 180;

function getOverlayMode() {
  if (routeLoading) return "route";
  if (requestLoadingCount > 0) return "request";
  return "";
}

function showLoadingOverlay() {
  const mode = getOverlayMode();
  if (!mode) return;
  const overlay = document.getElementById("app-loading-overlay");
  if (!overlay) return;

  overlay.dataset.mode = mode;
  overlay.classList.add("is-visible");
  overlay.setAttribute("aria-hidden", "false");
  overlayVisible = true;
}

function hideLoadingOverlay() {
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }

  const overlay = document.getElementById("app-loading-overlay");
  if (!overlay) {
    overlayVisible = false;
    return;
  }

  overlay.classList.remove("is-visible");
  overlay.setAttribute("aria-hidden", "true");
  delete overlay.dataset.mode;
  overlayVisible = false;
}

function syncLoadingOverlay() {
  const mode = getOverlayMode();

  if (!mode) {
    hideLoadingOverlay();
    return;
  }

  if (overlayVisible) return;
  if (overlayTimer) return;

  const delay = mode === "route" ? ROUTE_OVERLAY_DELAY_MS : REQUEST_OVERLAY_DELAY_MS;
  overlayTimer = window.setTimeout(() => {
    overlayTimer = null;
    if (!getOverlayMode()) return;
    showLoadingOverlay();
  }, delay);
}

function skeletonTypeFromPath(path = "") {
  if (path.startsWith("/proyectos/")) return "proyecto-detalle";
  if (path.startsWith("/proyectos")) return "proyectos";
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/clientes")) return "clientes";
  if (path.startsWith("/todo")) return "todo";
  if (path.startsWith("/personalizar")) return "personalizar";
  if (path.startsWith("/ajustes")) return "ajustes";
  return "default";
}

function skeletonBlocks(type) {
  if (type === "proyecto-detalle") {
    return `
      <div class="skeleton-row">
        <div class="skeleton-block h-28 w-40"></div>
        <div class="skeleton-block h-28 w-22"></div>
      </div>
      <div class="skeleton-grid cols-3">
        <div class="skeleton-block h-88"></div>
        <div class="skeleton-block h-88"></div>
        <div class="skeleton-block h-88"></div>
      </div>
      <div class="skeleton-block h-220"></div>
    `;
  }

  if (type === "proyectos") {
    return `
      <div class="skeleton-row">
        <div class="skeleton-block h-28 w-28"></div>
        <div class="skeleton-block h-28 w-18"></div>
      </div>
      <div class="skeleton-grid cols-3">
        <div class="skeleton-block h-96"></div>
        <div class="skeleton-block h-96"></div>
        <div class="skeleton-block h-96"></div>
      </div>
    `;
  }

  return `
    <div class="skeleton-row">
      <div class="skeleton-block h-28 w-32"></div>
      <div class="skeleton-block h-28 w-20"></div>
    </div>
    <div class="skeleton-grid cols-2">
      <div class="skeleton-block h-140"></div>
      <div class="skeleton-block h-140"></div>
    </div>
    <div class="skeleton-block h-180"></div>
  `;
}

export function showRouteSkeleton(path) {
  routeLoading = true;
  const root = document.getElementById("page-content");
  if (!root) return;
  const type = skeletonTypeFromPath(path);
  root.dataset.loading = "true";
  root.innerHTML = `<section class="skeleton-view">${skeletonBlocks(type)}</section>`;
  syncLoadingOverlay();
}

export function hideRouteSkeleton() {
  routeLoading = false;
  const root = document.getElementById("page-content");
  if (root && requestLoadingCount === 0) {
    delete root.dataset.loading;
  }
  syncLoadingOverlay();
}

function updateRequestLoading(nextCount) {
  requestLoadingCount = Math.max(0, nextCount);
  const root = document.getElementById("page-content");
  if (root) {
    if (requestLoadingCount > 0) root.dataset.loading = "true";
    if (requestLoadingCount === 0 && !routeLoading) delete root.dataset.loading;
  }
  syncLoadingOverlay();
}

window.addEventListener("co:loading:start", () => {
  updateRequestLoading(requestLoadingCount + 1);
});

window.addEventListener("co:loading:end", () => {
  updateRequestLoading(requestLoadingCount - 1);
});
