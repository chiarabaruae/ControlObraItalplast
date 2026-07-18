import { Router } from "express";
import multer from "multer";
import { createRequire } from "node:module";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbacoPdfText } from "../../application/projects/abaco-pdf-parser.js";
import { requireAuth } from "../middlewares/require-auth.js";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");
import { randomUUID } from "node:crypto";

// --- Helpers para Días Hábiles ---
function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Domingo, 6 = Sábado
}

function addBusinessDays(startDate, daysToAdd) {
  let currentDate = new Date(startDate);
  let addedDays = 0;
  const direction = daysToAdd > 0 ? 1 : -1;
  const targetDays = Math.abs(daysToAdd);

  while (addedDays < targetDays) {
    currentDate.setDate(currentDate.getDate() + direction);
    if (isBusinessDay(currentDate)) {
      addedDays++;
    }
  }
  return currentDate;
}

const upload = multer({ storage: multer.memoryStorage() });
const DOCUMENTS_STORAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../storage/documentos");
const WORKSPACE_ROLES = new Set(["administrator", "supervisor"]);

async function persistUploadedDocument(file, documentId) {
  await mkdir(DOCUMENTS_STORAGE_DIR, { recursive: true });
  const originalExt = path.extname(file.originalname || "").toLowerCase();
  const safeExt = originalExt && originalExt.length <= 8 ? originalExt : "";
  const fileName = `${documentId}${safeExt}`;
  const filePath = path.join(DOCUMENTS_STORAGE_DIR, fileName);
  await writeFile(filePath, file.buffer);
  return filePath;
}

function isAdministrator(user) {
  return user?.role === "administrator";
}

function isWorkspaceMember(user) {
  return WORKSPACE_ROLES.has(user?.role) || isAdministrator(user);
}

function isSameUser(userId, targetUserId) {
  return Boolean(userId && targetUserId && String(userId) === String(targetUserId));
}

function isFolderDocument(row) {
  return String(row?.tipo_documento || "").toLowerCase() === "carpeta"
    || Boolean(row?.datos_extraidos?.es_carpeta);
}

function isPdfUpload(file) {
  const mime = String(file?.mimetype || "").toLowerCase();
  const fileName = String(file?.originalname || "").toLowerCase();
  return mime.includes("pdf") || fileName.endsWith(".pdf");
}

async function extractPdfText(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "");
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy();
    }
  }
}

async function getProjectRecord(pool, projectId) {
  const result = await pool.query(
    "SELECT id, nombre, lider_usuario_id FROM obras WHERE id = $1 LIMIT 1",
    [projectId]
  );
  return result.rows[0] || null;
}

async function ensureProjectReadAccess(pool, request, response, projectId) {
  const project = await getProjectRecord(pool, projectId);
  if (!project) {
    response.status(404).json({ error: "Proyecto no encontrado." });
    return null;
  }

  if (isWorkspaceMember(request.user) || isSameUser(request.user?.sub, project.lider_usuario_id)) {
    return project;
  }

  response.status(403).json({ error: "No tienes acceso a este proyecto." });
  return null;
}

async function ensureProjectEditAccess(pool, request, response, projectId) {
  const project = await getProjectRecord(pool, projectId);
  if (!project) {
    response.status(404).json({ error: "Proyecto no encontrado." });
    return null;
  }

  if (isAdministrator(request.user) || isSameUser(request.user?.sub, project.lider_usuario_id)) {
    return project;
  }

  response.status(403).json({ error: "Solo el admin o el líder asignado pueden editar esta información." });
  return null;
}

async function ensureAvanceEtapaEditAccess(pool, request, response, avanceEtapaId) {
  const result = await pool.query(
    `
      SELECT o.id, o.lider_usuario_id
      FROM avance_etapas_abertura aea
      JOIN avance_aberturas aa ON aa.id = aea.avance_abertura_id
      JOIN seguimientos_proyecto sp ON sp.id = aa.seguimiento_id
      JOIN obras o ON o.id = sp.proyecto_id
      WHERE aea.id = $1
      LIMIT 1
    `,
    [avanceEtapaId]
  );

  const project = result.rows[0];
  if (!project) {
    response.status(404).json({ error: "Avance de etapa no encontrado." });
    return null;
  }

  if (isAdministrator(request.user) || isSameUser(request.user?.sub, project.lider_usuario_id)) {
    return project;
  }

  response.status(403).json({ error: "Solo el admin o el líder asignado pueden editar esta información." });
  return null;
}

async function resolveParentFolder(pool, projectId, parentFolderId) {
  if (!parentFolderId) return null;

  const result = await pool.query(
    `
      SELECT id, tipo_documento, datos_extraidos
      FROM documentos_proyecto
      WHERE id = $1 AND proyecto_id = $2
      LIMIT 1
    `,
    [parentFolderId, projectId]
  );

  const folder = result.rows[0];
  if (!folder || !isFolderDocument(folder)) {
    const error = new Error("La carpeta seleccionada no existe o no pertenece a este proyecto.");
    error.status = 400;
    throw error;
  }

  return folder;
}

function withProjectReadAccess(pool, handler) {
  return async (request, response, next) => {
    try {
      const project = await ensureProjectReadAccess(pool, request, response, request.params.id);
      if (!project) return;
      request.projectRecord = project;
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function withProjectEditAccess(pool, handler) {
  return async (request, response, next) => {
    try {
      const project = await ensureProjectEditAccess(pool, request, response, request.params.id);
      if (!project) return;
      request.projectRecord = project;
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function withAvanceEtapaEditAccess(pool, handler) {
  return async (request, response, next) => {
    try {
      const project = await ensureAvanceEtapaEditAccess(pool, request, response, request.params.id);
      if (!project) return;
      request.projectRecord = project;
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function createProyectosRoutes(container) {
  const router = Router();
  const auth = requireAuth(container.env);
  router.use(auth);

  // GET /api/admin/obras/:id/documentos
  router.get("/obras/:id/documentos", withProjectReadAccess(container.pool, async (request, response, next) => {
    try {
      const { id: proyectoId } = request.params;
      const result = await container.pool.query(
        `
        SELECT
          d.id,
          d.proyecto_id,
          d.tipo_documento,
          d.nombre_archivo,
          d.ruta_archivo,
          d.mime_type,
          d.estado_procesamiento,
          d.datos_extraidos,
          d.creado_por,
          d.creado_en,
          d.actualizado_en,
          u.display_name AS subido_por,
          CASE
            WHEN (d.datos_extraidos->>'size_bytes') ~ '^[0-9]+$' THEN (d.datos_extraidos->>'size_bytes')::bigint
            ELSE NULL
          END AS size_bytes,
          NULLIF(d.datos_extraidos->>'parent_folder_id', '') AS parent_folder_id,
          COALESCE(d.datos_extraidos->>'documento_asociado', 'otro') AS documento_asociado,
          COALESCE((d.datos_extraidos->>'es_carpeta')::boolean, false) AS es_carpeta
        FROM documentos_proyecto d
        LEFT JOIN app_users u ON u.id = d.creado_por
        WHERE d.proyecto_id = $1
        ORDER BY d.actualizado_en DESC, d.creado_en DESC
        `,
        [proyectoId]
      );

      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  }));

  router.get("/obras/:id/documentos/:documentoId/archivo", withProjectReadAccess(container.pool, async (request, response, next) => {
    try {
      const { id: proyectoId, documentoId } = request.params;
      const result = await container.pool.query(
        `
          select id, nombre_archivo, ruta_archivo, mime_type
          from documentos_proyecto
          where id = $1 and proyecto_id = $2
          limit 1
        `,
        [documentoId, proyectoId]
      );

      if (!result.rows.length) {
        response.status(404).json({ error: "Documento no encontrado." });
        return;
      }

      const doc = result.rows[0];
      if (!doc.ruta_archivo) {
        response.status(404).json({ error: "El documento no tiene archivo asociado." });
        return;
      }

      await access(doc.ruta_archivo);
      response.setHeader("Content-Disposition", `inline; filename="${doc.nombre_archivo || "documento"}"`);
      response.type(doc.mime_type || "application/octet-stream");
      response.sendFile(doc.ruta_archivo);
    } catch (error) {
      if (error.code === "ENOENT") {
        response.status(404).json({ error: "El archivo ya no existe en el servidor." });
        return;
      }
      next(error);
    }
  }));

  // POST /api/admin/obras/:id/documentos
  router.post("/obras/:id/documentos", upload.single("archivo"), withProjectEditAccess(container.pool, async (request, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ error: "No se proporcionó archivo." });
      }

      const { id: proyectoId } = request.params;
      const fileName = request.file.originalname;
      const mimeType = request.file.mimetype;
      const sizeBytes = request.file.size ?? 0;
      const docType = String(request.body?.tipo_documento || "otro").trim().toLowerCase() || "otro";
      const parentFolderId = String(request.body?.parent_folder_id || "").trim() || null;
      await resolveParentFolder(container.pool, proyectoId, parentFolderId);
      const docId = randomUUID();
      const rutaArchivo = await persistUploadedDocument(request.file, docId);

      await container.pool.query(
        `
        INSERT INTO documentos_proyecto (
          id, proyecto_id, tipo_documento, nombre_archivo, ruta_archivo, mime_type, estado_procesamiento, datos_extraidos, creado_por
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          docId,
          proyectoId,
          docType,
          fileName,
          rutaArchivo,
          mimeType,
          "procesado",
          {
            size_bytes: sizeBytes,
            nombre_original: fileName,
            parent_folder_id: parentFolderId
          },
          request.user?.sub || null
        ]
      );

      response.status(201).json({
        mensaje: "Documento cargado.",
        documento_id: docId
      });
    } catch (error) {
      next(error);
    }
  }));

  // POST /api/admin/obras/:id/documentos/carpeta
  router.post("/obras/:id/documentos/carpeta", withProjectEditAccess(container.pool, async (request, response, next) => {
    try {
      const { id: proyectoId } = request.params;
      const nombre = String(request.body?.nombre || "").trim();
      const parentFolderId = String(request.body?.parent_folder_id || "").trim() || null;
      if (!nombre) {
        return response.status(400).json({ error: "Nombre de carpeta requerido." });
      }
      await resolveParentFolder(container.pool, proyectoId, parentFolderId);

      const carpetaId = randomUUID();
      await container.pool.query(
        `
        INSERT INTO documentos_proyecto (
          id, proyecto_id, tipo_documento, nombre_archivo, mime_type, estado_procesamiento, datos_extraidos, creado_por
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          carpetaId,
          proyectoId,
          "carpeta",
          nombre,
          null,
          "procesado",
          {
            es_carpeta: true,
            documento_asociado: "otro",
            parent_folder_id: parentFolderId
          },
          request.user?.sub || null
        ]
      );

      response.status(201).json({
        mensaje: "Carpeta creada.",
        documento_id: carpetaId
      });
    } catch (error) {
      next(error);
    }
  }));

  // POST /api/admin/obras/:id/documentos/oferta
  router.post("/obras/:id/documentos/oferta", upload.single("archivo"), withProjectEditAccess(container.pool, async (request, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ error: "No se proporcionó un archivo PDF." });
      }
      if (!isPdfUpload(request.file)) {
        return response.status(400).json({ error: "La oferta debe cargarse en formato PDF." });
      }

      const { id: proyectoId } = request.params;
      const fileBuffer = request.file.buffer;
      const fileName = request.file.originalname;

      // 1. Guardar registro del documento
      const docId = randomUUID();
      const rutaArchivo = await persistUploadedDocument(request.file, docId);
      await container.pool.query(
        `
        INSERT INTO documentos_proyecto (id, proyecto_id, tipo_documento, nombre_archivo, ruta_archivo, mime_type, estado_procesamiento, creado_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [docId, proyectoId, "oferta_pdf", fileName, rutaArchivo, request.file.mimetype, "pendiente", request.user?.sub || null]
      );

      // 2. Procesar el PDF y extraer texto
      let text = "";
      try {
        text = await extractPdfText(fileBuffer);
      } catch (err) {
        await container.pool.query(
          "UPDATE documentos_proyecto SET estado_procesamiento = 'error' WHERE id = $1",
          [docId]
        );
        return response.status(500).json({ error: "Error al leer el PDF." });
      }

      // 3. Extracción de datos básicos (Reglas simples)
      const datosExtraidos = {
        oferta_nro: null,
        cliente: null,
        nombre_proyecto: null,
        serie: null,
        total_aberturas: 0
      };

      // Ejemplos de regex para extraer datos. Esto dependerá del formato real del PDF.
      // Ajustamos patrones genéricos según el prompt:
      // "Oferta_Nro: “2726/26”", "Cliente: “ARQ. CANTERO MATHIAS”", etc.
      
      const ofertaMatch = text.match(/(?:Oferta|Presupuesto)[\sNro.:]*([0-9]+\/[0-9]+)/i);
      if (ofertaMatch) datosExtraidos.oferta_nro = ofertaMatch[1].trim();

      const clienteMatch = text.match(/Cliente:?\s*([^\n]+)/i);
      if (clienteMatch) datosExtraidos.cliente = clienteMatch[1].trim();

      const proyectoMatch = text.match(/Proyecto:?\s*([^\n]+)/i) || text.match(/Obra:?\s*([^\n]+)/i);
      if (proyectoMatch) datosExtraidos.nombre_proyecto = proyectoMatch[1].trim();

      // Buscar si menciona series conocidas
      const seriesSugeridas = [];
      if (/Ideal 2000/i.test(text)) seriesSugeridas.push("Ideal 2000 Round Line");
      if (/multi-sliding/i.test(text)) seriesSugeridas.push("Corrediza multi-sliding");
      if (seriesSugeridas.length > 0) datosExtraidos.serie = seriesSugeridas.join(" / ");

      // Intentar contar posiciones
      const aberturasMatch = text.match(/Total Aberturas:?\s*([0-9]+)/i) || text.match(/Cantidad:?\s*([0-9]+)/i);
      if (aberturasMatch) {
        datosExtraidos.total_aberturas = parseInt(aberturasMatch[1], 10);
      }

      // Guardar extracción
      await container.pool.query(
        `
        UPDATE documentos_proyecto 
        SET estado_procesamiento = 'procesado', datos_extraidos = $1 
        WHERE id = $2
        `,
        [datosExtraidos, docId]
      );

      response.status(200).json({ 
        mensaje: "Oferta procesada correctamente", 
        documento_id: docId,
        datos_extraidos: datosExtraidos 
      });
    } catch (error) {
      next(error);
    }
  }));

  // POST /api/admin/obras/:id/cronograma
  router.post("/obras/:id/cronograma", withProjectEditAccess(container.pool, async (request, response, next) => {
    try {
      const body = request.body || {};
      const proyectoId = request.params.id;

      // Campos manuales (permitimos guardar aunque se completen despues)
      const fechaInicioInstalacionStr = body.fecha_comprometida_inicio_instalacion || null;
      const diasFabrica = Number.isFinite(Number(body.dias_fabrica)) ? parseInt(body.dias_fabrica, 10) : null;
      const diasInstalacion = Number.isFinite(Number(body.dias_instalacion)) ? parseInt(body.dias_instalacion, 10) : null;

      const fechaBase = fechaInicioInstalacionStr ? new Date(fechaInicioInstalacionStr + "T12:00:00") : null;

      const canCalculate = Boolean(fechaBase && diasFabrica && diasInstalacion);
      const finProduccion = canCalculate ? addBusinessDays(fechaBase, -3) : null;
      const inicioFabrica = canCalculate ? addBusinessDays(finProduccion, -diasFabrica) : null;
      const limiteAbaco = canCalculate ? addBusinessDays(inicioFabrica, -1) : null;
      const finInstalacion = canCalculate ? addBusinessDays(fechaBase, diasInstalacion - 1) : null;

      // Check if cronograma already exists
      const existingCronograma = await container.pool.query(
        "SELECT id FROM cronogramas_proyecto WHERE proyecto_id = $1 LIMIT 1",
        [proyectoId]
      );

      let cronogramaId;
      if (existingCronograma.rows.length > 0) {
        cronogramaId = existingCronograma.rows[0].id;
        await container.pool.query(
          `
          UPDATE cronogramas_proyecto SET
            documento_oferta_id = $2,
            oferta_nro = $3,
            cliente = $4,
            nombre_proyecto = $5,
            lider_proyecto = $6,
            lider_usuario_id = $7,
            serie = $8,
            total_aberturas = $9,
            dias_fabrica = $10,
            fecha_limite_firma_abaco = $11,
            inicio_fabrica = $12,
            fecha_compromiso_fin_produccion = $13,
            fecha_comprometida_inicio_instalacion = $14,
            dias_instalacion = $15,
            fin_instalacion = $16,
            actualizado_en = NOW()
          WHERE id = $1
          `,
          [
            cronogramaId,
            body.documento_oferta_id || null,
            body.oferta_nro || null,
            body.cliente || null,
            body.nombre_proyecto || null,
            body.lider_proyecto || null,
            body.lider_usuario_id || null,
            body.serie || null,
            parseInt(body.total_aberturas, 10) || null,
            diasFabrica,
            limiteAbaco,
            inicioFabrica,
            finProduccion,
            fechaBase,
            diasInstalacion,
            finInstalacion
          ]
        );
      } else {
        cronogramaId = randomUUID();
        await container.pool.query(
          `
          INSERT INTO cronogramas_proyecto (
            id, proyecto_id, documento_oferta_id, oferta_nro, cliente, nombre_proyecto, 
            lider_proyecto, lider_usuario_id, serie, total_aberturas, dias_fabrica, fecha_limite_firma_abaco, 
            inicio_fabrica, fecha_compromiso_fin_produccion, fecha_comprometida_inicio_instalacion, 
            dias_instalacion, fin_instalacion
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          `,
          [
            cronogramaId,
            proyectoId,
            body.documento_oferta_id || null,
            body.oferta_nro || null,
            body.cliente || null,
            body.nombre_proyecto || null,
            body.lider_proyecto || null,
            body.lider_usuario_id || null,
            body.serie || null,
            parseInt(body.total_aberturas, 10) || null,
            diasFabrica,
            limiteAbaco,
            inicioFabrica,
            finProduccion,
            fechaBase,
            diasInstalacion,
            finInstalacion
          ]
        );
      }

      if (body.lider_usuario_id) {
        await container.pool.query(
          "UPDATE obras SET lider_usuario_id = $1, updated_at = now() WHERE id = $2",
          [body.lider_usuario_id, proyectoId]
        );
      }

      response.status(201).json({
        mensaje: "Cronograma generado exitosamente",
        cronograma: {
          id: cronogramaId,
          fecha_limite_firma_abaco: limiteAbaco,
          inicio_fabrica: inicioFabrica,
          fecha_compromiso_fin_produccion: finProduccion,
          fecha_comprometida_inicio_instalacion: fechaBase,
          fin_instalacion: finInstalacion
        }
      });
    } catch (error) {
      next(error);
    }
  }));

  // GET /api/admin/obras/:id/cronograma
  router.get("/obras/:id/cronograma", withProjectReadAccess(container.pool, async (request, response, next) => {
    try {
      const result = await container.pool.query(
        "SELECT * FROM cronogramas_proyecto WHERE proyecto_id = $1 LIMIT 1",
        [request.params.id]
      );
      if (result.rows.length === 0) {
        return response.status(204).end();
      }
      response.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }));

  // POST /api/admin/obras/:id/documentos/abaco
  router.post("/obras/:id/documentos/abaco", upload.single("archivo"), withProjectEditAccess(container.pool, async (request, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ error: "No se proporcionó un archivo PDF de ábaco." });
      }
      if (!isPdfUpload(request.file)) {
        return response.status(400).json({ error: "Por ahora el ábaco solo admite archivos PDF." });
      }

      const { id: proyectoId } = request.params;
      const fileBuffer = request.file.buffer;
      const fileName = request.file.originalname;

      // Guardar documento
      const docId = randomUUID();
      const rutaArchivo = await persistUploadedDocument(request.file, docId);
      await container.pool.query(
        `
        INSERT INTO documentos_proyecto (id, proyecto_id, tipo_documento, nombre_archivo, ruta_archivo, mime_type, estado_procesamiento, creado_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [docId, proyectoId, "abaco_lista", fileName, rutaArchivo, request.file.mimetype, "pendiente", request.user?.sub || null]
      );

      // Procesar PDF del ábaco
      let aberturas = [];
      let metadata = {};
      try {
        const text = await extractPdfText(fileBuffer);
        const parsed = parseAbacoPdfText(text, fileName);
        aberturas = parsed.rows;
        metadata = parsed.metadata;
      } catch (err) {
        await container.pool.query(
          "UPDATE documentos_proyecto SET estado_procesamiento = 'error' WHERE id = $1",
          [docId]
        );
        return response.status(500).json({ error: "Error al procesar el PDF del ábaco." });
      }

      // Guardar aberturas en la base de datos
      if (aberturas.length > 0) {
        const client = await container.pool.connect();
        try {
          await client.query("BEGIN");

          await client.query("DELETE FROM seguimientos_proyecto WHERE proyecto_id = $1", [proyectoId]);
          await client.query("DELETE FROM aberturas_proyecto WHERE proyecto_id = $1", [proyectoId]);
          
          for (const ab of aberturas) {
            await client.query(
              `
              INSERT INTO aberturas_proyecto (
                id, proyecto_id, documento_abaco_id, numero, cod_posicion, ambiente, 
                cantidad, ancho_mm, largo_mm, serie, color, tipo_vidrio, observaciones
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              `,
              [
                randomUUID(), proyectoId, docId, ab.numero, ab.codPosicion, ab.ambiente,
                ab.cantidad, ab.anchoMm, ab.largoMm, ab.serie, ab.color, ab.tipoVidrio, ab.observaciones
              ]
            );
          }

          await client.query(
            `
              UPDATE documentos_proyecto
              SET estado_procesamiento = 'procesado', datos_extraidos = $2
              WHERE id = $1
            `,
            [
              docId,
              {
                size_bytes: request.file.size ?? 0,
                nombre_original: fileName,
                formato: "pdf",
                ...metadata
              }
            ]
          );

          await client.query("COMMIT");
        } catch (dbErr) {
          await client.query("ROLLBACK");
          throw dbErr;
        } finally {
          client.release();
        }
      } else {
        await container.pool.query(
          "UPDATE documentos_proyecto SET estado_procesamiento = 'error', datos_extraidos = '{\"error\":\"No se encontraron aberturas válidas\"}' WHERE id = $1",
          [docId]
        );
        return response.status(400).json({ error: "El PDF no contiene filas válidas de aberturas." });
      }

      response.status(200).json({ 
        mensaje: "Ábaco procesado correctamente", 
        documento_id: docId,
        total_aberturas: aberturas.length
      });
    } catch (error) {
      next(error);
    }
  }));

  // GET /api/admin/obras/:id/aberturas
  router.get("/obras/:id/aberturas", withProjectReadAccess(container.pool, async (request, response, next) => {
    try {
      const result = await container.pool.query(
        "SELECT * FROM aberturas_proyecto WHERE proyecto_id = $1 ORDER BY numero, cod_posicion",
        [request.params.id]
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  }));

  // GET /api/admin/configuracion-etapas/:tipo
  router.get("/configuracion-etapas/:tipo", async (request, response, next) => {
    try {
      const result = await container.pool.query(
        "SELECT * FROM configuracion_etapas WHERE tipo = $1 AND activa = true ORDER BY orden",
        [request.params.tipo]
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/obras/:id/seguimiento/:tipo
  router.post("/obras/:id/seguimiento/:tipo", withProjectEditAccess(container.pool, async (request, response, next) => {
    try {
      const { id: proyectoId, tipo } = request.params;
      const { etapas_seleccionadas } = request.body; // array de IDs de configuracion_etapas

      if (!['fabrica', 'obra'].includes(tipo)) {
        return response.status(400).json({ error: "Tipo de seguimiento inválido." });
      }

      const client = await container.pool.connect();
      try {
        await client.query("BEGIN");

        // 1. Obtener cronograma y aberturas
        const cronogramaRes = await client.query("SELECT * FROM cronogramas_proyecto WHERE proyecto_id = $1 LIMIT 1", [proyectoId]);
        const aberturasRes = await client.query("SELECT * FROM aberturas_proyecto WHERE proyecto_id = $1", [proyectoId]);
        
        if (cronogramaRes.rows.length === 0 || aberturasRes.rows.length === 0) {
          throw new Error("Falta cronograma o ábaco para generar el seguimiento.");
        }
        
        const cronograma = cronogramaRes.rows[0];
        const aberturas = aberturasRes.rows;

        // 2. Crear el seguimiento
        const seguimientoId = randomUUID();
        let fechaInicioPlanificada = tipo === 'fabrica' ? cronograma.inicio_fabrica : cronograma.fecha_comprometida_inicio_instalacion;
        let fechaFinPlanificada = tipo === 'fabrica' ? cronograma.fecha_compromiso_fin_produccion : cronograma.fin_instalacion;

        await client.query(
          `
          INSERT INTO seguimientos_proyecto (id, proyecto_id, tipo, documento_abaco_id, cronograma_id, fecha_inicio_planificada, fecha_fin_planificada)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [seguimientoId, proyectoId, tipo, aberturas[0].documento_abaco_id, cronograma.id, fechaInicioPlanificada, fechaFinPlanificada]
        );

        // 3. Obtener las etapas configuradas seleccionadas
        const etapasConfigRes = await client.query(
          "SELECT * FROM configuracion_etapas WHERE id = ANY($1) ORDER BY orden",
          [etapas_seleccionadas]
        );
        const etapasConfig = etapasConfigRes.rows;

        // 4. Crear etapas del seguimiento
        const etapasSeguimientoIds = [];
        for (const config of etapasConfig) {
          const etapaSegId = randomUUID();
          await client.query(
            `
            INSERT INTO etapas_seguimiento (id, seguimiento_id, nombre, orden)
            VALUES ($1, $2, $3, $4)
            `,
            [etapaSegId, seguimientoId, config.nombre, config.orden]
          );
          etapasSeguimientoIds.push(etapaSegId);
        }

        // 5. Crear avance de aberturas y sus etapas
        for (const ab of aberturas) {
          const avanceAbId = randomUUID();
          await client.query(
            `
            INSERT INTO avance_aberturas (id, seguimiento_id, abertura_id)
            VALUES ($1, $2, $3)
            `,
            [avanceAbId, seguimientoId, ab.id]
          );

          for (const etapaSegId of etapasSeguimientoIds) {
            await client.query(
              `
              INSERT INTO avance_etapas_abertura (id, avance_abertura_id, etapa_seguimiento_id)
              VALUES ($1, $2, $3)
              `,
              [randomUUID(), avanceAbId, etapaSegId]
            );
          }
        }

        await client.query("COMMIT");
        response.status(201).json({ mensaje: "Seguimiento generado exitosamente.", seguimiento_id: seguimientoId });
      } catch (dbErr) {
        await client.query("ROLLBACK");
        throw dbErr;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }));

  // GET /api/admin/obras/:id/seguimiento/:tipo
  router.get("/obras/:id/seguimiento/:tipo", withProjectReadAccess(container.pool, async (request, response, next) => {
    try {
      const { id: proyectoId, tipo } = request.params;
      
      const seguimientoRes = await container.pool.query(
        "SELECT * FROM seguimientos_proyecto WHERE proyecto_id = $1 AND tipo = $2 LIMIT 1",
        [proyectoId, tipo]
      );

      if (seguimientoRes.rows.length === 0) {
        return response.status(204).end();
      }

      const seguimiento = seguimientoRes.rows[0];

      // Obtener etapas del seguimiento
      const etapasRes = await container.pool.query(
        "SELECT * FROM etapas_seguimiento WHERE seguimiento_id = $1 ORDER BY orden",
        [seguimiento.id]
      );
      seguimiento.etapas = etapasRes.rows;

      // Obtener avance de aberturas detallado
      const aberturasRes = await container.pool.query(
        `
        SELECT 
          aa.id as avance_id,
          aa.porcentaje_avance,
          aa.estado as estado_general,
          ab.numero,
          ab.cod_posicion,
          ab.ambiente,
          ab.cantidad,
          ab.ancho_mm,
          ab.largo_mm,
          ab.serie,
          ab.color,
          ab.tipo_vidrio
        FROM avance_aberturas aa
        JOIN aberturas_proyecto ab ON ab.id = aa.abertura_id
        WHERE aa.seguimiento_id = $1
        ORDER BY ab.numero, ab.cod_posicion
        `,
        [seguimiento.id]
      );

      const avancesAbertura = aberturasRes.rows;

      // Obtener todos los estados de las etapas para este seguimiento
      const etapasAberturaRes = await container.pool.query(
        `
        SELECT aea.* 
        FROM avance_etapas_abertura aea
        JOIN avance_aberturas aa ON aa.id = aea.avance_abertura_id
        WHERE aa.seguimiento_id = $1
        `,
        [seguimiento.id]
      );

      // Anidar los estados en las aberturas
      for (const aa of avancesAbertura) {
        aa.etapas_estado = etapasAberturaRes.rows.filter(e => e.avance_abertura_id === aa.avance_id);
      }

      seguimiento.avances_aberturas = avancesAbertura;

      response.json(seguimiento);
    } catch (error) {
      next(error);
    }
  }));

  // PATCH /api/admin/avance-etapas/:id
  router.patch("/avance-etapas/:id", withAvanceEtapaEditAccess(container.pool, async (request, response, next) => {
    try {
      const { estado } = request.body; // 'pendiente', 'en_proceso', 'completada'
      if (!['pendiente', 'en_proceso', 'completada'].includes(estado)) {
        return response.status(400).json({ error: "Estado inválido." });
      }

      // 1. Actualizar etapa
      const resEtapa = await container.pool.query(
        `
        UPDATE avance_etapas_abertura 
        SET estado = $1, actualizado_en = NOW() 
        WHERE id = $2 
        RETURNING avance_abertura_id
        `,
        [estado, request.params.id]
      );

      if (resEtapa.rows.length === 0) {
        return response.status(404).json({ error: "Avance de etapa no encontrado." });
      }

      const avanceAberturaId = resEtapa.rows[0].avance_abertura_id;

      // 2. Recalcular porcentaje de la abertura
      const resAbertura = await container.pool.query(
        `
        SELECT aea.estado 
        FROM avance_etapas_abertura aea
        WHERE aea.avance_abertura_id = $1
        `,
        [avanceAberturaId]
      );

      const totalEtapas = resAbertura.rows.length;
      const completadas = resAbertura.rows.filter(r => r.estado === 'completada').length;
      const pct = totalEtapas > 0 ? (completadas / totalEtapas) * 100 : 0;
      const estadoGeneral = pct === 100 ? 'completada' : (pct > 0 ? 'en_proceso' : 'pendiente');

      await container.pool.query(
        `
        UPDATE avance_aberturas
        SET porcentaje_avance = $1, estado = $2, actualizado_en = NOW()
        WHERE id = $3
        `,
        [pct, estadoGeneral, avanceAberturaId]
      );

      response.json({ mensaje: "Estado actualizado", nuevo_porcentaje: pct, nuevo_estado_general: estadoGeneral });
    } catch (error) {
      next(error);
    }
  }));

  // GET /api/admin/gantt/global
  router.get("/gantt/global", async (request, response, next) => {
    try {
      const result = await container.pool.query(`
        SELECT 
          o.id as proyecto_id, o.nombre as nombre_proyecto, o.cliente_id, 
          c.nombre as cliente_nombre, o.oferta_nro, o.serie, 
          o.total_aberturas, o.responsable, o.estado, o.semaforo,
          cp.fecha_limite_firma_abaco, cp.inicio_fabrica, 
          cp.fecha_compromiso_fin_produccion, cp.fecha_comprometida_inicio_instalacion, 
          cp.fin_instalacion
        FROM obras o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN cronogramas_proyecto cp ON o.id = cp.proyecto_id
        ORDER BY o.fecha_inicio DESC
      `);
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/gantt/global
  router.get("/gantt/global", async (request, response, next) => {
    try {
      const result = await container.pool.query(`
        SELECT 
          o.id as proyecto_id, o.nombre as nombre_proyecto, o.cliente_id, 
          c.nombre as cliente_nombre, o.oferta_nro, o.serie, 
          o.total_aberturas, o.responsable, o.estado, o.semaforo,
          cp.fecha_limite_firma_abaco, cp.inicio_fabrica, 
          cp.fecha_compromiso_fin_produccion, cp.fecha_comprometida_inicio_instalacion, 
          cp.fin_instalacion
        FROM obras o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN cronogramas_proyecto cp ON o.id = cp.proyecto_id
        ORDER BY o.fecha_inicio DESC
      `);
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
