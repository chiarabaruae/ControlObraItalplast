---
context_id: controlobra-change-log
context_type: implementation_history
last_updated: 2026-07-22
tags:
  - changelog
  - commits
  - frontend
  - project-context
  - executive-budget
  - diagnostics
  - user-management
---

# Registro contextual de cambios

Este registro resume cambios materiales. Git continúa siendo la fuente exacta de diffs y autores.

## 2026-07-22 — Plazo de instalación de premarcos en la planificación backward

**Alcance:** la planificación por producto suma "Días de instalación de premarcos" (faltaba también en el Excel de referencia).

**Impacto:** el campo aparece solo cuando el producto tiene instalación de premarcos activa. Si se carga, esa ventana reemplaza a la brecha global entrega→ábaco para ubicar la entrega de premarcos hacia atrás desde la firma del ábaco; vacío, sigue rigiendo la brecha configurada por administración.

**Archivos clave:** `src/frontend/src/lib/planificacion.ts`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/pages/Proyectos.tsx`, `docs/decisions.md` (D-023 ampliada).

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador (con 6 días cargados la entrega de premarcos pasa del 3 ago a 31 jul para ábaco del 6 ago).

## 2026-07-22 — Supervisores pueden crear proyectos

**Alcance:** el permiso `crearProyecto` se extiende al rol `supervisor` (D-024).

**Impacto:** el botón "Nuevo proyecto" y el alta completa quedan disponibles para supervisores. Editar, eliminar, cancelar, reactivar y reabrir proyectos siguen siendo exclusivos de administración.

**Archivos clave:** `src/frontend/src/lib/roles.ts`, `docs/flujo-roles.md`, `docs/decisions.md`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como supervisor (botón visible y diálogo de alta operativo) y como Usuario (botón oculto).

## 2026-07-22 — Estimación backward de fechas con brechas configurables

**Alcance:** se traduce la lógica del Excel "Cronograma Fábrica" al frontend: desde la fecha comprometida de inicio de instalación se estiman hacia atrás las fechas de cada bloque del seguimiento.

**Impacto:** el alta de proyecto permite cargar por producto una planificación opcional (fecha comprometida de instalación, días de instalación, de fábrica y de premarcos) con vista previa de los hitos estimados (entrega de premarcos, firma de ábaco, inicio de fábrica, fin de producción, fin de instalación). Las tareas generadas desde el presupuesto nacen con `fechaInicio`/`fechaFin` por bloque, editables como siempre. Las tres brechas entre hitos (3/1/3 días por defecto) son regla de negocio editable solo por administradores en la nueva pantalla Configuración → Planificación; persisten en `localStorage` bajo `control-obras-planificacion`. Sin planificación cargada, las tareas siguen naciendo sin fechas.

**Archivos clave:** `src/frontend/src/lib/planificacion.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/pages/Planificacion.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/lib/roles.ts`, `src/frontend/src/components/app/AppShell.tsx`, `src/frontend/src/App.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como administrador (edición y persistencia de brechas, restauración de predeterminados, vista previa backward correcta: 20 ago −3 → fin producción 17 ago, −10 → inicio fábrica 7 ago, −1 → ábaco 6 ago, −3 → premarcos 3 ago) y como supervisor (ruta /settings/planning redirige a dashboard y la opción no aparece).

## 2026-07-22 — Reapertura justificada, auditoría de tareas, prioridad y retiro de tareas internas

**Alcance:** trazabilidad completa de las tareas de seguimiento y simplificación de la sección Tareas.

**Impacto:** reabrir una tarea completada exige un motivo obligatorio para todos los roles; se registran fecha, usuario y motivo (`reaperturas`) y cada cambio queda en `modificaciones` con `version`, `modificadaEn` y `modificadaPorId`. Las tareas guardan `creadaEn`; eliminar pasa a ser borrado lógico hacia `tareasEliminadas` (solo datos, sin UI). La tabla de Tareas suma la columna Prioridad (selector inline para administradores y supervisores; etiqueta de solo lectura para el resto) y las columnas Creación y Modificación visibles únicamente para administradores. La tabla "Tareas internas" se retiró: la sección muestra solo tareas dependientes de etapas. La prioridad también se define en los formularios de alta (cascada y por bloque) y edición.

**Archivos clave:** `src/frontend/src/mocks/data.ts`, `src/frontend/src/lib/roles.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/lib/format.ts`, `src/frontend/src/components/proyectos/DialogoCompletarTarea.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador como administrador (reapertura con motivo obligatorio, registro persistido en `localStorage`, columnas de auditoría con versión y autor) y como supervisor (prioridad editable, columnas de auditoría ocultas).

## 2026-07-21 — Alta de tareas en cascada y avisos de filtro sobre la tabla

**Alcance:** el botón "Nueva tarea" de la sección Tareas abre un panel de selección en cascada; los avisos de filtro y de truncado se muestran arriba de cada tabla en lugar de debajo.

**Impacto:** para crear una tarea de seguimiento el usuario elige, paso a paso, cliente → proyecto → producto → etapa (bloque), y recién ahí completa nombre y fechas. Cada paso se habilita solo cuando el anterior está resuelto y ofrece únicamente las opciones válidas del nivel superior. La tarea nueva se guarda en `tareasPresupuesto` del proyecto y aparece de inmediato en el seguimiento. El aviso "Mostrando X de Y · Quitar filtros" y el de "Mostrando 30 de N" pasaron al tope de la tabla (con borde inferior) en Clientes, Usuarios y Tareas.

**Archivos clave:** `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/components/app/EncabezadoFiltrable.tsx`, `src/frontend/src/lib/seguimiento-presupuesto.ts` (export de `gruposDeProducto`), `src/frontend/src/pages/Clientes.tsx`, `src/frontend/src/pages/Usuarios.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador del alta en cascada (cliente→proyecto→producto→etapa→nombre+fechas) con persistencia confirmada, y avisos ubicados arriba.

## 2026-07-21 — Filtro y orden por columna en las tablas, con etiquetas por tipo de dato

**Alcance:** las tablas de Clientes, Usuarios y Tareas (seguimiento e internas) suman un ícono de filtro por columna, al estilo de una planilla.

**Impacto:** cada columna permite ordenar y filtrar por sus valores. Las etiquetas de orden se adaptan al dato: texto usa "A → Z / Z → A", los números "De menor a mayor / De mayor a menor" y las fechas "Más recientes primero / Más antiguas primero". La lista de valores del filtro también respeta ese orden (fechas cronológicas, números por magnitud). El selector de vista de Proyectos pasó a mostrar solo íconos (con tooltip y texto accesible). El estado de orden y filtro vive en el hook `useTablaFiltrable` y no se persiste.

**Archivos clave:** `src/frontend/src/lib/tabla-filtros.ts`, `src/frontend/src/components/app/EncabezadoFiltrable.tsx`, `src/frontend/src/pages/Clientes.tsx`, `src/frontend/src/pages/Usuarios.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/Proyectos.tsx`.

**Validaciones:** `tsc -b` y `npm run lint` sin errores nuevos; recorrida en navegador de las tres tablas (orden de números y fechas, filtro por valor y aviso de filtros activos).

## 2026-07-19 — Promoción de la migración React a main y README vigente

**Alcance:** se actualizan el README principal y la guía del frontend antes de integrar `feature/frontend-react-migration` en `main` mediante fast-forward.

**Impacto:** el punto de entrada del repositorio describe la Fase 2 real: proyectos multiproducto, presupuesto ejecutivo, listas de tareas con evidencia, sincronización global, avance por checks, Kanban condicionado, ejecución local y credenciales mock. `main` pasa a ser la rama estable que contiene la migración React vigente.

**Archivos clave:** `README.md`, `src/frontend/README.md`, `docs/project-context.md`, `docs/change-log.md`.

**Validaciones:** comprobación de que `origin/main` es ancestro de la feature, `npm run build`, `npm run lint`, `git diff --check` y publicación de ambas ramas sobre el mismo commit.

## 2026-07-19 — Tareas demostrativas sincronizadas y avance solo por checks

**Alcance:** los proyectos mock existentes reciben presupuestos, productos y tareas ficticias para visualizar el seguimiento vigente; se retira el editor manual de porcentajes.

**Impacto:** Fábrica e Instalación muestran listas por componente y etapa en Torre Aviadores, Ykua Sati, Ñasaindy y Dúplex Lambaré. Torre Aviadores incluye premarcos de aluminio. Las mismas tareas aparecen en la sección Tareas, que suma filtro por proyecto; completar o reabrir desde una vista se refleja en la otra. Todos los disparadores de cierre usan check y la evidencia se solicita dentro del diálogo. Las evidencias precargadas están identificadas como demostrativas.

**Archivos clave:** `src/frontend/src/mocks/data.ts`, `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`.

**Validaciones:** `npm run build`, `npm run lint`, `git diff --check` y simulación localhost de reapertura en el detalle, cierre desde Tareas y verificación posterior en el detalle.

## 2026-07-19 — Kanban horizontal arrastrable y ciclo de estados seguro

**Alcance:** la vista Tablero adopta columnas horizontales, tarjetas arrastrables y una política completa de transición, cancelación y reapertura.

**Impacto:** administradores y supervisores pueden arrastrar o usar el menú, siempre con la misma confirmación o condición. En progreso exige avance, Planificada rechaza proyectos con avance, pausa y reanudación guardan motivo, y finalizar conserva su advertencia y evidencia. Cancelar, reactivar y reabrir son acciones especiales exclusivas de administración con motivo obligatorio. El modelo suma auditoría general en `historialEstados` y datos de reanudación, reapertura y cancelación.

**Archivos clave:** `src/frontend/src/components/proyectos/TableroProyectos.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/lib/roles.ts`, `src/frontend/src/mocks/data.ts`, `src/frontend/package.json`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`.

**Validaciones:** `npm run build`, `npm run lint`, `git diff --check` y simulación en localhost del tablero, arrastre y diálogos condicionados.

## 2026-07-19 — Auditoría contextual de tareas y tablero

**Alcance:** se verificó el commit `e294af1` ya publicado y se completó la documentación especializada que faltaba.

**Impacto:** se documentan la lista de tareas con fechas, la integración con Tareas, permisos y reglas actuales del tablero. También quedan explícitos los pendientes de cancelación, reanudación, reapertura, retorno a Planificada, arrastre y visibilidad de seguimiento para Usuario.

**Archivos clave:** `docs/context-index.md`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`, `docs/change-log.md`.

**Validaciones:** `npm run build`, `npm run lint`, revisión del commit y recorrida localhost de Tarjetas/Tablero, cambio directo, restauración del estado de prueba, diálogo de pausa, diálogo de cierre y Tareas global.

## 2026-07-19 — Tareas en lista, tablero por estado e interfaz 100% en español

**Alcance:** el seguimiento por presupuesto deja la matriz y pasa a lista de tareas con fechas; Proyectos suma vista Tablero con transiciones condicionadas; toda la interfaz queda en español.

**Impacto:** cada tarea muestra fecha de inicio/entrega editables y el supervisor puede agregar, renombrar o eliminar tareas por bloque. La sección Tareas del menú junta las tareas internas con el seguimiento de todos los proyectos y completa con el mismo diálogo de evidencia. En el tablero: pasar a En progreso exige avance previo (el cambio es automático con el primer avance), pausar exige motivo registrado y finalizar advierte que todo queda al 100% y exige al menos una evidencia. Configuración/Soporte/Cuenta/Actualizaciones/Documentación/Contactar soporte/Inicio reemplazan los rótulos en inglés. `vite.config.ts` excluye `pdfjs-dist` del optimizador (colgaba el arranque del dev server).

**Archivos clave:** `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/components/proyectos/DialogoCompletarTarea.tsx`, `src/frontend/src/components/proyectos/TableroProyectos.tsx`, `src/frontend/src/pages/Todo.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/mocks/data.ts`, `src/frontend/src/components/app/AppShell.tsx`, `src/frontend/vite.config.ts`.

**Validaciones:** `tsc -b` y `npm run lint` limpios; recorrida en navegador de lista de tareas, Tareas global, tablero y los tres diálogos de transición.

**Pendiente:** lógica de estimación de fechas del cronograma (Excel de referencia a incorporar).

## 2026-07-19 — Alta y edición de usuarios

**Alcance:** se organiza la tabla de usuarios y se incorpora una ventana compartida para alta y edición.

**Impacto:** la edición permite actualizar nombre, área, rol, correo y teléfono; los tres primeros campos son obligatorios. La tabla muestra Usuario, Área, Rol y Acciones; bajo Acciones agrupa el lápiz, la llave y archivar/reactivar.

**Archivos clave:** `src/frontend/src/pages/Usuarios.tsx`, `src/frontend/src/mocks/data.ts`, `docs/project-context.md`, `docs/decisions.md`, `docs/flujo-roles.md`.

**Validación:** `npm run build`, `npm run lint` y simulación localhost de alta, validación de obligatorios, edición, cambio de rol, presencia de iconos y recarga sin errores nuevos en consola.

## 2026-07-19 — Presupuesto ejecutivo, tareas y evidencia

**Alcance:** el presupuesto ejecutivo PDF pasa a ser obligatorio en el alta; se extraen y revisan componentes y se genera una matriz de tareas por etapa.

**Impacto:** PDF.js reconoce tabla Excel, Preference y Preference Mercosul sin OCR. Fábrica e Instalación agrupan premarcos y producto. Cada cierre exige imagen, admite observación y recalcula el avance automáticamente.

**Archivos clave:** `src/frontend/src/lib/presupuesto-parser.ts`, `src/frontend/src/lib/pdf-text.ts`, `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/lib/evidencias.ts`, `src/frontend/src/components/proyectos/PresupuestoUploader.tsx`, `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`, `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/mocks/data.ts`.

**Validación:** `npm run build`, `npm run lint`, diagnóstico automatizado con los tres PDFs reales (4, 34 y 9 componentes), y simulación localhost de alta, generación de matrices, cierre con evidencia, recarga y persistencia.

## 2026-07-18 — Contexto durable para agentes

**Alcance:** se establece una práctica obligatoria de documentación previa a cada commit/push.

**Impacto:** los agentes disponen de un índice, estado vigente, decisiones y registro de cambios preparados para recuperación semántica. Se reemplazan notas de entrada obsoletas y se aclara que todavía no existe una base vectorial real.

**Archivos clave:** `AGENTS.md`, `codex.md`, `README.md`, `src/frontend/README.md`, `docs/context-index.md`, `docs/project-context.md`, `docs/decisions.md`, `docs/change-log.md`, `docs/architecture.md`, `docs/flujo-roles.md`.

**Validación:** enlaces, coherencia entre documentos, estado Git y revisión de términos obsoletos.

## 2026-07-18 — Proyectos multiproducto

**Commit:** `e8a64ce`.

**Alcance:** un proyecto admite varios tipos de producto, cada uno con etapas independientes.

**Impacto:** aluminio y PVC, por ejemplo, pueden tener condiciones de premarcos diferentes dentro de la misma obra. Servicios no genera etapas. El detalle agrupa seguimientos por producto.

**Archivos clave:** `src/frontend/src/pages/Proyectos.tsx`, `src/frontend/src/pages/ProyectoDetalle.tsx`, `src/frontend/src/mocks/data.ts`, `docs/flujo-roles.md`.

**Validación:** TypeScript/Vite build, Oxlint, servidor localhost y comprobación visual del selector múltiple.

## 2026-07-18 — Mejoras de usuarios y alta inicial de proyectos

**Commit:** `7fbd1b1`.

**Alcance:** alta mock de proyectos, persistencia local, mejoras en gestión de usuarios y cambio de To-Do a Tareas.

**Impacto:** establece el flujo que posteriormente evolucionó al modelo multiproducto.

## 2026-07-18 — Popovers suaves de Settings y Support

**Commit:** `d33724e`.

**Alcance:** rediseño de desplegables laterales con iconos y animación suave.

## 2026-07-18 — Marca Italplast, login y utilidades del sidebar

**Commit:** `9d6066a`.

**Alcance:** rebranding a Gestión de proyectos, login por Documento, recuperación de contraseña mock, Settings, Support, Account, Updates y avatar.

## 2026-07-17 — Migración inicial a React

**Commit:** `d2979cf`.

**Alcance:** React, Vite, TypeScript, Tailwind y shadcn/UI con datos mock para Fase 2.
