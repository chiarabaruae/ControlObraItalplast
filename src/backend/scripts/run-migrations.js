import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/shared/config/env.js";
import { createPostgresPool } from "../src/infrastructure/postgres/postgres-pool.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const migrationsDirectory = path.resolve(currentDirectory, "../migrations");

const env = loadEnv();
const pool = createPostgresPool(env);

async function run() {
  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  for (const file of files) {
    const alreadyApplied = await pool.query(
      "select filename from schema_migrations where filename = $1",
      [file]
    );

    if (alreadyApplied.rowCount > 0) {
      console.log(`Saltando migracion ya aplicada: ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");

    await pool.query("begin");
    try {
      await pool.query(sql);
      await pool.query("insert into schema_migrations (filename) values ($1)", [file]);
      await pool.query("commit");
      console.log(`Migracion aplicada: ${file}`);
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
