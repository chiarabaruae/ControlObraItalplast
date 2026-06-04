# Codex Notes - ControlObraItalplast

Branch de trabajo: `pruebas`

## Estado actual del entorno

- Backend corriendo en `http://localhost:3001`.
- El `3000` lo estaba usando otro servicio local, así que este proyecto quedó separado en `3001`.
- La app frontend sirve desde el mismo backend local.
- Hay archivos `.DS_Store` locales sin versionar; no forman parte del trabajo.

## Contexto de producto

- La app apunta a control de obras de ingeniería civil.
- Flujo principal: cargar oferta, cargar ábaco, crear proyecto y hacer tracking.
- El sistema debe servir como fuente de información clave para decisiones.
- La carga de información no siempre la hace quien ejecuta la tarea; normalmente la carga el encargado de cuadrilla.

## Decisiones tomadas en esta conversación

- Se agregó la opción **Ajustes** solo para administradores.
- Dentro de Ajustes se creó **Usuarios** para alta, conteo de usuarios activos, archivado y eliminación.
- La vista de proyecto dejó de usar tabs y pasó a un menú superior horizontal tipo workspace.
- El proyecto ahora abre en `#/proyectos/:id` para administradores y supervisores.
- El flujo técnico conserva el **To-Do** lateral global.
- Se incorporó una vista de **To-Do** dentro del proyecto.
- Se agregó el acceso a **To-Do** también desde la pantalla de proyectos.
- El detalle del proyecto ahora permite:
  - editar nombre,
  - editar descripción,
  - editar líder,
  - editar fecha de fin,
  - guardar todo con un solo botón general.
- En Documentos se eliminó el campo `documento asociado`.
- El preview de documentos ahora abre el archivo real cuando existe `ruta_archivo`.
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
  - El endpoint `GET /usuarios/activos` quedó accesible para roles del workspace de proyecto, no solo admin.
- Migraciones agregadas:
  - `007_add_completada_por_to_tareas.sql`
  - `008_add_lider_usuario_to_obras.sql`
  - `009_add_lider_usuario_to_cronogramas.sql`
  - `010_add_responsable_usuario_to_tareas.sql`
- `src/backend/src/http/routes/proyectos-routes.js`
  - Guarda archivos en disco al subir documentos.
  - Expone una ruta para abrir el archivo real de documentos.
  - El ábaco se sube desde la vista de seguimiento y activa fábrica/obra.

## Cambios importantes en frontend

- `src/frontend/scripts/app.js`
  - Se ajustó el arranque para forzar la navegación inicial al dashboard después del login.
  - `#/proyectos` y `#/proyectos/:id` están protegidos para `administrator` y `supervisor`.
- `src/frontend/scripts/pages/proyectos.js`
  - Se agregó el quinto acceso **To-Do** dentro del proyecto.
  - Se añadió selector de responsable para tareas usando usuarios activos.
- `src/frontend/scripts/pages/proyecto-detalle.js`
  - La vista del proyecto ahora usa menú superior, no tabs.
  - El header muestra nombre, cliente, líder, fin y etapa.
  - El botón **Editar** permite modificar nombre, descripción, líder y fecha de fin.
  - Documentos ahora lista archivos, sube archivos reales y abre preview real.
  - Seguimiento tiene carga de ábaco desde la propia vista.
- `src/frontend/scripts/pages/todo.js`
  - El To-Do global ahora usa selector de usuarios activos como responsable.
- `src/frontend/scripts/layout.js`
  - Oculta `Obras` a perfiles sin acceso al workspace de proyecto.
- `src/frontend/scripts/authz.js`
  - Nuevo helper para centralizar permisos del workspace de proyecto.

## Observaciones de arquitectura

- La app todavía mezcla campos de texto libres con referencias reales a usuarios.
- El siguiente paso razonable es terminar de unificar:
  - líder del proyecto,
  - responsable de tarea,
  - validación de tarea,
  - máquina de estados del proyecto.
- Conviene seguir moviendo la lógica hacia backend y no duplicarla en múltiples pantallas.
- Hay herencia de código viejo en `src/frontend/scripts/pages/proyectos.js`; hoy no debería ser la fuente principal del detalle del proyecto.

## Seguridad y operativa

- No se encontró Docker en el repo.
- Hoy no hace falta introducir Docker para seguir desarrollando, pero podría ser útil más adelante para despliegue y consistencia de entorno.
- El acceso al detalle del proyecto está restringido a `administrator` y `supervisor`.
- El técnico mantiene acceso al To-Do lateral global, sin entrar al workspace de proyecto.

## Estado reciente

- La API local fue levantada en `http://localhost:3001`.
- Se ajustó la carga y visualización de documentos para usar archivos persistidos.
- El branch sigue siendo `pruebas`.

## Siguiente foco recomendado

1. Cerrar el flujo de seguimiento con ábaco y estados de fábrica/obra sin duplicidades.
2. Definir una máquina de estados clara para obra y tareas.
3. Consolidar reportes y validaciones en backend.
