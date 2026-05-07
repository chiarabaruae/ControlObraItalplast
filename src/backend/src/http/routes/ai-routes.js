import { Router } from "express";

export function createAiRoutes(aiService) {
  const router = Router();

  router.post("/chat", async (req, res) => {
    try {
      const { prompt, context } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "El prompt es requerido" });
      }

      // El adaptador llamará a OpenAI
      const respuesta = await aiService.ask(prompt, context || []);

      res.json({ respuesta });
    } catch (error) {
      console.error("Error en la ruta /chat:", error);
      res.status(500).json({ error: "Ocurrió un error al procesar la solicitud de IA" });
    }
  });

  return router;
}
