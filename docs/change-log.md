---
context_id: controlobra-change-log
context_type: implementation_history
last_updated: 2026-07-19
tags:
  - changelog
  - commits
  - frontend
  - project-context
  - executive-budget
  - diagnostics
  - user-management
---

# Registro contextual de cambios

Este registro resume cambios materiales. Git continúa siendo la fuente exacta de diffs y autores.

## 2026-07-19 — Auditoría contextual de tareas y tablero

**Alcance:** se verificó el commit `e294af1` ya publicado y se completó la documentación especializada que faltaba.

**Impacto:** se documentan la lista de tareas con fechas, la integración con Tareas, permisos y reglas actuales del tablero. También quedan explícitos los pendientes de cancelación, reanudación, reapertura, retorno a Planificada, arrastre y visibilidad de seguimiento para Usuario.

**Archivos clave:** `docs/context-index.md`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`, `docs/change-log.md`.

**Validaciones:** `npm run build`, `npm run lint`, revisión del commit y recorrida localhost de Tarjetas/Tablero, cambio directo, restauración del estado de prueba, diálogo de pausa, diálogo de cierre y Tareas global.

## 2026-07-19 — Tareas en lista, tablero por estado e interfaz 100% en español

**Alcance:** el seguimiento por presupuesto deja la matriz y pasa a lista de tareas con fechas; Proyectos suma vista Tablero con transiciones condicionadas; toda la interfaz queda en español.

**Impacto:** cada tarea muestra fecha de inicio/entrega editables y el supervisor puede agregar, renombrar o eliminar tareas por bloque. La sección Tareas del menú junta las tareas internas con el seguimiento de todos los proyectos y completa con el mismo diálogo de evidencia. En el tablero: pasar a En progreso exige avance previo (el cambio es automático con el primer avance), pausar exige motivo registrado y finalizar advierte que todo queda al 100% y exige al menos una evidencia. Configuración/Soporte/Cuenta/Actualizaciones/Documentación/Contactar soporte/Inicio reemplazan los rótulos en inglés. `vite.config.ts` excluye `pdfjs-dist` del optimizador (colgaba el arranque del dev server).

**Archivos clave:** `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/components/proyectos/DialogoCompletarTarea.tsx`, `src/frontend/src/components/proyectos/TableroProyectos.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/components/app/AppShell.tsx`, `src/frontend/vite.config.ts`.

**Validaciones:** `tsc -b` y `npm run lint` limpios; recorrida en navegador de lista de tareas, Tareas global, tablero y los tres diálogos de transición.

**Pendiente:** lógica de estimación de fechas del cronograma (Excel de referencia a incorporar).

## 2026-07-19 — Alta y edición de usuarios

**Alcance:** se organiza la tabla de usuarios y se incorpora una ventana compartida para alta y edición.

**Impacto:** la edición permite actualizar nombre, área, rol, correo y teléfono; los tres primeros campos son obligatorios. La tabla muestra Usuario, Área, Rol y Acciones; bajo Acciones agrupa el lápiz, la llave y archivar/reactivar.

**Archivos clave:** `src/frontend/src/pages/Usuarios.tsx`, `src/frontend/src/mocks/data.ts`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`.

**Validación:** `npm run build`, `npm run lint` y simulación localhost de alta, validación de obligatorios, edición, cambio de rol, presencia de iconos y recarga sin errores nuevos en consola.

## 2026-07-19 — Presupuesto ejecutivo, tareas y evidencia

**Alcance:** el presupuesto ejecutivo PDF pasa a ser obligatorio en el alta; se extraen y revisan componentes y se genera una matriz de tareas por etapa.

**Impacto:** PDF.js reconoce tabla Excel, Preference y Preference Mercosul sin OCR. Fábrica e Instalación agrupan premarcos y producto. Cada cierre exige imagen, admite observación y recalcula el avance automáticamente.

**Archivos clave:** `src/frontend/src/lib/presupuesto-parser.ts`, `src/frontend/src/lib/pdf-text.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/lib/evidencias.ts`, `src/frontend/src/components/proyectos/PresupuestoUploader.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/mocks/data.ts`.

**Validación:** `npm run build`, `npm run lint`, diagnóstico automatizado con los tres PDFs reales (4, 34 y 9 componentes), y simulación localhost de alta, generación de matrices, cierre con evidencia, recarga y persistencia.

## 2026-07-18 — Contexto durable para agentes

**Alcance:** se establece una práctica obligatoria de documentación previa a cada commit/push.

**Impacto:** los agentes disponen de un índice, estado vigente, decisiones y registro de cambios preparados para recuperación semántica. Se reemplazan notas de entrada obsoletas y se aclara que todavía no existe una base vectorial real.

**Archivos clave:** `AGENTS.md`, `codex.md`, `README.md`, `src/frontend/README.md`, `docs/context-index.md`, `docs/project-context.md`, `docs/decisions.md`, `docs/change-log.md`, `docs/architecture.md`, `docs/flujo-roles.md`.

**Validación:** enlaces, coherencia entre documentos, estado Git y revisión de términos obsoletos.

## 2026-07-18 — Proyectos multiproducto

**Commit:** `e8a64ce`.

**Alcance:** un proyecto admite varios tipos de producto, cada uno con etapas independientes.

**Impacto:** aluminio y PVC, por ejemplo, pueden tener condiciones de premarcos diferentes dentro de la misma obra. Servicios no genera etapas. El detalle agrupa seguimientos por producto.

**Archivos clave:** `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/mocks/data.ts`, `docs/flujo-roles.md`.

**Validación:** TypeScript/Vite build, Oxlint, servidor localhost y comprobación visual del selector múltiple.

## 2026-07-18 — Mejoras de usuarios y alta inicial de proyectos

**Commit:** `7fbd1b1`.

**Alcance:** alta mock de proyectos, persistencia local, mejoras en gestión de usuarios y cambio de To-Do a Tareas.

**Impacto:** establece el flujo que posteriormente evolucionó al modelo multiproducto.

## 2026-07-18 — Popovers suaves de Settings y Support

**Commit:** `d33724e`.

**Alcance:** rediseño de desplegables laterales con iconos y animación suave.

## 2026-07-18 — Marca Italplast, login y utilidades del sidebar

**Commit:** `9d6066a`.

**Alcance:** rebranding a Gestión de proyectos, login por Documento, recuperación de contraseña mock, Settings, Support, Account, Updates y avatar.

## 2026-07-17 — Migración inicial a React

**Commit:** `d2979cf`.

**Alcance:** React, Vite, TypeScript, Tailwind y shadcn/UI con datos mock para Fase 2.
