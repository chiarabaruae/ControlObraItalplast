import OpenAI from "openai";
import { AiService } from "../../application/ports/AiService.js";

export class OpenAiAdapter extends AiService {
  constructor(apiKey) {
    super();
    if (!apiKey) {
      console.warn("OpenAI API Key no configurada. El servicio de IA no funcionará.");
    }
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async ask(prompt, context = []) {
    try {
      const messages = [
        { role: "system", content: "Eres un asistente virtual útil para una aplicación de Control de Avances de Obra." },
        ...context,
        { role: "user", content: prompt }
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // O gpt-4, dependiendo de la cuenta
        messages: messages,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error comunicándose con OpenAI:", error);
      throw new Error("No se pudo obtener una respuesta del asistente de IA.");
    }
  }
}
