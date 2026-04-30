export function registerHealthRoutes(app) {
  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });
}
