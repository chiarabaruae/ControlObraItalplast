---
context_id: controlobra-decisions
context_type: architecture_decisions
last_updated: 2026-07-22
tags:
  - decisions
  - product
  - architecture
  - permissions
  - documentation
  - executive-budget
  - task-evidence
  - user-management
  - task-management
  - kanban
---

# Decisiones vigentes

## D-001 — Frontend React como interfaz activa

**Estado:** aceptada.

**Contexto:** el frontend vanilla dificultaba consolidar permisos, componentes y flujos nuevos.

**Decisión:** la interfaz activa de Fase 2 se desarrolla en React, TypeScript y Vite dentro de `src/frontend/src`.

**Consecuencias:** los archivos vanilla pueden seguir existiendo como legado, pero no son la fuente principal para nuevas pantallas.

## D-002 — Interfaz denominada Gestión de proyectos

**Estado:** aceptada.

**Contexto:** Italplast gestionará más líneas que aberturas PVC y aluminio.

**Decisión:** utilizar **Gestión de proyectos**, la marca Italplast y el azul oficial como identidad predeterminada.

**Consecuencias:** textos y navegación no deben restringir conceptualmente el producto a Control de Obras o a una única línea.

## D-003 — Tres roles operativos

**Estado:** aceptada.

**Decisión:** usar `administrator`, `supervisor` y `viewer`, mostrando este último como Usuario.

**Consecuencias:** las acciones no autorizadas se ocultan. La matriz detallada vive en `docs/flujo-roles.md`.

## D-004 — Settings y Support en el sidebar

**Estado:** aceptada.

**Decisión:** agrupar Account, Personalizar y Updates dentro de Settings; Documentation y Contact support dentro de Support.

**Consecuencias:** ambos grupos usan popovers animados. La personalización deja de ocupar un acceso principal independiente.

## D-005 — Proyectos con múltiples tipos de producto

**Estado:** aceptada.

**Contexto:** una misma obra puede incluir aluminio, PVC, mosquiteras, persianas, Velux y servicios con requisitos diferentes.

**Decisión:** un proyecto contiene una colección `productos`; cada tipo seleccionado mantiene sus propias etapas.

**Consecuencias:** la selección es múltiple y el seguimiento del detalle se agrupa por producto. La configuración actual es por tipo, no por unidad o lote.

## D-006 — Premarcos opcionales e independientes

**Estado:** aceptada.

**Decisión:** fabricación e instalación de premarcos son grupos opcionales independientes para cada producto. Fábrica e instalación del producto son obligatorias, excepto para Servicios.

**Consecuencias:** se admiten premarcos existentes, fabricación sin instalación, instalación sin fabricación o ausencia completa de premarcos.

## D-007 — Edición de etapas limitada al proyecto

**Estado:** aceptada.

**Decisión:** agregar, borrar, seleccionar o renombrar etapas durante el alta modifica únicamente ese producto dentro del proyecto.

**Consecuencias:** las plantillas globales se implementarán después y requerirán permisos restringidos para administradores y supervisores autorizados.

## D-008 — Documentación como parte del commit

**Estado:** aceptada.

**Contexto:** revisar todo el código en cada sesión es costoso y las notas anteriores quedaron desactualizadas.

**Decisión:** todo cambio material debe actualizar contexto, decisiones, registro de cambios y documentación especializada antes del commit/push.

**Consecuencias:** `AGENTS.md` convierte esta revisión en una regla obligatoria. Los documentos usan metadatos y secciones preparadas para recuperación semántica, sin afirmar que ya existe una base vectorial.

## D-009 — Presupuesto ejecutivo obligatorio y fuente de componentes

**Estado:** aceptada.

**Contexto:** el seguimiento operativo debe nacer de la última versión aprobada del presupuesto y no de una planilla paralela con otra denominación.

**Decisión:** todo proyecto exige un presupuesto ejecutivo PDF. El concepto anterior de planilla de aberturas se retira del modelo y la interfaz activos. Los componentes verificados del presupuesto son la fuente para generar el seguimiento.

**Consecuencias:** el alta no termina sin PDF y al menos una fila válida. Servicios también conserva el presupuesto aunque no genere etapas. El backend futuro deberá versionar el archivo y su revisión.

## D-010 — Extracción liviana de texto con revisión humana

**Estado:** aceptada.

**Contexto:** los tres formatos reales evaluados contienen texto embebido y una precisión absoluta no es requisito.

**Decisión:** usar PDF.js en el navegador, heurísticas por formato y una tabla editable obligatoria. No incorporar OCR en esta fase.

**Consecuencias:** se evita procesamiento pesado en backend, pero los PDFs escaneados o formatos nuevos requieren filas manuales hasta agregar otro parser. El resultado extraído nunca se considera confirmado sin revisión del usuario.

## D-011 — Matriz de tareas con evidencia y avance derivado

**Estado:** aceptada.

**Contexto:** el proceso actual marca cada componente por etapa y necesita trazabilidad para considerar un trabajo terminado.

**Decisión:** generar una tarea por `componente × etapa`; exigir imagen para completar, permitir observación opcional y derivar todos los porcentajes desde tareas completadas.

**Consecuencias:** desaparece el ajuste manual de porcentaje del flujo activo. Las evidencias se comprimen en Fase 2, pero el backend deberá almacenarlas como archivos auditables y no como datos en el navegador.

## D-012 — Premarcos anidados en Fábrica e Instalación

**Estado:** aceptada.

**Decisión:** usar dos pestañas operativas: Fábrica agrupa premarcos/fabricación y producto/fabricación; Instalación agrupa premarcos/instalación y producto/instalación. Cada producto conserva matrices independientes.

**Consecuencias:** se evita multiplicar pestañas por producto y se representa el flujo tal como trabaja cada equipo.

## D-013 — Alta y edición de usuarios en una ventana dedicada

**Estado:** aceptada.

**Contexto:** la tabla debe permitir administrar los datos de una persona sin mezclar edición directa de campos con las acciones de contraseña y archivo.

**Decisión:** usar una misma ventana para crear y editar usuarios. Nombre, área y rol son obligatorios; correo y número de teléfono son opcionales. La tabla agrupa bajo el encabezado Acciones los íconos independientes de lápiz, llave y archivar/reactivar.

**Consecuencias:** el rol deja de modificarse directamente desde la celda y se edita junto con el resto del perfil. En Fase 2 los cambios son locales a la pantalla; el backend futuro deberá persistirlos y generar las credenciales de acceso.

## D-014 — Tareas de seguimiento en lista con fechas, no en matriz

**Estado:** aceptada (reemplaza la presentación matricial de D-011; la generación ítem × etapa se mantiene).

**Decisión:** cada bloque muestra sus tareas como lista ordenada por fecha de entrega. El supervisor puede agregar tareas manuales, renombrar, cambiar fechas de inicio/entrega y eliminar. La sección Tareas del menú lateral refleja el seguimiento de todos los proyectos y completa con el mismo diálogo de evidencia.

**Consecuencias:** el seguimiento se opera como gestor de tareas con vencimientos; las tareas manuales conviven con las generadas desde el presupuesto (`titulo`, `fechaInicio`, `fechaFin`, `manual` en `TareaPresupuesto`).

## D-015 — Tablero por estado con transiciones condicionadas

**Estado:** aceptada.

**Decisión:** Proyectos suma vista Tablero (Planificadas / En progreso / Pausadas / Finalizadas). Pasar a En progreso solo ocurre con avance registrado (automático con el primer avance); pausar exige motivo que queda en el historial (`pausas`); finalizar advierte que los avances se guardan al 100%, exige al menos una evidencia (existente o adjuntada como evidencia general) y registra el cierre (`cierre`).

**Consecuencias:** los estados dejan de ser un campo editable a mano y pasan a reflejar reglas operativas trazables. Esta primera definición se amplía en D-017 con arrastre, confirmaciones y políticas de excepción.

## D-016 — Interfaz íntegramente en español

**Estado:** aceptada.

**Decisión:** todo texto visible para la persona usuaria va en español (Configuración, Soporte, Cuenta, Actualizaciones, Documentación, Contactar soporte, Inicio, Buscar actualizaciones). Los identificadores de código y rutas pueden permanecer en inglés.

**Consecuencias:** los rótulos ingleses previos quedan prohibidos en UI; el criterio aplica a toda pantalla nueva.

## D-017 — Kanban arrastrable con transiciones protegidas

**Estado:** aceptada.

**Contexto:** el tablero debía comportarse como un Kanban horizontal sin permitir que el gesto de arrastre eludiera las condiciones operativas ni borrara la trazabilidad de pausas, cierres o excepciones.

**Decisión:** usar columnas horizontales y tarjetas arrastrables con `@dnd-kit/core`. Arrastrar y usar el menú ejecutan el mismo flujo: todo movimiento requiere confirmación, validación o información obligatoria. En progreso exige avance; un proyecto con avance no vuelve a Planificada; Pausada exige motivo y su reanudación exige observación; Finalizada exige evidencia. Cancelar y reactivar son acciones administrativas con motivo fuera de las columnas. Reabrir una Finalizada también es una acción administrativa excepcional, no un destino de arrastre.

**Consecuencias:** administradores y supervisores cambian estados ordinarios; solo administradores cancelan, reactivan o reabren. Las transiciones se registran en `historialEstados` y las operaciones especiales mantienen sus registros en `pausas`, `cierre` o `cancelacion`. Reabrir conserva las tareas cerradas y vuelve a En progreso; no revierte silenciosamente el avance.

## D-018 — Seguimiento por checks también en proyectos demostrativos

**Estado:** aceptada.

**Contexto:** los proyectos mock anteriores a la carga de presupuestos seguían mostrando porcentajes editables y dejaban vacía la sección global de seguimiento, lo que impedía visualizar y probar el flujo vigente.

**Decisión:** derivar componentes y tareas ficticias desde las aberturas de los cuatro proyectos iniciales. El seguimiento activo usa exclusivamente `tareasPresupuesto`, tanto en el detalle como en Tareas. La acción se muestra con check y solicita evidencia dentro del diálogo. Los proyectos desconocidos que aún no tengan seguimiento muestran un estado pendiente de generación, sin controles porcentuales.

**Consecuencias:** el porcentaje queda siempre derivado de checks en la interfaz activa y ambas vistas comparten la persistencia de proyecto. Los presupuestos, fechas y evidencias sembrados quedan identificados como demostrativos; sirven para pruebas visuales, no como información operativa ni como migración definitiva del backend.

## D-019 — Filtro y orden por columna al estilo de planilla

**Estado:** aceptada.

**Contexto:** las tablas de gestión (Clientes, Usuarios, Tareas) crecen y el equipo necesita ubicar registros con la misma lógica que ya usan en Excel, sin sumar controles complejos.

**Decisión:** cada columna expone un menú con dos acciones: ordenar y filtrar por valores. El ordenamiento y la lista de valores respetan el tipo de dato (texto alfabético, números por magnitud, fechas cronológicas de más reciente a más antigua). La lógica vive en el hook reutilizable `useTablaFiltrable` y el encabezado `EncabezadoFiltrable`. El estado no se persiste entre sesiones.

**Consecuencias:** cualquier tabla nueva puede sumar filtro y orden declarando sus columnas y el tipo de cada una. El selector de vista de Proyectos queda solo con íconos, apoyado en tooltip y texto accesible.

## D-020 — Alta de tareas de seguimiento por selección en cascada

**Estado:** aceptada.

**Contexto:** una tarea de seguimiento pertenece a una etapa de un producto dentro de un proyecto de un cliente. Pedir todo junto en un formulario plano es propenso a combinaciones inválidas.

**Decisión:** el alta desde "Nueva tarea" guía la elección en pasos dependientes: cliente → proyecto → producto → etapa (bloque) → nombre y fechas. Cada nivel ofrece solo las opciones válidas del nivel anterior y se habilita al resolverlo. Solo participan proyectos con seguimiento ya generado desde un presupuesto.

**Consecuencias:** no se pueden crear tareas huérfanas ni en combinaciones inexistentes. El aviso de filtros y el de truncado de filas se ubican sobre la tabla para que el estado del listado sea visible antes de leer los datos.

## D-021 — Reapertura de tareas siempre justificada y auditoría visible solo para administradores

**Estado:** aceptada.

**Contexto:** reabrir una tarea completada borraba el cierre sin dejar rastro de quién lo hizo ni por qué, y no existía registro de creación ni de modificaciones de las tareas de seguimiento.

**Decisión:** reabrir una tarea exige un motivo obligatorio sin importar el rol; se registra fecha, usuario y motivo en `reaperturas`. Cada tarea conserva `creadaEn`, `version`, `modificadaEn`, `modificadaPorId` y el historial `modificaciones` (completar, reabrir, editar, cambiar prioridad). Eliminar una tarea es un borrado lógico: pasa a `tareasEliminadas` del proyecto con `eliminadaEn`/`eliminadaPorId`, sin interfaz que la muestre. En la tabla de Tareas, las columnas Creación y Modificación son visibles únicamente para administradores.

**Consecuencias:** toda alteración del seguimiento queda trazada en datos aunque la interfaz solo exponga el resumen a administradores. El helper `registrarModificacionTarea` centraliza el sellado y `eliminarTareaConAuditoria` el borrado lógico; el diálogo de completar/reabrir sella la auditoría él mismo recibiendo `usuarioId`.

## D-022 — Prioridad por tarea restringida y retiro de las tareas internas

**Estado:** aceptada.

**Contexto:** las tareas de seguimiento no tenían prioridad y la sección Tareas mezclaba una tabla de "tareas internas" sueltas que ya no representa el flujo deseado: por ahora toda tarea debe depender de una etapa.

**Decisión:** `TareaPresupuesto` incorpora `prioridad` (baja/media/alta/urgente, por defecto media). Solo administradores y supervisores pueden definirla (selector inline en la tabla de Tareas y en los formularios de alta/edición); los demás roles la ven como etiqueta de solo lectura. La tabla "Tareas internas" se retira de la sección Tareas; si en el futuro se necesitan tareas genéricas, irán por fuera de las etapas de Fabricación e Instalación pero siempre atadas a un proyecto.

**Consecuencias:** la sección Tareas muestra únicamente seguimiento dependiente de etapas. El tipo `Tarea` y `tareasIniciales` quedan como legado usado por el Dashboard y la pestaña Tareas del detalle de proyecto, pendientes de retirar o reconvertir.

## D-023 — Estimación backward de fechas con brechas configurables por administración

**Estado:** aceptada.

**Contexto:** el cronograma operativo real de Italplast (Excel "Cronograma Fábrica") planifica hacia atrás: desde la fecha comprometida de inicio de instalación se derivan fin de producción, entrada a fábrica, firma de ábaco y premarcos, restando duraciones por bloque y brechas fijas de 3, 1 y 3 días. Esas brechas son regla de negocio y pueden cambiar con el tiempo.

**Decisión:** replicar el cálculo backward en el frontend (`src/frontend/src/lib/planificacion.ts`). En el alta de proyecto, cada producto operativo puede cargar una planificación opcional: fecha comprometida de inicio de instalación más días de instalación, de fábrica, de fabricación de premarcos y de instalación de premarcos (este último no existía en el Excel: cuando se carga, reemplaza a la brecha global entrega→ábaco para ubicar la entrega de premarcos; vacío, rige la brecha). Con esa ancla se estiman las fechas de cada bloque (fabricación de premarcos, instalación de premarcos, fábrica, instalación) y las tareas generadas nacen con `fechaInicio`/`fechaFin` sugeridas, siempre editables después. Las tres brechas (fin producción→instalación, firma ábaco→fábrica, entrega premarcos→ábaco) parten de 3/1/3 días y se editan solo por administradores en Configuración → Planificación (permiso `configurarPlanificacion`); persisten en `localStorage` (`control-obras-planificacion`).

**Consecuencias:** las fechas dejan de cargarse siempre a mano: sin planificación cargada el comportamiento anterior se conserva (tareas sin fechas). Cambiar las brechas afecta solo a las estimaciones futuras; no se recalculan tareas existentes. El backend futuro deberá persistir la configuración global y la planificación por producto. La cadena se corta si falta un dato: sin días de fábrica no se estiman ábaco ni premarcos.

## D-024 — Supervisores pueden crear proyectos

**Estado:** aceptada (modifica la matriz congelada en Fase 1).

**Contexto:** la definición original reservaba la creación de proyectos a administración, pero la operación real necesita que los supervisores también den de alta proyectos.

**Decisión:** `crearProyecto` pasa a incluir al rol `supervisor`. Editar, eliminar, cancelar, reactivar y reabrir proyectos siguen siendo exclusivos de administración.

**Consecuencias:** el botón "Nuevo proyecto" y el alta completa (presupuesto ejecutivo incluido) quedan disponibles para supervisores. La matriz de `docs/flujo-roles.md` queda actualizada; el backend real deberá reflejar este permiso en sus rutas de escritura.

## D-025 — Sección "Reglas y catálogo" para reglas de negocio editables

**Estado:** aceptada.

**Contexto:** las reglas operativas cambian con el tiempo: las brechas de días del cálculo backward pueden variar y pueden incorporarse nuevos tipos de producto (por ejemplo, aberturas de otro material). Esas configuraciones no deben requerir cambios de código.

**Decisión:** nueva sección **Reglas y catálogo** (`/reglas`) en el menú principal, debajo de Usuarios, visible solo para administradores (permiso `gestionarReglasNegocio`). Reúne: (a) las **brechas de planificación backward**, que se mudan desde Configuración → Planificación (la ruta `/settings/planning` redirige a `/reglas`); y (b) el **catálogo de productos**: los seis tipos estándar más los personalizados que agregue administración, cada uno con nombre y un indicador de si **lleva premarcos**. Los personalizados persisten en `localStorage` (`control-obras-catalogo-productos`), aparecen automáticamente en el alta de proyectos para administradores y supervisores, y pueden editarse (nombre y si llevan premarcos, con edición inline que conserva el slug) o retirarse del catálogo sin afectar proyectos existentes. `TipoProducto` se amplía para admitir slugs personalizados; `nombreTipoProducto` resuelve la etiqueta desde el catálogo completo.

**Consecuencias:** un producto sin premarcos no ofrece los grupos de fabricación/instalación de premarcos ni sus plazos en la planificación. Servicios conserva su regla especial (sin etapas de seguimiento). Los productos estándar no pueden eliminarse. El backend futuro deberá persistir el catálogo y validar los slugs. Las plantillas de etapas por producto siguen pendientes (D-007) y podrán sumarse a esta sección.

## D-026 — Mismos campos, filtros y acciones en Tareas y en el detalle del proyecto

**Estado:** aceptada.

**Contexto:** la sección Tareas (global) y las pestañas Fábrica/Instalación del detalle de proyecto mostraban información y controles distintos para la misma tarea: el bloque decía genéricamente "Producto · fabricación" sin indicar el producto real, el detalle de proyecto no ofrecía prioridad editable inline ni auditoría visible para administradores, y el ícono de eliminar (papelera) aparecía ahí para supervisores pese a que `permisos.eliminarTarea` es exclusivo de administradores.

**Decisión:** unificar ambas vistas para que expongan los mismos campos con las mismas condiciones por rol. (1) Nueva etiqueta de bloque `etiquetaBloque(grupo, tipoProducto)` en `lib/seguimiento-presupuesto.ts`, que usa el nombre corto del catálogo (`nombreCortoTipoProducto`, ej. "PVC", "Aluminio") en vez del genérico "Producto"; reemplaza a `ETIQUETAS_GRUPO` en Tareas, en el detalle de proyecto y en el selector de etapa de "Nueva tarea". (2) El detalle de proyecto (`SeguimientoPresupuesto.tsx`) suma prioridad editable inline (si `definirPrioridadTarea`) y auditoría de creación/modificación (si `verAuditoriaTareas`), igual que Tareas. (3) Tareas suma columna "Acciones" con lápiz/papelera, igual que el detalle. (4) Se separan los permisos de edición y borrado: `puedeEditar` ahora refleja `permisos.editarTarea` y `puedeEliminar` refleja `permisos.eliminarTarea` (antes ambos íconos dependían de un único `puedeEditar` atado a `editarAvance`, dejando borrar disponible para supervisores por error). (5) Se extrae `DialogoEditarTarea` (`components/proyectos/DialogoEditarTarea.tsx`), compartido por Tareas y por el detalle de proyecto, para que la edición sea idéntica en ambos lugares.

**Consecuencias:** en ese momento el borrado quedó reservado a administración; D-028 reemplaza esa restricción por archivado lógico para administración y supervisión con confirmación y archivo admin-only. La etiqueta de bloque distingue productos en proyectos multiproducto. Cualquier cambio futuro al diálogo de edición se aplica una sola vez en `DialogoEditarTarea` y llega a ambas vistas.

## D-027 — Esquema PostgreSQL Fase 2 y rutas /api/v2 como esqueleto del backend real

**Estado:** aceptada (esqueleto parcial; el frontend sigue en `localStorage` hasta conectarlo).

**Contexto:** el backend Express/PostgreSQL legado usa terminología anterior (`obras`, `aberturas_proyecto`, `avance_*`, `cronogramas_proyecto`) que no refleja el modelo vigente del frontend React (presupuesto ejecutivo, tareas de seguimiento con auditoría, catálogo dinámico, reglas de planificación). Conectar el frontend a esos contratos obligaría a traducir en ambos lados.

**Decisión:** crear el esquema Fase 2 con terminología nueva en la migración `src/backend/migrations/015_fase2_modelo_seguimiento.sql`, coexistiendo con las tablas legadas (que quedan para migrar datos y retirar): `catalogo_productos` (con seed de los seis estándar, `nombre_corto` y `lleva_premarcos`), `reglas_planificacion` (fila única con las tres brechas backward), `proyectos`, `proyecto_productos` (con la planificación backward por producto), `proyecto_etapas`, `presupuestos_ejecutivos` versionados + `presupuesto_items`, `evidencias` (metadata + ruta de archivo, no blobs), `tareas_seguimiento` (prioridad, auditoría, borrado lógico, `check` de evidencia obligatoria al completar) con `tarea_modificaciones` y `tarea_reaperturas`, y las transiciones (`proyecto_historial_estados`, `proyecto_pausas`, `proyecto_cierres`, `proyecto_cancelaciones`). En paralelo, `src/backend/src/http/routes/fase2-routes.js` monta `/api/v2` con JWT y la misma matriz de permisos de `roles.ts`: catálogo (CRUD, baja lógica, estándar intocables), reglas (GET/PUT), proyectos (lista con avance agregado, detalle, alta transaccional con productos y etapas) y tareas (alta manual, edición con sellado de auditoría, completar con evidencia obligatoria, reabrir con motivo obligatorio, borrado lógico solo admin).

**Consecuencias:** el modelo de datos del frontend tiene espejo 1:1 en PostgreSQL y las reglas de negocio críticas (evidencia al completar, motivo al reabrir, permisos por rol) se validan también en el servidor. Pendientes explícitos: carga del PDF del presupuesto y evidencias como archivos, transiciones de estado del tablero, generación de tareas desde el presupuesto en el servidor, y la conexión del frontend React (hoy `localStorage`). Las rutas están validadas sintácticamente pero no ejecutadas contra una base real; correr `npm run db:migrate` en `src/backend` cuando haya PostgreSQL disponible.

## D-028 — Asignación de responsables y archivo administrativo de tareas

**Estado:** aceptada.

**Contexto:** las tareas de seguimiento se creaban sin responsable y el rol Usuario recibía el listado global. Además, el retiro de tareas no distinguía entre la operación de supervisión y la revisión administrativa posterior.

**Decisión:** cada tarea conserva `responsableId`, `asignadaPorId`, fecha e historial de asignaciones. Administración puede asignar a supervisores o usuarios; supervisión solo a usuarios; Usuario no crea, edita ni asigna. Usuario ve únicamente tareas asignadas a su cuenta. Editar, reasignar y archivar requieren confirmación en la interfaz; cambiar la prioridad se aplica directamente y conserva la auditoría. Archivar es borrado lógico y queda visible en una vista administrativa con responsable, autor y momento; se registra también en `tarea_modificaciones`. PostgreSQL replica los campos y suma `tarea_asignaciones` mediante la migración 016; las rutas validan el rol destino server-side.

**Consecuencias:** `permisos.eliminarTarea` deja de ser exclusivo de administración y representa archivado para administración y supervisión. La auditoría detallada sigue siendo admin-only. Las tareas generadas desde presupuesto nacen sin responsable y deben asignarse explícitamente.

## D-029 — Catálogo editable para todos los productos, etapas opcionales configurables y auditoría silenciosa

**Estado:** aceptada (amplía D-025).

**Contexto:** solo los productos personalizados podían editarse o retirarse; los seis estándar eran inmutables. La operación necesita ajustar también los estándar (renombrar, definir qué etapas opcionales ofrecen, retirarlos si una línea deja de trabajarse) y que todo cambio quede registrado con fecha y autor sin ocupar espacio en la interfaz.

**Decisión:** (1) Todos los productos del catálogo —estándar incluidos— pueden **editarse** (nombre y disponibilidad de etapas opcionales) y **retirarse**. La baja siempre es lógica: el producto queda "Retirado" en la lista (atenuado, con botón de restaurar) y los proyectos existentes conservan su referencia; ningún producto se borra físicamente. (2) El flag único `llevaPremarcos` se desdobla en **`llevaFabricacionPremarcos`** y **`llevaInstalacionPremarcos`**: administración configura por producto cuál de los dos grupos opcionales se ofrece en el alta (Servicios sigue sin etapas y no muestra estos switches). (3) Los cambios sobre estándar se persisten como **overrides** (`control-obras-catalogo-overrides`) sin tocar la definición base; los personalizados se editan en su propia lista. (4) Cada alta, edición, baja o reactivación sella un registro de **auditoría** con fecha, usuario, acción y detalle (`control-obras-catalogo-auditoria` en Fase 2; tabla `catalogo_auditoria` en PostgreSQL vía migración `017_catalogo_editable_y_auditoria.sql`). **Ninguna pantalla la muestra**: es trazabilidad de datos para el backend. (5) Las rutas `/api/v2` de catálogo aceptan PATCH/DELETE también para estándar, suman `POST /:valor/reactivar` y sellan la auditoría en cada operación.

**Consecuencias:** el alta de proyectos ofrece solo productos activos (`obtenerCatalogoActivo`) y muestra los editores de fabricación/instalación de premarcos según el flag de cada grupo. `obtenerCatalogoProductos()` incluye retirados para resolver etiquetas de proyectos históricos. El campo `llevaPremarcos` se conserva como resumen por compatibilidad. Restaurar un producto retirado lo devuelve al alta sin pérdida de configuración.
