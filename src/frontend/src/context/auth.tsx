// Sesión mock de Fase 2: sin backend. El login elige un usuario demo
// y el menú de usuario permite "ver como" otro rol para recorrer los flujos.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/roles";
import { usuariosDemo, type Usuario } from "@/mocks/data";

interface AuthState {
  user: Usuario | null;
  login: (rol: Role) => void;
  logout: () => void;
  verComo: (rol: Role) => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "co-mock-rol";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => {
    const rol = sessionStorage.getItem(STORAGE_KEY) as Role | null;
    return rol ? usuariosDemo[rol] : null;
  });

  useEffect(() => {
    if (user) sessionStorage.setItem(STORAGE_KEY, user.role);
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = (rol: Role) => setUser(usuariosDemo[rol]);
  const logout = () => setUser(null);
  const verComo = (rol: Role) => setUser(usuariosDemo[rol]);

  return (
    <AuthContext.Provider value={{ user, login, logout, verComo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
