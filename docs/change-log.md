---
context_id: controlobra-change-log
context_type: implementation_history
last_updated: 2026-07-23
tags:
  - changelog
  - commits
  - frontend
  - project-context
  - executive-budget
  - diagnostics
  - user-management
  - task-assignment
  - task-audit
---

# Registro contextual de cambios

Este registro resume cambios materiales. Git continúa siendo la fuente exacta de diffs y autores.

## 2026-07-23 — Cronograma general (Gantt de capacidad) por proyecto × producto

**Alcance:** nueva tercera vista de Proyectos que cruza la carga de fábrica e instalación de todas las obras contra la capacidad instalada (D-033).

**Impacto:** el Gantt general (`GanttProyectos.tsx`, alimentado por `lib/cronograma.ts`) dibuja una fila por proyecto × producto operativo con las barras de premarcos/fábrica/instalación y los diamantes de firma (rojo) y confirmación del cliente (gris), derivados del cálculo backward (D-023). Tiene zoom Día/Semana/Mes (semana por defecto), filtros por producto/líder/cliente y sección "Sin compromiso". Un carril superior suma la demanda de aberturas/día por línea de producto en fábrica y en instalación, y resalta en rojo los buckets que superan el tope. Los topes se configuran en Reglas y catálogo (`lib/capacidad.ts`): por línea para fábrica y uno único para instalación (predet. 6 y 10 ab./día). La planificación backward pasa a ser **obligatoria** por producto operativo al crear el proyecto, y el alta autogenera la tarea genérica "Firma de Presupuesto Ejecutivo" con la fecha de firma más temprana. Los cuatro proyectos demo se enriquecieron con planificación para exhibir el flujo. Backend: migración `020_capacidad_produccion.sql` (espejo 1:1).

**Archivos clave:** `src/frontend/src/components/proyectos/GanttProyectos.tsx` (nuevo), `src/frontend/src/lib/cronograma.ts` (nuevo), `src/frontend/src/lib/capacidad.ts` (nuevo), `src/frontend/src/pages/Proyectos.tsx` (tercera vista, planificación obligatoria, hito de firma), `src/frontend/src/pages/Reglas.tsx` (sección Capacidad), `src/frontend/src/mocks/data.ts` (planificación demo), `src/backend/migrations/020_capacidad_produccion.sql`, `docs/decisions.md` (D-033).

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos (solo advertencias Fast Refresh preexistentes). Recorrida en navegador como administrador: el cronograma muestra las 5 filas por producto con barras e hitos, el carril de capacidad marca en rojo Fábrica·Aluminio (8 > 6) e Instalación (12 > 10), el zoom Mes agrupa por mes, y al subir el tope de aluminio a 8 en Reglas la celda deja de estar en rojo. El estado demo de `localStorage` se restauró al terminar.

## 2026-07-23 — Estado "Pendiente" del proyecto y tooltips explicativos con delay

**Alcance:** nuevo estado de proyecto para diferenciar la detención por dependencia del cliente de la pausa por causa interna, más ayudas contextuales sobre estados del tablero y etapas de producto (D-032).

**Impacto:** `EstadoObra` suma `pendiente`, que en el tablero es una columna propia entre Planificadas y En progreso. Pasar a Pendiente exige un motivo ("qué se espera del cliente", mínimo 50 caracteres) y guarda un `RegistroPendiente` en `proyecto.pendientes`; reanudar vuelve a En progreso con observación obligatoria y cierra el registro abierto. "Pausada" se redefine en la UI como detención por causa interna. El estado suma token de color propio (`--estado-pendiente`, violeta) en `EstadoBadge`, la tarjeta del tablero y el filtro de la vista Tarjetas. Se introduce por primera vez el componente `Tooltip` (`TooltipProvider delayDuration={1000}`): al pasar el cursor 1 s sobre el encabezado de columna del tablero se explica cada estado, y sobre el título de bloque de Fábrica/Instalación se explica cada etapa (`descripcionGrupo`). Backend: migración `019_estado_pendiente_proyecto.sql` amplía el `check` de `proyectos.estado` y crea `proyecto_pendientes` (espejo 1:1, D-027).

**Archivos clave:** `src/frontend/src/mocks/data.ts` (`EstadoObra`, `RegistroPendiente`, `proyecto.pendientes`), `src/frontend/src/components/proyectos/TableroProyectos.tsx` (columna, diálogo, transiciones y tooltips de estado), `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx` (tooltip de etapa), `src/frontend/src/lib/seguimiento-presupuesto.ts` (`descripcionGrupo`), `src/frontend/src/components/app/EstadoBadge.tsx`, `src/frontend/src/pages/Proyectos.tsx` (filtro), `src/frontend/src/index.css` (token `--estado-pendiente`), `src/backend/migrations/019_estado_pendiente_proyecto.sql`, `docs/decisions.md` (D-032).

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos (solo advertencias Fast Refresh preexistentes). Recorrida en navegador como administrador: se movió "Torre Aviadores" a Pendientes con motivo (columna, tarjeta violeta y toast correctos), el orden de columnas quedó Planificadas → Pendientes → En progreso → Pausadas → Finalizadas, el tooltip de estado apareció tras 1 s sobre "En progreso" y el de etapa sobre "PVC · Fabricación"; sin errores de consola. El estado demo de `localStorage` se restauró al terminar.

## 2026-07-23 — Evidencia multi-formato acotada a las tareas generales del proyecto

**Alcance:** delimita D-031: los documentos y enlaces como evidencia aplican solo al grupo `generales`; las tareas de etapas vuelven a exigir fotografía.

**Impacto:** el diálogo de completar condiciona por grupo: en tareas de fabricación/instalación muestra "Evidencia fotográfica *" con `accept="image/*"` y sin campo de enlace; en tareas generales mantiene "Evidencia *" multi-formato con enlace. `prepararEvidencia` acepta `{ soloImagen }` y rechaza documentos fuera de las generales; el cierre de proyecto en el tablero también fija `soloImagen`.

**Archivos clave:** `src/frontend/src/components/proyectos/DialogoCompletarTarea.tsx`, `src/frontend/src/lib/evidencias.ts`, `src/frontend/src/components/proyectos/TableroProyectos.tsx`, `docs/decisions.md` (D-031 ampliada).

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador: tarea de etapa (Herrajes — V-02) muestra solo evidencia fotográfica sin enlace, y una tarea general muestra el multi-formato completo.

## 2026-07-23 — Evidencia multi-formato, justificaciones mínimas y filtros en las matrices por proyecto

**Alcance:** tres reglas transversales del seguimiento (D-031): la evidencia admite documentos y enlaces, toda justificación exige 50 caracteres y las matrices de tareas del proyecto ganan filtros por columna.

**Impacto:** el diálogo de completar acepta imagen (comprimida, máx. 12 MB), PDF/Word/Excel/CSV/texto (máx. 4 MB en Fase 2) o un enlace externo; la vista de evidencia muestra imagen, ancla o descarga según el tipo. `lib/justificaciones.ts` centraliza el mínimo de 50 caracteres y lo aplican el motivo de reapertura de tareas, los cinco motivos del tablero de proyectos y las observaciones de cierre cuando se escriben (cada campo indica cuántos caracteres faltan); `/api/v2` replica la validación. La nueva `TablaTareasSeguimiento` (compartida por los bloques de Fábrica/Instalación y las tareas genéricas) suma ordenar y filtrar por Tarea, Detalle, Responsable, Fechas y Prioridad, igual que la sección Tareas. Se verificó además que las tareas genéricas aparecen en el listado global con bloque "Proyecto · General".

**Archivos clave:** `src/frontend/src/lib/justificaciones.ts` (nuevo), `src/frontend/src/lib/evidencias.ts`, `src/frontend/src/mocks/data.ts` (`esEnlace`), `src/frontend/src/components/proyectos/DialogoCompletarTarea.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx` (`TablaTareasSeguimiento`), `src/frontend/src/components/proyectos/TareasGenerales.tsx`, `src/frontend/src/components/proyectos/TableroProyectos.tsx`, `src/backend/src/http/routes/fase2-routes.js`.

**Validaciones:** `tsc -b`, `npm run lint` y `node --check` sin errores nuevos; recorrida en navegador como administrador: cierre con enlace persistido (`esEnlace`), observación de 3 caracteres rechazada con aviso de faltantes, reapertura bloqueada hasta los 50 caracteres, filtros visibles en las matrices de Fábrica y de tareas genéricas, y "Proyecto · General" listado como valor del filtro Bloque en la sección Tareas.

## 2026-07-23 — Tareas genéricas del proyecto, solo administración y supervisión

**Alcance:** la pestaña Tareas del detalle de proyecto pasa a gestionar tareas genéricas atadas directamente al proyecto, sin producto ni etapa de fábrica/instalación (D-030).

**Impacto:** nuevo grupo `generales` en `TareaPresupuesto` (pseudo-tipo "general"; `null` en PostgreSQL). La pestaña usa la misma tabla estructurada, la misma `FilaTarea` compartida y los mismos diálogos (completar con evidencia, editar con confirmación, archivar auditado, prioridad inline) que Fábrica/Instalación, con bloque "Proyecto · General". Alta con nombre, prioridad, responsable y fechas. Vista y edición exclusivas de administración y supervisión: el rol Usuario no ve la pestaña y las tareas generales quedan fuera de su lista global aunque estén asignadas a él (filtros en frontend y en `/api/v2`). Se retira la tabla legada "Por hacer / Hechas" del detalle; `tareasIniciales` queda solo en el Dashboard.

**Archivos clave:** `src/frontend/src/components/proyectos/TareasGenerales.tsx` (nuevo), `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx` (exporta `FilaTarea`), `src/frontend/src/mocks/data.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts` (`etiquetaBloque` para generales), `src/frontend/src/lib/roles.ts` (`verTareasGeneralesProyecto`), `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/backend/migrations/018_tareas_generales_proyecto.sql`, `src/backend/src/http/routes/fase2-routes.js`.

**Validaciones:** `tsc -b`, `npm run lint` y `node --check` sin errores nuevos; recorrida en navegador como administrador (alta de tarea genérica visible en la tabla con bloque "Proyecto · General" y en el conteo de la sección global) y como Usuario con la tarea asignada a él (pestaña Tareas ausente y tarea excluida de su lista).

## 2026-07-23 — Catálogo editable para todos los productos con auditoría silenciosa

**Alcance:** los productos estándar del catálogo también pueden editarse y retirarse; las etapas opcionales se configuran por grupo; todo cambio queda auditado en datos (D-029).

**Impacto:** en Reglas y catálogo, cada producto (estándar o personalizado) muestra lápiz y papelera. Editar permite cambiar el nombre y definir si el producto ofrece **fabricación de premarcos** y/o **instalación de premarcos** (dos switches; Servicios no los muestra). Retirar es baja lógica: la fila queda atenuada como "Retirado" con botón de restaurar, y los proyectos existentes conservan la referencia. Los cambios sobre estándar se guardan como overrides sin tocar la definición base. Cada operación (crear/editar/desactivar/reactivar) sella fecha, usuario, acción y detalle en `control-obras-catalogo-auditoria` — sin interfaz que la muestre; en PostgreSQL persiste en `catalogo_auditoria`. El alta de proyectos ofrece solo productos activos y muestra los editores de premarcos según el flag de cada grupo.

**Archivos clave:** `src/frontend/src/mocks/data.ts` (overrides, `obtenerCatalogoActivo`, `registrarAuditoriaCatalogo`, flags por grupo), `src/frontend/src/pages/Reglas.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/backend/migrations/017_catalogo_editable_y_auditoria.sql`, `src/backend/src/http/routes/fase2-routes.js` (PATCH/DELETE para estándar + `POST /:valor/reactivar` + auditoría).

**Validaciones:** `tsc -b`, `npm run lint` y `node --check` sin errores nuevos; recorrida en navegador como administrador: edición de Persianas (instalación de premarcos apagada → el alta deja de ofrecer ese grupo), retiro de Mosquiteras (desaparece del alta, queda "Retirado" con restaurar) y auditoría verificada en `localStorage` con usuario, acción, detalle y fecha.

## 2026-07-22 — Rediseño visual de la fila de tarea en Fábrica/Instalación

**Alcance:** la fila de tarea del detalle de proyecto (`SeguimientoPresupuesto.tsx`) mezclaba título, info del ítem, auditoría completa, responsable, fechas, prioridad y acciones en un único contenedor `flex-wrap`, que se acomodaba de forma impredecible y se veía encimado con datos densos (varias asignaciones/ediciones).

**Impacto:** se presentaron 4 alternativas visuales como mockups (tabla estructurada, tarjeta por tarea, fila compacta expandible, chips con acento de prioridad); se eligió la **tabla estructurada** y se reemplazó la lista `<ul>` por columnas fijas y alineadas (`Table` de shadcn, `table-fixed` con anchos explícitos): Tarea, Detalle, Responsable, Fechas, Prioridad y Acciones (editar/eliminar, condicional por permiso). El rastro de auditoría, antes un texto largo ("Creada... · Modificada... · Autor · vN"), se condensa en un ícono de historial junto al título con el detalle completo en tooltip nativo. La tabla se recorrió como administrador, supervisor y usuario (viewer) para confirmar que las columnas de auditoría, prioridad editable y acciones respetan los mismos permisos que la sección Tareas (D-026).

**Archivos clave:** `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx` (`FilaTarea`, integración de `Table`/`TableHeader`/`TableBody`).

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador con los tres roles, verificando columnas, tooltip de auditoría y ausencia de truncado en títulos largos.

## 2026-07-22 — Simplificación de ramas y publicación a main

**Alcance:** se retira `feature/frontend-react-migration` (local y remota) por quedar idéntica a `develop`, y se promueve todo el trabajo acumulado a `main` mediante fast-forward.

**Impacto:** `develop` pasa a ser la única rama de trabajo activo; `main` queda al día con la migración React completa, Reglas y catálogo, planificación backward, asignación/auditoría de tareas y el esqueleto de backend Fase 2. El README principal se actualiza para reflejar el estado vigente (roles, pantallas, esqueleto `/api/v2`).

**Archivos clave:** `README.md`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; fast-forward confirmado sin commits divergentes entre `main` y `develop`.

## 2026-07-22 — Cambio de prioridad sin confirmación

**Alcance:** se elimina el panel de confirmación al seleccionar una nueva prioridad en Tareas y en el seguimiento del detalle de proyecto.

**Impacto:** la prioridad se aplica inmediatamente, mantiene el registro de auditoría y conserva las confirmaciones para editar, reasignar y archivar.

**Archivos clave:** `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `docs/project-context.md`, `docs/decisions.md`.

**Validaciones:** `npm run build`, `npm run lint` (solo advertencias Fast Refresh preexistentes) y recorrido visual en localhost como supervisor.

## 2026-07-22 — Responsables, confirmaciones y archivo administrativo de tareas

**Alcance:** se implementa asignación de tareas por rol, filtro de tareas propias para Usuario, confirmación de edición/archivado y consulta administrativa de tareas retiradas (D-028).

**Impacto:** administración asigna a supervisores o usuarios; supervisión asigna solo a usuarios. Cada tarea guarda responsable, asignador, fecha e historial. La UI muestra avatar o iniciales y quién asignó. Archivar desde cualquiera de las dos vistas conserva la tarea con autor y momento; solo administración ve el archivo. PostgreSQL queda preparado con la migración 016, `tarea_asignaciones` y rutas `/api/v2` con validación de destino.

**Archivos clave:** `src/frontend/src/lib/roles.ts`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/components/proyectos/SelectorResponsableTarea.tsx`, `src/frontend/src/components/proyectos/DialogoConfirmarCambioTarea.tsx`, `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, `src/frontend/src/components/proyectos/DialogoEditarTarea.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/backend/migrations/016_asignacion_y_archivo_tareas.sql`, `src/backend/src/http/routes/fase2-routes.js`.

**Validaciones:** `npm run build`, `npm run lint` (solo advertencias Fast Refresh preexistentes), `node --check` de rutas y server. Falta recorrido visual actualizado y ejecución contra PostgreSQL real.

## 2026-07-22 — Esquema PostgreSQL Fase 2 y rutas /api/v2 (esqueleto backend)

**Alcance:** el modelo vigente del frontend gana su espejo en base de datos y un esqueleto de API con permisos (D-027).

**Impacto:** la migración `015_fase2_modelo_seguimiento.sql` crea con terminología nueva: catálogo de productos (seed de los seis estándar), reglas de planificación backward, proyectos con productos/planificación/etapas, presupuestos ejecutivos versionados con ítems, evidencias como archivos referenciados, tareas de seguimiento con prioridad/auditoría/borrado lógico (más `tarea_modificaciones` y `tarea_reaperturas`) y las transiciones de estado. `/api/v2` (JWT + matriz de permisos de `roles.ts`) expone catálogo, reglas, proyectos y tareas; el servidor valida evidencia obligatoria al completar y motivo obligatorio al reabrir. Las tablas legadas quedan intactas para migrar datos y retirar después.

**Archivos clave:** `src/backend/migrations/015_fase2_modelo_seguimiento.sql`, `src/backend/src/http/routes/fase2-routes.js`, `src/backend/src/server.js`.

**Validaciones:** `node --check` de rutas y server sin errores. Pendiente ejecutar `npm run db:migrate` contra PostgreSQL real y conectar el frontend (hoy sigue en `localStorage`).

## 2026-07-22 — Tareas y detalle de proyecto con los mismos campos, filtros y permisos

**Alcance:** unifica la vista de tareas de seguimiento entre la sección Tareas (global) y las pestañas Fábrica/Instalación del detalle de proyecto (D-026).

**Impacto:** el bloque muestra el producto real ("PVC · Fabricación", "Aluminio · Instalación") en vez del genérico "Producto · fabricación", en Tareas, en el detalle de proyecto y en el selector de "Nueva tarea". El detalle de proyecto suma prioridad editable inline y auditoría de creación/modificación para administradores, igual que Tareas. Tareas suma columna "Acciones" con lápiz (editar) y papelera (eliminar), igual que el detalle. Se corrige un permiso: eliminar tarea ahora depende de `permisos.eliminarTarea` (solo administradores) en ambas vistas — antes, en el detalle de proyecto, dependía por error del mismo permiso que completar tareas y quedaba disponible también para supervisores. La edición de una tarea existente usa un diálogo compartido nuevo (`DialogoEditarTarea`) en los dos lugares.

**Archivos clave:** `src/frontend/src/lib/seguimiento-presupuesto.ts` (`etiquetaBloque`, retira `ETIQUETAS_GRUPO`), `src/frontend/src/mocks/data.ts` (`nombreCortoTipoProducto`, `nombreCorto` en el catálogo), `src/frontend/src/components/proyectos/DialogoEditarTarea.tsx` (nuevo), `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como administrador (bloque "PVC · Fabricación" y auditoría visibles en ambas vistas, edición desde Tareas con el mismo diálogo), como supervisor (prioridad editable y lápiz en ambas vistas, sin papelera ni auditoría) y como Usuario (sin columna de acciones).

## 2026-07-22 — Edición de productos del catálogo y aclaración de excepciones

**Alcance:** los productos personalizados del catálogo suman edición inline; la nota de las brechas explica cómo manejar excepciones.

**Impacto:** cada producto personalizado muestra lápiz (editar nombre y si lleva premarcos, conservando el slug para no romper proyectos existentes) y papelera. La nota bajo las brechas ahora aclara al administrador que, para una excepción puntual, los plazos se ajustan dentro del proyecto (planificación del producto al crearlo o fechas de sus tareas en el seguimiento). Los productos estándar siguen sin poder editarse ni eliminarse.

**Archivos clave:** `src/frontend/src/pages/Reglas.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador (alta, renombrado con cambio de premarcos persistido con slug estable, eliminación y texto de excepciones visible).

## 2026-07-22 — Sección "Reglas y catálogo" con catálogo dinámico de productos

**Alcance:** nueva sección admin-only en el menú principal (debajo de Usuarios) que centraliza reglas de negocio editables (D-025).

**Impacto:** `/reglas` reúne las brechas del cálculo backward (mudadas desde `/settings/planning`, que ahora redirige) y el catálogo de productos: administración puede agregar tipos nuevos indicando si llevan premarcos, y retirarlos (los estándar no se eliminan). Los tipos agregados aparecen de inmediato en el alta de proyectos para administradores y supervisores; un producto sin premarcos no ofrece esos grupos ni sus plazos. `TipoProducto` admite slugs personalizados y las etiquetas se resuelven desde el catálogo.

**Archivos clave:** `src/frontend/src/pages/Reglas.tsx` (nueva), `src/frontend/src/mocks/data.ts` (catálogo y persistencia), `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/lib/roles.ts` (`gestionarReglasNegocio`), `src/frontend/src/components/app/AppShell.tsx`, `src/frontend/src/App.tsx`; se elimina `src/frontend/src/pages/Planificacion.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como administrador (alta de "Aberturas de madera" sin premarcos, persistencia, aparición en el alta sin grupos de premarcos) y como supervisor (sección oculta, `/reglas` redirige a dashboard, el producto nuevo sí aparece en su alta).

## 2026-07-22 — Plazo de instalación de premarcos en la planificación backward

**Alcance:** la planificación por producto suma "Días de instalación de premarcos" (faltaba también en el Excel de referencia).

**Impacto:** el campo aparece solo cuando el producto tiene instalación de premarcos activa. Si se carga, esa ventana reemplaza a la brecha global entrega→ábaco para ubicar la entrega de premarcos hacia atrás desde la firma del ábaco; vacío, sigue rigiendo la brecha configurada por administración.

**Archivos clave:** `src/frontend/src/lib/planificacion.ts`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/pages/Proyectos.tsx`, `docs/decisions.md` (D-023 ampliada).

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador (con 6 días cargados la entrega de premarcos pasa del 3 ago a 31 jul para ábaco del 6 ago).

## 2026-07-22 — Supervisores pueden crear proyectos

**Alcance:** el permiso `crearProyecto` se extiende al rol `supervisor` (D-024).

**Impacto:** el botón "Nuevo proyecto" y el alta completa quedan disponibles para supervisores. Editar, eliminar, cancelar, reactivar y reabrir proyectos siguen siendo exclusivos de administración.

**Archivos clave:** `src/frontend/src/lib/roles.ts`, `docs/flujo-roles.md`, `docs/decisions.md`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como supervisor (botón visible y diálogo de alta operativo) y como Usuario (botón oculto).

## 2026-07-22 — Estimación backward de fechas con brechas configurables

**Alcance:** se traduce la lógica del Excel "Cronograma Fábrica" al frontend: desde la fecha comprometida de inicio de instalación se estiman hacia atrás las fechas de cada bloque del seguimiento.

**Impacto:** el alta de proyecto permite cargar por producto una planificación opcional (fecha comprometida de instalación, días de instalación, de fábrica y de premarcos) con vista previa de los hitos estimados (entrega de premarcos, firma de ábaco, inicio de fábrica, fin de producción, fin de instalación). Las tareas generadas desde el presupuesto nacen con `fechaInicio`/`fechaFin` por bloque, editables como siempre. Las tres brechas entre hitos (3/1/3 días por defecto) son regla de negocio editable solo por administradores en la nueva pantalla Configuración → Planificación; persisten en `localStorage` bajo `control-obras-planificacion`. Sin planificación cargada, las tareas siguen naciendo sin fechas.

**Archivos clave:** `src/frontend/src/lib/planificacion.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/pages/Planificacion.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/lib/roles.ts`, `src/frontend/src/components/app/AppShell.tsx`, `src/frontend/src/App.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como administrador (edición y persistencia de brechas, restauración de predeterminados, vista previa backward correcta: 20 ago −3 → fin producción 17 ago, −10 → inicio fábrica 7 ago, −1 → ábaco 6 ago, −3 → premarcos 3 ago) y como supervisor (ruta /settings/planning redirige a dashboard y la opción no aparece).

## 2026-07-22 — Reapertura justificada, auditoría de tareas, prioridad y retiro de tareas internas

**Alcance:** trazabilidad completa de las tareas de seguimiento y simplificación de la sección Tareas.

**Impacto:** reabrir una tarea completada exige un motivo obligatorio para todos los roles; se registran fecha, usuario y motivo (`reaperturas`) y cada cambio queda en `modificaciones` con `version`, `modificadaEn` y `modificadaPorId`. Las tareas guardan `creadaEn`; eliminar pasa a ser borrado lógico hacia `tareasEliminadas` (solo datos, sin UI). La tabla de Tareas suma la columna Prioridad (selector inline para administradores y supervisores; etiqueta de solo lectura para el resto) y las columnas Creación y Modificación visibles únicamente para administradores. La tabla "Tareas internas" se retiró: la sección muestra solo tareas dependientes de etapas. La prioridad también se define en los formularios de alta (cascada y por bloque) y edición.

**Archivos clave:** `src/frontend/src/mocks/data.ts`, `src/frontend/src/lib/roles.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/lib/format.ts`, `src/frontend/src/components/proyectos/DialogoCompletarTarea.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como administrador (reapertura con motivo obligatorio, registro persistido en `localStorage`, columnas de auditoría con versión y autor) y como supervisor (prioridad editable, columnas de auditoría ocultas).

## 2026-07-21 — Alta de tareas en cascada y avisos de filtro sobre la tabla

**Alcance:** el botón "Nueva tarea" de la sección Tareas abre un panel de selección en cascada; los avisos de filtro y de truncado se muestran arriba de cada tabla en lugar de debajo.

**Impacto:** para crear una tarea de seguimiento el usuario elige, paso a paso, cliente → proyecto → producto → etapa (bloque), y recién ahí completa nombre y fechas. Cada paso se habilita solo cuando el anterior está resuelto y ofrece únicamente las opciones válidas del nivel superior. La tarea nueva se guarda en `tareasPresupuesto` del proyecto y aparece de inmediato en el seguimiento. El aviso "Mostrando X de Y · Quitar filtros" y el de "Mostrando 30 de N" pasaron al tope de la tabla (con borde inferior) en Clientes, Usuarios y Tareas.

**Archivos clave:** `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/components/app/EncabezadoFiltrable.tsx`, `src/frontend/src/lib/seguimiento-presupuesto.ts` (export de `gruposDeProducto`), `src/frontend/src/pages/Clientes.tsx`, `src/frontend/src/pages/Usuarios.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador del alta en cascada (cliente→proyecto→producto→etapa→nombre+fechas) con persistencia confirmada, y avisos ubicados arriba.

## 2026-07-21 — Filtro y orden por columna en las tablas, con etiquetas por tipo de dato

**Alcance:** las tablas de Clientes, Usuarios y Tareas (seguimiento e internas) suman un ícono de filtro por columna, al estilo de una planilla.

**Impacto:** cada columna permite ordenar y filtrar por sus valores. Las etiquetas de orden se adaptan al dato: texto usa "A → Z / Z → A", los números "De menor a mayor / De mayor a menor" y las fechas "Más recientes primero / Más antiguas primero". La lista de valores del filtro también respeta ese orden (fechas cronológicas, números por magnitud). El selector de vista de Proyectos pasó a mostrar solo íconos (con tooltip y texto accesible). El estado de orden y filtro vive en el hook `useTablaFiltrable` y no se persiste.

**Archivos clave:** `src/frontend/src/lib/tabla-filtros.ts`, `src/frontend/src/components/app/EncabezadoFiltrable.tsx`, `src/frontend/src/pages/Clientes.tsx`, `src/frontend/src/pages/Usuarios.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/Proyectos.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador de las tres tablas (orden de números y fechas, filtro por valor y aviso de filtros activos).

## 2026-07-19 — Promoción de la migración React a main y README vigente

**Alcance:** se actualizan el README principal y la guía del frontend antes de integrar `feature/frontend-react-migration` en `main` mediante fast-forward.

**Impacto:** el punto de entrada del repositorio describe la Fase 2 real: proyectos multiproducto, presupuesto ejecutivo, listas de tareas con evidencia, sincronización global, avance por checks, Kanban condicionado, ejecución local y credenciales mock. `main` pasa a ser la rama estable que contiene la migración React vigente.

**Archivos clave:** `README.md`, `src/frontend/README.md`, `docs/project-context.md`, `docs/change-log.md`.

**Validaciones:** comprobación de que `origin/main` es ancestro de la feature, `npm run build`, `npm run lint`, `git diff --check` y publicación de ambas ramas sobre el mismo commit.

## 2026-07-19 — Tareas demostrativas sincronizadas y avance solo por checks

**Alcance:** los proyectos mock existentes reciben presupuestos, productos y tareas ficticias para visualizar el seguimiento vigente; se retira el editor manual de porcentajes.

**Impacto:** Fábrica e Instalación muestran listas por componente y etapa en Torre Aviadores, Ykua Sati, Ñasaindy y Dúplex Lambaré. Torre Aviadores incluye premarcos de aluminio. Las mismas tareas aparecen en la sección Tareas, que suma filtro por proyecto; completar o reabrir desde una vista se refleja en la otra. Todos los disparadores de cierre usan check y la evidencia se solicita dentro del diálogo. Las evidencias precargadas están identificadas como demostrativas.

**Archivos clave:** `src/frontend/src/mocks/data.ts`, `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`.

**Validaciones:** `npm run build`, `npm run lint`, `git diff --check` y simulación localhost de reapertura en el detalle, cierre desde Tareas y verificación posterior en el detalle.

## 2026-07-19 — Kanban horizontal arrastrable y ciclo de estados seguro

**Alcance:** la vista Tablero adopta columnas horizontales, tarjetas arrastrables y una política completa de transición, cancelación y reapertura.

**Impacto:** administradores y supervisores pueden arrastrar o usar el menú, siempre con la misma confirmación o condición. En progreso exige avance, Planificada rechaza proyectos con avance, pausa y reanudación guardan motivo, y finalizar conserva su advertencia y evidencia. Cancelar, reactivar y reabrir son acciones especiales exclusivas de administración con motivo obligatorio. El modelo suma auditoría general en `historialEstados` y datos de reanudación, reapertura y cancelación.

**Archivos clave:** `src/frontend/src/components/proyectos/TableroProyectos.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/lib/roles.ts`, `src/frontend/src/mocks/data.ts`, `src/frontend/package.json`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`.

**Validaciones:** `npm run build`, `npm run lint`, `git diff --check` y simulación en localhost del tablero, arrastre y diálogos condicionados.

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
