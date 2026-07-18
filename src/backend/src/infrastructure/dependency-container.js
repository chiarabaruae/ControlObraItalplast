import { LoginUseCase } from "../application/auth/login-use-case.js";
import { createLocalPool } from "./database/local-pool.js";
import { createPowerbiPool } from "./database/powerbi-pool.js";
import { PostgresUserRepository } from "./users/postgres-user-repository.js";
import { BcryptPasswordVerifier } from "./security/bcrypt-password-verifier.js";
import { JwtSessionTokenIssuer } from "./security/jwt-session-token-issuer.js";
import { OpenAiAdapter } from "./ai/OpenAiAdapter.js";

export function createContainer(env) {
  const localPool = createLocalPool(env);
  const powerbiPool = createPowerbiPool(env);
  const userRepository = new PostgresUserRepository({ pool: localPool });
  const passwordVerifier = new BcryptPasswordVerifier();
  const sessionTokenIssuer = new JwtSessionTokenIssuer({
    secret: env.jwtSecret,
    expiresIn: env.jwtExpiresIn
  });
  const aiService = new OpenAiAdapter(env.openaiApiKey);

  return {
    env,
    pool: localPool,
    localPool,
    powerbiPool,
    loginUseCase: new LoginUseCase({
      userRepository,
      passwordVerifier,
      sessionTokenIssuer
    }),
    aiService
  };
}
