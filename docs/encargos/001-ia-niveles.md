# 001: IA con niveles

Estado: entregado

## Objetivo

Una IA pura y determinista que elige la jugada del jugador en turno, con tres niveles (fácil, normal,
difícil). Fácil y normal replican `aiMove()` de `referencias/prototipo-hex-triad.html`.

## Archivos

- Nuevo: `src/core/ai.ts` (exportado desde `src/core/index.ts`), `src/data/ai.json`, `tests/core/ai.test.ts`.
- Editar: `src/core/types.ts` (tipos de configuración de IA), `src/data/schemas.ts` y `src/data/index.ts`
  (validar y exponer `AI_LEVELS`). Si necesitas un auxiliar en `src/core/rules.ts` para evaluar una carta
  colocada antes de resolver, agrégalo sin cambiar el comportamiento de `applyMove`.

## Especificación

API: `chooseMove(state, rules, config, rng): Move`. Elige para `state.turn`. No muta `state`. Usa solo el
`rng` recibido (nunca `Math.random`). `src/core` no puede importar de `src/data`: la configuración llega
por parámetro.

Recorre, en este orden, cada casilla legal (índice ascendente), cada carta de la mano (índice ascendente)
y cada rotación (0 a 5 si la carta tiene Giro; solo 0 si no). Se queda con el primer puntaje estrictamente
mayor.

Términos, como en el prototipo:

- `caps`: cartas capturadas en la primera oleada (después de Guardián). Sale de los eventos `flip` con
  `wave: 1` de `applyMove`.
- `mod`: modificador de la carta donde cae (zona + Manada), antes de capturar.
- `power`: `cardPower` de la carta con sus lados actuales.
- `threat`: con la carta ya colocada y **antes** de voltear nada, cuenta las direcciones cuya vecina está
  libre (ni roca ni carta; los sellos no cuentan) y donde alguna carta `o` de la mano rival cumple
  `clamp(o.lado[opuesto] + zona(o, casilla vecina)) + bonoElemento(o, mía) + (Embestida de o ? bono : 0) > mi lado efectivo`.
  Si la carta colocada tiene Firme, `threat = 0`.

Puntaje:

- Fácil: `caps * captureWeight + rng * noise`.
- Normal: `caps * (Cadena ? cadenaCaptureWeight : captureWeight) - threat * threatWeight + mod * modifierWeight - power * powerWeight + rng * noise`.
- Difícil: calcula el puntaje normal de todas las jugadas, toma las `lookahead.candidates` mejores, simula
  cada una con `applyMove` y le resta `lookahead.replyWeight * (máximo de cartas que el rival puede capturar
en su mejor respuesta, contando ambas oleadas)`. Si la partida termina con la jugada, no hay respuesta.

`src/data/ai.json` (valores de partida; los de fácil y normal salen del prototipo, los de difícil son
provisionales y se ajustan en la pasada de balance):

```json
{
  "easy": {
    "captureWeight": 10,
    "cadenaCaptureWeight": 10,
    "threatWeight": 0,
    "modifierWeight": 0,
    "powerWeight": 0,
    "noise": 9,
    "lookahead": null
  },
  "normal": {
    "captureWeight": 10,
    "cadenaCaptureWeight": 13,
    "threatWeight": 2.5,
    "modifierWeight": 2,
    "powerWeight": 0.05,
    "noise": 1.2,
    "lookahead": null
  },
  "hard": {
    "captureWeight": 10,
    "cadenaCaptureWeight": 13,
    "threatWeight": 2.5,
    "modifierWeight": 2,
    "powerWeight": 0.05,
    "noise": 0.6,
    "lookahead": { "candidates": 6, "replyWeight": 8 }
  }
}
```

El "tier menos" de fácil no va aquí: ya está resuelto con el mazo del rival (`decks.json`, `rivals`).

## Restricciones

- No cambies reglas ni valores de `rules.json`, `effects.json`, `cards.json` ni `decks.json`.
- `chooseMove` en difícil debe tardar menos de 150 ms por jugada en un computador normal.

## Criterio de terminado

- Tests en `tests/core/ai.test.ts` que cubran: misma semilla y estado dan la misma jugada; nunca devuelve
  una jugada ilegal en 200 partidas IA contra IA jugadas hasta el final (todos los niveles y los 5 niveles
  de tablero); prefiere capturar a no capturar; con una carta de Giro encuentra la rotación que captura;
  en normal evita una casilla amenazada cuando hay otra igual sin amenaza; en difícil descarta una jugada
  cuya respuesta rival captura más de lo que gana; `threat` es 0 con Firme.
- Los 56 tests existentes siguen pasando sin modificarlos. `npm run check` en verde. Workflow en verde.
- Sección **Entrega** llena.

## Entrega

- Commits: `b9fa9d0..a0d16a1` (implementación y pruebas); cierre documental en el commit de esta entrega.
- Qué quedó hecho: `chooseMove(state, rules, config, rng)` exportado desde el núcleo, con fácil,
  normal y difícil; pesos en `ai.json`, validados al cargar y expuestos como `AI_LEVELS`. Difícil evalúa
  las seis mejores candidatas y penaliza la mejor respuesta rival contando ambas oleadas.
- Cómo probarlo: `npm run check` (66 tests, los 56 existentes sin cambios) y
  `npx vitest run tests/core/ai.test.ts --reporter=verbose`. Las 200 partidas con semilla cubren los tres
  niveles de IA y los cinco tableros, hasta el final, comprobando cada jugada. Las pruebas tácticas cubren
  capturas, Giro, amenazas antes de Espinas, Firme, desempates, respuesta rival con Cadena y fin de partida.
  En la corrida local focalizada, la jugada difícil más lenta tardó 3,39 ms (límite: 150 ms).
  Workflow de implementación en verde, build y despliegue:
  https://github.com/afpisso/paramundo/actions/runs/45267841661.
- Decisiones:
  - La posición previa a los volteos usa una copia superficial del tablero, solo para lectura de zona,
    Manada y amenaza; `applyMove` sigue siendo la única fuente de resolución y capturas. No fue necesario
    modificar `rules.ts`.
  - Se conserva el orden casilla/mano/rotación también en los empates del puntaje final de difícil.
  - Sin jugadas legales o con partida terminada, se lanza `IllegalMoveError`, siguiendo el núcleo.
  - No se usan fuentes de azar adicionales: se consume una muestra del RNG recibido por candidata.
- Preguntas: ninguna decisión de diseño nueva.
- Fuera del encargo que vi y no toqué: el build local falló por memoria tanto dentro como fuera del
  sandbox; el job `build` de GitHub Actions sí pasó, incluido `npm run build`. No se modificaron
  configuración de compilación, reglas, cartas, mazos, arte ni archivos de Claude.
