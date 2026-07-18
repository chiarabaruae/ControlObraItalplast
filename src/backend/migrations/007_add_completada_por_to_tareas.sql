-- ============================================================
-- Migration 007: Agregar completada_por a tareas_obra
-- ============================================================

ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS completada_por UUID REFERENCES app_users(id) ON DELETE SET NULL;
