---
context_id: controlobra-context-index
context_type: retrieval_index
last_updated: 2026-07-18
tags:
  - agents
  - context
  - documentation
  - semantic-retrieval
---

# Índice de contexto para agentes

Este archivo es el punto de entrada para recuperar contexto sin revisar todo el código.

## Orden de lectura recomendado

1. [project-context.md](project-context.md): estado vigente, arquitectura activa, flujos y limitaciones.
2. [decisions.md](decisions.md): decisiones aceptadas, motivos y consecuencias.
3. [change-log.md](change-log.md): cambios materiales recientes y validaciones.
4. [flujo-roles.md](flujo-roles.md): matriz detallada de roles, permisos y creación de proyectos.

## Enrutamiento por intención

| Necesidad | Fuente principal |
|---|---|
| Entender qué aplicación está activa hoy | `docs/project-context.md` |
| Crear o modificar proyectos y etapas | `docs/project-context.md` + `docs/flujo-roles.md` |
| Revisar permisos por rol | `docs/flujo-roles.md` + `src/frontend/src/lib/roles.ts` |
| Comprender por qué se eligió una solución | `docs/decisions.md` |
| Saber qué cambió recientemente | `docs/change-log.md` + historial Git |
| Revisar arquitectura general y transición | `docs/architecture.md` |
| Configurar herramientas | documento específico `docs/*-setup.md` |

## Estado de la memoria semántica

Los documentos canónicos usan metadatos y secciones pequeñas para quedar preparados para embeddings e indexación semántica. Actualmente no existe una base vectorial ni un proceso automático de embeddings dentro del repositorio.

Hasta incorporar esa infraestructura, la recuperación confiable se basa en este índice, `AGENTS.md`, búsqueda textual y el historial Git.

## Criterio de actualización

Cada cambio material debe actualizar el contexto en el mismo commit. El agente que realiza el commit es responsable de revisar las fuentes de verdad indicadas en `AGENTS.md`.
