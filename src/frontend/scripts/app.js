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
const submitBtn = document.querySelector(".submit-button");
const submitBtnText = submitBtn?.querySelector("span");
const submitBtnIcon = submitBtn?.querySelector("svg");

const spinnerSvg = '<svg viewBox="0 0 24 24" class="spinner" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="32" stroke-dashoffset="32"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';

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
  setLoading(true);

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setStatus(data.error ?? "No se pudo iniciar sesión.", "error");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("controlObraToken", data.token);
    sessionStorage.setItem("controlObraUser", JSON.stringify(data.user));
    enterApp(data.user);
  } catch {
    setStatus("No se pudo conectar con la API.", "error");
    setLoading(false);
  }
});

function setLoading(isLoading) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  if (isLoading) {
    submitBtnText.textContent = "Validando...";
    submitBtn.innerHTML = spinnerSvg + "<span>Validando...</span>";
    submitBtn.style.opacity = "0.7";
    submitBtn.style.cursor = "not-allowed";
  } else {
    submitBtnText.textContent = "Iniciar sesión";
    submitBtn.innerHTML = submitBtnIcon.outerHTML + "<span>Iniciar sesión</span>";
    submitBtn.style.opacity = "1";
    submitBtn.style.cursor = "pointer";
  }
}

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

  // Apply saved accent color and theme
  const accent = localStorage.getItem("co-accent");
  if (accent) document.documentElement.style.setProperty("--primario", accent);

  const theme = localStorage.getItem("co-theme") || "sistema";
  if (theme === "oscuro") document.documentElement.setAttribute("data-theme", "dark");
  else if (theme === "claro") document.documentElement.setAttribute("data-theme", "light");
  else {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) document.documentElement.setAttribute("data-theme", "dark");
  }

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
