# Gitleaks Setup y Uso

## ¿Qué es Gitleaks?
[Gitleaks](https://github.com/gitleaks/gitleaks) es una herramienta de análisis estático (SAST) utilizada para detectar y prevenir la exposición de secretos codificados como contraseñas, claves API, tokens y otras credenciales confidenciales en tu código y en el historial del repositorio Git.

## ¿Cómo correr un escaneo manual?
Para ejecutar un escaneo en todo el repositorio y generar un reporte JSON:
```bash
gitleaks git -v --redact --report-format json --report-path gitleaks-report.json .
```
> [!NOTE]
> La opción `--redact` oculta los secretos en el reporte, mostrando el archivo, la línea, y la regla que fue activada sin exponer la clave completa.

## ¿Cómo funciona el pre-commit hook?
El proyecto utiliza [pre-commit](https://pre-commit.com/) para ejecutar Gitleaks antes de cada commit. Si Gitleaks detecta un posible secreto en los archivos que se van a commitear, bloqueará el commit, evitando que el secreto se envíe al historial.
La configuración del hook se encuentra en `.pre-commit-config.yaml`.

## ¿Cómo revisar hallazgos?
Al ejecutar el escaneo, Gitleaks puede imprimir los hallazgos en la consola o en un archivo JSON (por ejemplo, `gitleaks-report.json`). En la salida podrás ver:
- Archivo y línea del hallazgo.
- Regla activada (por ejemplo, `github-pat`, `aws-access-token`).
- Recomendación.

## ¿Qué hacer si se detecta un secreto real?
1. **No commitees la clave**. Elimina el secreto del código fuente.
2. Si el secreto ya fue commiteado en el historial de Git, **RÓTALO DE INMEDIATO** (invalida el token anterior y genera uno nuevo desde el proveedor del servicio). No asumas que porque lo borres en un commit nuevo ya estás seguro.

## ¿Cómo agregar falsos positivos a la allowlist de forma controlada?
Si Gitleaks detecta un secreto que en realidad no lo es (un falso positivo), puedes crear o editar el archivo `.gitleaks.toml` en la raíz del proyecto para extender la configuración base e ignorar este hallazgo específico.

Ejemplo de cómo empezar `.gitleaks.toml`:
```toml
[extend]
useDefault = true

[[rules]]
id = "mi-regla-especifica"
description = "Ignorar token falso en pruebas"
regex = '''el_regex_del_falso_positivo'''
```
También puedes usar el modo inline mediante el comentario: `// gitleaks:allow` en la línea específica del código donde está el falso positivo, dependiendo del lenguaje.
