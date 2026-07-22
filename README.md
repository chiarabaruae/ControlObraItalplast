# Gestión de proyectos — Italplast

Aplicación web interna para gestionar clientes, proyectos multiproducto, presupuestos ejecutivos, etapas, tareas, documentos y seguimiento operativo de Italplast.

> Contexto vigente para agentes y colaboradores: [docs/context-index.md](docs/context-index.md).

---

## ¿De qué trata este proyecto?

Este proyecto centraliza el flujo operativo de obras de Italplast:

1. Se crea un proyecto con uno o más tipos de producto y sus etapas particulares.
2. Se carga y revisa el presupuesto ejecutivo PDF que origina los componentes y tareas.
3. Fábrica e Instalación completan tareas con evidencia y el avance se calcula automáticamente.
4. El estado general se administra desde un tablero Kanban con transiciones condicionadas.

---

## ¿Para qué es este proyecto?

Para que el equipo pueda:

- convertir oportunidades comerciales en proyectos de ejecución,
- controlar avance de obras en una sola plataforma,
- coordinar fabricación, premarcos e instalación mediante tareas verificables,
- mantener trazabilidad entre CRM (externo) y operación (interna).

---

## Estado actual

La interfaz activa está en **Fase 2** y usa React con datos mock y persistencia temporal en `localStorage`. En paralelo existe un **esqueleto de backend Fase 2** (PostgreSQL + rutas `/api/v2`) todavía no conectado al frontend.

Funcionalidades disponibles:

- acceso por Documento y Contraseña con roles Administrador, Supervisor y Usuario;
- gestión mock de clientes y usuarios;
- proyectos con aluminio, PVC, mosquiteras, persianas, Velux, servicios y **productos personalizados** dados de alta por administración;
- configuración independiente de etapas y premarcos por producto (administradores **y supervisores** pueden crear proyectos);
- carga y revisión del presupuesto ejecutivo mediante extracción de texto embebido con PDF.js;
- **estimación automática de fechas** por bloque (fábrica/instalación) mediante planificación backward, con brechas configurables por administración;
- tareas con fechas, check, evidencia obligatoria, observaciones, **prioridad**, **responsable asignado** y auditoría (creación, modificación, reaperturas) visible para administradores;
- reapertura de tareas completadas con motivo obligatorio para todos los roles; borrado lógico auditado en vez de eliminación definitiva;
- Tareas (sección global) y el detalle de proyecto muestran los **mismos campos, filtros y permisos** para una misma tarea;
- sección **Reglas y catálogo** (solo administradores): brechas de planificación backward y alta/edición/baja de tipos de producto;
- filtro y orden por columna al estilo planilla en las tablas de gestión (Clientes, Usuarios, Tareas);
- avance automático derivado de tareas completadas, sin edición manual de porcentajes;
- tablero Kanban horizontal arrastrable con confirmaciones, pausas, cierres y acciones administrativas;
- personalización visual, datos de cuenta, actualizaciones y soporte.

Los cuatro proyectos iniciales incluyen componentes, tareas y evidencias **demostrativas** para recorrer el flujo. No representan información operativa real.

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
ControlObraItalplast/
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
4. El presupuesto ejecutivo PDF se lee localmente y sus componentes se revisan antes de confirmar.
5. Cada producto conserva sus propias etapas de premarcos, fábrica e instalación.
6. Los componentes y etapas generan listas de tareas con fechas; cada cierre exige evidencia y recalcula el avance.
7. Las mismas tareas se consultan y actualizan desde el detalle del proyecto y la sección Tareas.
8. El tablero Kanban aplica reglas antes de cada cambio de estado.
9. Los datos de Fase 2 se guardan temporalmente en `localStorage`.
10. La conexión completa con la API y PostgreSQL queda para las fases siguientes.

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
- `Proyectos`: tarjetas, Kanban arrastrable y alta multiproducto con presupuesto ejecutivo.
- `Detalle de proyecto`: resumen, tareas internas, cronograma, Fábrica, Instalación, informe y documentos.
- `Tareas`: seguimiento sincronizado de proyectos y tareas internas del equipo.
- `Configuración`: Cuenta, Personalizar y Actualizaciones.
- `Soporte`: Documentación y Contactar soporte.
- `Usuarios` (admin): gestión mock de usuarios y roles.
- `Reglas y catálogo` (admin): brechas de planificación backward y alta/edición/baja de tipos de producto.

## Desarrollo del frontend React

```bash
cd src/frontend
npm install
npm run dev
```

Vite sirve normalmente la aplicación en [http://localhost:5173](http://localhost:5173). Si ese puerto está ocupado, informa el siguiente disponible.

Para la sesión mock puede usarse el documento `2319471` (Administrador) y cualquier contraseña de al menos cuatro caracteres. No son credenciales de producción.

Validación:

```bash
npm run build
npm run lint
npm run diagnostico:presupuestos -- /ruta/presupuesto.pdf
```

El lint puede mostrar cuatro advertencias conocidas de Fast Refresh; no son errores de compilación.

## Backend

```bash
cd src/backend
npm install
npm run dev
```

La API Express/PostgreSQL permanece en evolución y todavía no cubre todos los flujos del frontend React. Existe un esqueleto Fase 2 (`/api/v2` en `src/backend/src/http/routes/fase2-routes.js` + migración `015_fase2_modelo_seguimiento.sql`) que espeja el modelo vigente del frontend (catálogo, reglas de planificación, proyectos, tareas con auditoría); requiere una instancia de PostgreSQL para correr `npm run db:migrate` y todavía no está conectado a la interfaz.

## Contexto y contribución

Antes de realizar cambios materiales, consultar:

- [AGENTS.md](AGENTS.md)
- [docs/context-index.md](docs/context-index.md)
- [docs/project-context.md](docs/project-context.md)
- [docs/decisions.md](docs/decisions.md)
- [docs/flujo-roles.md](docs/flujo-roles.md)

La documentación contextual forma parte de la definición de terminado y debe actualizarse junto con el código relacionado.

---
