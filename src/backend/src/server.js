import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./shared/config/env.js";
import { createContainer } from "./infrastructure/dependency-container.js";
import { registerAuthRoutes } from "./http/routes/auth-routes.js";
import { registerHealthRoutes } from "./http/routes/health-routes.js";
import { errorHandler } from "./http/middlewares/error-handler.js";

const env = loadEnv();
const container = createContainer(env);
const app = express();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const frontendPath = path.resolve(currentDirectory, "../../frontend");

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

registerHealthRoutes(app);
registerAuthRoutes(app, container);

app.use(express.static(frontendPath));
app.get("/", (_request, response) => {
  response.sendFile(path.join(frontendPath, "index.html"));
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Control Obra API escuchando en http://localhost:${env.port}`);
});
