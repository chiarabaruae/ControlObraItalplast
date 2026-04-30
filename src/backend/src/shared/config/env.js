import dotenv from "dotenv";

dotenv.config();

export function loadEnv() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
  };
}
