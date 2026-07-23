-- ============================================================================
-- D-030 — Tareas genéricas del proyecto: grupo "generales" sin producto ni
-- etapa de fábrica/instalación. Vista y edición exclusivas de administración
-- y supervisión (la API filtra el grupo para el rol viewer).
-- ============================================================================

-- El tipo de producto pasa a ser opcional: null = tarea general del proyecto.
alter table tareas_seguimiento
  alter column tipo_producto drop not null;

-- El grupo admite "generales"; una tarea general no lleva tipo de producto.
alter table tareas_seguimiento
  drop constraint if exists tareas_seguimiento_grupo_check;

alter table tareas_seguimiento
  add constraint tareas_seguimiento_grupo_check
  check (grupo in ('fabricacion_premarcos','instalacion_premarcos','fabrica','instalacion','generales')),
  add constraint tareas_seguimiento_general_sin_producto_check
  check ((grupo = 'generales') = (tipo_producto is null));
