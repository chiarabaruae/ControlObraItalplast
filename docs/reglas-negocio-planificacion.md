# Reglas de negocio — Planificación de fechas

Documento de referencia de la cadena de hitos, bloques y brechas que ordena el
cálculo de fechas de un proyecto. Es la fuente de verdad funcional del motor de
planificación (`src/frontend/src/lib/planificacion.ts`).

> Origen: definiciones de negocio de Italplast (documentos de necesidades pt1 y pt2).

## Conceptos

| Concepto | Qué es | Cómo se define |
|---|---|---|
| **Hito** | Un momento puntual del proyecto | Fecha fija; el sistema deduce los días |
| **Bloque** | Un trabajo que dura varios días | Días de trabajo; el sistema deduce las fechas |
| **Brecha** | Días de espera entre dos puntos | Cantidad de días de separación |

Dos conceptos que no deben confundirse en los informes:

- **Completitud:** porcentaje del alcance total ya terminado.
- **Avance del período:** trabajo ejecutado en un día o rango de fechas.

## Regla general de los hitos

**Un hito nunca cae el mismo día que el inicio del bloque que lo sigue.**

Que el cliente confirme, o que se firme el presupuesto, no significa que ese
mismo día pueda arrancar la fabricación o la instalación. Siempre hay una
brecha entre el hito y el bloque siguiente.

## Cadena de planificación (orden cronológico)

```
Confirmación del cliente
   └─ +1 día
Fabricación de premarcos            (bloque, si el proyecto lleva premarcos)
   └─ +1 día
Instalación de premarcos            (bloque, interna o del cliente)
   └─ +1 día
Relevamiento técnico                (hito, automático)
   └─ +2 días
Firma de Presupuesto Ejecutivo      (hito)
   └─ +1 día
Fabricación de aberturas            (bloque)
   └─ +3 días
Instalación de aberturas            (bloque)
```

Todas las brechas son configurables desde **Reglas**; los días indicados son los
valores predeterminados.

### Confirmación del cliente

**Al día siguiente** de la confirmación del cliente ya arranca la fabricación de
premarcos.

### Relevamiento técnico (hito nuevo)

- Se calcula **automáticamente**: **un día después** de la última fecha de
  instalación de premarcos, sin importar si esa instalación la hizo el cliente
  o la gestión interna.
- Es el paso donde se toman las **medidas finales**.

### Firma de Presupuesto Ejecutivo

- Va **2 días después** del relevamiento técnico.
- La brecha existe porque recién con las medidas del relevamiento se tienen las
  **medidas finales** para cerrar el presupuesto.
- Después de la firma continúa la **fabricación de aberturas**.

### Escenario: el cliente instala

A veces el cliente instala las aberturas (se fabriquen o no internamente).

- El cliente define y se compromete a una **fecha de finalización**.
- Con esa fecha se genera un **bloque de plazo estimativo**.
- Ese bloque se calcula desde la fecha de **Fabricación de premarcos** hasta
  **un día antes** de la fecha estimada de relevamiento técnico.
- Cargar esta fecha es **obligatorio** para todos los proyectos que tengan
  premarcos pero **no** tengan marcada la etapa *Instalación de premarcos*.
- Este bloque **reemplaza** a la instalación de premarcos interna: ocupa el mismo
  lugar en la cadena y se identifica como **“Instalación de premarcos (cliente)”**.

## Capacidad (demanda pico vs. tope)

La carga operativa incluye los premarcos: la comparación de demanda contra tope
debe mostrar filas para **fabricación de premarcos** e **instalación de
premarcos**, además de fábrica de aberturas e instalación.

## Estados de desempeño del proyecto

Se separa el **desempeño** de la **situación administrativa**.

| Estado | Criterio provisional |
|---|---|
| En tiempo | Desviación ≤ 0 días y sin hitos críticos vencidos |
| En riesgo | Atraso proyectado de 1 a 3 días, o un bloqueo relevante |
| Retrasado | Atraso real o proyectado de 4 a 7 días |
| Crítico | Atraso > 7 días, hito contractual comprometido o imposibilidad de continuar |

Situaciones administrativas (no describen desempeño):

- **Cancelado:** proyecto cancelado formalmente.
- **Pausado:** detenido por decisión del cliente o de Italplast.

> Los rangos son provisionales y deben ajustarse con el historial real de proyectos.

## Evidencia en el cierre de tareas

- **Instalación / obra:** la tarea exige evidencia fotográfica para completarse.
- **Fábrica:** excepción — alcanza con marcar el check, **sin foto**.
- **Reapertura:** en todos los casos se mantiene la regla de reabrir con
  justificación, limitada a los roles habilitados.

## Pendiente de implementación

- Identificar el bloque como **“Instalación de premarcos (cliente)”** cuando la
  instalación queda a cargo del cliente, y hacer obligatoria su fecha de
  compromiso en los proyectos con premarcos sin instalación propia.
