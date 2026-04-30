import { USER_ROLES } from "./user-role.js";

export function createUser({
  id,
  username,
  displayName,
  role,
  passwordHash,
  isActive = true
}) {
  if (!id) {
    throw new Error("El identificador del usuario es obligatorio.");
  }

  if (!username || !username.trim()) {
    throw new Error("El usuario es obligatorio.");
  }

  if (!displayName || !displayName.trim()) {
    throw new Error("El nombre visible es obligatorio.");
  }

  if (!Object.values(USER_ROLES).includes(role)) {
    throw new Error("El rol del usuario no es valido.");
  }

  if (!passwordHash) {
    throw new Error("El hash de contrasena es obligatorio.");
  }

  return Object.freeze({
    id,
    username: username.trim(),
    displayName: displayName.trim(),
    role,
    passwordHash,
    isActive: Boolean(isActive)
  });
}
