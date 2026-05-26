import { Router } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-admin.js";
import { USER_ROLES } from "../../domain/users/user-role.js";

const estadosObra = ["planificada", "en_progreso", "pausada", "finalizada", "cancelada"];
const estadosTarea = ["pendiente", "en_progreso", "bloqueada", "finalizada"];
const estadosCliente = ["activo", "inactivo"];
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

  registerClientes(router, container.pool, admin);
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

function registerClientes(router, pool, admin) {
  router.get("/clientes", async (_request, response, next) => {
    try {
      const result = await pool.query("select * from clientes order by created_at desc");
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  router.get("/clientes/:id", async (request, response, next) => {
    try {
      const row = await findOne(pool, "clientes", request.params.id);
      sendFound(response, row);
    } catch (error) {
      next(error);
    }
  });

  router.post("/clientes", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const result = await pool.query(
        `
          insert into clientes (id, nombre, ruc, telefono, email, direccion, contacto_principal, estado)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning *
        `,
        [
          randomUUID(),
          required(body.nombre, "nombre"),
          clean(body.ruc),
          clean(body.telefono),
          clean(body.email),
          clean(body.direccion),
          clean(body.contacto_principal),
          enumValue(body.estado, estadosCliente, "activo")
        ]
      );
      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/clientes/:id", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const result = await pool.query(
        `
          update clientes set
            nombre = $2,
            ruc = $3,
            telefono = $4,
            email = $5,
            direccion = $6,
            contacto_principal = $7,
            estado = $8,
            updated_at = now()
          where id = $1
          returning *
        `,
        [
          request.params.id,
          required(body.nombre, "nombre"),
          clean(body.ruc),
          clean(body.telefono),
          clean(body.email),
          clean(body.direccion),
          clean(body.contacto_principal),
          enumValue(body.estado, estadosCliente, "activo")
        ]
      );
      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/clientes/:id", admin, async (request, response, next) => {
    try {
      const result = await pool.query("delete from clientes where id = $1 returning id", [request.params.id]);
      sendDeleted(response, result.rowCount);
    } catch (error) {
      next(error);
    }
  });
}

function registerObras(router, pool, admin) {
  router.get("/obras", async (_request, response, next) => {
    try {
      const result = await pool.query(`
        select o.*, c.nombre as cliente_nombre
        from obras o
        left join clientes c on c.id = o.cliente_id
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
            id, cliente_id, nombre, ubicacion, responsable, fecha_inicio,
            fecha_fin_estimada, fecha_fin_real, estado, avance, descripcion
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          returning *
        `,
        obraValues(randomUUID(), body)
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
            nombre = $3,
            ubicacion = $4,
            responsable = $5,
            fecha_inicio = $6,
            fecha_fin_estimada = $7,
            fecha_fin_real = $8,
            estado = $9,
            avance = $10,
            descripcion = $11,
            updated_at = now()
          where id = $1
          returning *
        `,
        obraValues(request.params.id, body)
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
          select t.*, o.nombre as obra_nombre
          from tareas_obra t
          join obras o on o.id = t.obra_id
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
      const result = await pool.query(
        `
          insert into tareas_obra (
            id, obra_id, titulo, descripcion, responsable, fecha_inicio,
            fecha_fin, estado, prioridad, avance, orden
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          returning *
        `,
        tareaValues(randomUUID(), body)
      );
      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/tareas/:id", admin, async (request, response, next) => {
    try {
      const body = request.body ?? {};
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
            updated_at = now()
          where id = $1
          returning *
        `,
        tareaValues(request.params.id, body)
      );
      sendFound(response, result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/tareas/:id", admin, async (request, response, next) => {
    try {
      const result = await pool.query("delete from tareas_obra where id = $1 returning id", [request.params.id]);
      sendDeleted(response, result.rowCount);
    } catch (error) {
      next(error);
    }
  });
}

function obraValues(id, body) {
  return [
    id,
    clean(body.cliente_id),
    required(body.nombre, "nombre"),
    clean(body.ubicacion),
    clean(body.responsable),
    required(body.fecha_inicio, "fecha_inicio"),
    required(body.fecha_fin_estimada, "fecha_fin_estimada"),
    clean(body.fecha_fin_real),
    enumValue(body.estado, estadosObra, "planificada"),
    percent(body.avance),
    clean(body.descripcion)
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
