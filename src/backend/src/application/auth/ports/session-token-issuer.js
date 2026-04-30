export class SessionTokenIssuer {
  async issue() {
    throw new Error("SessionTokenIssuer.issue debe ser implementado por infraestructura.");
  }
}
