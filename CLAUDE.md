# Paramundo: biblia del proyecto

Juego de cartas hexagonales para celular. Este archivo es la fuente de verdad de visión, reglas y
decisiones. Se actualiza cada vez que se decide algo.

## Visión

Los hexágonos son portales que traen criaturas de otros universos. El primer universo es una Colombia
del futuro cercano: fauna tierna en las comunes y mitos reinventados con nombre propio en las raras y
superiores. El vertical slice debe probar que alguien que no nos conoce juega una partida, quiere otra y
quiere completar su colección.

Alcance del slice: ruta por un bioma (Río de neón) con combates, élite, evento, tienda y jefe (Riomán);
8 rivales NPC; recompensas; tienda con sobres y Esencia; mazo y colección; tutorial de 3 partidas;
pulido de producto; guardado local. Fuera: otros biomas, multijugador, nube, dinero real, temporadas,
misiones diarias, localización, tiendas de apps, analítica en servidor.

## Fases

0. Base (hecha): repo, Vite, Phaser, TS estricto, lint, Vitest, PWA, deploy a Pages, este archivo.
1. Combate: núcleo con tests y paridad (hecho), IA con niveles, escena de combate, simulador.
2. Bucle completo: ruta, recompensas, tienda, sobres, colección, mazo, guardado, tutorial.
3. Pulido: animaciones, sonido, vibración, transiciones.
4. Playtest: métricas locales, pantalla de stats, balance con el simulador.

Al cerrar cada fase: parar y mostrar qué hay, cómo probarlo y qué se decidió.

## Reglas del combate

- Tablero: hexágono de radio 2 (19 casillas), flat-top, coordenadas axiales. Direcciones N, NE, SE, S,
  SO, NO: `[[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]]`. Opuesto de `d`: `(d+3)%6`.
- Cada jugador juega 6 cartas, robadas al azar (con semilla) de un mazo de 12. No se roba en partida.
- Quien empieza se alterna entre partidas de la ruta.
- Lados: 6 números del 1 al 10 (el 10 se muestra como A), en orden N, NE, SE, S, SO, NO.
- Captura: lado del atacante + bonos **estrictamente mayor** que el lado del defensor que lo mira.
- Elementos: Fuego vence a Monte, Monte vence a Agua, Agua vence a Fuego. +1 si vences, -1 si te
  vencen. Errantes neutrales.
- Zonas: +1 a todos los lados si coincide con el elemento de la carta, -1 si es del elemento que la vence.
- Tope: el lado con zona y Manada se limita a 1..10. Los bonos de ataque (elemento, Embestida, Reclamo)
  se suman después, sin tope: una A con ventaja vence a otra A.
- Tótems: cartas neutrales (dueño 2). No atacan; quien las captura se las queda.
- Fin: cuando no quedan cartas en mano o no hay casillas libres. Gana quien tenga más cartas en el
  tablero. Puede haber empate.

### Poder y tiers (se calculan, nunca se escriben a mano)

`COST(v) = v si v <= 6; 7 -> 8, 8 -> 10, 9 -> 12, 10 -> 15`. Poder = suma de COST de los 6 lados + costo
del efecto. Común <= 26, Poco común 27 a 32, Rara 33 a 38, Épica 39 a 45, Legendaria >= 46.

### Efectos del slice (como mucho uno por carta)

| Efecto | Costo | Regla |
|---|---|---|
| Embestida | 3 | +1 al atacar, solo el turno en que se juega |
| Reclamo | 4 | +2 al atacar cartas que alguna vez fueron tuyas |
| Guardián | 4 | Si varias cartas de su dueño van a caer de un golpe, solo cae esta |
| Firme | 2 | No puede ser capturada durante la siguiente jugada rival |
| Espinas | 3 | La carta que la capture pierde 1 en todos sus lados hasta el final de la partida (mínimo 1) |
| Manada | 4 | +1 en todos sus lados por cada aliada vecina, hasta +2. Dinámica; no cuenta tótems |
| Siembra | 5 | Crea zonas de su elemento en 1, 2 o 3 vecinas libres según tier, frente a sus lados más altos |
| Sello | 4 | Bloquea al rival 1, 2 o 3 vecinas libres según tier, frente a sus lados más débiles, un turno |
| Giro | 3 | Se puede rotar de a un sexto de vuelta antes de jugarla |
| Cadena | 7 | Solo legendarias. Las cartas que captura atacan a sus vecinas, una sola vez |

Siembra y Sello por tier: común 1, poco común 2, rara o más 3 (`effects.json`, `cellsByTier`).
Recortados para expansiones: Vínculo, Disolver, Empuje, Drenar, Traición, Testamento, Eco.

### Orden de resolución (verificado contra `play()` del prototipo)

1. Colocar la carta (rotación de Giro, escudo de Firme).
2. Modificadores (zona, Manada, Embestida).
3. Choques contra cada vecina rival o neutral.
4. Guardián.
5. Volteo.
6. Espinas.
7. Cadena: segunda oleada (choques, Guardián, volteo, Espinas). Las cartas encadenadas atacan sin
   Embestida ni Reclamo propios, pero con elemento, zona y Manada. Firme también las frena.
8. Siembra (lee los lados ya reducidos por Espinas).
9. Sello.
10. Fin de turno: expiran los sellos del jugador que entra y su Firme; si el que entra no tiene casilla
    legal, los sellos se rompen.

## Economía (valores de partida, todos en datos)

Moneda blanda única (nombre provisional: Llaves). Combate 30, élite 60, jefe 150 y una carta rara o
mejor. Sobre de 3 cartas por 100: común 60%, poco común 27%, rara 10%, épica 2,5%, legendaria 0,5%.
Garantías: una de las 3 es rara o mejor; una legendaria cada 20 sobres sin legendaria. Ritmo: un sobre
cada tres combates. Duplicados se convierten en Esencia: +1 en un lado, una sola vez por carta.

## Contenido

- Unas 40 cartas al final del slice. **No inventar personajes, nombres ni lore**: dejar hueco marcado y
  Andrés lo diseña. Cada personaje: nombre propio, inspiración que se note sin explicarla, efecto que
  salga de su historia.
- Tribus: Agua (río de neón), Monte (biopunk), Fuego (vapor y trapiche), Errantes (ciudad pirata).

## Arquitectura

- `src/core/`: reglas puras. Sin Phaser, sin DOM, sin importar datos, sin `Math.random` (ESLint lo
  impide). `applyMove(state, move, rules) -> { state, events }`. La capa visual solo reproduce eventos.
- `src/data/`: JSON validados con zod al cargar (`index.ts`). Todo valor de balance vive aquí.
- `src/config.ts`: nombre del juego y de la moneda (provisionales), en un solo lugar.
- `src/ui/tokens.ts`: colores y tipografías. Ningún literal de color o fuente fuera de ahí.
- `src/scenes/`, `src/ui/`, `src/fx/`, `src/save/`: Phaser, componentes, efectos, guardado.
- `tools/parity/oracle.js`: lógica del prototipo sin DOM. No se "mejora": es el patrón de comparación.
- `tests/`: Vitest. `tests/parity` juega partidas al azar en el oráculo y en el núcleo, y compara el
  estado completo después de cada jugada.

## Convenciones

- Código e identificadores en inglés. Textos del juego en español, en `src/data/strings.es.json`.
- En los textos del juego no usar guiones largos: comas, dos puntos o paréntesis.
- Valores de balance siempre en datos. El tier nunca se escribe: se calcula.
- Commits pequeños y descriptivos. `npm run check` (typecheck, lint, tests) debe pasar antes de subir.
- Si algo del prototipo parece bug y no regla, preguntar antes de replicarlo o corregirlo.
- No ajustar balance por iniciativa propia: habrá una pasada de balance aparte.

## Decisiones

### 2026-11-23

- **Reasignación de efectos recortados** (aprobada, lados sin cambios): Titín Eco -> Manada (22, común);
  Caimanero Empuje -> Sello (33, rara); Patasombra Drenar -> Espinas (36, rara); Mil Caras Traición ->
  Reclamo (47, legendaria). Los `whyEffect` de esas cuatro son provisionales, pendientes de Andrés.
- **Guardián protege solo cartas de su dueño.** No salva tótems neutrales, y un tótem no cuenta para
  "varias cartas van a caer". Desvío del prototipo, donde un Guardián salvaba al tótem vecino. Si caen
  dos Guardianes a la vez, caen los dos (igual que el prototipo).
- **Guardián durante Cadena: se evalúa por atacante** (elegida por Claude, revisable). Cada carta
  encadenada es un golpe propio, así que una carta salvada frente a un atacante puede caer ante otro
  de la misma oleada. Por qué: (1) coherencia, la regla dice "de un golpe" y cada carta encadenada
  ataca por separado, con su propio lado y su propia etiqueta en el borde; (2) simplicidad, la segunda
  oleada reutiliza exactamente la misma función que un ataque normal, sin caso especial; (3) mantiene
  la paridad con el prototipo. Alternativa descartada: evaluar Guardián sobre toda la oleada junta,
  que haría a Guardián más fuerte contra Cadena y pediría lógica nueva. Código: `src/core/rules.ts`
  (paso 7). Test: `tests/core/rules.test.ts`, "with Guardián: evaluated per chained attacker".
- **Mazos con copias.** Se permiten copias de una misma carta, sin límite (`rules.json`,
  `deck.maxCopies: null`). El validador conserva el chequeo por si después se fija un tope desde datos.
- **Mazo inicial provisional:** 2 copias de Chigüi, Doradita, Guaca y Titín, más Anteojitos, Frailín,
  Rosadito y Zumbi (`decks.json`). Pendiente de las comunes nuevas.
- **Siembra y Sello por tier: 1, 2, 3 (común, poco común, rara o más)**, como dice el brief. El
  prototipo usa 1, 1, 2, 3, 3. Es un valor en datos; pendiente de confirmar con Andrés.
- **Espinas "para siempre"** significa hasta el final de la partida. Nunca toca la carta de la colección.
- **Siembra en un Errante no hace nada**: la validación de datos lo prohíbe.
- **Paridad:** dos corridas de 600 partidas. Una con las reglas del prototipo al pie de la letra en
  tableros sin tótems; otra con las reglas del juego (desvíos aprobados activos) en todos los niveles.
- **Técnicas:** base relativa en Vite (sirve igual en Pages y Capacitor); RNG mulberry32 con semilla;
  lienzo lógico 720x1280 con escala FIT; el núcleo recibe el `Ruleset` por parámetro en vez de
  importar JSON, para poder simular variantes de balance.

## Pendientes de diseño (preguntar a Andrés)

- Confirmar Siembra y Sello por tier (brief 1/2/3 o prototipo 1/1/2/3/3).
- Qué pasa con un empate en la ruta.
- Regla especial del bioma para el jefe Riomán (Claude propone).
- Comunes nuevas para el mazo inicial y el resto de cartas hasta unas 40.
