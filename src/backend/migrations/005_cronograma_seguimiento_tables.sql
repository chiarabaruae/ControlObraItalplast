-- ============================================================
-- Migration 005: Tables for Cronograma and Seguimientos
-- ============================================================

-- Insertar proyectos ejemplares en la tabla obras
INSERT INTO obras (id, nombre, fecha_inicio, fecha_fin_estimada, estado, descripcion)
VALUES 
  (gen_random_uuid(), 'Proyecto 1', CURRENT_DATE, CURRENT_DATE + interval '30 days', 'planificada', 'Proyecto de prueba 1 para Cronogramas y Seguimientos'),
  (gen_random_uuid(), 'Proyecto 2', CURRENT_DATE, CURRENT_DATE + interval '45 days', 'planificada', 'Proyecto de prueba 2 para Cronogramas y Seguimientos'),
  (gen_random_uuid(), 'Proyecto 3', CURRENT_DATE, CURRENT_DATE + interval '60 days', 'planificada', 'Proyecto de prueba 3 para Cronogramas y Seguimientos')
ON CONFLICT DO NOTHING;

-- TABLA: documentos_proyecto
CREATE TABLE IF NOT EXISTS documentos_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo_documento VARCHAR(50) NOT NULL, -- oferta_pdf, abaco_lista, otro
  nombre_archivo VARCHAR(255),
  ruta_archivo TEXT,
  mime_type VARCHAR(100),
  estado_procesamiento VARCHAR(50) DEFAULT 'pendiente', -- pendiente, procesado, error
  datos_extraidos JSONB,
  creado_por UUID,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: cronogramas_proyecto
CREATE TABLE IF NOT EXISTS cronogramas_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  documento_oferta_id UUID REFERENCES documentos_proyecto(id) ON DELETE SET NULL,
  oferta_nro VARCHAR(80),
  cliente VARCHAR(180),
  nombre_proyecto VARCHAR(200),
  lider_proyecto VARCHAR(160),
  serie VARCHAR(160),
  total_aberturas INTEGER,
  dias_fabrica INTEGER,
  fecha_limite_firma_abaco DATE,
  inicio_fabrica DATE,
  fecha_compromiso_fin_produccion DATE,
  fecha_comprometida_inicio_instalacion DATE,
  dias_instalacion INTEGER,
  fin_instalacion DATE,
  calculo_manual BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: aberturas_proyecto
CREATE TABLE IF NOT EXISTS aberturas_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  documento_abaco_id UUID REFERENCES documentos_proyecto(id) ON DELETE CASCADE,
  numero INTEGER,
  cod_posicion VARCHAR(50),
  ambiente VARCHAR(200),
  cantidad INTEGER,
  ancho_mm NUMERIC(10,2),
  largo_mm NUMERIC(10,2),
  serie VARCHAR(160),
  color VARCHAR(100),
  tipo_vidrio TEXT,
  observaciones TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: seguimientos_proyecto
CREATE TABLE IF NOT EXISTS seguimientos_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- fabrica, obra
  documento_abaco_id UUID REFERENCES documentos_proyecto(id) ON DELETE SET NULL,
  cronograma_id UUID REFERENCES cronogramas_proyecto(id) ON DELETE SET NULL,
  fecha_inicio_planificada DATE,
  fecha_fin_planificada DATE,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  porcentaje_avance NUMERIC(5,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: etapas_seguimiento
CREATE TABLE IF NOT EXISTS etapas_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id UUID NOT NULL REFERENCES seguimientos_proyecto(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  orden INTEGER DEFAULT 0,
  aplica BOOLEAN DEFAULT TRUE,
  fecha_estimada DATE,
  fecha_real DATE,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: avance_aberturas
CREATE TABLE IF NOT EXISTS avance_aberturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id UUID NOT NULL REFERENCES seguimientos_proyecto(id) ON DELETE CASCADE,
  abertura_id UUID NOT NULL REFERENCES aberturas_proyecto(id) ON DELETE CASCADE,
  porcentaje_avance NUMERIC(5,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'pendiente',
  fecha_estimada_fin DATE,
  fecha_real_fin DATE,
  observaciones TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: avance_etapas_abertura
CREATE TABLE IF NOT EXISTS avance_etapas_abertura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avance_abertura_id UUID NOT NULL REFERENCES avance_aberturas(id) ON DELETE CASCADE,
  etapa_seguimiento_id UUID NOT NULL REFERENCES etapas_seguimiento(id) ON DELETE CASCADE,
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, en_proceso, completada, no_aplica
  fecha_estimada DATE,
  fecha_real DATE,
  completado_por UUID,
  comentario TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- TABLA: calendario_laboral
CREATE TABLE IF NOT EXISTS calendario_laboral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  es_habil BOOLEAN DEFAULT TRUE,
  motivo VARCHAR(200),
  creado_en TIMESTAMP DEFAULT NOW()
);
