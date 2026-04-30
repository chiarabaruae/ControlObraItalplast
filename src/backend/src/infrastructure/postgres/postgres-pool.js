import pg from "pg";

export function createPostgresPool(env) {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL es obligatorio para conectar con PostgreSQL.");
  }

  return new pg.Pool({
    connectionString: env.databaseUrl
  });
}
