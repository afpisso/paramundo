# 003: Escena de combate en pixel art

Estado: pendiente

Depende de: 001 aprobado. Lee antes `docs/art/ESPEC.md`: define el render, los tamaños y las claves de
textura que usa este encargo.

## Objetivo

Una partida completa jugable en el celular contra la IA: mano de 6 robada de un mazo de 12, los 5
niveles, tres dificultades, con cada choque explicado en el borde compartido. Pixel art nítido, con
placeholders por código donde falte arte.

## Archivos

- Nuevo: `src/scenes/CombatScene.ts` y lo que necesites en `src/ui/` (carta, mano, tablero, etiqueta de
  choque, panel), `src/fx/` (reproductor de eventos, texturas placeholder), `src/save/` (ajustes).
- Editar: `src/main.ts`, `src/scenes/BootScene.ts`, `src/ui/tokens.ts`, `index.html`,
  `src/data/strings.es.json` (solo textos de interfaz), `package.json` (fuentes).
- Tests nuevos donde haya lógica sin Phaser (guardado, orden de reproducción de eventos, geometría).

## Especificación

**Render.** Lo de `docs/art/ESPEC.md`: lienzo 360 x 640, escala entera, sin suavizado, arte x2. Colores
y tipografías solo en `src/ui/tokens.ts`.

**Arranque.** `BootScene` carga `public/art/manifest.json` y las fuentes, crea las texturas placeholder
de toda clave que falte y pasa a `CombatScene`. Con el manifiesto vacío el juego debe verse completo.

**Partida.** El jugador (0, azul) usa `DECKS.starter`; el rival (1, coral) usa `DECKS.rivals[nivel]` y
la IA de ese nivel. Cada partida roba 6 con `drawHand` y una semilla nueva. La primera partida la empieza
el jugador y después se alterna. La semilla, el nivel de tablero, la dificultad, quién empieza y el modo
rápido se guardan.

**Pantalla** (de arriba a abajo, ajusta medidas si hace falta):

- Barra: nombre del nivel, botón de ajustes.
- Mano rival, visible y pequeña (x1). Tocar una carta muestra su información.
- Tablero (320 x 360 lógico), con casillas, zonas, rocas, tótems, sellos y escudos de Firme.
- Marcador: cartas de cada uno, de quién es el turno, línea de estado.
- Línea de información de la carta tocada: nombre, tier, elemento, efecto con su descripción.
- Mano del jugador a x2 (mismo tamaño que en el tablero), con los 6 números visibles en cada carta.

**Carta.** Cuerpo teñido con el color del dueño (gris para tótems), marco teñido con el color del tier,
ícono `card/<id>` al centro, los 6 números en sus lados (N, NE, SE, S, SO, NO; el 10 se muestra A), tier
a la izquierda y efecto a la derecha, elemento visible. Un lado con modificador positivo se pinta en
color de mejora y uno negativo en color de pena; siempre muestra el valor efectivo (`sideValue`).

**Interacción.** Tocar una carta de la mano la selecciona; las casillas legales se resaltan y muestran el
modificador que tendría la carta ahí (`+1`, `-1`). Tocar una casilla legal la juega. Una carta con Giro
ya seleccionada gira un sexto con cada toque adicional. Tocar una casilla sellada, una roca o una carta
del tablero explica qué es. Zonas táctiles de al menos 44 px en pantalla.

**Reproducción de eventos.** La escena llama a `applyMove` y reproduce su lista de eventos en orden; no
recalcula reglas. Mínimo por evento:

- `placed`: la carta cae en la casilla. `firm`: aparece el escudo.
- `modifiers`: texto flotante (`+1 Agua`, `+2 Manada`, `Embestida`).
- `clash`: etiqueta en el borde compartido con la comparación completa, por ejemplo `5+1 > 5`, `4 < 6`,
  `5 = 5`, o `Firme`. Ganadora en color de acento, perdedora apagada. Se muestran juntas las de una oleada
  y se sostienen lo suficiente para leerlas.
- `guardian`: marca al Guardián y tacha las etiquetas de las cartas salvadas (`a salvo`).
- `flip`: volteo con pausa corta, cambio de color y vibración breve (`navigator.vibrate`, si existe).
- `espinas`: `-1 Espinas` sobre la carta atacante y sus números bajan.
- `cadena`: rótulo `Cadena`, luego la segunda oleada con sus propias etiquetas.
- `siembra`, `sello`: aparecen las zonas o los sellos con un destello.
- `seals_broken`, `turn`, `game_over`: estado y marcador.

Un modo rápido multiplica todas las duraciones por 0,45.

**Fin de partida.** Panel con resultado (Ganaste, Perdiste, Empate), marcador y botones: Otra partida,
Siguiente nivel, Ajustes. Ajustes permite elegir nivel de tablero, dificultad y modo rápido.

**Guardado.** `src/save/`: localStorage con `GAME_CONFIG.saveKey`, versión de esquema, validación con zod
y una función de migración (hoy solo la versión 1). Si el dato está corrupto, se usan los valores por
defecto sin romper.

## Restricciones

- Los rivales de esta fase no tienen nombre ni frase: muestra "Rival". No inventes personajes.
- No cambies reglas, cartas, mazos ni valores. No edites `docs/art/` ni `public/art/`.
- Nada de reglas en la escena: si necesitas un dato que el núcleo no expone, agrégalo al núcleo con test.
- Respeta la marca de versión de la esquina inferior derecha y la barra "Actualizar" (`src/pwa.ts`, son
  HTML encima del canvas): no las tapes con botones ni las quites. `main.ts` sigue llamando a `setupPwa()`.
- En el computador de Andrés `npm run build` falla por memoria: para probar en local usa `npm run dev`; el
  build lo valida GitHub Actions.
- Textos en `strings.es.json`, en español y sin guiones largos.

## Criterio de terminado

- En https://afpisso.github.io/paramundo/ se juega una partida completa contra la IA en un celular, en los
  5 niveles y las 3 dificultades, sin errores en consola.
- Los números de las cartas se leen en el celular y cada captura muestra su comparación.
- Con `manifest.json` vacío todo se ve con placeholders; agregando un `cards/<id>.webp` y su línea en el
  manifiesto, esa carta muestra el arte sin tocar código.
- El ajuste elegido persiste al recargar. El modo rápido funciona.
- `npm run check` y workflow en verde. En **Entrega**, el enlace para probar es
  https://afpisso.github.io/paramundo/. Sección **Entrega** llena, con dos capturas de pantalla en
  `docs/encargos/capturas/003-*.png` (viewport de celular): una a mitad de partida con etiquetas de choque
  y otra del panel final.
