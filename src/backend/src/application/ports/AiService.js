export class AiService {
  /**
   * Envía un mensaje al asistente y devuelve la respuesta.
   * @param {string} prompt El mensaje del usuario.
   * @param {Array<{role: string, content: string}>} context Contexto opcional de la conversación.
   * @returns {Promise<string>} La respuesta del asistente.
   */
  async ask(prompt, context = []) {
    throw new Error("Method not implemented.");
  }
}
