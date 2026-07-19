---
context_id: controlobra-decisions
context_type: architecture_decisions
last_updated: 2026-07-18
tags:
  - decisions
  - product
  - architecture
  - permissions
  - documentation
---

# Decisiones vigentes

## D-001 — Frontend React como interfaz activa

**Estado:** aceptada.

**Contexto:** el frontend vanilla dificultaba consolidar permisos, componentes y flujos nuevos.

**Decisión:** la interfaz activa de Fase 2 se desarrolla en React, TypeScript y Vite dentro de `src/frontend/src`.

**Consecuencias:** los archivos vanilla pueden seguir existiendo como legado, pero no son la fuente principal para nuevas pantallas.

## D-002 — Interfaz denominada Gestión de proyectos

**Estado:** aceptada.

**Contexto:** Italplast gestionará más líneas que aberturas PVC y aluminio.

**Decisión:** utilizar **Gestión de proyectos**, la marca Italplast y el azul oficial como identidad predeterminada.

**Consecuencias:** textos y navegación no deben restringir conceptualmente el producto a Control de Obras o a una única línea.

## D-003 — Tres roles operativos

**Estado:** aceptada.

**Decisión:** usar `administrator`, `supervisor` y `viewer`, mostrando este último como Usuario.

**Consecuencias:** las acciones no autorizadas se ocultan. La matriz detallada vive en `docs/flujo-roles.md`.

## D-004 — Settings y Support en el sidebar

**Estado:** aceptada.

**Decisión:** agrupar Account, Personalizar y Updates dentro de Settings; Documentation y Contact support dentro de Support.

**Consecuencias:** ambos grupos usan popovers animados. La personalización deja de ocupar un acceso principal independiente.

## D-005 — Proyectos con múltiples tipos de producto

**Estado:** aceptada.

**Contexto:** una misma obra puede incluir aluminio, PVC, mosquiteras, persianas, Velux y servicios con requisitos diferentes.

**Decisión:** un proyecto contiene una colección `productos`; cada tipo seleccionado mantiene sus propias etapas.

**Consecuencias:** la selección es múltiple y el seguimiento del detalle se agrupa por producto. La configuración actual es por tipo, no por unidad o lote.

## D-006 — Premarcos opcionales e independientes

**Estado:** aceptada.

**Decisión:** fabricación e instalación de premarcos son grupos opcionales independientes para cada producto. Fábrica y obra del producto son obligatorias, excepto para Servicios.

**Consecuencias:** se admiten premarcos existentes, fabricación sin instalación, instalación sin fabricación o ausencia completa de premarcos.

## D-007 — Edición de etapas limitada al proyecto

**Estado:** aceptada.

**Decisión:** agregar, borrar, seleccionar o renombrar etapas durante el alta modifica únicamente ese producto dentro del proyecto.

**Consecuencias:** las plantillas globales se implementarán después y requerirán permisos restringidos para administradores y supervisores autorizados.

## D-008 — Documentación como parte del commit

**Estado:** aceptada.

**Contexto:** revisar todo el código en cada sesión es costoso y las notas anteriores quedaron desactualizadas.

**Decisión:** todo cambio material debe actualizar contexto, decisiones, registro de cambios y documentación especializada antes del commit/push.

**Consecuencias:** `AGENTS.md` convierte esta revisión en una regla obligatoria. Los documentos usan metadatos y secciones preparadas para recuperación semántica, sin afirmar que ya existe una base vectorial.
