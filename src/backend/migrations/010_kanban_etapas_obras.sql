-- ============================================================
-- Migration 010: Etapas Kanban configurables para obras
-- ============================================================

CREATE TABLE IF NOT EXISTS etapas_kanban_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  codigo VARCHAR(80) UNIQUE,
  orden INTEGER NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS etapa_kanban_id UUID REFERENCES etapas_kanban_obra(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_etapas_kanban_obra_orden ON etapas_kanban_obra(orden);
CREATE INDEX IF NOT EXISTS ix_obras_etapa_kanban_id ON obras(etapa_kanban_id);

INSERT INTO etapas_kanban_obra (nombre, codigo, orden, activa)
VALUES
  ('Planificación', 'planificacion', 10, TRUE),
  ('En ejecución', 'en_ejecucion', 20, TRUE),
  ('Riesgo / Bloqueo', 'riesgo_bloqueo', 30, TRUE),
  ('Cierre', 'cierre', 40, TRUE),
  ('Otros', 'otros', 50, TRUE)
ON CONFLICT (codigo) DO NOTHING;

UPDATE obras o
SET etapa_kanban_id = e.id
FROM etapas_kanban_obra e
WHERE o.etapa_kanban_id IS NULL
  AND (
    (e.codigo = 'planificacion' AND o.estado IN ('planificada', 'pendiente'))
    OR
    (e.codigo = 'en_ejecucion' AND o.estado IN ('en_progreso', 'en_ejecucion'))
    OR
    (e.codigo = 'riesgo_bloqueo' AND o.estado IN ('pausada', 'bloqueada', 'en_riesgo', 'critica'))
    OR
    (e.codigo = 'cierre' AND o.estado IN ('finalizada', 'cancelada'))
  );

UPDATE obras o
SET etapa_kanban_id = e.id
FROM etapas_kanban_obra e
WHERE o.etapa_kanban_id IS NULL
  AND e.codigo = 'otros';
