-- Migración 005: Tablas para Gantt, Cronograma Backward y Seguimientos

-- 1. Actualizar tabla obras (proyectos) existente
ALTER TABLE obras 
  ADD COLUMN IF NOT EXISTS cliente_id UUID,
  ADD COLUMN IF NOT EXISTS oferta_nro TEXT,
  ADD COLUMN IF NOT EXISTS nro_abaco TEXT,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS producto TEXT,
  ADD COLUMN IF NOT EXISTS total_aberturas INTEGER,
  ADD COLUMN IF NOT EXISTS semaforo TEXT DEFAULT 'gris';

-- 2. Cronogramas de proyecto (Backward Schedule)
CREATE TABLE IF NOT EXISTS cronogramas_proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
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
    actualizado_en TIMESTAMP DEFAULT NOW(),
    eliminado_en TIMESTAMP NULL
);

-- 3. Aberturas de proyecto (Items del Ábaco)
CREATE TABLE IF NOT EXISTS aberturas_proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    nro_abaco TEXT,
    numero INTEGER,
    cod_posicion TEXT,
    ambiente TEXT,
    cantidad INTEGER,
    ancho NUMERIC(10,2),
    largo NUMERIC(10,2),
    serie TEXT,
    color TEXT,
    tipo_vidrio TEXT,
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW(),
    eliminado_en TIMESTAMP NULL
);

-- 4. Seguimientos (Fábrica / Obra)
CREATE TABLE IF NOT EXISTS seguimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'fabrica' o 'obra'
    fecha_creacion DATE,
    fecha_inicio_planificada DATE,
    fecha_fin_planificada DATE,
    fecha_inicio_real DATE,
    fecha_fin_real DATE,
    porcentaje_avance NUMERIC(5,2) DEFAULT 0,
    estado TEXT DEFAULT 'pendiente',
    semaforo TEXT DEFAULT 'gris',
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW(),
    eliminado_en TIMESTAMP NULL
);

-- 5. Etapas de seguimiento configurables
CREATE TABLE IF NOT EXISTS etapas_seguimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seguimiento_id UUID NOT NULL REFERENCES seguimientos(id) ON DELETE CASCADE,
    nombre_etapa TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    aplica BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- 6. Avance General por Abertura
CREATE TABLE IF NOT EXISTS avance_aberturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seguimiento_id UUID NOT NULL REFERENCES seguimientos(id) ON DELETE CASCADE,
    abertura_id UUID NOT NULL REFERENCES aberturas_proyecto(id) ON DELETE CASCADE,
    porcentaje_avance NUMERIC(5,2) DEFAULT 0,
    estado TEXT DEFAULT 'pendiente',
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- 7. Avance Detallado por Abertura y Etapa
CREATE TABLE IF NOT EXISTS avance_etapas_abertura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avance_abertura_id UUID NOT NULL REFERENCES avance_aberturas(id) ON DELETE CASCADE,
    etapa_seguimiento_id UUID NOT NULL REFERENCES etapas_seguimiento(id) ON DELETE CASCADE,
    cantidad_avanzada NUMERIC(10,2) DEFAULT 0,
    porcentaje_etapa NUMERIC(5,2) DEFAULT 0,
    estado TEXT DEFAULT 'pendiente',
    fecha_real DATE,
    comentario TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- 8. Avance Diario (Planificado vs Real)
CREATE TABLE IF NOT EXISTS avance_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    seguimiento_id UUID REFERENCES seguimientos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL, -- 'fabrica' o 'obra'
    serie TEXT,
    etapa TEXT,
    cantidad_planificada NUMERIC(10,2) DEFAULT 0,
    cantidad_real NUMERIC(10,2) DEFAULT 0,
    diferencia NUMERIC(10,2) DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- 9. Documentos de Proyecto
CREATE TABLE IF NOT EXISTS documentos_proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL,
    nombre_archivo TEXT,
    ruta_archivo TEXT,
    mime_type TEXT,
    datos_extraidos JSONB,
    estado_procesamiento TEXT DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- 10. Calendario Laboral
CREATE TABLE IF NOT EXISTS calendario_laboral (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    es_habil BOOLEAN DEFAULT TRUE,
    motivo TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);
