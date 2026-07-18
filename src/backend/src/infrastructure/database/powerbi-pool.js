import mysql from "mysql2/promise";

function parseMysqlUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname.replace(/^\//, "") || undefined
    };
  } catch {
    return null;
  }
}

export function createPowerbiPool(env) {
  const byUrl = parseMysqlUrl(env.powerbiDatabaseUrl);
  const host = byUrl?.host || env.powerbiDbHost;
  const user = byUrl?.user || env.powerbiDbUser;
  const database = byUrl?.database || env.powerbiDbName;

  if (!host || !user || !database) {
    return null;
  }

  return mysql.createPool({
    host,
    port: byUrl?.port || env.powerbiDbPort || 3306,
    user,
    password: byUrl?.password || env.powerbiDbPassword,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    ssl: env.powerbiDbSsl ? { rejectUnauthorized: false } : undefined
  });
}
