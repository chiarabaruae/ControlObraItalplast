---
context_id: controlobra-decisions
context_type: architecture_decisions
last_updated: 2026-07-19
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

**Consecuencias:** desaparece el ajuste manual de porcentaje en proyectos nuevos. Las evidencias se comprimen en Fase 2, pero el backend deberá almacenarlas como archivos auditables y no como datos en el navegador.

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

**Consecuencias:** los estados dejan de ser un campo editable a mano y pasan a reflejar reglas operativas trazables. La implementación inicial usa un menú; el arrastre, la confirmación de todos los movimientos y las políticas para cancelación, reapertura y retorno a Planificada requieren una definición adicional antes de ampliarla.

## D-016 — Interfaz íntegramente en español

**Estado:** aceptada.

**Decisión:** todo texto visible para la persona usuaria va en español (Configuración, Soporte, Cuenta, Actualizaciones, Documentación, Contactar soporte, Inicio, Buscar actualizaciones). Los identificadores de código y rutas pueden permanecer en inglés.

**Consecuencias:** los rótulos ingleses previos quedan prohibidos en UI; el criterio aplica a toda pantalla nueva.
