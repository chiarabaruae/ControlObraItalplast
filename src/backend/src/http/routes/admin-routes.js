import { Router } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-admin.js";
import { USER_ROLES } from "../../domain/users/user-role.js";

const estadosObra = ["pendiente_de_planificacion", "planificada", "en_progreso", "pausada", "finalizada", "cancelada"];
const estadosTarea = ["pendiente", "en_progreso", "bloqueada", "finalizada"];
const prioridades = ["baja", "media", "alta", "urgente"];
const rolesUsuario = Object.values(USER_ROLES);
const SALT_ROUNDS = 10;

export function createAdminRoutes(container) {
  const router = Router();
  const auth = requireAuth(container.env);
  const admin = requireAdmin(container.env);

  router.use(auth);

  router.get("/dashboard", async (_request, response, next) => {
    try {
      const result = await container.pool.query(`
        select
          (select count(*)::int from clientes) as clientes,
          (select count(*)::int from obras) as obras,
          (select count(*)::int from obras where estado = 'en_progreso') as obras_en_progreso,
          (select count(*)::int from tareas_obra) as tareas,
          (select count(*)::int from tareas_obra where estado = 'finalizada') as tareas_finalizadas,
          coalesce((select round(avg(avance), 2)::float from obras), 0) as avance_promedio
      `);

      const estados = await container.pool.query(`
        select estado, count(*)::int as total
        from obras
        group by estado
        order by estado
      `);

      response.json({ resumen: result.rows[0], estados: estados.rows });
    } catch (error) {
      next(error);
    }
  });

  router.get("/gantt", async (request, response, next) => {
    try {
      const obraId = request.query.obraId;
      const params = [];
      let where = "";

      if (obraId) {
        params.push(obraId);
        where = "where t.obra_id = $1";
      }

      const result = await container.pool.query(
        `
          select
            t.id,
            t.obra_id,
            o.nombre as obra_nombre,
            t.titulo,
            t.responsable,
            t.fecha_inicio,
            t.fecha_fin,
            t.estado,
            t.prioridad,
            t.avance
          from tareas_obra t
          join obras o on o.id = t.obra_id
          ${where}
          order by t.fecha_inicio asc, t.orden asc, t.created_at asc
        `,
        params
      );

      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  registerClientes(router, container, admin);
  registerObras(router, container.pool, admin);
  registerTareas(router, container.pool, admin);
  registerUsuarios(router, container.pool, admin);

  return router;
}

function registerUsuarios(router, pool, admin) {
  router.get("/usuarios", admin, async (_request, response, next) => {
    try {
      const result = await pool.query(`
        select
          id,
          username,
          display_name,
          role,
          is_active,
          created_at,
          updated_at
        from app_users
        order by is_active desc, display_name asc
      `);

      const activeCount = result.rows.filter((user) => user.is_active).length;
      response.json({ activeCount, users: result.rows });
    } catch (error) {
      next(error);
    }
  });

  // Listado ligero para asignaciones (solo activos). Admin-only por requerimiento.
  router.get("/usuarios/activos", admin, async (_request, response, next) => {
    try {
      const result = await pool.query(
        `
          select id, username, display_name, role
          from app_users
          where is_active = true
          order by display_name asc
        `
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.post("/usuarios", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const username = required(body.username, "usuario").toLowerCase();
      const password = required(body.password, "contraseña");
      const firstName = required(body.firstName, "nombre");
      const lastName = required(body.lastName, "apellido");
      const role = enumValue(body.role, rolesUsuario, USER_ROLES.VIEWER);

      if (password.length < 8) {
        const error = new Error("La contraseña debe tener al menos 8 caracteres.");
        error.status = 400;
        throw error;
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const displayName = `${firstName} ${lastName}`.trim();

      const result = await pool.query(
        `
          insert into app_users (id, username, display_name, password_hash, role, is_active)
          values ($1, $2, $3, $4, $5, true)
          returning id, username, display_name, role, is_active, created_at, updated_at
        `,
        [randomUUID(), username, displayName, passwordHash, role]
      );

      response.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        error.status = 409;
        error.message = "Ya existe un usuario con ese nombre de usuario.";
      }
      next(error);
    }
  });

  router.patch("/usuarios/:id/archive", admin, async (request, response, next) => {
    try {
      if (request.params.id === request.user.sub) {
        response.status(400).json({ error: "No puedes archivar tu propio usuario." });
        return;
      }

      const result = await pool.query(
        `
          update app_users
          set is_active = false, updated_at = now()
          where id = $1
          returning id, username, display_name, role, is_active, created_at, updated_at
        `,
        [request.params.id]
      );

      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/usuarios/:id", admin, async (request, response, next) => {
    try {
      if (request.params.id === request.user.sub) {
        response.status(400).json({ error: "No puedes eliminar tu propio usuario." });
        return;
      }

      const result = await pool.query("delete from app_users where id = $1 returning id", [request.params.id]);
      sendDeleted(response, result.rowCount);
    } catch (error) {
      next(error);
    }
  });
}

function registerClientes(router, container, admin) {
  const pool = container.pool;

  router.get("/clientes", async (_request, response, next) => {
    try {
      if (!container.powerbiPool) {
        response.status(503).json({
          error: "La conexión externa de clientes no está configurada. Revisa variables POWERBI_DB_*."
        });
        return;
      }

      const [rows] = await container.powerbiPool.query(
        `
          select
            id,
            persona,
            telefono,
            tipo_cliente,
            embudo,
            etapa,
            propietario,
            temperatura,
            fuente,
            producto,
            productos,
            valor,
            moneda,
            descripcion,
            activo,
            estado_final,
            motivo_perdido,
            creado
          from leads
          order by creado desc
        `
      );
      const mapped = (Array.isArray(rows) ? rows : []).map(mapLeadToCliente);
      response.json(mapped);
    } catch (error) {
      next(error);
    }
  });

  router.get("/clientes/relaciones", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `
          select id, cliente_externo_id, cliente_nombre_normalizado, proyecto_id, estado_relacion, creado_en, actualizado_en
          from relaciones_clientes_proyectos
          order by actualizado_en desc
        `
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.post("/clientes/:clienteExternoId/relaciones", admin, async (request, response, next) => {
    try {
      const clienteExternoId = required(request.params.clienteExternoId, "clienteExternoId");
      const proyectoId = required(request.body?.proyecto_id, "proyecto_id");
      const estadoRelacion = enumValue(
        request.body?.estado_relacion,
        ["confirmado", "rechazado", "sugerido"],
        "confirmado"
      );
      const clienteNombreNormalizado = clean(request.body?.cliente_nombre_normalizado);

      const exists = await pool.query("select id from obras where id = $1 limit 1", [proyectoId]);
      if (!exists.rowCount) {
        response.status(404).json({ error: "Proyecto no encontrado." });
        return;
      }

      const relationId = randomUUID();
      const result = await pool.query(
        `
          insert into relaciones_clientes_proyectos (
            id, cliente_externo_id, cliente_nombre_normalizado, proyecto_id, estado_relacion
          )
          values ($1, $2, $3, $4, $5)
          on conflict (cliente_externo_id, proyecto_id) do update
          set
            cliente_nombre_normalizado = excluded.cliente_nombre_normalizado,
            estado_relacion = excluded.estado_relacion,
            actualizado_en = now()
          returning *
        `,
        [relationId, clienteExternoId, clienteNombreNormalizado, proyectoId, estadoRelacion]
      );

      if (estadoRelacion === "confirmado") {
        await pool.query(
          `
            update obras
            set
              cliente_externo_id = $2,
              cliente_nombre_snapshot = coalesce($3, cliente_nombre_snapshot),
              cliente_telefono_snapshot = coalesce($4, cliente_telefono_snapshot),
              cliente_origen = 'leads',
              updated_at = now()
            where id = $1
          `,
          [
            proyectoId,
            clienteExternoId,
            clean(request.body?.cliente_nombre_snapshot),
            clean(request.body?.cliente_telefono_snapshot)
          ]
        );
      }

      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.get("/clientes/:clienteExternoId/proyectos", async (request, response, next) => {
    try {
      const clienteExternoId = required(request.params.clienteExternoId, "clienteExternoId");
      const result = await pool.query(
        `
          select
            o.*,
            coalesce(o.cliente_nombre_snapshot, c.nombre) as cliente_nombre
          from obras o
          left join clientes c on c.id = o.cliente_id
          where
            o.cliente_externo_id = $1
            or exists (
              select 1
              from relaciones_clientes_proyectos r
              where
                r.proyecto_id = o.id
                and r.cliente_externo_id = $1
                and r.estado_relacion = 'confirmado'
            )
          order by o.created_at desc
        `,
        [clienteExternoId]
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.post("/clientes/:clienteExternoId/proyectos", admin, async (request, response, next) => {
    try {
      const clienteExternoId = required(request.params.clienteExternoId, "clienteExternoId");
      const body = request.body ?? {};
      const etapaKanbanId = clean(body.etapa_kanban_id) || await getDefaultKanbanStageId(pool);
      const fechaInicio = clean(body.fecha_inicio) || new Date().toISOString().slice(0, 10);
      const fechaFinEstimada = clean(body.fecha_fin_estimada) || fechaInicio;

      const result = await pool.query(
        `
          insert into obras (
            id, cliente_id, cliente_externo_id, cliente_nombre_snapshot, cliente_telefono_snapshot, cliente_ruc_snapshot, cliente_origen,
            nombre, oferta_nro, serie, total_aberturas, ubicacion, responsable, fecha_inicio, fecha_fin_estimada,
            fecha_fin_real, estado, avance, descripcion, observaciones, fecha_firma_abaco, etiquetas, lider_usuario_id, etapa_kanban_id
          )
          values ($1, null, $2, $3, $4, null, $5, $6, null, null, 0, null, $7, $8, $9, null, $10, 0, null, $11, $12, $13::jsonb, $14, $15)
          returning *
        `,
        [
          randomUUID(),
          clienteExternoId,
          clean(body.cliente_nombre_snapshot),
          clean(body.cliente_telefono_snapshot),
          clean(body.cliente_origen) || "leads",
          required(body.nombre, "nombre"),
          clean(body.responsable),
          fechaInicio,
          fechaFinEstimada,
          enumValue(body.estado, estadosObra, "pendiente_de_planificacion"),
          clean(body.observaciones),
          clean(body.fecha_firma_abaco),
          JSON.stringify(parseTags(body.etiquetas)),
          clean(body.lider_usuario_id),
          etapaKanbanId
        ]
      );

      await pool.query(
        `
          insert into relaciones_clientes_proyectos (
            id, cliente_externo_id, cliente_nombre_normalizado, proyecto_id, estado_relacion
          )
          values ($1, $2, $3, $4, 'confirmado')
          on conflict (cliente_externo_id, proyecto_id) do update
          set estado_relacion = 'confirmado', actualizado_en = now()
        `,
        [
          randomUUID(),
          clienteExternoId,
          normalizeClientName(body.cliente_nombre_snapshot),
          result.rows[0].id
        ]
      );

      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });
}

function registerObras(router, pool, admin) {
  router.get("/kanban/etapas", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `
          select id, nombre, codigo, orden, activa
          from etapas_kanban_obra
          where activa = true
          order by orden asc, creado_en asc
        `
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.post("/kanban/etapas", admin, async (request, response, next) => {
    try {
      const nombre = required(request.body?.nombre, "nombre");
      const nextOrder = await getNextKanbanOrder(pool);
      const result = await pool.query(
        `
          insert into etapas_kanban_obra (id, nombre, codigo, orden, activa)
          values ($1, $2, null, $3, true)
          returning id, nombre, codigo, orden, activa
        `,
        [randomUUID(), nombre, nextOrder]
      );
      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/kanban/etapas/:id", admin, async (request, response, next) => {
    try {
      const nombre = required(request.body?.nombre, "nombre");
      const result = await pool.query(
        `
          update etapas_kanban_obra
          set nombre = $2, actualizado_en = now()
          where id = $1 and activa = true
          returning id, nombre, codigo, orden, activa
        `,
        [request.params.id, nombre]
      );
      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.post("/kanban/etapas/:id/eliminar", admin, async (request, response, next) => {
    try {
      await deleteKanbanStage(pool, request.params.id, clean(request.body?.etapa_destino_id));
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.delete("/kanban/etapas/:id", admin, async (request, response, next) => {
    try {
      await deleteKanbanStage(pool, request.params.id, null);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/obras/:id/etapa", admin, async (request, response, next) => {
    try {
      const etapaId = clean(request.body?.etapa_kanban_id);
      if (!etapaId) {
        response.status(400).json({ error: "etapa_kanban_id es obligatorio." });
        return;
      }

      const etapaRes = await pool.query(
        "select id from etapas_kanban_obra where id = $1 and activa = true limit 1",
        [etapaId]
      );
      if (!etapaRes.rowCount) {
        response.status(404).json({ error: "Etapa destino no encontrada." });
        return;
      }

      const result = await pool.query(
        `
          update obras
          set etapa_kanban_id = $2, updated_at = now()
          where id = $1
          returning *
        `,
        [request.params.id, etapaId]
      );
      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.get("/obras", async (_request, response, next) => {
    try {
      const result = await pool.query(`
        select
          o.*,
          coalesce(o.cliente_nombre_snapshot, c.nombre) as cliente_nombre,
          e.nombre as etapa_kanban_nombre,
          e.orden as etapa_kanban_orden
        from obras o
        left join clientes c on c.id = o.cliente_id
        left join etapas_kanban_obra e on e.id = o.etapa_kanban_id
        order by o.created_at desc
      `);
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.get("/obras/:id", async (request, response, next) => {
    try {
      const row = await findOne(pool, "obras", request.params.id);
      sendFound(response, row);
    } catch (error) {
      next(error);
    }
  });

  router.post("/obras", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const result = await pool.query(
        `
          insert into obras (
            id, cliente_id, cliente_externo_id, cliente_nombre_snapshot, cliente_telefono_snapshot, cliente_ruc_snapshot, cliente_origen,
            nombre, oferta_nro, serie, total_aberturas, ubicacion, responsable, fecha_inicio,
            fecha_fin_estimada, fecha_fin_real, estado, avance, descripcion, observaciones, lider_usuario_id, etapa_kanban_id
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          returning *
        `,
        [
          ...obraValues(randomUUID(), body),
          clean(body.lider_usuario_id),
          clean(body.etapa_kanban_id) || await getDefaultKanbanStageId(pool)
        ]
      );
      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/obras/:id", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const result = await pool.query(
        `
          update obras set
            cliente_id = $2,
            cliente_externo_id = $3,
            cliente_nombre_snapshot = $4,
            cliente_telefono_snapshot = $5,
            cliente_ruc_snapshot = $6,
            cliente_origen = $7,
            nombre = $8,
            oferta_nro = $9,
            serie = $10,
            total_aberturas = $11,
            ubicacion = $12,
            responsable = $13,
            lider_usuario_id = $14,
            etapa_kanban_id = $15,
            fecha_inicio = $16,
            fecha_fin_estimada = $17,
            fecha_fin_real = $18,
            estado = $19,
            avance = $20,
            descripcion = $21,
            observaciones = $22,
            updated_at = now()
          where id = $1
          returning *
        `,
        [
          request.params.id,
          clean(body.cliente_id),
          clean(body.cliente_externo_id),
          clean(body.cliente_nombre_snapshot),
          clean(body.cliente_telefono_snapshot),
          clean(body.cliente_ruc_snapshot),
          clean(body.cliente_origen) || "leads",
          required(body.nombre, "nombre"),
          clean(body.oferta_nro),
          clean(body.serie),
          positiveInteger(body.total_aberturas, 0),
          clean(body.ubicacion),
          clean(body.responsable),
          clean(body.lider_usuario_id),
          clean(body.etapa_kanban_id),
          required(body.fecha_inicio, "fecha_inicio"),
          required(body.fecha_fin_estimada, "fecha_fin_estimada"),
          clean(body.fecha_fin_real),
          enumValue(body.estado, estadosObra, "planificada"),
          percent(body.avance),
          clean(body.descripcion),
          clean(body.observaciones)
        ]
      );
      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/obras/:id/lider", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const result = await pool.query(
        `
          update obras
          set lider_usuario_id = $2, updated_at = now()
          where id = $1
          returning *
        `,
        [request.params.id, clean(body.lider_usuario_id)]
      );
      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/obras/:id", admin, async (request, response, next) => {
    try {
      const result = await pool.query("delete from obras where id = $1 returning id", [request.params.id]);
      sendDeleted(response, result.rowCount);
    } catch (error) {
      next(error);
    }
  });
}

function registerTareas(router, pool, admin) {
  router.get("/tareas", async (request, response, next) => {
    try {
      const params = [];
      let where = "";

      if (request.query.obraId) {
        params.push(request.query.obraId);
        where = "where t.obra_id = $1";
      }

      const result = await pool.query(
        `
          select t.*, o.nombre as obra_nombre, u.display_name as completada_por_name
          from tareas_obra t
          join obras o on o.id = t.obra_id
          left join app_users u on u.id = t.completada_por
          ${where}
          order by t.fecha_inicio asc, t.orden asc
        `,
        params
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.get("/tareas/:id", async (request, response, next) => {
    try {
      const row = await findOne(pool, "tareas_obra", request.params.id);
      sendFound(response, row);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tareas", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const id = randomUUID();
      const isFinalizada = body.estado === "finalizada";
      const completadaPor = isFinalizada ? request.user.sub : null;
      const completadaEn = isFinalizada ? new Date() : null;

      const result = await pool.query(
        `
          insert into tareas_obra (
            id, obra_id, titulo, descripcion, responsable, fecha_inicio,
            fecha_fin, estado, prioridad, avance, orden, completada_por, completada_en
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          returning *
        `,
        [
          id,
          required(body.obra_id, "obra_id"),
          required(body.titulo, "titulo"),
          clean(body.descripcion),
          clean(body.responsable),
          required(body.fecha_inicio, "fecha_inicio"),
          required(body.fecha_fin, "fecha_fin"),
          enumValue(body.estado, estadosTarea, "pendiente"),
          enumValue(body.prioridad, prioridades, "media"),
          percent(body.avance),
          Number.parseInt(body.orden ?? 0, 10) || 0,
          completadaPor,
          completadaEn
        ]
      );

      await recalculateObraStatus(pool, body.obra_id, request.user.sub);

      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/tareas/:id", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      
      const prevTask = await findOne(pool, "tareas_obra", request.params.id);
      if (!prevTask) {
        return response.status(404).json({ error: "Tarea no encontrada." });
      }

      let completadaPor = prevTask.completada_por;
      let completadaEn = prevTask.completada_en;

      if (body.estado === "finalizada") {
        if (prevTask.estado !== "finalizada") {
          completadaPor = request.user.sub;
          completadaEn = new Date();
        }
      } else {
        completadaPor = null;
        completadaEn = null;
      }

      const result = await pool.query(
        `
          update tareas_obra set
            obra_id = $2,
            titulo = $3,
            descripcion = $4,
            responsable = $5,
            fecha_inicio = $6,
            fecha_fin = $7,
            estado = $8,
            prioridad = $9,
            avance = $10,
            orden = $11,
            completada_por = $12,
            completada_en = $13,
            updated_at = now()
          where id = $1
          returning *
        `,
        [
          request.params.id,
          required(body.obra_id, "obra_id"),
          required(body.titulo, "titulo"),
          clean(body.descripcion),
          clean(body.responsable),
          required(body.fecha_inicio, "fecha_inicio"),
          required(body.fecha_fin, "fecha_fin"),
          enumValue(body.estado, estadosTarea, "pendiente"),
          enumValue(body.prioridad, prioridades, "media"),
          percent(body.avance),
          Number.parseInt(body.orden ?? 0, 10) || 0,
          completadaPor,
          completadaEn
        ]
      );

      await recalculateObraStatus(pool, prevTask.obra_id, request.user.sub);
      if (body.obra_id && body.obra_id !== prevTask.obra_id) {
        await recalculateObraStatus(pool, body.obra_id, request.user.sub);
      }

      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/tareas/:id", admin, async (request, response, next) => {
    try {
      const prevTask = await findOne(pool, "tareas_obra", request.params.id);
      if (!prevTask) {
        return response.status(404).json({ error: "Tarea no encontrada." });
      }

      const result = await pool.query("delete from tareas_obra where id = $1 returning id", [request.params.id]);

      await recalculateObraStatus(pool, prevTask.obra_id, request.user.sub);

      sendDeleted(response, result.rowCount);
    } catch (error) {
      next(error);
    }
  });
}

async function recalculateObraStatus(pool, obraId, userId) {
  if (!obraId) return;

  const tasksRes = await pool.query(
    "select id, estado from tareas_obra where obra_id = $1",
    [obraId]
  );

  const totalTasks = tasksRes.rowCount;
  if (totalTasks === 0) return;

  const completedTasks = tasksRes.rows.filter(t => t.estado === "finalizada").length;

  const projectRes = await pool.query(
    "select estado from obras where id = $1",
    [obraId]
  );
  if (projectRes.rows.length === 0) return;
  const currentProjectState = projectRes.rows[0].estado;

  if (completedTasks === totalTasks) {
    if (currentProjectState !== "finalizada") {
      await pool.query(
        "update obras set estado = 'finalizada', updated_at = now() where id = $1",
        [obraId]
      );
      await pool.query(
        `insert into auditoria_cambios (id, usuario_id, entidad, entidad_id, accion, datos_anteriores, datos_nuevos)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          userId,
          "obras",
          obraId,
          "finalizacion_automatica",
          JSON.stringify({ estado: currentProjectState }),
          JSON.stringify({ estado: "finalizada" })
        ]
      );
    }
  } else {
    if (currentProjectState === "finalizada") {
      await pool.query(
        "update obras set estado = 'en_progreso', updated_at = now() where id = $1",
        [obraId]
      );
      await pool.query(
        `insert into auditoria_cambios (id, usuario_id, entidad, entidad_id, accion, datos_anteriores, datos_nuevos)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          userId,
          "obras",
          obraId,
          "reapertura_proyecto",
          JSON.stringify({ estado: "finalizada" }),
          JSON.stringify({ estado: "en_progreso" })
        ]
      );
    }
  }

}

function obraValues(id, body) {
  return [
    id,
    clean(body.cliente_id),
    clean(body.cliente_externo_id),
    clean(body.cliente_nombre_snapshot),
    clean(body.cliente_telefono_snapshot),
    clean(body.cliente_ruc_snapshot),
    clean(body.cliente_origen) || "leads",
    required(body.nombre, "nombre"),
    clean(body.oferta_nro),
    clean(body.serie),
    positiveInteger(body.total_aberturas, 0),
    clean(body.ubicacion),
    clean(body.responsable),
    required(body.fecha_inicio, "fecha_inicio"),
    required(body.fecha_fin_estimada, "fecha_fin_estimada"),
    clean(body.fecha_fin_real),
    enumValue(body.estado, estadosObra, "planificada"),
    percent(body.avance),
    clean(body.descripcion),
    clean(body.observaciones)
  ];
}

function tareaValues(id, body) {
  return [
    id,
    required(body.obra_id, "obra_id"),
    required(body.titulo, "titulo"),
    clean(body.descripcion),
    clean(body.responsable),
    required(body.fecha_inicio, "fecha_inicio"),
    required(body.fecha_fin, "fecha_fin"),
    enumValue(body.estado, estadosTarea, "pendiente"),
    enumValue(body.prioridad, prioridades, "media"),
    percent(body.avance),
    Number.parseInt(body.orden ?? 0, 10) || 0
  ];
}

function mapLeadToCliente(row) {
  const source = row ?? {};
  return {
    id_cliente_externo: clean(source.id),
    nombre_cliente: sanitizeLeadText(source.persona),
    telefono: sanitizeLeadText(source.telefono),
    tipo_cliente: sanitizeLeadText(source.tipo_cliente),
    embudo: sanitizeLeadText(source.embudo),
    etapa: sanitizeLeadText(source.etapa),
    propietario: sanitizeLeadText(source.propietario),
    temperatura: sanitizeLeadText(source.temperatura),
    fuente: sanitizeLeadText(source.fuente),
    producto: sanitizeLeadText(source.producto),
    productos: sanitizeLeadText(source.productos),
    valor: source.valor ?? null,
    moneda: sanitizeLeadText(source.moneda),
    descripcion: sanitizeLeadText(source.descripcion),
    activo: source.activo ?? null,
    estado_final: sanitizeLeadText(source.estado_final),
    motivo_perdido: sanitizeLeadText(source.motivo_perdido),
    creado: source.creado ?? null,
    origen: "leads"
  };
}

function sanitizeLeadText(value) {
  const cleanValue = clean(value);
  if (!cleanValue) return null;
  const normalized = fixMojibake(cleanValue).replace(/\s+/g, " ").trim();
  const low = normalized.toLowerCase();
  if (!normalized || low === "null" || low === "undefined") return null;
  return normalized;
}

function fixMojibake(text) {
  const suspicious = /Ã|Â|â|�/;
  if (!suspicious.test(text)) return text;

  try {
    const decoded = Buffer.from(text, "latin1").toString("utf8");
    const originalNoise = (text.match(suspicious) || []).length;
    const decodedNoise = (decoded.match(suspicious) || []).length;
    return decodedNoise < originalNoise ? decoded : text;
  } catch {
    return text;
  }
}

function normalizeClientName(value) {
  const text = sanitizeLeadText(value) || "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

async function findOne(pool, table, id) {
  const result = await pool.query(`select * from ${table} where id = $1 limit 1`, [id]);
  return result.rows[0];
}

function sendFound(response, row) {
  if (!row) {
    response.status(404).json({ error: "Registro no encontrado." });
    return;
  }

  response.json(row);
}

function sendDeleted(response, rowCount) {
  if (!rowCount) {
    response.status(404).json({ error: "Registro no encontrado." });
    return;
  }

  response.status(204).end();
}

function required(value, field) {
  const cleanValue = clean(value);

  if (!cleanValue) {
    const error = new Error(`El campo ${field} es obligatorio.`);
    error.status = 400;
    throw error;
  }

  return cleanValue;
}

function clean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function enumValue(value, allowed, fallback) {
  const cleanValue = clean(value) ?? fallback;
  return allowed.includes(cleanValue) ? cleanValue : fallback;
}

function percent(value) {
  const number = Number(value ?? 0);
  return Math.min(100, Math.max(0, Number.isFinite(number) ? number : 0));
}

function positiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function parseTags(value) {
  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        nombre: sanitizeLeadText(item?.nombre) || null,
        color: sanitizeLeadText(item?.color) || "#8A0FA8"
      }))
      .filter((item) => item.nombre);
  } catch {
    return [];
  }
}

async function getNextKanbanOrder(pool) {
  const result = await pool.query(
    "select coalesce(max(orden), 0)::int as max_orden from etapas_kanban_obra where activa = true"
  );
  return (result.rows[0]?.max_orden || 0) + 10;
}

async function getDefaultKanbanStageId(pool) {
  const result = await pool.query(
    `
      select id
      from etapas_kanban_obra
      where activa = true
      order by orden asc, creado_en asc
      limit 1
    `
  );
  return result.rows[0]?.id || null;
}

async function normalizeKanbanOrder(pool) {
  const result = await pool.query(
    `
      select id
      from etapas_kanban_obra
      where activa = true
      order by orden asc, creado_en asc
    `
  );

  let next = 10;
  for (const row of result.rows) {
    await pool.query(
      "update etapas_kanban_obra set orden = $2, actualizado_en = now() where id = $1 and orden <> $2",
      [row.id, next]
    );
    next += 10;
  }
}

async function deleteKanbanStage(pool, stageId, etapaDestinoId) {
  const etapasRes = await pool.query(
    `
      select id, orden
      from etapas_kanban_obra
      where activa = true
      order by orden asc, creado_en asc
    `
  );
  const etapas = etapasRes.rows;
  const toDelete = etapas.find((item) => item.id === stageId);
  const ordered = [...etapas].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const index = ordered.findIndex((item) => item.id === stageId);

  if (!toDelete) {
    const error = new Error("Etapa no encontrada.");
    error.status = 404;
    throw error;
  }

  if (etapas.length <= 1) {
    const error = new Error("Debe existir al menos una etapa activa.");
    error.status = 400;
    throw error;
  }

  const countRes = await pool.query(
    "select count(*)::int as total from obras where etapa_kanban_id = $1",
    [stageId]
  );
  const projectCount = countRes.rows[0]?.total || 0;

  let destino = null;
  if (projectCount > 0) {
    const previous = index > 0 ? ordered[index - 1] : null;
    const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
    destino = previous || next || null;
  } else if (etapaDestinoId) {
    destino = etapas.find((item) => item.id === etapaDestinoId) || null;
  } else {
    destino = etapas.find((item) => item.id !== stageId) || null;
  }

  if (projectCount > 0 && !destino) {
    const error = new Error("No hay etapa destino disponible para reasignar proyectos.");
    error.status = 400;
    throw error;
  }

  await pool.query("begin");
  try {
    if (projectCount > 0) {
      await pool.query(
        "update obras set etapa_kanban_id = $2, updated_at = now() where etapa_kanban_id = $1",
        [stageId, destino.id]
      );
    }
    await pool.query(
      "update etapas_kanban_obra set activa = false, actualizado_en = now() where id = $1",
      [stageId]
    );
    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }

  await normalizeKanbanOrder(pool);
}
