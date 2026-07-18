-- ============================================================
-- Migration 010: Responsable de tarea como usuario del sistema
-- ============================================================

ALTER TABLE tareas_obra
  ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_tareas_obra_responsable_id ON tareas_obra(responsable_id);

UPDATE tareas_obra t
SET responsable_id = u.id
FROM app_users u
WHERE t.responsable_id IS NULL
  AND t.responsable IS NOT NULL
  AND lower(trim(t.responsable)) = lower(trim(u.display_name));
