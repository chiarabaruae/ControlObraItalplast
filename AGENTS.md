# Instrucciones para agentes

Always use Context7 automatically when I need library/API documentation, framework references, setup/configuration steps, or code generation based on up-to-date documentation.

## Contexto obligatorio antes de trabajar

Antes de modificar código o documentación:

1. Leer `docs/context-index.md` para ubicar las fuentes de verdad.
2. Leer completo `docs/project-context.md` para conocer el estado vigente.
3. Leer `docs/decisions.md` y la documentación de dominio relacionada con la tarea.
4. Consultar `docs/change-log.md` cuando sea necesario entender cambios recientes.

No asumir que una nota histórica sigue vigente si contradice las fuentes canónicas anteriores.

## Regla obligatoria antes de commit y push

La documentación forma parte de la definición de terminado. Antes de crear cualquier commit que cambie comportamiento, arquitectura, datos, interfaz, permisos o flujo operativo:

- Actualizar `docs/project-context.md` si cambió el estado actual del sistema.
- Registrar decisiones duraderas y sus consecuencias en `docs/decisions.md`.
- Agregar una entrada breve a `docs/change-log.md` con fecha, alcance, impacto, archivos clave y validaciones.
- Actualizar la documentación especializada correspondiente, por ejemplo `docs/flujo-roles.md` cuando cambien roles, proyectos o etapas.
- Actualizar `last_updated` en los documentos con frontmatter que hayan cambiado.
- Incluir las actualizaciones `.md` en el mismo commit que el código relacionado.

Si un cambio no requiere modificar documentación, verificarlo explícitamente antes del commit. No copiar diffs completos, secretos, credenciales, datos personales ni información temporal irrelevante a los archivos de contexto.

## Formato preparado para recuperación semántica

- Mantener frontmatter con `context_id`, `context_type`, `last_updated` y `tags` en los documentos canónicos.
- Usar encabezados estables y descriptivos.
- Mantener una idea principal por sección y párrafos breves.
- Registrar decisiones como contexto, decisión y consecuencias.
- Enlazar a archivos fuente en vez de duplicar bloques extensos de código.
- Marcar claramente limitaciones, trabajo pendiente y contenido histórico.

Estas reglas hacen que el contexto sea fácil de leer y quede preparado para una futura indexación vectorial. El repositorio no debe afirmar que existe una base vectorial hasta que haya un proceso real de embeddings e indexación.
