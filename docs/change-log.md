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
---

# Registro contextual de cambios

Este registro resume cambios materiales. Git continúa siendo la fuente exacta de diffs y autores.

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
