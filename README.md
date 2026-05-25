# Control de Avances de Obra — Italplast

Aplicación web interna para la gestión integral de proyectos de carpintería de aluminio:
desde la creación del proyecto hasta el seguimiento de fabricación e instalación en obra.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS (Vanilla) + JavaScript (ES Modules) |
| Backend | Node.js 20+ con Express |
| Base de datos | PostgreSQL 16 (Railway) |
| Autenticación | JWT (jsonwebtoken + bcryptjs) |
| Parsing de archivos | pdf-parse (PDF) + xlsx (Excel) |

---

## Estructura del Proyecto

```text
src/
  backend/
    src/
      domain/            # Entidades y reglas del negocio
      application/       # Casos de uso y puertos
      infrastructure/    # Adaptadores: PostgreSQL, JWT, servicios externos
      http/              # Rutas y middlewares Express
    migrations/          # SQL versionado para PostgreSQL
    scripts/             # Migraciones y seed de usuarios
  frontend/
    index.html           # Shell principal (login + app)
    styles/              # CSS global y componentes
    scripts/
      app.js             # Entry point: auth + router
      router.js          # SPA router sin recarga
      layout.js          # Sidebar, topbar y contenedor de página
      api.js             # Wrapper fetch con JWT
      ui.js              # Íconos, helpers, componentes reutilizables
      pages/
        dashboard.js     # KPIs y resumen general
        proyectos.js     # Módulo principal de gestión de proyectos
        clientes.js      # ABM de clientes
        todo.js          # Tareas internas
        personalizar.js  # Tema y preferencias del usuario
tools/
  python/                # Utilidades de soporte
docs/
  architecture.md        # Decisiones y convenciones de arquitectura