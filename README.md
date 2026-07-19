# Control Obras — Italplast

Aplicación web interna para gestionar clientes, proyectos multiproducto, etapas, documentos, cronogramas y seguimiento operativo de Italplast.

> Contexto vigente para agentes y colaboradores: [docs/context-index.md](docs/context-index.md).

---

## ¿De qué trata este proyecto?

Este proyecto centraliza el flujo operativo de obras de Italplast:

1. Se crean y gestionan proyectos locales.
2. Se hace seguimiento del estado de cada proyecto (tablero, fechas, documentos, etc.).

---

## ¿Para qué es este proyecto?

Para que el equipo pueda:

- convertir oportunidades comerciales en proyectos de ejecución,
- controlar avance de obras en una sola plataforma,
- mantener trazabilidad entre CRM (externo) y operación (interna).

---

## ¿Cuál es la estructura del Stack Tecnológico?

| Capa | Tecnología |
|---|---|
| Frontend activo | React + TypeScript + Vite + Tailwind CSS + shadcn/Radix |
| Frontend legado | HTML + CSS + JavaScript (conservado durante la migración) |
| Backend API | Node.js + Express |
| Base local operativa | PostgreSQL (Railway) |
| Base externa CRM | MySQL/MariaDB (vista `leads`) |
| Auth | JWT + bcryptjs |
| Archivos | multer + pdf-parse + xlsx |

---

## ¿Cuál es la estructura del proyecto?

```text
ControlAvancesObra/
  docs/
  src/
    backend/
      migrations/
      scripts/
      src/
        application/
        domain/
        http/
        infrastructure/
        shared/
    frontend/
      src/
        components/
        context/
        lib/
        mocks/
        pages/
      public/
  tools/
```

---

## ¿Para qué sirve cada carpeta? (breve)

- `docs/`: documentación técnica y decisiones de arquitectura.
- `src/backend/`: API, lógica de negocio, acceso a datos y migraciones.
- `src/backend/migrations/`: cambios versionados de esquema SQL.
- `src/backend/scripts/`: utilidades (migrar DB, seeds, etc.).
- `src/backend/src/application/`: casos de uso.
- `src/backend/src/domain/`: reglas de negocio y modelos.
- `src/backend/src/http/`: rutas y middlewares Express.
- `src/backend/src/infrastructure/`: adaptadores (PostgreSQL, MySQL, seguridad, servicios).
- `src/backend/src/shared/`: configuración compartida (env, utilidades).
- `src/frontend/src/`: frontend React activo.
- `src/frontend/src/pages/`: pantallas de Dashboard, Clientes, Proyectos, Tareas, Usuarios, Settings y Support.
- `src/frontend/src/components/`: shell, componentes de aplicación y UI reutilizable.
- `src/frontend/src/mocks/`: modelo y persistencia temporal de Fase 2.
- `src/frontend/scripts/` y `styles/`: frontend vanilla legado durante la migración.
- `tools/`: utilidades de soporte del repo.

---

## ¿Cómo funciona este proyecto?

Resumen de flujo funcional:

1. Usuario inicia sesión en el frontend React mock.
2. La navegación y las acciones visibles se filtran por rol.
3. Administradores pueden crear proyectos con uno o más tipos de producto.
4. Cada producto conserva sus propias etapas de premarcos, fábrica y obra.
5. Los datos de Fase 2 se guardan temporalmente en `localStorage`.
6. La conexión completa con la API y PostgreSQL queda para las fases siguientes.

Arquitectura general:

```text
Frontend React (mocks/localStorage, Fase 2)
              ↓ conexión progresiva
Backend Express -> PostgreSQL
```

---

## Overview de pantallas principales

Incluye una maqueta fija en HTML que imita la interfaz principal del Dashboard:

- [overview-dashboard.html](docs/overview-dashboard.html)

Resumen funcional de pantallas:

- `Login`: acceso mock por Documento y Contraseña, con recuperación de contraseña demostrativa.
- `Dashboard`: resumen operativo general (estado de obras y métricas rápidas).
- `Clientes`: clientes del CRM , vinculación con proyectos y creación de proyecto.
- `Proyectos`: tarjetas, alta multiproducto y seguimiento por producto.
- `Tareas`: tareas internas de seguimiento.
- `Settings`: Account, Personalizar y Updates.
- `Support`: Documentation y Contact support.
- `Usuarios` (admin): gestión mock de usuarios y roles.

## Desarrollo del frontend React

```bash
cd src/frontend
npm install
npm run dev
```

Validación:

```bash
npm run build
npm run lint
```

---
