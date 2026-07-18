import { Router } from "express";
import multer from "multer";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import * as xlsx from "xlsx";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../middlewares/require-admin.js";

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

export function createProyectosRoutes(container) {
  const router = Router();
  const auth = requireAdmin(container.env);
  router.use(auth);

  // POST /api/admin/obras/:id/documentos/oferta
  router.post("/obras/:id/documentos/oferta", upload.single("archivo"), async (request, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ error: "No se proporcionó un archivo PDF." });
      }

      const { id: proyectoId } = request.params;
      const fileBuffer = request.file.buffer;
      const fileName = request.file.originalname;

      // 1. Guardar registro del documento
      const docId = randomUUID();
      await container.pool.query(
        `
        INSERT INTO documentos_proyecto (id, proyecto_id, tipo_documento, nombre_archivo, mime_type, estado_procesamiento)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [docId, proyectoId, "oferta_pdf", fileName, request.file.mimetype, "pendiente"]
      );

      // 2. Procesar el PDF y extraer texto
      let pdfData;
      try {
        pdfData = await pdfParse(fileBuffer);
      } catch (err) {
        await container.pool.query(
          "UPDATE documentos_proyecto SET estado_procesamiento = 'error' WHERE id = $1",
          [docId]
        );
        return response.status(500).json({ error: "Error al leer el PDF." });
      }

      const text = pdfData.text;

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
  });

  // POST /api/admin/obras/:id/cronograma
  router.post("/obras/:id/cronograma", async (request, response, next) => {
    try {
      const body = request.body || {};
      const proyectoId = request.params.id;

      // Leer campos manuales
      const fechaInicioInstalacionStr = body.fecha_comprometida_inicio_instalacion;
      if (!fechaInicioInstalacionStr) {
        return response.status(400).json({ error: "La Fecha comprometida de inicio de instalación es obligatoria." });
      }

      const fechaBase = new Date(fechaInicioInstalacionStr + "T12:00:00");
      const diasFabrica = parseInt(body.dias_fabrica, 10) || 15;
      const diasInstalacion = parseInt(body.dias_instalacion, 10) || 5;

      // 1. Fecha compromiso fin producción = Fecha inicio instalación - 3 hábiles
      const finProduccion = addBusinessDays(fechaBase, -3);

      // 2. Inicio fábrica = Fin producción - días fábrica hábiles
      const inicioFabrica = addBusinessDays(finProduccion, -diasFabrica);

      // 3. Límite firma ábaco = Inicio fábrica - 1 hábil
      const limiteAbaco = addBusinessDays(inicioFabrica, -1);

      // 4. Fin instalación = Fecha inicio instalación + días instalación hábiles - 1
      const finInstalacion = addBusinessDays(fechaBase, diasInstalacion - 1);

      const cronogramaId = randomUUID();

      await container.pool.query(
        `
        INSERT INTO cronogramas_proyecto (
          id, proyecto_id, documento_oferta_id, oferta_nro, cliente, nombre_proyecto, 
          lider_proyecto, serie, total_aberturas, dias_fabrica, fecha_limite_firma_abaco, 
          inicio_fabrica, fecha_compromiso_fin_produccion, fecha_comprometida_inicio_instalacion, 
          dias_instalacion, fin_instalacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
        [
          cronogramaId,
          proyectoId,
          body.documento_oferta_id || null,
          body.oferta_nro || null,
          body.cliente || null,
          body.nombre_proyecto || null,
          body.lider_proyecto || null,
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
  });

  // GET /api/admin/obras/:id/cronograma
  router.get("/obras/:id/cronograma", async (request, response, next) => {
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
  });

  // POST /api/admin/obras/:id/documentos/abaco
  router.post("/obras/:id/documentos/abaco", upload.single("archivo"), async (request, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ error: "No se proporcionó un archivo de ábaco (Excel/CSV)." });
      }

      const { id: proyectoId } = request.params;
      const fileBuffer = request.file.buffer;
      const fileName = request.file.originalname;

      // Guardar documento
      const docId = randomUUID();
      await container.pool.query(
        `
        INSERT INTO documentos_proyecto (id, proyecto_id, tipo_documento, nombre_archivo, mime_type, estado_procesamiento)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [docId, proyectoId, "abaco_lista", fileName, request.file.mimetype, "pendiente"]
      );

      // Procesar archivo Excel
      let aberturas = [];
      try {
        const workbook = xlsx.read(fileBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

        // Mapear campos. Depende de cómo venga el excel, se buscan palabras clave.
        for (const row of data) {
          // Extraer valores con llaves parecidas (ignorar case/espacios si es posible)
          const getVal = (keys) => {
            const foundKey = Object.keys(row).find(k => keys.some(kw => k.toLowerCase().includes(kw)));
            return foundKey ? row[foundKey] : null;
          };

          const numero = parseInt(getVal(["nro", "numero", "número"]) || 0, 10);
          const codPosicion = getVal(["cod", "pos", "posición", "posicion"]);
          const ambiente = getVal(["amb", "ambiente", "ubicación", "ubicacion"]);
          const cantidad = parseInt(getVal(["cant", "cantidad"]) || 1, 10);
          const ancho = parseFloat(getVal(["ancho", "anchura"]) || 0);
          const largo = parseFloat(getVal(["largo", "alto", "altura"]) || 0);
          const serie = getVal(["serie", "linea", "línea"]);
          const color = getVal(["color", "terminacion", "terminación"]);
          const tipoVidrio = getVal(["vidrio", "cristal"]);
          const obs = getVal(["obs", "comentario"]);

          // Solo agregar si tiene algún identificador (numero o cod)
          if (numero || codPosicion) {
            aberturas.push({
              numero,
              codPosicion: String(codPosicion || numero),
              ambiente: String(ambiente || ""),
              cantidad,
              ancho,
              largo,
              serie: String(serie || ""),
              color: String(color || ""),
              tipoVidrio: String(tipoVidrio || ""),
              observaciones: String(obs || "")
            });
          }
        }

      } catch (err) {
        await container.pool.query(
          "UPDATE documentos_proyecto SET estado_procesamiento = 'error' WHERE id = $1",
          [docId]
        );
        return response.status(500).json({ error: "Error al procesar el archivo Excel/CSV." });
      }

      // Guardar aberturas en la base de datos
      if (aberturas.length > 0) {
        const client = await container.pool.connect();
        try {
          await client.query("BEGIN");
          
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
                ab.cantidad, ab.ancho, ab.largo, ab.serie, ab.color, ab.tipoVidrio, ab.observaciones
              ]
            );
          }

          await client.query(
            "UPDATE documentos_proyecto SET estado_procesamiento = 'procesado' WHERE id = $1",
            [docId]
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
        return response.status(400).json({ error: "El archivo no contiene filas válidas de aberturas." });
      }

      response.status(200).json({ 
        mensaje: "Ábaco procesado correctamente", 
        documento_id: docId,
        total_aberturas: aberturas.length
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/obras/:id/aberturas
  router.get("/obras/:id/aberturas", async (request, response, next) => {
    try {
      const result = await container.pool.query(
        "SELECT * FROM aberturas_proyecto WHERE proyecto_id = $1 ORDER BY numero, cod_posicion",
        [request.params.id]
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

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
  router.post("/obras/:id/seguimiento/:tipo", async (request, response, next) => {
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
  });

  // GET /api/admin/obras/:id/seguimiento/:tipo
  router.get("/obras/:id/seguimiento/:tipo", async (request, response, next) => {
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
  });

  // PATCH /api/admin/avance-etapas/:id
  router.patch("/avance-etapas/:id", async (request, response, next) => {
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
