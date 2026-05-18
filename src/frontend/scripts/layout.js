// Layout: Sidebar + Topbar rendering
import { icons, getInitials } from "./ui.js";
import { navigate, getCurrentPath } from "./router.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", path: "/dashboard" },
  { id: "clientes", label: "Clientes", icon: "clientes", path: "/clientes" },
  { id: "obras", label: "Obras", icon: "obras", path: "/proyectos" },
  { id: "tareas", label: "To-Do", icon: "tareas", path: "/todo" },
  { id: "personalizar", label: "Personalizar", icon: "personalizar", path: "/personalizar" },
];

let sidebarClients = [];

export function setSidebarClients(clients) {
  sidebarClients = clients;
  renderClientList();
}

export function renderLayout(container, user) {
  container.innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">CO</div>
        <div class="logo-text">
          <strong>Control Obras</strong>
        </div>
      </div>
      <nav class="side-nav" id="side-nav"></nav>
      <div class="sidebar-section" id="sidebar-clients">
        <div class="sidebar-section-title">CLIENTES</div>
        <div id="sidebar-client-list"></div>
      </div>
    </aside>
    <div class="main-content">
      <header class="topbar">
        <div class="topbar-left" style="display:flex;align-items:center;gap:10px">
          <button class="mobile-menu-btn" id="mobile-menu-btn" type="button">${icons.menu}</button>
          <span id="topbar-section">Dashboard</span>
        </div>
        <div class="topbar-right">
          <span class="user-name" id="user-name-btn">${esc(user.displayName)}</span>
          <div class="user-avatar" id="user-avatar-btn">${getInitials(user.displayName)}</div>
          <div class="user-menu" id="user-menu">
            <button type="button" data-theme="claro">☀️ Modo Claro</button>
            <button type="button" data-theme="oscuro">🌙 Modo Oscuro</button>
            <button type="button" data-theme="sistema">🖥️ Sistema</button>
            <hr>
            <button type="button" id="btn-logout">Cerrar sesión</button>
          </div>
        </div>
      </header>
      <div class="page-content" id="page-content">
        <div class="loading">Cargando...</div>
      </div>
    </div>
  `;

  renderNav();
  bindLayoutEvents(user);
}

function renderNav() {
  const nav = document.getElementById("side-nav");
  if (!nav) return;
  const current = getCurrentPath();
  nav.innerHTML = NAV_ITEMS.map(item => {
    const isActive = current.startsWith(item.path) ? "active" : "";
    return `<button class="nav-item ${isActive}" data-path="${item.path}" type="button">
      ${icons[item.icon]}
      <span>${item.label}</span>
    </button>`;
  }).join("");
}

function renderClientList() {
  const el = document.getElementById("sidebar-client-list");
  if (!el) return;
  el.innerHTML = sidebarClients.filter(c => c.estado === "activo").slice(0, 8).map(c =>
    `<div class="sidebar-client">
      <div class="avatar-sm">${getInitials(c.nombre)}</div>
      <span>${esc(c.nombre).toUpperCase()}</span>
    </div>`
  ).join("") || '<div style="padding:6px 14px;font-size:12px;color:var(--muted)">Sin clientes</div>';
}

function bindLayoutEvents(user) {
  // Nav clicks
  document.getElementById("side-nav")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-path]");
    if (btn) {
      navigate(btn.dataset.path);
      closeMobileSidebar();
    }
  });

  // Update nav on hash change
  window.addEventListener("hashchange", renderNav);

  // User menu toggle
  const menuToggle = () => {
    document.getElementById("user-menu")?.classList.toggle("open");
  };
  document.getElementById("user-avatar-btn")?.addEventListener("click", menuToggle);
  document.getElementById("user-name-btn")?.addEventListener("click", menuToggle);

  // Close menu on outside click
  document.addEventListener("click", e => {
    const menu = document.getElementById("user-menu");
    const avatar = document.getElementById("user-avatar-btn");
    const name = document.getElementById("user-name-btn");
    if (menu && !menu.contains(e.target) && e.target !== avatar && e.target !== name) {
      menu.classList.remove("open");
    }
  });

  // Theme buttons
  document.getElementById("user-menu")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-theme]");
    if (btn) {
      localStorage.setItem("co-theme", btn.dataset.theme);
      applyTheme();
      document.getElementById("user-menu")?.classList.remove("open");
    }
  });

  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    sessionStorage.clear();
    location.reload();
  });

  // Mobile sidebar
  document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
    document.getElementById("sidebar-overlay")?.classList.toggle("open");
  });
  document.getElementById("sidebar-overlay")?.addEventListener("click", closeMobileSidebar);

  applyTheme();
}

function closeMobileSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-overlay")?.classList.remove("open");
}

export function setTopbarSection(name) {
  const el = document.getElementById("topbar-section");
  if (el) el.textContent = name;
}

export function getPageContent() {
  return document.getElementById("page-content");
}

function applyTheme() {
  const theme = localStorage.getItem("co-theme") || "sistema";
  document.documentElement.removeAttribute("data-theme");
  if (theme === "oscuro") document.documentElement.setAttribute("data-theme", "dark");
  else if (theme === "claro") document.documentElement.setAttribute("data-theme", "light");
}

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
