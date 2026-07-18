import { createLocalPool } from "../database/local-pool.js";

export function createPostgresPool(env) {
  return createLocalPool(env);
}
