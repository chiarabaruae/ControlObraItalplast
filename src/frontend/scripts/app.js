// Main entry point - Control Obras
import { addRoute, startRouter, navigate } from "./router.js";
import { renderLayout, getPageContent, setSidebarClients } from "./layout.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderClientes } from "./pages/clientes.js";
import { renderObras } from "./pages/obras.js";
import { renderTodo } from "./pages/todo.js";
import { renderPersonalizar } from "./pages/personalizar.js";
import { apiGet } from "./api.js";

// ============ AUTH ============
const loginShell = document.getElementById("login-shell");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const formStatus = document.getElementById("form-status");
const togglePwd = document.getElementById("toggle-password");

let currentUser = null;

// Toggle password visibility
togglePwd?.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePwd.setAttribute("aria-label", isHidden ? "Ocultar contraseña" : "Mostrar contraseña");
});

// Login form
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const creds = { username: usernameInput.value.trim(), password: passwordInput.value };

  if (!creds.username || !creds.password) {
    setStatus("Ingresa usuario y contraseña.", "error");
    return;
  }

  if (window.location.protocol === "file:") {
    setStatus("Levanta el backend para iniciar sesión.", "error");
    return;
  }

  setStatus("Validando acceso...");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setStatus(data.error ?? "No se pudo iniciar sesión.", "error");
      return;
    }

    sessionStorage.setItem("controlObraToken", data.token);
    sessionStorage.setItem("controlObraUser", JSON.stringify(data.user));
    enterApp(data.user);
  } catch {
    setStatus("No se pudo conectar con la API.", "error");
  }
});

function setStatus(msg, type = "") {
  if (formStatus) {
    formStatus.textContent = msg;
    formStatus.className = `form-status${type ? ` is-${type}` : ""}`;
  }
}

// ============ APP INIT ============
function enterApp(user) {
  currentUser = user;
  loginShell.hidden = true;
  appShell.hidden = false;

  renderLayout(appShell, user);

  // Apply saved accent color
  const accent = localStorage.getItem("co-accent");
  if (accent) document.documentElement.style.setProperty("--primario", accent);

  // Load sidebar clients
  apiGet("/clientes").then(c => setSidebarClients(c)).catch(() => {});

  // Register routes
  addRoute("/dashboard", () => {
    const el = getPageContent();
    if (el) renderDashboard(el, currentUser);
  });
  addRoute("/clientes", () => {
    const el = getPageContent();
    if (el) renderClientes(el);
  });
  addRoute("/proyectos", () => {
    const el = getPageContent();
    if (el) renderObras(el);
  });
  addRoute("/todo", () => {
    const el = getPageContent();
    if (el) renderTodo(el);
  });
  addRoute("/personalizar", () => {
    const el = getPageContent();
    if (el) renderPersonalizar(el);
  });

  // Start routing
  startRouter();
}

// Auto-login from session
const storedToken = sessionStorage.getItem("controlObraToken");
const storedUser = sessionStorage.getItem("controlObraUser");

if (storedToken && storedUser) {
  try {
    enterApp(JSON.parse(storedUser));
  } catch {
    sessionStorage.clear();
  }
}
