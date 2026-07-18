-- ============================================================
-- Migration 008: Lider de proyecto como usuario del sistema
-- ============================================================

ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS lider_usuario_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_obras_lider_usuario_id ON obras(lider_usuario_id);

