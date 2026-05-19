import jwt from "jsonwebtoken";

export function requireAuth(env) {
  return (request, response, next) => {
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      response.status(401).json({ error: "Sesion requerida." });
      return;
    }

    try {
      request.user = jwt.verify(token, env.jwtSecret);
      next();
    } catch {
      response.status(401).json({ error: "Sesion invalida." });
    }
  };
}
