---
context_id: controlobra-role-flow
context_type: functional_specification
last_updated: 2026-07-22
tags:
  - roles
  - permissions
  - projects
  - stages
  - password-recovery
  - executive-budget
  - task-evidence
  - user-management
  - task-management
  - kanban
---

# Flujo por rol — Gestión de proyectos Italplast

> Definición congelada en Fase 1 del plan de reestructuración (2026-07-17).
> Base del rediseño frontend en React (Fase 2, datos mock) y de los permisos
> reales de backend (Fase 3/4). Confirmada con la dueña del proyecto.

## Contexto del relevamiento

- El frontend vanilla legado **no filtra correctamente por rol**. El frontend
  React activo sí aplica guardas de ruta y visibilidad mediante `lib/roles.ts`.
- El backend ya tiene una regla implícita en `admin-routes.js`: **GET = cualquier
  sesión válida, POST/PUT/DELETE = solo `administrator`**. Excepción:
  `proyectos-routes.js` (ofertas, cronogramas y seguimientos) exige admin
  incluso para lectura — esto deberá relajarse en Fase 3/4 para que supervisor y
  viewer puedan consultar cronogramas y avances.
- El rol **`supervisor` existe en los mocks y permisos del frontend React**, pero
  todavía debe formalizarse en middleware, seed y permisos del backend real. La
  tabla `roles` de la DB está huérfana y `app_users.role` es un varchar.
- Los archivos vanilla `obras.js`, `proyectos.js` y `proyecto-detalle.js` son
  legado; las rutas activas viven en `src/frontend/src/App.tsx`.

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
| Configuración / Personalizar | ✅ | ✅ | ✅ |
| Configuración / Planificación (brechas backward) | ✅ | ❌ oculta | ❌ oculta |
| Soporte | ✅ | ✅ | ✅ |

*Las brechas del cálculo backward de fechas (fin producción→instalación, firma
ábaco→fábrica, entrega premarcos→ábaco) son regla de negocio global: solo
administración puede modificarlas (`permisos.configurarPlanificacion`).*

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

### Proyectos (vistas Tarjetas y Tablero)
| Acción | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Ver todos los proyectos en Tarjetas y Tablero | ✅ | ✅ | ✅ |
| Arrastrar o solicitar cambio ordinario de estado | ✅ | ✅ | ❌ |
| Cancelar o reactivar proyecto con motivo | ✅ | ❌ | ❌ |
| Reabrir proyecto finalizado con motivo | ✅ | ❌ | ❌ |
| Crear proyecto | ✅ | ❌ | ❌ |
| Editar datos del proyecto | ✅ | ❌ | ❌ |
| Eliminar proyecto | ✅ | ❌ | ❌ |

### Proyecto — detalle (Resumen · Tareas · Cronograma · Fábrica · Instalación · Informe · Documentos)
| Acción | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Ver los módulos del proyecto | ✅ | ✅ | ✅ |
| Subir oferta PDF → generar cronograma | ✅ | ❌ (comercial) | ❌ |
| Reemplazar presupuesto ejecutivo | ✅ | ✅ | ❌ |
| Generar seguimientos (fábrica/instalación) | ✅ | ✅ | ❌ |
| Agregar, renombrar, refechar o eliminar tareas de seguimiento | ✅ | ✅ | ❌ |
| **Completar tareas de etapa con evidencia** | ✅ | ✅ *(su función principal)* | ❌ en Fase 2 |
| Comentarios / hitos | ✅ | ✅ | ❌ |

### Tareas (antes To-Do)
| Acción | administrator | supervisor | Usuario (`viewer`) |
|---|---|---|---|
| Ver tareas | ✅ todas | ✅ todas | ✅ las asignadas a él/ella |
| Crear / editar tarea | ✅ | ✅ | ❌ |
| Completar / reabrir | ✅ | ✅ | ✅ **solo las propias** |
| Reabrir sin motivo | ❌ nadie: el motivo es obligatorio para todos los roles | ❌ | ❌ |
| Definir prioridad | ✅ | ✅ | ❌ (la ve como etiqueta) |
| Ver columnas Creación / Modificación (auditoría) | ✅ | ❌ | ❌ |
| Eliminar tarea (borrado lógico auditado) | ✅ | ❌ | ❌ |

*La sección Tareas ya no muestra "tareas internas": solo tareas de seguimiento
dependientes de una etapa. Cada reapertura registra fecha, usuario y motivo;
cada modificación (completar, reabrir, editar, prioridad) suma versión, fecha y
autor a la auditoría de la tarea.*

*Nota Fase 3: "sus tareas" requiere agregar asignación por usuario
(`tareas_obra.responsable` hoy es texto libre, no FK a `app_users`). Las tareas
de seguimiento aún no tienen responsable y la implementación Fase 2 las muestra
en lectura al rol Usuario; debe filtrarse antes de producción.*

### Usuarios (pantalla nueva, admin-only)
| Acción | administrator |
|---|---|
| Listar usuarios con rol, área, estado | ✅ |
| Crear y editar nombre, área y rol | ✅ |
| Registrar correo y teléfono opcionales | ✅ |
| Archivar / reactivar | ✅ |
| Solicitar cambio de contraseña | ✅ |

*La pantalla permite gestionar usuarios mock en Fase 2. La única forma de
persistir usuarios y credenciales reales continúa siendo el script
`db:seed-users`; la interfaz se conecta al backend en Fase 4.*

La tabla usa los encabezados Usuario, Área, Rol y Acciones. Bajo Acciones se
alinean el lápiz, la llave y archivar/reactivar; cada ícono conserva su etiqueta
accesible. El alta usa la misma ventana. Nombre, área y rol son obligatorios;
correo y número de teléfono son opcionales.

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
- El alta de proyecto debe pedir nombre, cliente, uno o más tipos de producto,
  fecha de inicio y la última versión del presupuesto ejecutivo PDF. Líder y
  ubicación pueden cargarse durante el alta. La fecha de creación se genera
  automáticamente y se muestra solo como dato de lectura. La fecha de inicio se
  precarga con el día actual y sigue siendo editable.
- Los tipos de producto iniciales son: aberturas de aluminio, aberturas de PVC,
  mosquiteras, persianas, aberturas Velux de techo y servicios.
- Un proyecto puede reunir varios tipos de producto. Cada tipo conserva su propia
  configuración de premarcos, fábrica e instalación, sin compartir ni sobrescribir las
  etapas de los otros productos seleccionados.
- La selección de productos es múltiple. Al seleccionar un tipo aparece su editor
  de etapas; al deseleccionarlo se oculta y no se guarda en el proyecto. Durante
  el formulario, volver a seleccionarlo recupera la configuración que tenía.
- `Servicios` no utiliza seguimiento por etapas de premarcos, fábrica o instalación; puede
  coexistir con otros productos, que sí conservan sus etapas independientes.
- La fecha fin estimada queda vacía al alta y debe poder editarse posteriormente.
- Para cada producto distinto de `Servicios`, la configuración contiene cuatro
  grupos: fabricación de premarcos (opcional), instalación de premarcos
  (opcional e independiente), fábrica del producto (obligatorio) e instalación del
  producto (obligatorio).
- Fabricación e instalación de premarcos pueden combinarse libremente: ambas,
  solo fabricación, solo instalación o ninguna. Esto contempla premarcos del
  cliente, entrega sin instalación e instalación de premarcos existentes.
- Cada grupo permite seleccionar, renombrar, eliminar y agregar subetapas antes
  de crear el proyecto. Los cambios se guardan únicamente en ese proyecto y no
  modifican los valores predeterminados de otros proyectos.
- Por defecto quedan seleccionadas las etapas estándar de fábrica e instalación;
  `Precorte` queda disponible como etapa no seleccionada. Los grupos opcionales
  de premarcos parten de una propuesta editable de subetapas operativas.
- Como evolución futura, Settings tendrá plantillas globales por producto. Solo
  administradores y supervisores podrán modificar esas condiciones globales;
  los permisos específicos se definirán al conectar el backend.

### Lectura y revisión del presupuesto ejecutivo

- El PDF es obligatorio incluso cuando el proyecto contiene solo Servicios; en
  ese caso conserva la fuente comercial pero no genera tareas por etapas.
- La extracción ocurre localmente con PDF.js y texto embebido. No se usa OCR en
  Fase 2.
- Los formatos iniciales son tabla Excel, Oferta Preference y Propuesta
  Preference Mercosul. Un formato desconocido permite agregar filas manuales.
- Antes de crear el proyecto se debe revisar una tabla editable. Cada fila exige
  código, descripción, cantidad positiva y un producto que siga seleccionado.
- Cada producto operativo seleccionado debe recibir al menos un componente.
- Con varios productos, cada componente se asigna de forma independiente. La
  sugerencia automática se puede corregir antes de confirmar.

### Generación y cierre de tareas operativas

- Se genera una tarea por cada combinación entre componente presupuestado y
  etapa activa del producto asignado.
- La pestaña Fábrica contiene `Premarcos · fabricación` y
  `Producto · fabricación`. La pestaña Instalación contiene
  `Premarcos · instalación` y `Producto · instalación`.
- Cada bloque se presenta como lista ordenada por fecha de entrega, no como matriz.
- Administradores y supervisores pueden agregar tareas manuales, renombrarlas,
  cambiar sus fechas de inicio/entrega o eliminarlas dentro del proyecto.
- La sección Tareas reúne seguimiento de proyectos y tareas internas. Cerrar una
  tarea de seguimiento desde cualquiera de las dos vistas usa el mismo diálogo
  y persiste sobre la misma colección del proyecto. Puede filtrarse por proyecto.
- El disparador de cierre usa siempre un check; la evidencia obligatoria se pide
  dentro del diálogo y no se representa mediante un ícono de cámara en la lista.
- Marcar una tarea como lista exige una imagen. Observaciones es opcional.
- Se registra quién y cuándo completó la tarea. La evidencia se puede consultar
  y la tarea se puede reabrir.
- Los porcentajes de bloque, producto y proyecto son derivados, no editables:
  `completadas / total`.
- En Fase 2, administradores y supervisores pueden cerrar estas tareas. La
  asignación por persona para habilitar a Usuario (`viewer`) queda pendiente del
  modelo real de responsables.
- Los cuatro proyectos mock incluyen seguimiento ficticio para recorrer el
  flujo completo. Los proyectos anteriores sin datos suficientes muestran
  "Seguimiento pendiente de generar"; no se permite editar porcentajes a mano.

### Tablero de proyectos y transiciones

- El tablero muestra Planificadas, En progreso, Pausadas y Finalizadas en una fila
  horizontal con desplazamiento lateral. Administradores y supervisores pueden
  arrastrar por el asa o usar el menú; Usuario solo consulta.
- Todo movimiento manual abre confirmación, bloqueo o formulario según su regla.
- En progreso exige avance registrado; sin avance se deriva a las tareas. El
  primer avance cambia automáticamente Planificada a En progreso.
- Un proyecto con avance no puede volver a Planificada.
- Pausada exige motivo. Reanudar exige observación y cierra la pausa abierta con
  usuario y fecha.
- Finalizada exige evidencia y lleva las tareas pendientes al 100%. No se puede
  arrastrar desde este estado.
- Solo administración puede reabrir una Finalizada con motivo. Vuelve a En
  progreso y conserva las tareas ya cerradas; no se revierte avance en silencio.
- Cancelar es una acción administrativa separada de las columnas y exige motivo.
  Los cancelados se muestran en un bloque aparte; administración puede
  reactivarlos con motivo hacia Planificada o En progreso según su avance.
- Cada cambio conserva origen, destino, usuario y fecha en `historialEstados`.

### Configuración y Soporte

Disponibles para los 3 roles. Configuración reúne Cuenta, Personalizar y
Actualizaciones; Soporte reúne Documentación y Contactar soporte. Las
preferencias visuales son locales y no modifican datos operativos.

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
5. **2026-07-18 — Etapas configurables por producto y proyecto**: un proyecto
   admite varios tipos de producto, cada uno con etapas independientes. Las
   modificaciones de nombres, altas y bajas afectan solo a ese producto dentro
   del proyecto en creación. Las plantillas globales se administrarán más
   adelante con acceso restringido a administradores y supervisores.
6. **2026-07-19 — Presupuesto ejecutivo como fuente del seguimiento**: el PDF
   es obligatorio, sus componentes se revisan antes del alta y generan las
   matrices de tareas con evidencia y avance automático.
7. **2026-07-19 — Seguimiento como lista de tareas con fechas**: se mantiene la
   generación componente × etapa, pero la operación se presenta como listas
   editables y se integra con Tareas.
8. **2026-07-19 — Tablero horizontal arrastrable y condicionado**: el arrastre
   comparte las mismas reglas que el menú; pausa, reanudación, cierre,
   cancelación, reactivación y reapertura quedan auditadas. Cancelar y reabrir
   son acciones exclusivas de administración.
9. **2026-07-19 — Seguimiento demostrativo unificado**: los proyectos mock usan
   tareas ficticias por componente y etapa, sincronizadas con Tareas. El avance
   manual por `+ / −` se retira y el check es el único disparador de cierre.

## Implicancias para Fase 2 (React + mocks)

- El login simulado solicita Documento y Contraseña. El usuario mock encontrado
  determina el rol; no se presenta un selector manual de roles.
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
