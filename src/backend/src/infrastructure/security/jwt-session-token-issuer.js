import jwt from "jsonwebtoken";
import { SessionTokenIssuer } from "../../application/auth/ports/session-token-issuer.js";

export class JwtSessionTokenIssuer extends SessionTokenIssuer {
  constructor({ secret, expiresIn }) {
    super();
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  async issue(user) {
    if (!this.secret) {
      throw new Error("JWT_SECRET es obligatorio para emitir sesiones.");
    }

    return jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role
      },
      this.secret,
      {
        expiresIn: this.expiresIn
      }
    );
  }
}
