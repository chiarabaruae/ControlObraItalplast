# Control de Avances de Obra

Aplicacion web para el control de avances de obras de Italplast.

## Estructura inicial

El proyecto queda preparado con una base de arquitectura hexagonal para que el dominio pueda crecer sin depender del framework web, la base de datos o la interfaz.

```text
src/
  backend/
    src/
      domain/                    # Entidades y reglas del negocio
      application/               # Casos de uso y puertos
      infrastructure/            # Adaptadores externos: PostgreSQL, seguridad, servicios
      http/                      # Entrada HTTP de la aplicacion
    migrations/                  # SQL versionado para PostgreSQL
  frontend/                      # Interfaz web inicial
tools/
  python/                        # Utilidades de soporte
docs/
  architecture.md                # Decisiones y convenciones de arquitectura
```

## Login

La primera pantalla disponible esta en:

```text
src/frontend/index.html
```

Se puede abrir directamente en el navegador para revisar el diseno inicial. Cuando instalemos Node.js o definamos el stack frontend final, esta pantalla puede evolucionar a React, Angular, Blazor u otra opcion.

## Backend

El backend queda bosquejado para Node.js y PostgreSQL, con JavaScript puro.

Instalacion pendiente:

- Node.js 20 o superior.
- PostgreSQL 16 o superior.
- Python 3.11 o superior para utilidades.
- Docker en una etapa posterior.

Comandos previstos cuando Node.js este instalado:

```text
cd src/backend
npm install
npm run dev
```

El backend servira la pantalla web desde `src/frontend` y expondra `/api/auth/login`.

## Git

Repositorio remoto:

```text
https://github.com/chiarabaruae/ControlObraItalplast.git
```
