import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Aplicar tema guardado antes del primer render para evitar flash
const tema = localStorage.getItem("co-tema") ?? "sistema";
const oscuro =
  tema === "oscuro" ||
  (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark", oscuro);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
