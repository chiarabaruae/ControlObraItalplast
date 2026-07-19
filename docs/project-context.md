---
context_id: controlobra-project-context
context_type: current_project_state
last_updated: 2026-07-18
branch: feature/frontend-react-migration
tags:
  - italplast
  - react
  - typescript
  - project-management
  - multi-product
  - stages
---

# Contexto vigente del proyecto

## Producto

ControlObraItalplast es una aplicación interna para gestionar clientes, proyectos, productos, etapas operativas, tareas, documentos y seguimiento de obras de Italplast.

La interfaz se presenta como **Gestión de proyectos** porque debe cubrir aberturas y otras líneas de producto.

## Estado actual

- Rama activa de trabajo: `feature/frontend-react-migration`.
- Frontend activo: React, TypeScript, Vite, Tailwind CSS y componentes shadcn/Radix.
- Versión visible: `AppWebb v0.2.0`.
- La Fase 2 usa datos mock y persistencia temporal en `localStorage`.
- El backend Express/PostgreSQL permanece en el repositorio, pero el nuevo frontend React todavía no está conectado a todas sus rutas reales.
- Comandos principales desde `src/frontend`: `npm run dev`, `npm run build` y `npm run lint`.

## Identidad visual y acceso

- Color predeterminado: azul oficial de Italplast `#0060AF`.
- El logo Italplast aparece en login, favicon y parte superior del sidebar.
- El login solicita Documento y Contraseña; no permite seleccionar roles manualmente.
- Existe un flujo mock de recuperación de contraseña por documento.
- Settings contiene Account, Personalizar y Updates.
- Support contiene Documentation y Contact support.
- Los paneles Settings y Support usan popovers animados y suaves.

## Navegación activa

- `/dashboard`
- `/clientes`
- `/proyectos`
- `/proyectos/:id`
- `/tareas`
- `/usuarios`
- `/settings/account`
- `/settings/appearance`
- `/settings/updates`
- `/support/documentation`
- `/support/contact`

La fuente de rutas es `src/frontend/src/App.tsx`.

## Roles

- `administrator`: control total, creación de proyectos y gestión de usuarios.
- `supervisor`: lectura operativa, edición de avances y tareas según permisos.
- `viewer`, mostrado como **Usuario**: consulta y tareas propias.

La matriz funcional completa está en `docs/flujo-roles.md`. La implementación frontend está centralizada en `src/frontend/src/lib/roles.ts`.

## Creación de proyectos multiproducto

Un proyecto puede seleccionar varios tipos de producto:

- Aberturas de aluminio.
- Aberturas de PVC.
- Mosquiteras.
- Persianas.
- Aberturas Velux de techo.
- Servicios.

Cada tipo seleccionado conserva una configuración independiente. Desmarcar un producto oculta su editor; volver a marcarlo durante la misma creación recupera su configuración temporal.

La configuración se agrupa por tipo, no por unidad o lote. Si dos partidas del mismo tipo necesitan condiciones distintas, todavía será necesario modelar lotes o partidas de producto.

## Etapas por producto

Para cada producto distinto de Servicios existen cuatro grupos:

1. Fabricación de premarcos: opcional.
2. Instalación de premarcos: opcional e independiente de la fabricación.
3. Etapas de fábrica del producto: obligatorias.
4. Etapas de obra del producto: obligatorias.

Cada subetapa puede seleccionarse, renombrarse, eliminarse o agregarse antes de crear el proyecto. Los cambios afectan solamente a ese producto dentro del proyecto.

Servicios no genera etapas de premarcos, fábrica u obra, pero puede coexistir con otros productos que sí las tengan.

El detalle del proyecto muestra el seguimiento agrupado por producto para evitar una cantidad excesiva de pestañas.

## Persistencia y compatibilidad

- Los proyectos mock se guardan bajo la clave `control-obras-proyectos` en `localStorage`.
- El modelo nuevo usa `productos`, con una configuración de etapas por tipo.
- `tipoProducto` se conserva temporalmente para migrar proyectos creados con el modelo anterior.
- Las etapas agregadas al proyecto también se consolidan en las listas superiores de fábrica y obra para mantener compatibles las tarjetas y métricas existentes.

La fuente principal del modelo mock es `src/frontend/src/mocks/data.ts`.

## Archivos clave

- `src/frontend/src/pages/Proyectos.tsx`: alta multiproducto y edición local de etapas.
- `src/frontend/src/pages/ProyectoDetalle.tsx`: seguimiento agrupado por producto.
- `src/frontend/src/mocks/data.ts`: tipos, defaults, mocks, migración local y persistencia.
- `src/frontend/src/components/app/AppShell.tsx`: navegación y popovers Settings/Support.
- `src/frontend/src/context/auth.tsx`: sesión mock.
- `src/frontend/src/lib/roles.ts`: permisos frontend.
- `docs/flujo-roles.md`: especificación funcional detallada.

## Limitaciones conocidas

- No existe backend real para el alta multiproducto ni para persistir cambios de avance.
- No existe administración global de plantillas de productos y etapas.
- Las futuras plantillas globales solo deben ser modificables por administradores y supervisores autorizados.
- No se modelan cantidades, lotes o partidas independientes de un mismo tipo de producto.
- El dashboard todavía se apoya principalmente en datos mock estáticos.
- El flujo de recuperación de contraseña y Check for updates es demostrativo.
- No existe una base vectorial ni indexación automática; los documentos están preparados para incorporarla posteriormente.

## Validación esperada antes de publicar

Desde `src/frontend`:

```bash
npm run build
npm run lint
```

El lint puede mostrar advertencias preexistentes de Fast Refresh en componentes UI y `context/auth.tsx`; no deben confundirse con errores nuevos.
