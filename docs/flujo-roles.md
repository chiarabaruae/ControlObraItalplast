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
| `viewer` *(se muestra como "Usuario")* | Auxiliares de obra, operarios de producción, administración, comercial | Consulta estado y avances; solo puede completar sus propias tareas |

## Navegación (sidebar) por rol

| Sección | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Clientes | ✅ CRUD | ✅ solo lectura | ❌ oculta |
| Proyectos | ✅ | ✅ | ✅ lectura |
| Tareas | ✅ | ✅ | ✅ (sus tareas) |
| Usuarios *(pantalla nueva)* | ✅ | ❌ | ❌ |
| Personalizar | ✅ | ✅ | ✅ |

## Matriz pantalla × rol

### Dashboard
| | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| KPIs (clientes, obras, tareas, avance promedio) | ✅ | ✅ (operativos) | ✅ (resumen) |
| Distribución por estado | ✅ | ✅ | ✅ |
| Lista de obras con acceso al detalle | ✅ | ✅ | ✅ |

### Clientes
| Acción | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Ver tabla y contactos | ✅ | ✅ | — (sección oculta) |
| Crear / editar / eliminar | ✅ | ❌ | — |

*Racional: un encargado de cuadrilla a veces necesita el teléfono del cliente
para coordinar en obra; un operario no necesita la cartera de clientes.*

### Proyectos (lista — vistas lista/tarjetas/kanban/gantt)
| Acción | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Ver todos los proyectos en todas las vistas | ✅ | ✅ | ✅ |
| Crear proyecto | ✅ | ❌ | ❌ |
| Editar datos del proyecto | ✅ | ❌ | ❌ |
| Eliminar proyecto | ✅ | ❌ | ❌ |

### Proyecto — detalle (menú superior: Resumen · Tareas · Cronograma · Seguimiento Fábrica · Seguimiento Obra · Informe de Avance · Documentos)
| Acción | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Ver los módulos del proyecto | ✅ | ✅ | ✅ |
| Subir oferta PDF → generar cronograma | ✅ | ❌ (comercial) | ❌ |
| Subir ábaco de aberturas | ✅ | ✅ | ❌ |
| Generar seguimientos (fábrica/obra) | ✅ | ✅ | ❌ |
| **Editar avance de etapas** | ✅ | ✅ *(su función principal)* | ❌ |
| Comentarios / hitos | ✅ | ✅ | ❌ |

### Tareas (antes To-Do)
| Acción | administrator | supervisor | Usuario (`viewer`) |
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
| Listar usuarios con rol, área, estado | ✅ |
| Alta / baja (activar-desactivar) | ✅ |
| Asignar rol | ✅ |
| Resetear contraseña | ✅ |

*Hoy la única forma de gestionar usuarios es el script `db:seed-users`. Se
diseña ya en Fase 2 con mocks; se conecta en Fase 4.*

### Login y recuperación de contraseña

- El login principal debe usar siempre el número de documento como identificador
  visible del usuario. En backend puede seguir mapeándose al campo técnico
  `username`, pero la interfaz debe nombrarlo como **Documento**.
- La pantalla de gestión de usuarios no necesita mostrar la columna Documento,
  porque ese dato es sensible y no aporta a la operación diaria del administrador.
- El botón **Cambiar contraseña** debe terminar como un flujo de enlace por
  correo: el administrador solicita el restablecimiento, el backend genera un
  token de un solo uso con vencimiento corto y el usuario define una nueva
  contraseña desde una URL segura.
- Para usuarios de obra con bajo acceso a tecnología, el flujo debe evitar pasos
  complejos: mensaje claro, enlace único, expiración visible y soporte para que
  un supervisor confirme que la persona pudo recuperar acceso.

### Creación de proyectos

- En Fase 2, la creación queda resuelta en frontend/mock con persistencia temporal
  en `localStorage`, porque todavía no hay base de datos ni endpoint confirmado
  que permita validar trazabilidad real.
- El alta de proyecto debe pedir nombre, cliente y fecha de inicio. La fecha de
  creación se genera automáticamente y se muestra solo como dato de lectura.
- La fecha fin estimada queda vacía al alta y debe poder editarse posteriormente.
- El proyecto se crea con etapas seleccionables. Por defecto quedan tildadas las
  etapas estándar de fábrica y obra; `Precorte` queda disponible como etapa
  opcional no seleccionada.
- Las etapas no seleccionadas no aparecen en seguimiento. La posibilidad de
  agregar etapas luego de creado el proyecto queda como requerimiento futuro,
  porque implica diseñar trazabilidad de cambios del alcance.
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

- Selector "ver como" (admin / supervisor / usuario) en el login simulado para
  recorrer los 3 flujos sin backend.
- Guardas de ruta: `/usuarios` solo admin; `/clientes` admin+supervisor.
- Renderizado condicional de acciones según la matriz de arriba (los botones
  que el rol no puede usar **no se muestran**, no se deshabilitan).

## Implicancias para Fase 3/4 (backend)

- Crear rol `supervisor` (seed + middleware `requireRole(...roles)` en lugar del
  binario `requireAdmin`).
- Abrir los GET de `proyectos-routes.js` a supervisor/viewer.
- Permisos de escritura granulares según la matriz (ej. `PATCH /avance-etapas`
  para supervisor; completar tarea propia para Usuario (`viewer`) con check de
  asignación).
- Decidir si la tabla `roles` huérfana se usa de verdad o se elimina.
- Implementar endpoint de recuperación de contraseña, por ejemplo
  `POST /auth/password-reset/request`, sin revelar si el documento/correo existe.
