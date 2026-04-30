import { LoginUseCase } from "../application/auth/login-use-case.js";
import { createPostgresPool } from "./postgres/postgres-pool.js";
import { PostgresUserRepository } from "./users/postgres-user-repository.js";
import { BcryptPasswordVerifier } from "./security/bcrypt-password-verifier.js";
import { JwtSessionTokenIssuer } from "./security/jwt-session-token-issuer.js";

export function createContainer(env) {
  const pool = createPostgresPool(env);
  const userRepository = new PostgresUserRepository({ pool });
  const passwordVerifier = new BcryptPasswordVerifier();
  const sessionTokenIssuer = new JwtSessionTokenIssuer({
    secret: env.jwtSecret,
    expiresIn: env.jwtExpiresIn
  });

  return {
    loginUseCase: new LoginUseCase({
      userRepository,
      passwordVerifier,
      sessionTokenIssuer
    })
  };
}
