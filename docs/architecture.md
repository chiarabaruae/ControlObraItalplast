---
context_id: controlobra-architecture
context_type: technical_architecture
last_updated: 2026-07-18
tags:
  - architecture
  - frontend
  - backend
  - migration
---

# Arquitectura

Este proyecto se organiza con una base hexagonal. La idea es que las reglas de negocio vivan en el centro y que los detalles externos, como HTTP, SQL Server, autenticacion, archivos o servicios de terceros, entren mediante adaptadores.

## Capas

### Domain

Contiene entidades, objetos de valor y reglas propias del negocio. No debe depender de ASP.NET, SQL Server, Entity Framework, React ni librerias de infraestructura.

### Application

Contiene casos de uso y puertos. Un caso de uso expresa una accion del sistema, por ejemplo iniciar sesion, registrar avance o aprobar mediciones. Los puertos son interfaces que la aplicacion necesita para hablar con el exterior.

### Infrastructure

Contiene adaptadores concretos para los puertos: repositorios PostgreSQL, emisores de token, almacenamiento de archivos, correo, integraciones, etc.

### Http

Contiene la entrada HTTP: endpoints, controladores, middlewares, configuracion y composicion de dependencias.

### Frontend

Contiene la interfaz de usuario. La interfaz activa de Fase 2 está construida con React, TypeScript, Vite, Tailwind CSS y componentes shadcn/Radix dentro de `src/frontend/src`.

La versión HTML/CSS/JS sin build permanece como legado durante la migración y no debe considerarse la fuente principal para nuevas funcionalidades.

El frontend React todavía trabaja principalmente con mocks y `localStorage`. La integración completa con los casos de uso y adaptadores backend se realizará progresivamente.

## Regla de dependencias

Las dependencias apuntan hacia adentro:

```text
Http -> Application -> Domain
Http -> Infrastructure -> Application
Infrastructure -> Application
Infrastructure -> Domain
```

Domain no conoce a nadie. Application conoce Domain. Infrastructure implementa puertos definidos por Application. Http conecta todo.

## Autenticacion inicial

El login queda modelado como caso de uso, pero el adaptador actual es de demostracion. Antes de produccion se debe reemplazar por:

- Repositorio de usuarios en PostgreSQL.
- Hash seguro de contrasenas.
- Emision de sesion con cookies seguras o JWT.
- Politicas de permisos por rol.
- Auditoria de accesos.

## Stack actual

- Backend: Node.js con JavaScript.
- API HTTP: Express.
- Base de datos: PostgreSQL.
- Frontend activo: React, TypeScript, Vite y Tailwind CSS.
- Frontend legado: HTML, CSS y JavaScript sin build.
- Utilidades: Python para scripts de soporte cuando haga falta.

## Contexto canónico

El estado vigente y las decisiones se mantienen en:

- `docs/context-index.md`
- `docs/project-context.md`
- `docs/decisions.md`
- `docs/change-log.md`
