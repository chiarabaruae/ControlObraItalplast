# Flujo por rol — Control de Obras Italplast

> Definición congelada en Fase 1 del plan de reestructuración (2026-07-17).
> Base del rediseño frontend en React (Fase 2, datos mock) y de los permisos
> reales de backend (Fase 3/4). Confirmada con la dueña del proyecto.

## Contexto del relevamiento

- El frontend vanilla actual **no filtra nada por rol**: todos los usuarios ven
  todos los botones, y a los no-admin les fallan las escrituras con 403.
- El backend ya tiene una regla implícita en `admin-routes.js`: **GET = cualquier
  sesión válida, POST/PUT/DELETE = solo `administrator`**. Excepción:
  `proyectos-routes.js` (ofertas, cronogramas, seguimientos, ábacos) exige admin
  incluso para lectura — esto deberá relajarse en Fase 3/4 para que supervisor y
  viewer puedan consultar cronogramas y avances.
- El rol **`supervisor` no existe todavía en el código** (ni middleware, ni seed,
  ni datos). Se crea en Fase 3. La tabla `roles` de la DB está huérfana
  (una sola fila "admin", nadie la consulta; `app_users.role` es un varchar).
- `obras.js` y `proyecto-detalle.js` no están ruteados hoy;
  `proyectos.js` reemplaza conceptualmente a `obras.js`.

## Roles

| Rol | Quiénes (según seed real) | Idea central |
|---|---|---|
| `administrator` | Gerencia, Jefe de Proyectos | Control total + gestión de usuarios |
| `supervisor` *(nuevo)* | Jefa de Obras, Encargados de Cuadrillas, Encargados de Producción PVC/ALU | Carga avances y gestiona tareas; no crea/borra proyectos ni toca datos comerciales |
| `viewer` | Auxiliares de obra, operarios de producción, administración, comercial | Consulta estado y avances; solo puede completar sus propias tareas |

## Navegación (sidebar) por rol

| Sección | administrator | supervisor | viewer |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Clientes | ✅ CRUD | ✅ solo lectura | ❌ oculta |
| Proyectos | ✅ | ✅ | ✅ lectura |
| To-Do | ✅ | ✅ | ✅ (sus tareas) |
| Usuarios *(pantalla nueva)* | ✅ | ❌ | ❌ |
| Personalizar | ✅ | ✅ | ✅ |

## Matriz pantalla × rol

### Dashboard
| | administrator | supervisor | viewer |
|---|---|---|---|
| KPIs (clientes, obras, tareas, avance promedio) | ✅ | ✅ (operativos) | ✅ (resumen) |
| Distribución por estado | ✅ | ✅ | ✅ |
| Lista de obras con acceso al detalle | ✅ | ✅ | ✅ |

### Clientes
| Acción | administrator | supervisor | viewer |
|---|---|---|---|
| Ver tabla y contactos | ✅ | ✅ | — (sección oculta) |
| Crear / editar / eliminar | ✅ | ❌ | — |

*Racional: un encargado de cuadrilla a veces necesita el teléfono del cliente
para coordinar en obra; un operario no necesita la cartera de clientes.*

### Proyectos (lista — vistas lista/tarjetas/kanban/gantt)
| Acción | administrator | supervisor | viewer |
|---|---|---|---|
| Ver todos los proyectos en todas las vistas | ✅ | ✅ | ✅ |
| Crear proyecto | ✅ | ❌ | ❌ |
| Editar datos del proyecto | ✅ | ❌ | ❌ |
| Eliminar proyecto | ✅ | ❌ | ❌ |

### Proyecto — detalle (tabs: Resumen · Cronograma · Seguimiento Fábrica · Seguimiento Obra · Informe de Avance · Documentos)
| Acción | administrator | supervisor | viewer |
|---|---|---|---|
| Ver las 6 tabs | ✅ | ✅ | ✅ |
| Subir oferta PDF → generar cronograma | ✅ | ❌ (comercial) | ❌ |
| Subir ábaco de aberturas | ✅ | ✅ | ❌ |
| Generar seguimientos (fábrica/obra) | ✅ | ✅ | ❌ |
| **Editar avance de etapas** | ✅ | ✅ *(su función principal)* | ❌ |
| Comentarios / hitos | ✅ | ✅ | ❌ |

### To-Do (tareas por obra)
| Acción | administrator | supervisor | viewer |
|---|---|---|---|
| Ver tareas | ✅ todas | ✅ todas | ✅ las asignadas a él/ella |
| Crear / editar tarea | ✅ | ✅ | ❌ |
| Completar / reabrir | ✅ | ✅ | ✅ **solo las propias** |
| Eliminar tarea | ✅ | ❌ | ❌ |

*Nota Fase 3: "sus tareas" requiere agregar asignación por usuario
(`tareas_obra.responsable` hoy es texto libre, no FK a `app_users`).*

### Usuarios (pantalla nueva, admin-only)
| Acción | administrator |
|---|---|
| Listar usuarios con rol, departamento, estado | ✅ |
| Alta / baja (activar-desactivar) | ✅ |
| Asignar rol | ✅ |
| Resetear contraseña | ✅ |

*Hoy la única forma de gestionar usuarios es el script `db:seed-users`. Se
diseña ya en Fase 2 con mocks; se conecta en Fase 4.*

### Personalizar
Disponible para los 3 roles (tema claro/oscuro/sistema + color de acento;
preferencias locales, sin impacto en datos).

## Decisiones tomadas (con fecha)

1. **2026-07-17 — Viewer completa sus propias tareas**: el operario marca su
   tarea como hecha desde obra; el supervisor valida. (Alternativa descartada:
   viewer 100% lectura.)
2. **2026-07-17 — Supervisor ve Clientes solo lectura.** (Alternativa
   descartada: ocultarla también para supervisor.)
3. **2026-07-17 — La pantalla Usuarios entra ya al rediseño con mocks.**
   (Alternativa descartada: seguir gestionando usuarios por script hasta
   Fase 3.)
4. **Consolidación**: la sección `obras` desaparece como pantalla independiente;
   queda una sola sección **Proyectos** cuyo detalle absorbe los módulos
   (Resumen/Documentos/Cronogramas/Seguimientos). `obras.js` no se migra.

## Implicancias para Fase 2 (React + mocks)

- Selector "ver como" (admin / supervisor / viewer) en el login simulado para
  recorrer los 3 flujos sin backend.
- Guardas de ruta: `/usuarios` solo admin; `/clientes` admin+supervisor.
- Renderizado condicional de acciones según la matriz de arriba (los botones
  que el rol no puede usar **no se muestran**, no se deshabilitan).

## Implicancias para Fase 3/4 (backend)

- Crear rol `supervisor` (seed + middleware `requireRole(...roles)` en lugar del
  binario `requireAdmin`).
- Abrir los GET de `proyectos-routes.js` a supervisor/viewer.
- Permisos de escritura granulares según la matriz (ej. `PATCH /avance-etapas`
  para supervisor; completar tarea propia para viewer con check de asignación).
- Decidir si la tabla `roles` huérfana se usa de verdad o se elimina.
