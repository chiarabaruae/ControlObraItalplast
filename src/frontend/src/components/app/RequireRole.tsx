import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/context/auth";
import type { Role } from "@/lib/roles";

// Guarda de ruta: sin sesión → login; sin rol permitido → dashboard.
export function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // El rol TI (soporte/desarrollo) accede a todas las rutas.
  if (user.role !== "ti" && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
