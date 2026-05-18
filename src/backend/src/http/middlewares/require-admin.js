import jwt from "jsonwebtoken";

export function requireAdmin(env) {
  return (request, response, next) => {
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      response.status(401).json({ error: "Sesion requerida." });
      return;
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret);

      if (payload.role !== "administrator") {
        response.status(403).json({ error: "Acceso solo para Admin." });
        return;
      }

      request.user = payload;
      next();
    } catch {
      response.status(401).json({ error: "Sesion invalida." });
    }
  };
}
