const form = document.querySelector("#login-form");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const statusMessage = document.querySelector("#form-status");
const togglePassword = document.querySelector("#toggle-password");

const setStatus = (message, type = "") => {
  statusMessage.textContent = message;
  statusMessage.className = `form-status${type ? ` is-${type}` : ""}`;
};

togglePassword.addEventListener("click", () => {
  const isHidden = password.type === "password";
  password.type = isHidden ? "text" : "password";
  togglePassword.setAttribute(
    "aria-label",
    isHidden ? "Ocultar contraseña" : "Mostrar contraseña"
  );
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const credentials = {
    username: username.value.trim(),
    password: password.value
  };

  if (!credentials.username || !credentials.password) {
    setStatus("Ingresá usuario y contraseña.", "error");
    return;
  }

  if (window.location.protocol === "file:") {
    setStatus("Login visual listo. La API se conectará al levantar el backend.", "success");
    return;
  }

  setStatus("Validando acceso...");

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credentials)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setStatus(result.error ?? "No se pudo iniciar sesión.", "error");
      return;
    }

    sessionStorage.setItem("controlObraToken", result.token);
    setStatus(`Bienvenida/o, ${result.user.displayName}.`, "success");
  } catch {
    setStatus("No se pudo conectar con la API.", "error");
  }
});
