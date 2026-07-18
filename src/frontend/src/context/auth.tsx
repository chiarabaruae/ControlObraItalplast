// Sesión mock de Fase 2. El backend reemplazará esta validación en la Fase 4.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usuarios, type Usuario } from "@/mocks/data";

export type SessionUser = Usuario & { avatar?: string };

type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

interface AuthState {
  user: SessionUser | null;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  updateAvatar: (avatar?: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

const SESSION_KEY = "co-session-user";
const avatarKey = (userId: string) => `co-avatar-${userId}`;

function withSavedAvatar(user: Usuario): SessionUser {
  return { ...user, avatar: localStorage.getItem(avatarKey(user.id)) ?? undefined };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const userId = sessionStorage.getItem(SESSION_KEY);
    const savedUser = usuarios.find((candidate) => candidate.id === userId && candidate.isActive);
    return savedUser ? withSavedAvatar(savedUser) : null;
  });

  useEffect(() => {
    if (user) sessionStorage.setItem(SESSION_KEY, user.id);
    else sessionStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = (username: string, password: string): LoginResult => {
    const normalizedUsername = username.trim();
    const account = usuarios.find((candidate) => candidate.username === normalizedUsername);

    if (!account) return { ok: false, error: "No encontramos una cuenta con ese usuario." };
    if (!account.isActive) return { ok: false, error: "Esta cuenta se encuentra inactiva. Contactá a soporte." };
    if (password.trim().length < 4) return { ok: false, error: "Ingresá una contraseña válida." };

    setUser(withSavedAvatar(account));
    return { ok: true };
  };

  const logout = () => setUser(null);

  const updateAvatar = (avatar?: string) => {
    if (!user) return;
    if (avatar) localStorage.setItem(avatarKey(user.id), avatar);
    else localStorage.removeItem(avatarKey(user.id));
    setUser({ ...user, avatar });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
