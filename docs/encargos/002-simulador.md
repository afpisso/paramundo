# 002: Simulador de balance

Estado: entregado

Depende de: 001 aprobado.

## Objetivo

Una herramienta de línea de comandos que juega N partidas IA contra IA y reporta tasas de victoria, para
la pasada de balance.

## Archivos

- Nuevo: `tools/sim/` (lógica en un módulo importable, más el punto de entrada), `tests/sim/sim.test.ts`.
- Editar: `package.json` (script `sim` y la dependencia de desarrollo para ejecutar TypeScript; `tsx` es
  la opción por defecto), `README.md` (una sección corta de uso).

## Especificación

```
npm run sim -- --games 2000 --p0 normal --p1 normal --deck0 starter --deck1 normal --level all --seed 1
```

- `--p0`, `--p1`: nivel de IA de cada jugador (`easy`, `normal`, `hard`). Por defecto `normal`.
- `--deck0`, `--deck1`: `starter` o una clave de `rivals` en `decks.json`. Por defecto `starter`.
- `--level`: id de un nivel de `levels.json`, `none` (tablero libre) o `all` (rota entre todos). Por
  defecto `all`.
- `--games`: por defecto 1000. `--seed`: por defecto 1. `--json`: imprime el reporte como JSON.
- Cada partida: roba 6 de 12 con `drawHand`, quien empieza se alterna partida a partida, y todo sale del
  RNG con semilla (misma semilla, mismo reporte).

Reporte:

- Partidas, victorias de p0, de p1 y empates, en número y porcentaje.
- Tasa de victoria de quien empieza y de quien va segundo.
- Capturas por jugada (promedio) y máximo de capturas en una jugada.
- Por nivel de tablero: partidas y tasa de victoria de p0.
- Por carta: partidas en que estuvo en una mano, tasa de victoria de su dueño en esas partidas, y promedio
  de capturas hechas al jugarla. Ordenado por tasa de victoria.

## Restricciones

- El simulador solo usa `src/core` y `src/data`. Nada de Phaser ni DOM.
- No cambies valores de balance aunque el reporte muestre algo raro: anótalo en **Entrega**.

## Criterio de terminado

- `npm run sim -- --games 200` corre sin errores y termina en menos de 30 segundos.
- Test: dos corridas con la misma semilla dan el mismo reporte; los totales cuadran (victorias + empates
  = partidas).
- `npm run check` y workflow en verde. Sección **Entrega** llena, con la salida de una corrida de 2000
  partidas normal contra normal pegada como referencia.

## Entrega

- Commits: `5385587..7453d43` (implementación); cierre documental en el commit de esta entrega.
- Qué quedó hecho: módulo importable `tools/sim/sim.ts`, CLI `tools/sim/cli.ts`, script `sim`,
  salida de texto y JSON, validación de opciones y sección de uso en el README. Se reutilizan
  exclusivamente las reglas, IA, RNG, mazos y datos del proyecto para jugar las partidas.
- Cómo probarlo: página de estado https://afpisso.github.io/paramundo/estado/.
  Para la revisión técnica: `npm run check` pasa con 73 tests. Las pruebas cubren reproducibilidad,
  totales por tablero/carta, copias y dueños, comparación con una partida reproducida mediante el núcleo,
  opciones inválidas y ejecución real de la CLI con JSON.
  `npm run sim -- --games 200` terminó en 0,87 s incluyendo el arranque de la CLI (límite: 30 s).
  Workflow de implementación en verde, build y despliegue:
  https://github.com/afpisso/paramundo/actions/runs/45275276429.
- Decisiones:
  - Se usa un único RNG con semilla para robos y decisiones de ambas IA. El reporte no incluye tiempos
    para que sea idéntico con las mismas opciones y semilla.
  - `all` rota por los niveles en el orden de los datos, sin incluir el tablero libre; empieza p0 en la
    primera partida y se alterna. Los empates cuentan en el denominador de las tasas de victoria.
  - Las capturas incluyen las dos oleadas y tótems, atribuidas a la carta que se jugó.
  - Cada carta cuenta una sola aparición por dueño y partida aunque haya copias. Se exponen tanto
    partidas distintas como manos de dueños para explicar el denominador si ambos jugadores la robaron.
    El promedio de capturas usa el número de veces que se jugó.
  - `tsx` ejecuta TypeScript sin generar archivos. Se conserva `@types/node` 22, incorporado por Claude
    mientras se implementaba el encargo.
- Preguntas: ninguna decisión de diseño nueva.
- Fuera del encargo que vi y no toqué:
  - Fue imprescindible actualizar `package-lock.json` junto a la dependencia `tsx` para que
    `npm ci` instale lo mismo en CI.
  - La referencia muestra 30,00% de victorias de quien empieza y 55,85% del segundo, con 14,15% de empates.
    Se registra para la pasada de balance; no se cambió ningún valor ni regla.
  - Se integraron los commits concurrentes de Claude mediante rebase, conservando su publicación,
    PWA y configuración. No se editaron sus archivos.

### Referencia: 2000 partidas normal contra normal

`npm run sim -- --games 2000 --p0 normal --p1 normal --deck0 starter --deck1 normal --level all --seed 1`

```text
Partidas: 2000 | semilla: 1
IA: normal vs normal | mazos: starter vs normal
p0: 833 (41.65%) | p1: 884 (44.20%) | empates: 283 (14.15%)
Empieza: 600 (30.00%) | segundo: 1117 (55.85%)
Jugadas: 24000 | capturas: 12884 | promedio por jugada: 0.537 | máximo: 3

Por tablero (victorias de p0):
  claro: 400 partidas, 173 (43.25%)
  rio-partido: 400 partidas, 155 (38.75%)
  caldera: 400 partidas, 190 (47.50%)
  ruinas: 400 partidas, 129 (32.25%)
  grieta: 400 partidas, 186 (46.50%)

Por carta (victorias por dueño/partida, copias sin duplicar; capturas incluyen Cadena y tótems):
  Rosadito [rosadito]: 1507 partidas, 1981 manos de dueños, 1039 victorias (52.45%), 1981 jugadas, 0.748 capturas/jugada
  Zumbi [zumbi]: 1499 partidas, 2009 manos de dueños, 1016 victorias (50.57%), 2009 jugadas, 0.879 capturas/jugada
  Anteojitos [anteojitos]: 1506 partidas, 2025 manos de dueños, 954 victorias (47.11%), 2025 jugadas, 0.814 capturas/jugada
  Guaca [guaca]: 1892 partidas, 3067 manos de dueños, 1394 victorias (45.45%), 3959 jugadas, 0.735 capturas/jugada
  Chigüi [chigui]: 1897 partidas, 3100 manos de dueños, 1335 victorias (43.06%), 4011 jugadas, 0.589 capturas/jugada
  Titín [titin]: 1878 partidas, 3068 manos de dueños, 1280 victorias (41.72%), 4040 jugadas, 0.310 capturas/jugada
  Frailín [frailin]: 1503 partidas, 2027 manos de dueños, 812 victorias (40.06%), 2027 jugadas, 0.612 capturas/jugada
  Doradita [doradita]: 1889 partidas, 3078 manos de dueños, 1139 victorias (37.00%), 3948 jugadas, 0.056 capturas/jugada
```
