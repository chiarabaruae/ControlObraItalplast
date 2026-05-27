# Control Obras — Italplast

Aplicación web interna para gestionar obras de instalación de aberturas: clientes, proyectos, etapas, documentos, cronogramas y seguimiento operativo.

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
| Frontend | HTML + CSS + JavaScript (ES Modules, sin build) |
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
      index.html
      scripts/
        pages/
      styles/
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
- `src/frontend/`: SPA (login + app) en JS vanilla.
- `src/frontend/scripts/pages/`: pantallas (Dashboard, Clientes, Proyectos, etc.).
- `src/frontend/styles/`: estilos globales y componentes visuales.
- `tools/`: utilidades de soporte del repo.

---

## ¿Cómo funciona este proyecto?

Resumen de flujo funcional:

1. Usuario inicia sesión.
2. Frontend consume API backend (`/api/...`) con JWT.
3. Módulo Clientes lee datos de CRM externo (`leads`) en modo solo lectura.
4. Desde Clientes se crean proyectos en DB local y se vinculan al cliente externo.
5. Módulo Proyectos/Obras opera sobre datos locales (estados, tablero, seguimiento, documentos).

Arquitectura general:

```text
Frontend (JS) -> Backend Express -> PostgreSQL (local)

---

## Overview de pantallas principales

Incluye una maqueta fija en HTML que imita la interfaz principal del Dashboard:

- [overview-dashboard.html](docs/overview-dashboard.html)

Resumen funcional de pantallas:

- `Login`: acceso con usuario/contraseña y sesión JWT.
- `Dashboard`: resumen operativo general (estado de obras y métricas rápidas).
- `Clientes`: clientes del CRM , vinculación con proyectos y creación de proyecto.
- `Proyectos / Obras`: tablero de gestión de proyectos (lista, matriz, kanban, gantt y módulos internos).
- `To-Do`: tareas internas de seguimiento.
- `Personalizar`: ajustes visuales (tema y color de acento).
- `Ajustes / Usuarios` (admin): gestión básica de usuarios y roles.

---
