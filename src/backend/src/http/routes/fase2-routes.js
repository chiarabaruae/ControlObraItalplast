// Rutas Fase 2 (/api/v2): esqueleto funcional del modelo vigente del frontend
// React. Espeja la matriz de permisos de src/frontend/src/lib/roles.ts y el
// esquema de migrations/015_fase2_modelo_seguimiento.sql.
//
// Estado: esqueleto parcial (D-027). Cubre catálogo de productos, reglas de
// planificación, proyectos (lectura/alta) y tareas de seguimiento (lectura,
// alta manual, edición, prioridad, completar/reabrir, borrado lógico).
// Pendiente: carga de presupuesto PDF, evidencias como archivo, transiciones
// de estado del tablero y generación de tareas desde el presupuesto.
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middlewares/require-auth.js";

// --- Permisos: misma matriz que el frontend (docs/flujo-roles.md) ---
const puede = {
  crearProyecto: (rol) => rol === "administrator" || rol === "supervisor",
  editarAvance: (rol) => rol === "administrator" || rol === "supervisor",
  crearTarea: (rol) => rol === "administrator" || rol === "supervisor",
  editarTarea: (rol) => rol === "administrator" || rol === "supervisor",
  eliminarTarea: (rol) => rol === "administrator" || rol === "supervisor",
  asignarTarea: (rol) => rol === "administrator" || rol === "supervisor",
  definirPrioridad: (rol) => rol === "administrator" || rol === "supervisor",
  verAuditoriaTareas: (rol) => rol === "administrator",
  gestionarReglasNegocio: (rol) => rol === "administrator"
};

function exigir(permiso) {
  return (request, response, next) => {
    if (!puede[permiso](request.user?.role)) {
      response.status(403).json({ error: "No autorizado para esta acción." });
      return;
    }
    next();
  };
}

function puedeAsignarA(rol, destino) {
  return rol === "administrator"
    ? destino === "supervisor" || destino === "viewer"
    : rol === "supervisor" && destino === "viewer";
}

async function validarResponsable(pool, request, responsableId) {
  if (responsableId === undefined || responsableId === null) return null;
  if (!puede.asignarTarea(request.user?.role)) {
    const error = new Error("No autorizado para asignar tareas.");
    error.status = 403;
    throw error;
  }
  const { rows } = await pool.query(
    `select id, role, is_active from app_users where id = $1`,
    [responsableId]
  );
  const destino = rows[0];
  if (!destino || !destino.is_active || !puedeAsignarA(request.user.role, destino.role)) {
    const error = new Error("El responsable elegido no está habilitado para este rol.");
    error.status = 403;
    throw error;
  }
  return destino;
}

export function createFase2Routes({ pool, env }) {
  const router = Router();
  router.use(requireAuth(env));

  // ==========================================================================
  // Catálogo de productos (D-025, editable para todos según D-029)
  // ==========================================================================
  const auditarCatalogo = (accion, valor, usuarioId, detalle) =>
    pool.query(
      `insert into catalogo_auditoria (accion, valor, usuario_id, detalle) values ($1, $2, $3, $4)`,
      [accion, valor, usuarioId ?? null, detalle ? JSON.stringify(detalle) : null]
    );

  router.get("/catalogo/productos", async (request, response, next) => {
    try {
      // ?todos=1 incluye los retirados (para administrar y resolver etiquetas históricas).
      const incluirInactivos = request.query.todos === "1";
      const { rows } = await pool.query(
        `select valor, label, nombre_corto, lleva_premarcos,
                lleva_fabricacion_premarcos, lleva_instalacion_premarcos, es_base, activo
           from catalogo_productos ${incluirInactivos ? "" : "where activo"}
          order by es_base desc, label`
      );
      response.json(rows);
    } catch (error) { next(error); }
  });

  router.post("/catalogo/productos", exigir("gestionarReglasNegocio"), async (request, response, next) => {
    try {
      const { valor, label, nombreCorto, llevaPremarcos } = request.body ?? {};
      if (!valor || !label) {
        response.status(400).json({ error: "valor y label son obligatorios." });
        return;
      }
      const { rows } = await pool.query(
        `insert into catalogo_productos (valor, label, nombre_corto, lleva_premarcos,
                                         lleva_fabricacion_premarcos, lleva_instalacion_premarcos)
         values ($1, $2, $3, coalesce($4, true), coalesce($4, true), coalesce($4, true))
         on conflict (valor) do nothing
         returning valor`,
        [valor, label, nombreCorto ?? null, llevaPremarcos]
      );
      if (rows.length === 0) {
        response.status(409).json({ error: "Ya existe un producto con ese slug." });
        return;
      }
      await auditarCatalogo("crear", valor, request.user.sub, { label });
      response.status(201).json({ valor });
    } catch (error) { next(error); }
  });

  // Edición para todos los productos, estándar incluidos (D-028): nombre y
  // disponibilidad de las etapas opcionales por grupo.
  router.patch("/catalogo/productos/:valor", exigir("gestionarReglasNegocio"), async (request, response, next) => {
    try {
      const { label, nombreCorto, llevaFabricacionPremarcos, llevaInstalacionPremarcos } = request.body ?? {};
      const { rowCount } = await pool.query(
        `update catalogo_productos
            set label = coalesce($2, label),
                nombre_corto = coalesce($3, nombre_corto),
                lleva_fabricacion_premarcos = coalesce($4, lleva_fabricacion_premarcos),
                lleva_instalacion_premarcos = coalesce($5, lleva_instalacion_premarcos),
                lleva_premarcos = coalesce($4, lleva_fabricacion_premarcos) or coalesce($5, lleva_instalacion_premarcos),
                actualizado_en = now()
          where valor = $1`,
        [request.params.valor, label ?? null, nombreCorto ?? null,
         llevaFabricacionPremarcos ?? null, llevaInstalacionPremarcos ?? null]
      );
      if (rowCount === 0) {
        response.status(404).json({ error: "Producto no encontrado." });
        return;
      }
      await auditarCatalogo("editar", request.params.valor, request.user.sub,
        { label, llevaFabricacionPremarcos, llevaInstalacionPremarcos });
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  // Baja lógica para todos: los proyectos existentes conservan la referencia.
  router.delete("/catalogo/productos/:valor", exigir("gestionarReglasNegocio"), async (request, response, next) => {
    try {
      const { rowCount } = await pool.query(
        `update catalogo_productos set activo = false, actualizado_en = now() where valor = $1`,
        [request.params.valor]
      );
      if (rowCount === 0) {
        response.status(404).json({ error: "Producto no encontrado." });
        return;
      }
      await auditarCatalogo("desactivar", request.params.valor, request.user.sub);
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.post("/catalogo/productos/:valor/reactivar", exigir("gestionarReglasNegocio"), async (request, response, next) => {
    try {
      const { rowCount } = await pool.query(
        `update catalogo_productos set activo = true, actualizado_en = now() where valor = $1`,
        [request.params.valor]
      );
      if (rowCount === 0) {
        response.status(404).json({ error: "Producto no encontrado." });
        return;
      }
      await auditarCatalogo("reactivar", request.params.valor, request.user.sub);
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  // ==========================================================================
  // Reglas de planificación backward (D-023)
  // ==========================================================================
  router.get("/reglas/planificacion", async (_request, response, next) => {
    try {
      const { rows } = await pool.query(
        `select dias_produccion_a_instalacion, dias_abaco_a_fabrica, dias_premarcos_a_abaco
           from reglas_planificacion where id = 1`
      );
      response.json(rows[0]);
    } catch (error) { next(error); }
  });

  router.put("/reglas/planificacion", exigir("gestionarReglasNegocio"), async (request, response, next) => {
    try {
      const { diasProduccionAInstalacion, diasAbacoAFabrica, diasPremarcosAAbaco } = request.body ?? {};
      const valores = [diasProduccionAInstalacion, diasAbacoAFabrica, diasPremarcosAAbaco];
      if (valores.some((valor) => !Number.isInteger(valor) || valor < 0)) {
        response.status(400).json({ error: "Las tres brechas deben ser enteros de 0 o más días." });
        return;
      }
      await pool.query(
        `update reglas_planificacion
            set dias_produccion_a_instalacion = $1,
                dias_abaco_a_fabrica = $2,
                dias_premarcos_a_abaco = $3,
                actualizado_en = now(),
                actualizado_por_id = $4
          where id = 1`,
        [...valores, request.user.sub ?? null]
      );
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  // ==========================================================================
  // Proyectos (lectura y alta; transiciones de estado pendientes)
  // ==========================================================================
  router.get("/proyectos", async (_request, response, next) => {
    try {
      const { rows } = await pool.query(
        `select p.id, p.nombre, p.estado, p.direccion, p.fecha_inicio, p.fecha_fin,
                p.cliente_id, p.lider_usuario_id,
                coalesce(t.total, 0) as tareas_totales,
                coalesce(t.completadas, 0) as tareas_completadas
           from proyectos p
           left join lateral (
             select count(*) as total,
                    count(*) filter (where completada) as completadas
               from tareas_seguimiento ts
              where ts.proyecto_id = p.id and ts.eliminada_en is null
           ) t on true
          order by p.creado_en desc`
      );
      response.json(rows);
    } catch (error) { next(error); }
  });

  router.get("/proyectos/:id", async (request, response, next) => {
    try {
      const [proyecto, productos, etapas, tareas] = await Promise.all([
        pool.query(`select * from proyectos where id = $1`, [request.params.id]),
        pool.query(`select * from proyecto_productos where proyecto_id = $1`, [request.params.id]),
        pool.query(`select * from proyecto_etapas where proyecto_id = $1 order by grupo, orden`, [request.params.id]),
        pool.query(
          `select * from tareas_seguimiento where proyecto_id = $1 and eliminada_en is null
            and ($2 in ('administrator','supervisor') or responsable_id = $3)
            order by fecha_fin nulls last`,
          [request.params.id, request.user.role, request.user.sub ?? null]
        )
      ]);
      if (proyecto.rows.length === 0) {
        response.status(404).json({ error: "Proyecto no encontrado." });
        return;
      }
      response.json({
        ...proyecto.rows[0],
        productos: productos.rows,
        etapas: etapas.rows,
        tareas: tareas.rows
      });
    } catch (error) { next(error); }
  });

  router.get("/tareas", async (request, response, next) => {
    try {
      const filtro = request.user.role === "viewer" ? "and ts.responsable_id = $1" : "";
      const params = request.user.role === "viewer" ? [request.user.sub] : [];
      const { rows } = await pool.query(
        `select ts.*, p.nombre as proyecto_nombre,
                responsable.display_name as responsable_nombre,
                asignador.display_name as asignada_por_nombre
           from tareas_seguimiento ts
           join proyectos p on p.id = ts.proyecto_id
           left join app_users responsable on responsable.id = ts.responsable_id
           left join app_users asignador on asignador.id = ts.asignada_por_id
          where ts.eliminada_en is null ${filtro}
          order by ts.fecha_fin nulls last`,
        params
      );
      response.json(rows);
    } catch (error) { next(error); }
  });

  router.post("/proyectos", exigir("crearProyecto"), async (request, response, next) => {
    const cliente = await pool.connect();
    try {
      const { nombre, clienteId, direccion, descripcion, liderUsuarioId, fechaInicio, fechaFin, productos } =
        request.body ?? {};
      if (!nombre || !Array.isArray(productos) || productos.length === 0) {
        response.status(400).json({ error: "nombre y al menos un producto son obligatorios." });
        return;
      }
      await cliente.query("begin");
      const proyectoId = randomUUID();
      await cliente.query(
        `insert into proyectos (id, nombre, cliente_id, direccion, descripcion, lider_usuario_id,
                                fecha_inicio, fecha_fin, creado_por_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [proyectoId, nombre, clienteId ?? null, direccion ?? null, descripcion ?? null,
         liderUsuarioId ?? null, fechaInicio ?? null, fechaFin ?? null, request.user.sub ?? null]
      );
      for (const producto of productos) {
        await cliente.query(
          `insert into proyecto_productos (proyecto_id, tipo_producto, fabricara_premarcos, instalara_premarcos,
                                           fecha_inicio_instalacion, dias_instalacion, dias_fabrica,
                                           dias_fabricacion_premarcos, dias_instalacion_premarcos)
           values ($1, $2, coalesce($3,false), coalesce($4,false), $5, $6, $7, $8, $9)`,
          [proyectoId, producto.tipo, producto.fabricaraPremarcos, producto.instalaraPremarcos,
           producto.fechaInicioInstalacion ?? null, producto.diasInstalacion ?? null,
           producto.diasFabrica ?? null, producto.diasFabricacionPremarcos ?? null,
           producto.diasInstalacionPremarcos ?? null]
        );
        for (const [grupo, etapas] of Object.entries(producto.etapas ?? {})) {
          for (const [orden, nombreEtapa] of etapas.entries()) {
            await cliente.query(
              `insert into proyecto_etapas (id, proyecto_id, tipo_producto, grupo, nombre, orden)
               values ($1, $2, $3, $4, $5, $6)`,
              [randomUUID(), proyectoId, producto.tipo, grupo, nombreEtapa, orden]
            );
          }
        }
      }
      await cliente.query("commit");
      response.status(201).json({ id: proyectoId });
    } catch (error) {
      await cliente.query("rollback");
      next(error);
    } finally {
      cliente.release();
    }
  });

  // ==========================================================================
  // Tareas de seguimiento (D-021/D-022/D-026)
  // ==========================================================================
  router.post("/proyectos/:id/tareas", exigir("crearTarea"), async (request, response, next) => {
    try {
      const { tipoProducto, grupo, titulo, itemId, fechaInicio, fechaFin, prioridad, responsableId } = request.body ?? {};
      if (!tipoProducto || !grupo || !titulo?.trim()) {
        response.status(400).json({ error: "tipoProducto, grupo y titulo son obligatorios." });
        return;
      }
      const responsable = await validarResponsable(pool, request, responsableId);
      const id = randomUUID();
      await pool.query(
        `insert into tareas_seguimiento (id, proyecto_id, item_id, tipo_producto, grupo, etapa, titulo,
                                         fecha_inicio, fecha_fin, manual, prioridad, creada_por_id,
                                         responsable_id, asignada_por_id, asignada_en)
         values ($1, $2, $3, $4, $5, 'Tarea agregada', $6, $7, $8, true, coalesce($9,'media'), $10,
                 $11, $12, case when $11 is null then null else now() end)`,
        [id, request.params.id, itemId ?? null, tipoProducto, grupo, titulo.trim(),
         fechaInicio ?? null, fechaFin ?? null, prioridad, request.user.sub ?? null,
         responsable?.id ?? null, request.user.sub ?? null]
      );
      if (responsable) {
        await pool.query(
          `insert into tarea_asignaciones (tarea_id, asignado_por_id, responsable_id, resumen)
           values ($1, $2, $3, $4)`,
          [id, request.user.sub ?? null, responsable.id, `Asignó la tarea a ${responsable.display_name}`]
        );
      }
      response.status(201).json({ id });
    } catch (error) { next(error); }
  });

  // Edición de nombre, componente, fechas y prioridad (sella auditoría, D-021).
  router.patch("/tareas/:id", exigir("editarTarea"), async (request, response, next) => {
    try {
      const { titulo, itemId, fechaInicio, fechaFin, prioridad, responsableId, resumen } = request.body ?? {};
      const cambiaResponsable = Object.prototype.hasOwnProperty.call(request.body ?? {}, "responsableId");
      const responsable = cambiaResponsable ? await validarResponsable(pool, request, responsableId) : null;
      const actual = await pool.query(
        `select responsable_id from tareas_seguimiento where id = $1 and eliminada_en is null`,
        [request.params.id]
      );
      if (actual.rows.length === 0) {
        response.status(404).json({ error: "Tarea no encontrada." });
        return;
      }
      const responsableCambio = cambiaResponsable && actual.rows[0].responsable_id !== (responsable?.id ?? null);
      const { rowCount } = await pool.query(
        `update tareas_seguimiento
            set titulo = coalesce($2, titulo),
                item_id = coalesce($3, item_id),
                fecha_inicio = coalesce($4, fecha_inicio),
                fecha_fin = coalesce($5, fecha_fin),
                prioridad = coalesce($6, prioridad),
                responsable_id = case when $8 then $7 else responsable_id end,
                asignada_por_id = case when $8 and $7 is not null then $9 else asignada_por_id end,
                asignada_en = case when $8 then case when $7 is null then null else now() end else asignada_en end,
                version = version + 1,
                modificada_en = now(),
                modificada_por_id = $9
          where id = $1 and eliminada_en is null`,
        [request.params.id, titulo ?? null, itemId ?? null, fechaInicio ?? null,
         fechaFin ?? null, prioridad ?? null, responsable?.id ?? null, cambiaResponsable,
         request.user.sub ?? null]
      );
      if (rowCount === 0) {
        response.status(404).json({ error: "Tarea no encontrada." });
        return;
      }
      await pool.query(
        `insert into tarea_modificaciones (tarea_id, usuario_id, resumen) values ($1, $2, $3)`,
        [request.params.id, request.user.sub ?? null, resumen ?? (responsableCambio ? "Cambió el responsable de la tarea" : "Editó nombre, fechas o prioridad de la tarea")]
      );
      if (responsableCambio) {
        await pool.query(
          `insert into tarea_asignaciones (tarea_id, asignado_por_id, responsable_id, resumen)
           values ($1, $2, $3, $4)`,
          [request.params.id, request.user.sub ?? null, responsable?.id ?? null,
           responsable ? `Asignó la tarea a ${responsable.display_name}` : "Quitó la asignación de la tarea"]
        );
      }
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  // Completar: exige evidencia previa registrada (columna evidencia_id).
  router.post("/tareas/:id/completar", exigir("editarAvance"), async (request, response, next) => {
    try {
      const { evidenciaId, observaciones } = request.body ?? {};
      if (!evidenciaId) {
        response.status(400).json({ error: "Completar exige una evidencia (evidenciaId)." });
        return;
      }
      const { rowCount } = await pool.query(
        `update tareas_seguimiento
            set completada = true, completada_en = now(), completada_por_id = $2,
                evidencia_id = $3, observaciones = $4,
                version = version + 1, modificada_en = now(), modificada_por_id = $2
          where id = $1 and eliminada_en is null and not completada`,
        [request.params.id, request.user.sub ?? null, evidenciaId, observaciones ?? null]
      );
      if (rowCount === 0) {
        response.status(409).json({ error: "Tarea inexistente o ya completada." });
        return;
      }
      await pool.query(
        `insert into tarea_modificaciones (tarea_id, usuario_id, resumen) values ($1, $2, 'Completó la tarea')`,
        [request.params.id, request.user.sub ?? null]
      );
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  // Reabrir: motivo obligatorio para todos los roles (D-021).
  router.post("/tareas/:id/reabrir", async (request, response, next) => {
    try {
      const tareaActual = await pool.query(
        `select responsable_id from tareas_seguimiento where id = $1 and eliminada_en is null`,
        [request.params.id]
      );
      if (tareaActual.rows.length === 0) {
        response.status(404).json({ error: "Tarea no encontrada." });
        return;
      }
      const esAdminOSupervisor = request.user.role === "administrator" || request.user.role === "supervisor";
      const esResponsable = tareaActual.rows[0].responsable_id && tareaActual.rows[0].responsable_id === request.user.sub;
      if (!esAdminOSupervisor && !esResponsable) {
        response.status(403).json({ error: "Solo el responsable o administración puede reabrir esta tarea." });
        return;
      }
      const { motivo } = request.body ?? {};
      if (!motivo?.trim()) {
        response.status(400).json({ error: "Reabrir exige un motivo obligatorio." });
        return;
      }
      const { rowCount } = await pool.query(
        `update tareas_seguimiento
            set completada = false, completada_en = null, completada_por_id = null,
                evidencia_id = null, observaciones = null,
                version = version + 1, modificada_en = now(), modificada_por_id = $2
          where id = $1 and eliminada_en is null and completada`,
        [request.params.id, request.user.sub ?? null]
      );
      if (rowCount === 0) {
        response.status(409).json({ error: "Tarea inexistente o no completada." });
        return;
      }
      await pool.query(
        `insert into tarea_reaperturas (tarea_id, usuario_id, motivo) values ($1, $2, $3)`,
        [request.params.id, request.user.sub ?? null, motivo.trim()]
      );
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.get("/tareas/archivadas", exigir("verAuditoriaTareas"), async (_request, response, next) => {
    try {
      const { rows } = await pool.query(
        `select ts.*, p.nombre as proyecto_nombre,
                responsable.display_name as responsable_nombre,
                archivador.display_name as eliminada_por_nombre
           from tareas_seguimiento ts
           join proyectos p on p.id = ts.proyecto_id
           left join app_users responsable on responsable.id = ts.responsable_id
           left join app_users archivador on archivador.id = ts.eliminada_por_id
          where ts.eliminada_en is not null
          order by ts.eliminada_en desc`
      );
      response.json(rows);
    } catch (error) { next(error); }
  });

  // Borrado lógico (D-021): la tarea queda auditada, ninguna vista la muestra.
  router.delete("/tareas/:id", exigir("eliminarTarea"), async (request, response, next) => {
    try {
      const { rowCount } = await pool.query(
        `update tareas_seguimiento
            set eliminada_en = now(), eliminada_por_id = $2
          where id = $1 and eliminada_en is null`,
        [request.params.id, request.user.sub ?? null]
      );
      if (rowCount === 0) {
        response.status(404).json({ error: "Tarea no encontrada." });
        return;
      }
      await pool.query(
        `insert into tarea_modificaciones (tarea_id, usuario_id, resumen) values ($1, $2, 'Archivó la tarea')`,
        [request.params.id, request.user.sub ?? null]
      );
      response.json({ ok: true });
    } catch (error) { next(error); }
  });

  return router;
}
