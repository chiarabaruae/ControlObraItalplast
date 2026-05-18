-- ============================================================
-- Migration 004: Complete MVP tables for Control Obras
-- ============================================================

-- 1. Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(80) UNIQUE NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar rol Admin si no existe
INSERT INTO roles (nombre, descripcion)
VALUES ('admin', 'Administrador del sistema con acceso completo')
ON CONFLICT (nombre) DO NOTHING;

-- 2. ALTER clientes: agregar columnas faltantes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS industria VARCHAR(120);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS calificacion NUMERIC(2,1) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(60);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_contacto VARCHAR(180);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- 3. ALTER obras: agregar columnas faltantes
ALTER TABLE obras ADD COLUMN IF NOT EXISTS codigo VARCHAR(30) UNIQUE;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS salud VARCHAR(40) DEFAULT 'buena';
ALTER TABLE obras ADD COLUMN IF NOT EXISTS presupuesto_horas NUMERIC(10,2) DEFAULT 0;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS horas_consumidas NUMERIC(10,2) DEFAULT 0;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS presupuesto_monto NUMERIC(14,2) DEFAULT 0;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS costo_consumido NUMERIC(14,2) DEFAULT 0;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- 4. ALTER tareas_obra: agregar columnas faltantes
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS hito_id UUID;
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS tarea_padre_id UUID;
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS fecha_limite DATE;
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS es_hito BOOLEAN DEFAULT FALSE;
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS completada_en TIMESTAMPTZ;
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS creado_por UUID;
ALTER TABLE tareas_obra ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- 5. Tabla: hitos_obra
CREATE TABLE IF NOT EXISTS hitos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(40) DEFAULT 'pendiente',
  orden INTEGER DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  progreso NUMERIC(5,2) DEFAULT 0,
  responsable_id UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eliminado_en TIMESTAMPTZ
);

-- FK de tareas_obra hacia hitos_obra (solo si no existe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tareas_obra_hito'
  ) THEN
    ALTER TABLE tareas_obra
      ADD CONSTRAINT fk_tareas_obra_hito
      FOREIGN KEY (hito_id) REFERENCES hitos_obra(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tareas_obra_padre'
  ) THEN
    ALTER TABLE tareas_obra
      ADD CONSTRAINT fk_tareas_obra_padre
      FOREIGN KEY (tarea_padre_id) REFERENCES tareas_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_hitos_obra_obra_id ON hitos_obra(obra_id);
CREATE INDEX IF NOT EXISTS ix_tareas_obra_hito_id ON tareas_obra(hito_id);

-- 6. Tabla: equipo_obra
CREATE TABLE IF NOT EXISTS equipo_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  rol_en_obra VARCHAR(120),
  porcentaje_asignacion NUMERIC(5,2) DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(30) DEFAULT 'activo',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_equipo_obra_obra_id ON equipo_obra(obra_id);
CREATE INDEX IF NOT EXISTS ix_equipo_obra_usuario_id ON equipo_obra(usuario_id);

-- 7. Tabla: riesgos_obra
CREATE TABLE IF NOT EXISTS riesgos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  probabilidad VARCHAR(30) DEFAULT 'media',
  impacto VARCHAR(30) DEFAULT 'medio',
  severidad VARCHAR(30) DEFAULT 'media',
  estado VARCHAR(40) DEFAULT 'abierto',
  responsable_id UUID,
  plan_mitigacion TEXT,
  fecha_identificacion DATE DEFAULT CURRENT_DATE,
  fecha_cierre DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eliminado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_riesgos_obra_obra_id ON riesgos_obra(obra_id);

-- 8. Tabla: documentos_obra
CREATE TABLE IF NOT EXISTS documentos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(80),
  url TEXT,
  ruta_archivo TEXT,
  descripcion TEXT,
  subido_por UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eliminado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_documentos_obra_obra_id ON documentos_obra(obra_id);

-- 9. Tabla: comentarios_obra
CREATE TABLE IF NOT EXISTS comentarios_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  tarea_id UUID REFERENCES tareas_obra(id) ON DELETE CASCADE,
  riesgo_id UUID REFERENCES riesgos_obra(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eliminado_en TIMESTAMPTZ
);

-- 10. Tabla: configuraciones_usuario
CREATE TABLE IF NOT EXISTS configuraciones_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE,
  tema VARCHAR(30) DEFAULT 'sistema',
  color_acento VARCHAR(20) DEFAULT '#8A0FA8',
  sidebar_colapsado BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tabla: auditoria_cambios
CREATE TABLE IF NOT EXISTS auditoria_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  entidad VARCHAR(100) NOT NULL,
  entidad_id UUID,
  accion VARCHAR(80) NOT NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auditoria_entidad ON auditoria_cambios(entidad, entidad_id);
