import bcrypt from "bcryptjs";
import { PasswordVerifier } from "../../application/auth/ports/password-verifier.js";

export class BcryptPasswordVerifier extends PasswordVerifier {
  async verify(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }
}
