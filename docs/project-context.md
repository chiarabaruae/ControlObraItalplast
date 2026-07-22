---
context_id: controlobra-project-context
context_type: current_project_state
last_updated: 2026-07-22
branch: feature/frontend-react-migration
tags:
  - italplast
  - react
  - typescript
  - project-management
  - multi-product
  - stages
  - executive-budget
  - pdf-parsing
  - evidence
  - user-management
  - task-management
  - kanban
  - table-filters
  - task-creation
---

# Contexto vigente del proyecto

## Producto

ControlObraItalplast es una aplicación interna para gestionar clientes, proyectos, productos, etapas operativas, tareas, documentos y seguimiento de obras de Italplast.

La interfaz se presenta como **Gestión de proyectos** porque debe cubrir aberturas y otras líneas de producto.

## Estado actual

- Rama activa de trabajo: `feature/frontend-react-migration` (adelantada respecto de `main`, que quedó publicada el 2026-07-19). Los cambios de UI del 2026-07-21 viven en esta rama vía PR #4.
- Frontend activo: React, TypeScript, Vite, Tailwind CSS y componentes shadcn/Radix.
- Versión visible: `AppWebb v0.2.0`.
- La Fase 2 usa datos mock y persistencia temporal en `localStorage`.
- El backend Express/PostgreSQL permanece en el repositorio, pero el nuevo frontend React todavía no está conectado a todas sus rutas reales.
- Comandos principales desde `src/frontend`: `npm run dev`, `npm run build` y `npm run lint`.
- Diagnóstico de lectores PDF: `npm run diagnostico:presupuestos -- <archivo-1.pdf> <archivo-2.pdf>`.

## Identidad visual y acceso

- Color predeterminado: azul oficial de Italplast `#0060AF`.
- El logo Italplast aparece en login, favicon y parte superior del sidebar.
- El login solicita Documento y Contraseña; no permite seleccionar roles manualmente.
- Existe un flujo mock de recuperación de contraseña por documento.
- Configuración contiene Cuenta, Personalizar y Actualizaciones.
- Soporte contiene Documentación y Contactar soporte.
- Los paneles Configuración y Soporte usan popovers animados y suaves.

## Navegación activa

- `/dashboard`
- `/clientes`
- `/proyectos`
- `/proyectos/:id`
- `/tareas`
- `/usuarios`
- `/settings/account`
- `/settings/appearance`
- `/settings/updates`
- `/support/documentation`
- `/support/contact`

La fuente de rutas es `src/frontend/src/App.tsx`.

## Roles

- `administrator`: control total, creación de proyectos y gestión de usuarios.
- `supervisor`: lectura operativa, creación de proyectos, edición de avances y tareas según permisos.
- `viewer`, mostrado como **Usuario**: consulta y tareas propias.

La matriz funcional completa está en `docs/flujo-roles.md`. La implementación frontend está centralizada en `src/frontend/src/lib/roles.ts`.

## Gestión de usuarios

- La ruta `/usuarios` continúa restringida a administradores.
- La tabla presenta Usuario, Área, Rol y Acciones. Bajo Acciones agrupa los íconos de editar, cambiar contraseña y archivar/reactivar.
- Editar usa un ícono de lápiz y abre una ventana con nombre, área, rol, correo y número de teléfono.
- Nuevo usuario reutiliza la misma ventana. Nombre, área y rol son obligatorios; correo y teléfono son opcionales.
- Cambiar contraseña se representa en cada fila únicamente con un ícono de llave y conserva una etiqueta accesible.
- En Fase 2, altas y modificaciones viven en el estado local de la pantalla; la persistencia y la creación de credenciales reales quedan pendientes del backend.

La fuente principal es `src/frontend/src/pages/Usuarios.tsx`; el tipo mock vive en `src/frontend/src/mocks/data.ts`.

## Creación de proyectos multiproducto

Un proyecto puede seleccionar varios tipos de producto:

- Aberturas de aluminio.
- Aberturas de PVC.
- Mosquiteras.
- Persianas.
- Aberturas Velux de techo.
- Servicios.

Cada tipo seleccionado conserva una configuración independiente. Desmarcar un producto oculta su editor; volver a marcarlo durante la misma creación recupera su configuración temporal.

La configuración se agrupa por tipo, no por unidad o lote. Si dos partidas del mismo tipo necesitan condiciones distintas, todavía será necesario modelar lotes o partidas de producto.

## Presupuesto ejecutivo como fuente de verdad

- El alta exige la última versión del **presupuesto ejecutivo en PDF** y al menos un componente verificado.
- El término anterior para la planilla de aberturas quedó retirado de la interfaz y del modelo activo.
- PDF.js extrae texto embebido localmente en el navegador; los documentos analizados no requieren OCR.
- Se reconocen tres familias iniciales: tabla exportada desde Excel, oferta Preference y propuesta Preference Mercosul.
- La lectura nunca se confirma sola: el formulario presenta una tabla editable para corregir, agregar, eliminar y reasignar componentes a los productos seleccionados.
- Cada componente conserva posición, código, ambiente, cantidad, medidas, descripción, serie, color, vidrio/detalle y tipo de producto.
- El archivo PDF no se persiste completo en Fase 2; se guardan su metadata y los componentes verificados en `localStorage`.

Las fuentes principales son `src/frontend/src/lib/presupuesto-parser.ts`, `src/frontend/src/lib/pdf-text.ts` y `src/frontend/src/components/proyectos/PresupuestoUploader.tsx`.

## Etapas por producto

Para cada producto distinto de Servicios existen cuatro grupos:

1. Fabricación de premarcos: opcional.
2. Instalación de premarcos: opcional e independiente de la fabricación.
3. Etapas de fábrica del producto: obligatorias.
4. Etapas de instalación del producto: obligatorias.

Cada subetapa puede seleccionarse, renombrarse, eliminarse o agregarse antes de crear el proyecto. Los cambios afectan solamente a ese producto dentro del proyecto.

Servicios no genera etapas de premarcos, fábrica o instalación, pero puede coexistir con otros productos que sí las tengan.

El detalle usa dos pestañas operativas. **Fábrica** reúne fabricación de premarcos y del producto; **Instalación** reúne instalación de premarcos y del producto. Dentro de cada pestaña, las tareas se muestran como lista con fechas de inicio/entrega, separadas por producto y bloque; el supervisor puede agregar, renombrar, refechar o eliminar tareas.

## Tareas, evidencia y avance automático

- Al crear el proyecto se genera una tarea por combinación `componente × etapa activa` del producto asignado.
- Las listas de tareas de Fábrica e Instalación reemplazan completamente la carga manual de porcentaje; los controles `+ / −` fueron retirados del detalle.
- La sección Tareas del menú lee las mismas `tareasPresupuesto` persistidas por cada proyecto, permite filtrar por proyecto y usa el mismo diálogo de cierre. Un cambio realizado allí se refleja al volver al detalle y viceversa.
- La tabla "Tareas internas" fue retirada de la sección Tareas: solo existen tareas dependientes de una etapa. El tipo `Tarea` y `tareasIniciales` quedan como legado (Dashboard y pestaña Tareas del detalle), pendientes de retirar o reconvertir.
- Cada tarea tiene una **prioridad** (baja/media/alta/urgente, por defecto media) que solo administradores y supervisores pueden definir: selector inline en la tabla de Tareas y campos en los formularios de alta/edición. Los demás roles la ven como etiqueta.
- **Reabrir una tarea completada exige motivo obligatorio para todos los roles.** Se registran fecha, usuario y motivo en `reaperturas`, y el cambio queda en el historial `modificaciones`.
- Auditoría por tarea: `creadaEn`, `version`, `modificadaEn`, `modificadaPorId`, `modificaciones` y `reaperturas`. En la tabla de Tareas, las columnas **Creación** y **Modificación** son visibles solo para administradores (permiso `verAuditoriaTareas`).
- Eliminar una tarea es un borrado lógico: pasa a `tareasEliminadas` del proyecto con `eliminadaEn`/`eliminadaPorId`; ninguna interfaz la muestra.
- La acción primaria para completar siempre se representa con un ícono de check. La evidencia continúa siendo obligatoria dentro del diálogo, pero ya no se representa con una cámara en la lista.
- Completar una tarea exige una evidencia de imagen; la observación es opcional.
- La imagen se redimensiona a un máximo de 1280 px y se comprime a JPEG antes de guardarse localmente.
- Cada cierre conserva usuario, fecha, evidencia y observación; una tarea completada puede consultarse o reabrirse.
- El avance de grupo, Fábrica, Instalación y proyecto se calcula como `tareas completadas / tareas totales`.
- Los cuatro proyectos mock fueron enriquecidos con componentes, productos, fechas y tareas ficticias para probar el flujo sin cargar PDFs. Torre Aviadores incluye fabricación e instalación de premarcos para aluminio. Las tareas cerradas usan una imagen identificada expresamente como evidencia demostrativa.
- Los proyectos reales anteriores sin componentes ni tareas muestran un estado pendiente de generación; ya no vuelven al editor porcentual legado.

Las fuentes principales son `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/lib/evidencias.ts` y `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`.

## Estimación backward de fechas (cronograma de fábrica)

- Cada producto operativo del alta puede cargar una **planificación opcional**: fecha comprometida de inicio de instalación, días de instalación, días de fábrica y días de fabricación de premarcos.
- Con esa ancla se calculan hacia atrás (backward) los hitos: fin de producción, inicio de fábrica, firma de ábaco, entrega de premarcos e inicio de fabricación de premarcos, usando tres **brechas configurables** (predeterminadas 3/1/3 días).
- Las tareas generadas desde el presupuesto nacen con `fechaInicio`/`fechaFin` según el bloque; siguen siendo editables tarea por tarea. Sin planificación cargada, nacen sin fechas como antes.
- Las brechas se editan solo por administradores en **Configuración → Planificación** (`/settings/planning`, permiso `configurarPlanificacion`) y persisten en `localStorage` (`control-obras-planificacion`). Cambiarlas no recalcula tareas existentes.
- Fuentes: `src/frontend/src/lib/planificacion.ts` (cálculo y persistencia), `src/frontend/src/pages/Planificacion.tsx` (pantalla), integración en `src/frontend/src/lib/seguimiento-presupuesto.ts` y `src/frontend/src/pages/Proyectos.tsx`.

## Alta de tareas en cascada (sección Tareas)

- El botón "Nueva tarea" abre un panel de selección en pasos dependientes: **cliente → proyecto → producto → etapa (bloque) → nombre, prioridad y fechas**. Cada nivel se habilita solo cuando el anterior está resuelto y ofrece únicamente opciones válidas del nivel superior; solo participan proyectos con seguimiento ya generado.
- La tarea nueva se guarda como `TareaPresupuesto` manual en `tareasPresupuesto` del proyecto elegido y aparece de inmediato en el seguimiento; no puede quedar huérfana ni en combinaciones inexistentes.
- Fuente: `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`, cableada desde `src/frontend/src/pages/Todo.tsx`. Reutiliza `gruposDeProducto` exportado por `src/frontend/src/lib/seguimiento-presupuesto.ts`.

## Filtro y orden por columna en tablas de gestión

- Las tablas de Clientes, Usuarios y Tareas (seguimiento e internas) tienen un ícono de filtro por columna, al estilo de una planilla: **ordenar** y **filtrar por valores** de esa columna, sin otras funciones.
- Las etiquetas de orden se adaptan al tipo de dato: texto `A → Z / Z → A`, números `De menor a mayor / De mayor a menor`, fechas `Más recientes primero / Más antiguas primero`. La lista de valores del filtro respeta ese orden (fechas cronológicas, números por magnitud).
- El aviso "Mostrando X de Y · Quitar filtros" y el de truncado de filas se ubican **sobre** la tabla, con borde inferior.
- El selector de vista de Proyectos (Tarjetas/Tablero) quedó solo con íconos, con tooltip y texto accesible.
- Fuentes: hook `src/frontend/src/lib/tabla-filtros.ts` (`useTablaFiltrable`, con tipos de columna) y `src/frontend/src/components/app/EncabezadoFiltrable.tsx` (`EncabezadoFiltrable`, `AvisoFiltros`). El estado de orden/filtro no se persiste entre sesiones.

## Tablero de proyectos y cambios de estado

- Proyectos permite alternar entre Tarjetas y Tablero.
- El tablero presenta Planificadas, En progreso, Pausadas y Finalizadas como columnas horizontales contiguas, con desplazamiento lateral en pantallas angostas.
- Administradores y supervisores pueden arrastrar una tarjeta por su asa o usar su menú accesible. Ningún cambio manual se aplica sin confirmación, validación o dato obligatorio.
- Pasar a En progreso se bloquea si no existe avance; el primer cierre de tarea realiza esa transición automáticamente.
- Un proyecto con avance no puede volver a Planificada.
- Pasar a Pausada exige motivo y agrega un registro a `pausas`; reanudar exige una observación y cierra el registro de pausa abierto.
- Pasar a Finalizada advierte que las tareas pendientes quedarán completas, exige al menos una evidencia y registra `cierre`.
- Finalizada no es un origen de arrastre. Solo un administrador puede reabrirla mediante una acción especial con motivo; vuelve a En progreso y conserva los cierres de tareas existentes.
- Cancelar es una acción administrativa separada del flujo de columnas, exige motivo y mueve el proyecto al bloque de cancelados. Reactivar también exige motivo y devuelve a Planificada o En progreso según conserve avance.
- `historialEstados` registra origen, destino, usuario, fecha y motivo cuando corresponde. `pausas`, `cierre` y `cancelacion` conservan además el detalle propio de cada transición especial.

La fuente principal es `src/frontend/src/components/proyectos/TableroProyectos.tsx`.

## Persistencia y compatibilidad

- Los proyectos mock se guardan bajo la clave `control-obras-proyectos` en `localStorage`.
- El modelo nuevo usa `productos`, con una configuración de etapas por tipo.
- `tipoProducto` se conserva temporalmente para migrar proyectos creados con el modelo anterior.
- `presupuestoEjecutivo` conserva metadata e ítems revisados; `tareasPresupuesto` conserva las tareas (con fechas, prioridad, auditoría y manuales) y sus cierres; `tareasEliminadas` guarda el borrado lógico; `pausas`, `cierre`, `cancelacion` e `historialEstados` registran las transiciones de estado.
- Las etapas agregadas al proyecto también se consolidan en las listas superiores de fábrica e instalación para mantener compatibles las tarjetas y métricas existentes.

La fuente principal del modelo mock es `src/frontend/src/mocks/data.ts`.

## Archivos clave

- `src/frontend/src/pages/Proyectos.tsx`: alta multiproducto, presupuesto obligatorio y edición local de etapas.
- `src/frontend/src/pages/ProyectoDetalle.tsx`: resumen de componentes y pestañas Fábrica/Instalación.
- `src/frontend/src/components/proyectos/PresupuestoUploader.tsx`: carga y revisión del PDF.
- `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`: lista de tareas y cierre con evidencia.
- `src/frontend/src/components/proyectos/TableroProyectos.tsx`: tablero horizontal arrastrable y transiciones condicionadas.
- `src/frontend/src/components/proyectos/DialogoNuevaTarea.tsx`: alta de tareas en cascada (cliente→proyecto→producto→etapa).
- `src/frontend/src/lib/tabla-filtros.ts` y `src/frontend/src/components/app/EncabezadoFiltrable.tsx`: filtro y orden por columna reutilizables.
- `src/frontend/src/lib/presupuesto-parser.ts`: detección y parsing de los tres formatos.
- `src/frontend/scripts/diagnostico-presupuestos.ts`: prueba repetible con PDFs reales provistos externamente.
- `src/frontend/src/mocks/data.ts`: tipos, defaults, mocks, migración local y persistencia.
- `src/frontend/src/components/app/AppShell.tsx`: navegación y popovers Settings/Support.
- `src/frontend/src/context/auth.tsx`: sesión mock.
- `src/frontend/src/lib/roles.ts`: permisos frontend.
- `docs/flujo-roles.md`: especificación funcional detallada.

## Limitaciones conocidas

- No existe backend real para el alta multiproducto ni para persistir cambios de avance.
- El backend legado todavía conserva contratos y columnas con la terminología anterior al presupuesto ejecutivo; deben migrarse antes de conectar este flujo React.
- La lectura usa heurísticas sobre texto embebido. Los PDFs escaneados sin texto y formatos no reconocidos requieren carga manual; no hay OCR.
- Las evidencias viven temporalmente como imágenes comprimidas en `localStorage`; el límite de cuota del navegador impide usarlo como repositorio definitivo.
- Las tareas se generan por componente presupuestado y etapa, no por cada unidad individual cuando `cantidad > 1`.
- Las tareas generadas todavía no tienen responsable; en Fase 2 las completan administradores o supervisores.
- Los componentes, fechas, cierres y evidencias agregados a los cuatro proyectos iniciales son datos ficticios de demostración y no deben interpretarse como registros operativos reales.
- La vista Tareas muestra el seguimiento global también al rol Usuario, aunque sus controles estén deshabilitados; debe filtrarse por responsabilidad antes de producción.
- La reapertura de una Finalizada conserva las tareas completadas al 100%; todavía no existe una operación para revertir masivamente esos cierres, por lo que deben agregarse o reabrirse tareas en forma explícita.
- No existe administración global de plantillas de productos y etapas.
- Las futuras plantillas globales solo deben ser modificables por administradores y supervisores autorizados.
- No se modelan cantidades, lotes o partidas independientes de un mismo tipo de producto.
- El dashboard todavía se apoya principalmente en datos mock estáticos.
- El flujo de recuperación de contraseña y Check for updates es demostrativo.
- Las altas y ediciones de usuarios no persisten al recargar ni crean credenciales reales hasta conectar el backend.
- No existe una base vectorial ni indexación automática; los documentos están preparados para incorporarla posteriormente.

## Validación esperada antes de publicar

Desde `src/frontend`:

```bash
npm run build
npm run lint
```

El lint puede mostrar advertencias preexistentes de Fast Refresh en componentes UI y `context/auth.tsx`; no deben confundirse con errores nuevos.
