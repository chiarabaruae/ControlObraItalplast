import { requireAuth } from "./require-auth.js";

export function requireAdmin(env) {
  const auth = requireAuth(env);

  return (request, response, next) => {
    auth(request, response, () => {
      if (request.user.role !== "administrator") {
        response.status(403).json({ error: "Acceso solo para Admin." });
        return;
      }

      next();
    });
  };
}
