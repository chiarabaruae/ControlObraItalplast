-- ============================================================
-- Migration 006: Configuración de Etapas Dinámicas
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- 'fabrica' o 'obra'
  nombre VARCHAR(120) NOT NULL,
  orden INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Insertar etapas por defecto para FÁBRICA (basadas en el Excel adjunto y requerimientos)
INSERT INTO configuracion_etapas (tipo, nombre, orden) VALUES 
  ('fabrica', 'Corte', 1),
  ('fabrica', 'Limpieza', 2),
  ('fabrica', 'Soldadura', 3),
  ('fabrica', 'Armado', 4),
  ('fabrica', 'SV', 5),
  ('fabrica', 'Vidriado', 6),
  ('fabrica', 'Terminado', 7),
  ('fabrica', 'Enviado', 8)
ON CONFLICT DO NOTHING;

-- Insertar etapas por defecto para OBRA
INSERT INTO configuracion_etapas (tipo, nombre, orden) VALUES 
  ('obra', 'En obra', 1),
  ('obra', 'Instalado marco', 2),
  ('obra', 'Instaladas hojas', 3),
  ('obra', 'Vidriado', 4),
  ('obra', 'Terminado interior', 5),
  ('obra', 'Terminado exterior', 6),
  ('obra', 'Manijas y puntos de cierre', 7),
  ('obra', 'Contravientos / felpas', 8),
  ('obra', 'Enguiadores', 9),
  ('obra', 'Tapas para tornillos o pintura', 10),
  ('obra', 'Certificados', 11)
ON CONFLICT DO NOTHING;
