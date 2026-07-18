export function canAccessProjectWorkspace(role) {
  return role === "administrator" || role === "supervisor";
}

