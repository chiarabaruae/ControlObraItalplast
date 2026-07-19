---
context_id: controlobra-project-context
context_type: current_project_state
last_updated: 2026-07-19
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
---

# Contexto vigente del proyecto

## Producto

ControlObraItalplast es una aplicación interna para gestionar clientes, proyectos, productos, etapas operativas, tareas, documentos y seguimiento de obras de Italplast.

La interfaz se presenta como **Gestión de proyectos** porque debe cubrir aberturas y otras líneas de producto.

## Estado actual

- Rama activa de trabajo: `feature/frontend-react-migration`.
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
- `supervisor`: lectura operativa, edición de avances y tareas según permisos.
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
- Las listas de tareas de Fábrica e Instalación reemplazan la carga manual de porcentaje en proyectos nuevos; la sección Tareas del menú refleja el seguimiento de todos los proyectos.
- Completar una tarea exige una evidencia de imagen; la observación es opcional.
- La imagen se redimensiona a un máximo de 1280 px y se comprime a JPEG antes de guardarse localmente.
- Cada cierre conserva usuario, fecha, evidencia y observación; una tarea completada puede consultarse o reabrirse.
- El avance de grupo, Fábrica, Instalación y proyecto se calcula como `tareas completadas / tareas totales`.
- Los proyectos anteriores sin tareas generadas mantienen el seguimiento porcentual legado para compatibilidad.

Las fuentes principales son `src/frontend/src/lib/seguimiento-presupuesto.ts`, `src/frontend/src/lib/evidencias.ts` y `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`.

## Tablero de proyectos y cambios de estado

- Proyectos permite alternar entre Tarjetas y Tablero.
- El tablero vigente agrupa en Planificadas, En progreso, Pausadas y Finalizadas.
- Administradores y supervisores pueden solicitar un cambio de estado mediante el menú de cada tarjeta; el arrastre todavía no está implementado.
- Pasar a En progreso se bloquea si no existe avance. Con avance existente, el cambio es directo.
- Pasar a Pausada exige motivo y agrega un registro a `pausas`.
- Pasar a Finalizada advierte que las tareas pendientes quedarán completas, exige al menos una evidencia y registra `cierre`.
- Volver a Planificada es directo en la implementación actual, incluso cuando existe avance.
- El modelo admite `cancelada`, pero ese estado no aparece en el tablero.
- Una tarjeta Finalizada puede ofrecer destinos anteriores, pero todavía no existe una política segura para revertir el cierre ni las tareas llevadas al 100%.

La fuente principal es `src/frontend/src/components/proyectos/TableroProyectos.tsx`.

## Persistencia y compatibilidad

- Los proyectos mock se guardan bajo la clave `control-obras-proyectos` en `localStorage`.
- El modelo nuevo usa `productos`, con una configuración de etapas por tipo.
- `tipoProducto` se conserva temporalmente para migrar proyectos creados con el modelo anterior.
- `presupuestoEjecutivo` conserva metadata e ítems revisados; `tareasPresupuesto` conserva las tareas (con fechas y manuales) y sus cierres; `pausas` y `cierre` registran las transiciones de estado.
- Las etapas agregadas al proyecto también se consolidan en las listas superiores de fábrica e instalación para mantener compatibles las tarjetas y métricas existentes.

La fuente principal del modelo mock es `src/frontend/src/mocks/data.ts`.

## Archivos clave

- `src/frontend/src/pages/Proyectos.tsx`: alta multiproducto, presupuesto obligatorio y edición local de etapas.
- `src/frontend/src/pages/ProyectoDetalle.tsx`: resumen de componentes y pestañas Fábrica/Instalación.
- `src/frontend/src/components/proyectos/PresupuestoUploader.tsx`: carga y revisión del PDF.
- `src/frontend/src/components/proyectos/SeguimientoPresupuesto.tsx`: lista de tareas y cierre con evidencia.
- `src/frontend/src/components/proyectos/TableroProyectos.tsx`: tablero por estado y transiciones condicionadas.
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
- La vista Tareas muestra el seguimiento global también al rol Usuario, aunque sus controles estén deshabilitados; debe filtrarse por responsabilidad antes de producción.
- El tablero todavía usa un menú para mover proyectos; no admite arrastre.
- `cancelada` existe en el modelo, pero no tiene columna, motivo ni flujo de reactivación.
- Reanudar una pausa, regresar a Planificada o reabrir una Finalizada no tiene todavía reglas completas de auditoría y reversión.
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
