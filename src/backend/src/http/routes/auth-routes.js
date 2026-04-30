export function registerAuthRoutes(app, container) {
  app.post("/api/auth/login", async (request, response, next) => {
    try {
      const result = await container.loginUseCase.execute({
        username: request.body?.username,
        password: request.body?.password
      });

      if (!result.success) {
        response.status(400).json(result);
        return;
      }

      response.json(result);
    } catch (error) {
      next(error);
    }
  });
}
