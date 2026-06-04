# Codex Notes - ControlObraItalplast

Branch de trabajo: `pruebas`

## Contexto de producto

- La app apunta a control de obras de ingeniería civil.
- Flujo principal: cargar oferta, cargar ábaco, crear proyecto y hacer tracking.
- El sistema debe servir como fuente de información clave para decisiones.
- La carga de información no siempre la hace quien ejecuta la tarea; normalmente la carga el encargado de cuadrilla.

## Decisiones tomadas en esta conversación

- Se agregó la opción **Ajustes** solo para administradores.
- Dentro de Ajustes se creó **Usuarios** para alta, conteo de usuarios activos, archivado y eliminación.
- Se incorporó una vista de **To-Do** dentro del proyecto.
- Se agregó el acceso a **To-Do** también desde la pantalla de proyectos.
- Se inició la transición de datos hacia referencias reales a usuarios del sistema:
  - `lider_usuario_id` para obras y cronogramas.
  - `completada_por` y `completada_en` para tareas.
  - `responsable_id` para tareas.

## Cambios importantes en backend

- `src/backend/src/http/routes/admin-routes.js`
  - Recalcula estado de obra cuando todas las tareas están finalizadas.
  - Guarda quién completa una tarea.
  - Devuelve nombre visible del responsable cuando existe.
  - Usa `responsable_id` en tareas y `lider_usuario_id` en obras.
- Migraciones agregadas:
  - `007_add_completada_por_to_tareas.sql`
  - `008_add_lider_usuario_to_obras.sql`
  - `009_add_lider_usuario_to_cronogramas.sql`
  - `010_add_responsable_usuario_to_tareas.sql`

## Cambios importantes en frontend

- `src/frontend/scripts/app.js`
  - Se ajustó el arranque para forzar la navegación inicial al dashboard después del login.
- `src/frontend/scripts/pages/proyectos.js`
  - Se agregó el quinto acceso **To-Do** dentro del proyecto.
  - Se añadió selector de responsable para tareas usando usuarios activos.
- `src/frontend/scripts/pages/proyecto-detalle.js`
  - La vista del proyecto ahora usa `responsable_id` y muestra nombre visible del responsable.
- `src/frontend/scripts/pages/todo.js`
  - El To-Do global ahora usa selector de usuarios activos como responsable.

## Observaciones de arquitectura

- La app todavía mezcla campos de texto libres con referencias reales a usuarios.
- El siguiente paso razonable es terminar de unificar:
  - líder del proyecto,
  - responsable de tarea,
  - validación de tarea,
  - máquina de estados del proyecto.
- Conviene seguir moviendo la lógica hacia backend y no duplicarla en múltiples pantallas.

## Seguridad y operativa

- No se encontró Docker en el repo.
- Hoy no hace falta introducir Docker para seguir desarrollando, pero podría ser útil más adelante para despliegue y consistencia de entorno.

## Estado reciente

- La API local fue levantada en `http://localhost:3000`.
- Se corrió la migración `010_add_responsable_usuario_to_tareas.sql`.
- El branch sigue siendo `pruebas`.

## Siguiente foco recomendado

1. Unificar definitivamente el modelo de líder/responsable como `user_id`.
2. Definir una máquina de estados clara para obra y tareas.
3. Consolidar reportes y validaciones en backend.
