-- ============================================================
-- Migration 009: Lider de proyecto referenciado a usuario
-- ============================================================

ALTER TABLE cronogramas_proyecto
  ADD COLUMN IF NOT EXISTS lider_usuario_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_cronogramas_lider_usuario_id ON cronogramas_proyecto(lider_usuario_id);

