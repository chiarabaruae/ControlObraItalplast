import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import pg from "pg";
import { loadEnv } from "../src/shared/config/env.js";

const { Pool } = pg;
const env = loadEnv();
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");

async function parseTsv(filename) {
  try {
    const filePath = path.join(dataDir, filename);
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split("\t").map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split("\t");
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || null;
      });
      data.push(row);
    }
    return data;
  } catch (error) {
    console.warn(`No se pudo leer ${filename}: ${error.message}`);
    return [];
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // asumiendo formato DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

async function run() {
  const client = await pool.connect();
  try {
    console.log("Iniciando importación de datos Gantt...");
    await client.query("BEGIN");

    // 1. Leer nifo6.txt (Cronogramas)
    const nifo6 = await parseTsv("nifo6.txt");
    
    for (const row of nifo6) {
      const clienteNombre = row["Cliente"] || "CLIENTE DESCONOCIDO";
      
      // Buscar o crear cliente
      let resCliente = await client.query("SELECT id FROM clientes WHERE nombre = $1", [clienteNombre]);
      let clienteId;
      if (resCliente.rows.length === 0) {
        clienteId = crypto.randomUUID();
        await client.query(
          "INSERT INTO clientes (id, nombre) VALUES ($1, $2)",
          [clienteId, clienteNombre]
        );
      } else {
        clienteId = resCliente.rows[0].id;
      }

      // Crear Obra/Proyecto
      const getField = (row, startStr) => {
        const key = Object.keys(row).find(k => k.startsWith(startStr));
        return key ? row[key] : null;
      };
      const obraNombre = row["Nombre del proyecto"] || `Proyecto ${row["Oferta_Nro"] || 'S/N'}`;
      const obraId = crypto.randomUUID();
      const inicioFabrica = parseDate(getField(row, "Inicio f")) || new Date().toISOString().split('T')[0];
      const finInstalacion = parseDate(getField(row, "Fin instalaci")) || new Date(new Date(inicioFabrica).getTime() + 90*24*60*60*1000).toISOString().split('T')[0];
      
      await client.query(
        `INSERT INTO obras (id, nombre, cliente_id, oferta_nro, serie, total_aberturas, responsable, estado, semaforo, fecha_inicio, fecha_fin_estimada) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          obraId,
          obraNombre, 
          clienteId, 
          row["Oferta_Nro"], 
          row["Serie"], 
          parseInt(row["Total Aberturas"]) || 0,
          row["Líder del proyecto"] || row["Lder del proyecto"],
          'planificada',
          'verde',
          inicioFabrica,
          finInstalacion
        ]
      );

      await client.query(
        `INSERT INTO cronogramas_proyecto (
          proyecto_id, dias_fabrica, fecha_limite_firma_abaco, inicio_fabrica, 
          fecha_compromiso_fin_produccion, fecha_comprometida_inicio_instalacion, 
          dias_instalacion, fin_instalacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          obraId,
          parseInt(getField(row, "Das f")) || parseInt(row["Días fábrica"]) || 0,
          parseDate(getField(row, "Fecha lmite")),
          parseDate(getField(row, "Inicio f")),
          parseDate(getField(row, "Fecha compromiso")),
          parseDate(getField(row, "Fecha Comprometida")),
          parseInt(getField(row, "Das instalaci")) || 0,
          parseDate(getField(row, "Fin instalaci"))
        ]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Importación completada con éxito.");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error importando datos:", error);
  } finally {
    client.release();
    pool.end();
  }
}

run();
