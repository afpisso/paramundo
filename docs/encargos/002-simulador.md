# 002: Simulador de balance

Estado: pendiente

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
