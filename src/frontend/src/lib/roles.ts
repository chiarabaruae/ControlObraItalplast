// Matriz de permisos por rol — fuente: docs/flujo-roles.md (Fase 1)
// Los botones que un rol no puede usar NO se muestran (no se deshabilitan).

export type Role = "ti" | "administrator" | "supervisor" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  ti: "TI · Soporte",
  administrator: "Administrador",
  supervisor: "Supervisor",
  viewer: "Usuario"
};

// Chequeos base por rol. El rol TI (soporte y desarrollo) tiene acceso total:
// el proxy de más abajo hace que cualquier permiso devuelva true cuando el rol es "ti".
const reglasPermisos = {
  // Navegación
  verClientes: (r: Role) => r === "administrator" || r === "supervisor",
  verUsuarios: (r: Role) => r === "administrator",

  // Clientes
  gestionarClientes: (r: Role) => r === "administrator",

  // Proyectos
  crearProyecto: (r: Role) => r === "administrator" || r === "supervisor",
  editarProyecto: (r: Role) => r === "administrator",
  eliminarProyecto: (r: Role) => r === "administrator",
  subirOferta: (r: Role) => r === "administrator",
  // Gestionar el presupuesto ejecutivo quedó como acción de Administrador; un
  // supervisor puede recibirla puntualmente vía permisos por acción (excepción).
  gestionarPresupuesto: (r: Role) => r === "administrator",
  generarSeguimiento: (r: Role) => r === "administrator" || r === "supervisor",
  editarAvance: (r: Role) => r === "administrator" || r === "supervisor",
  cambiarEstadoProyecto: (r: Role) => r === "administrator" || r === "supervisor",
  cancelarProyecto: (r: Role) => r === "administrator",
  reabrirProyecto: (r: Role) => r === "administrator",
  comentarObra: (r: Role) => r === "administrator" || r === "supervisor",

  // Tareas
  crearTarea: (r: Role) => r === "administrator" || r === "supervisor",
  editarTarea: (r: Role) => r === "administrator" || r === "supervisor",
  // Administración y supervisión pueden retirar una tarea. El retiro es
  // lógico y queda visible en el archivo de auditoría solo para admin.
  eliminarTarea: (r: Role) => r === "administrator" || r === "supervisor",
  asignarTarea: (r: Role) => r === "administrator" || r === "supervisor",
  puedeAsignarA: (r: Role, destino: Role) =>
    r === "administrator"
      ? destino === "supervisor" || destino === "viewer"
      : r === "supervisor" && destino === "viewer",
  // La prioridad de una tarea solo la determinan administradores y supervisores.
  definirPrioridadTarea: (r: Role) => r === "administrator" || r === "supervisor",
  // Columnas de auditoría (creación / modificaciones): solo administradores.
  verAuditoriaTareas: (r: Role) => r === "administrator",
  completarTarea: (r: Role, esPropia: boolean) =>
    r === "administrator" || r === "supervisor" || esPropia,

  // Usuarios
  gestionarUsuarios: (r: Role) => r === "administrator",

  // Tareas genéricas del proyecto (D-030): vista y edición solo para
  // administración y supervisión; el rol Usuario no accede ni a la lectura.
  verTareasGeneralesProyecto: (r: Role) => r === "administrator" || r === "supervisor",

  // Reglas y catálogo: brechas backward y catálogo de productos, solo administradores.
  configurarPlanificacion: (r: Role) => r === "administrator",
  gestionarReglasNegocio: (r: Role) => r === "administrator"
};

type ReglasPermisos = typeof reglasPermisos;

// El rol TI es omnipotente: cualquier permiso devuelve true si el primer
// argumento (el rol) es "ti", sin tener que repetirlo en cada regla.
export const permisos: ReglasPermisos = new Proxy(reglasPermisos, {
  get(target, prop) {
    const fn = Reflect.get(target, prop);
    if (typeof fn !== "function") return fn;
    return (...args: unknown[]) =>
      args[0] === "ti" ? true : (fn as (...a: unknown[]) => boolean)(...args);
  }
}) as ReglasPermisos;
