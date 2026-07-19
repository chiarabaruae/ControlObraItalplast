---
context_id: controlobra-storybook-setup
context_type: historical_setup
last_updated: 2026-07-18
status: historical
tags:
  - storybook
  - legacy-frontend
---

# Storybook setup — histórico

> Esta configuración correspondía al frontend HTML + Vite. Storybook no figura
> actualmente en `src/frontend/package.json` ni forma parte del flujo React
> activo. No ejecutar estas instrucciones sin decidir primero una nueva
> configuración para React.

## Instalación usada

La instalación se completó dentro de `src/frontend` con paquetes Storybook v8 para `HTML + Vite`.

Comando base usado:

```powershell
npm install --save-dev storybook@^8 @storybook/html@^8 @storybook/html-vite@^8 @storybook/addon-essentials@^8 @storybook/addon-interactions@^8 @storybook/blocks@^8 vite
```

## Archivos creados o modificados

- `src/frontend/package.json`
- `src/frontend/package-lock.json`
- `src/frontend/.storybook/main.js`
- `src/frontend/.storybook/preview.js`
- `src/frontend/stories/ui-helpers.stories.js`
- `docs/storybook-setup.md`

## Cómo correr Storybook

Desde `src/frontend`:

```powershell
npm run storybook
```

URL esperada:

```text
http://localhost:6006
```

## Cómo crear nuevas stories

1. Crear un archivo dentro de `src/frontend/stories/`
2. Usar el sufijo `.stories.js`
3. Importar el componente o helper visual real del sistema
4. Exportar `default` con `title`, `args` y `argTypes`
5. Exportar una o más variantes

## Componente de ejemplo

Se dejó como ejemplo:

- `Sistema/UI Helpers`

La story usa helpers reales del proyecto:

- `renderBadge`
- `renderProgress`

Incluye:

- estado default
- variantes visuales
- controls configurables
- ejemplo de uso real dentro de una card del sistema
