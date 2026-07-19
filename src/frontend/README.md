# Frontend React — Gestión de proyectos Italplast

Interfaz activa de Fase 2 construida con React, TypeScript, Vite, Tailwind CSS y componentes shadcn/Radix.

## Contexto funcional

Antes de modificar el frontend, leer:

- `../../AGENTS.md`
- `../../docs/context-index.md`
- `../../docs/project-context.md`
- `../../docs/decisions.md`
- `../../docs/flujo-roles.md`

## Desarrollo

```bash
npm install
npm run dev
```

Vite sirve normalmente la aplicación en `http://localhost:5173`.

## Validación

```bash
npm run build
npm run lint
npm run diagnostico:presupuestos -- /ruta/presupuesto.pdf
```

El lint puede reportar advertencias preexistentes de Fast Refresh en componentes UI y `context/auth.tsx`.

## Estado de integración

- La interfaz usa datos mock y `localStorage` para proyectos creados.
- El modelo permite varios tipos de producto con etapas independientes.
- El alta exige presupuesto ejecutivo PDF, revisión de componentes y asignación por producto.
- Los proyectos generan listas de tareas con fechas, check, evidencia y avance automático.
- El seguimiento se sincroniza con la sección Tareas y ya no permite editar porcentajes manualmente.
- Proyectos incluye un Kanban horizontal arrastrable con transiciones condicionadas.
- Los proyectos mock iniciales contienen datos y evidencias demostrativas para probar el flujo.
- PDF.js procesa texto embebido en el navegador; no hay OCR en esta fase.
- El backend Express/PostgreSQL todavía no cubre el flujo React completo.
- La fuente vigente de limitaciones y próximos pasos es `../../docs/project-context.md`.
