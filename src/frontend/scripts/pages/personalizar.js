// Personalizar page
import { icons, esc } from "../ui.js";
import { setTopbarSection } from "../layout.js";

export function renderPersonalizar(container) {
  setTopbarSection("Personalizar");
  const currentTheme = localStorage.getItem("co-theme") || "sistema";
  const currentColor = localStorage.getItem("co-accent") || "#8A0FA8";

  container.innerHTML = `
    <div class="page-header">
      <div class="eyebrow">CONFIGURACIÓN</div>
      <h1>Personalizar</h1>
      <p class="subtitle">Elegí el tema de la interfaz y el color de acento. Se guarda automáticamente.</p>
    </div>

    <div class="card" style="max-width:640px">
      <div class="card-header"><div><h2>Tema de interfaz</h2></div></div>
      <p style="font-size:13px;color:var(--texto-sec);margin-bottom:16px">
        Elegí el tema de la interfaz (Sistema / Light / Dark). Se guarda automáticamente.
      </p>
      <div class="theme-options">
        <div class="theme-option ${currentTheme === "sistema" ? "selected" : ""}" data-set-theme="sistema">
          🖥️<br>Sistema
        </div>
        <div class="theme-option ${currentTheme === "claro" ? "selected" : ""}" data-set-theme="claro">
          ☀️<br>Light
        </div>
        <div class="theme-option ${currentTheme === "oscuro" ? "selected" : ""}" data-set-theme="oscuro">
          🌙<br>Dark
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:8px">
        Si elegís Sistema, la app seguirá el tema del sistema operativo y cambiará en tiempo real.
      </p>

      <hr style="border:none;border-top:1px solid var(--borde);margin:24px 0">

      <div class="card-header"><div><h2>Color de acento</h2></div></div>
      <p style="font-size:13px;color:var(--texto-sec);margin-bottom:16px">
        Por defecto usa el violeta del tema. Si elegís uno, se guarda.
      </p>
      <div class="color-picker-row">
        <input type="color" id="accent-color" value="${currentColor}">
        <span style="font-size:14px;font-weight:600;color:var(--texto)" id="accent-value">${currentColor}</span>
        <button class="btn btn-ghost btn-sm" id="btn-restore-accent" type="button">Restaurar</button>
      </div>
    </div>
  `;

  // Theme selection
  container.addEventListener("click", e => {
    const themeEl = e.target.closest("[data-set-theme]");
    if (themeEl) {
      localStorage.setItem("co-theme", themeEl.dataset.setTheme);
      applyTheme();
      container.querySelectorAll(".theme-option").forEach(el => el.classList.remove("selected"));
      themeEl.classList.add("selected");
    }
  });

  // Accent color
  document.getElementById("accent-color")?.addEventListener("input", e => {
    const color = e.target.value;
    localStorage.setItem("co-accent", color);
    document.getElementById("accent-value").textContent = color;
    document.documentElement.style.setProperty("--primario", color);
  });

  document.getElementById("btn-restore-accent")?.addEventListener("click", () => {
    const def = "#8A0FA8";
    localStorage.removeItem("co-accent");
    document.getElementById("accent-color").value = def;
    document.getElementById("accent-value").textContent = def;
    document.documentElement.style.setProperty("--primario", def);
  });
}

function applyTheme() {
  const theme = localStorage.getItem("co-theme") || "sistema";
  document.documentElement.removeAttribute("data-theme");
  if (theme === "oscuro") document.documentElement.setAttribute("data-theme", "dark");
  else if (theme === "claro") document.documentElement.setAttribute("data-theme", "light");
}
