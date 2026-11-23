# Especificación de arte: pixel art

Dueño: Claude. Codex no edita este archivo ni `public/art/`.

## Render

- Lienzo lógico: **360 x 640** (vertical, 9:16). Todo el juego se dibuja en esa resolución.
- Escala a pantalla: múltiplo **entero** de píxeles físicos del dispositivo (`zoom = floor(ajuste)`),
  centrado, con el fondo del color `bg`. Si el entero deja menos del 85% del ajuste posible, se usa el
  ajuste exacto (fraccionario) para no desperdiciar pantalla.
- Sin suavizado: `pixelArt: true`, `roundPixels: true`, `image-rendering: pixelated` en el canvas.
- **Escala de arte x2:** un píxel de arte = 2 x 2 píxeles lógicos. Todo sprite se dibuja al doble de su
  tamaño nativo, siempre en posiciones enteras. En un celular típico (ancho físico 1080) eso da 6 píxeles
  físicos por píxel de arte.

## Geometría del tablero

- Casilla hexagonal flat-top de **40 x 36** nativo (80 x 72 lógico).
- Centro de la casilla axial `(q, r)`, en lógico y relativo al centro del tablero:
  `x = 60 * q`, `y = 72 * (r + q / 2)`. Es decir, 30 nativo entre columnas, 36 nativo entre filas, y cada
  columna baja media fila respecto a la anterior.
- Tablero completo (radio 2): 160 x 180 nativo (320 x 360 lógico).
- Una carta en el tablero ocupa la casilla entera: 80 x 72 lógico, unos 85 px de ancho en un celular.

## Paleta

- Cada asset usa como máximo 16 colores, tomados de una paleta maestra de 32. La paleta maestra se fija
  con el primer lote de arte de cartas (pendiente) y se guardará en `docs/art/paleta.json`.
- Colores base que ya existen en `src/ui/tokens.ts` y deben estar en la paleta: fondo `#12101a`,
  superficie `#1d1a2b`, línea `#3a3550`, tinta `#f3ecdf`, apagado `#a99fb8`, acento `#f4c95d`, jugador
  `#3fa9e0`, rival `#ec6a4f`, neutral `#8a8398`, Fuego `#ffa53b`, Agua `#6fd6ff`, Monte `#86dc5e`,
  Errante `#cfc6dc`, tiers `#a7adb5 #6fcf6f #5aa9ff #b57bff #f4c95d`.
- Contorno oscuro de 1 píxel en personajes e íconos. Sin degradados ni anti-aliasing.
- Tribus: Agua (río de neón: cian y magenta sobre azul noche), Monte (biopunk: verdes y bioluminiscencia),
  Fuego (vapor y trapiche: naranjas, cobre, humo), Errantes (ciudad pirata: violetas, lona, óxido).

## Tipografía

- Texto: **Pixelify Sans** (paquete `@fontsource/pixelify-sans`), empaquetada en el build (la PWA
  funciona sin red). Rótulos cortos y botones: **Silkscreen** (`@fontsource/silkscreen`).
- Números de las cartas: fuente bitmap propia de **5 x 7** nativo (10 x 14 lógico), con contorno oscuro
  de 1 píxel nativo. Glifos: `1 2 3 4 5 6 7 8 9 A + - > < =`.

## Assets

Formato: PNG de 8 bits con transparencia para interfaz y tablero; **WebP sin pérdida** con transparencia
para arte de cartas. Tamaño en píxeles nativos. Ruta relativa a `public/art/`. La clave es la que usa el
juego para pedir la textura.

| Clave               | Archivo                                                                                           | Nativo              | Fase | Notas                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card/<id>`         | `cards/<id>.webp`                                                                                 | 36 x 32             | 1    | Ícono de tablero. Recortado en hexágono flat-top, fondo transparente. El sujeto va en el centro de 20 x 20: los bordes quedan bajo los números. 19 cartas hoy |
| `card_full/<id>`    | `cards/full/<id>.webp`                                                                            | 96 x 128            | 2    | Ilustración completa para detalle y colección                                                                                                                 |
| `ui/card_body`      | `ui/card_body.png`                                                                                | 40 x 36             | 1    | Cuerpo de carta en grises; el juego lo tiñe con el color del dueño                                                                                            |
| `ui/card_rim`       | `ui/card_rim.png`                                                                                 | 40 x 36             | 1    | Marco en grises; el juego lo tiñe con el color del tier                                                                                                       |
| `ui/card_back`      | `ui/card_back.png`                                                                                | 40 x 36             | 2    | Reverso (sobres, mano oculta)                                                                                                                                 |
| `ui/digits`         | `ui/digits.png`                                                                                   | 75 x 7              | 1    | Hoja de 15 glifos de 5 x 7, en el orden de arriba, blanco sobre transparente                                                                                  |
| `ui/totem`          | `ui/totem.png`                                                                                    | 36 x 32             | 1    | Ícono del tótem neutral                                                                                                                                       |
| `board/cell`        | `board/cell.png`                                                                                  | 40 x 36             | 1    | Casilla vacía                                                                                                                                                 |
| `board/cell_open`   | `board/cell_open.png`                                                                             | 40 x 36             | 1    | Resalte de casilla jugable                                                                                                                                    |
| `board/zone_<el>`   | `board/zone_fuego.png`, `zone_agua.png`, `zone_monte.png`                                         | 40 x 36             | 1    | Casilla de zona                                                                                                                                               |
| `board/rock`        | `board/rock.png`                                                                                  | 40 x 40             | 1    | Roca; sobresale 4 píxeles por arriba de la casilla                                                                                                            |
| `board/seal`        | `board/seal.png`                                                                                  | 40 x 36             | 1    | Sello en grises; se tiñe con el color de quien lo puso                                                                                                        |
| `board/firm`        | `board/firm.png`                                                                                  | 40 x 36             | 1    | Aro del escudo de Firme                                                                                                                                       |
| `icon/el_<el>`      | `icons/el_fuego.png`, `el_agua.png`, `el_monte.png`, `el_errante.png`                             | 9 x 9               | 1    | Ícono de elemento                                                                                                                                             |
| `icon/fx_<id>`      | `icons/fx_<efecto>.png` (10 efectos)                                                              | 9 x 9               | 1    | Ícono de efecto, un solo color claro; el juego lo pone sobre un disco oscuro                                                                                  |
| `fx/flip`           | `fx/flip.png`                                                                                     | 40 x 36 x 6 cuadros | 3    | Tira horizontal del volteo                                                                                                                                    |
| `fx/burst`          | `fx/burst.png`                                                                                    | 48 x 48 x 6 cuadros | 3    | Destello de captura                                                                                                                                           |
| `pack/sobre`        | `packs/sobre.png`                                                                                 | 48 x 64             | 2    | Sobre cerrado                                                                                                                                                 |
| `route/rio-neon_bg` | `route/rio-neon_bg.png`                                                                           | 180 x 320           | 2    | Fondo de la ruta del Río de neón                                                                                                                              |
| `route/node_<tipo>` | `route/node_combate.png`, `node_elite.png`, `node_evento.png`, `node_tienda.png`, `node_jefe.png` | 16 x 16             | 2    | Nodos de la ruta                                                                                                                                              |
| `ui/panel`          | `ui/panel.png`                                                                                    | 24 x 24             | 2    | Panel de 9 secciones (bordes de 8)                                                                                                                            |
| `ui/button`         | `ui/button.png`                                                                                   | 24 x 16             | 2    | Botón de 9 secciones                                                                                                                                          |

## Manifiesto y placeholders

`public/art/manifest.json` lista los assets que existen:

```json
{ "version": 1, "assets": { "card/chigui": "cards/chigui.webp", "board/rock": "board/rock.png" } }
```

- El juego carga el manifiesto al arrancar. Para cada clave que necesita: si está en el manifiesto, carga
  el archivo; si no, **genera por código una textura con la misma clave y el mismo tamaño nativo**. Así
  nada se rompe cuando falta arte y cambiar un placeholder por arte real es solo agregar el archivo y su
  línea en el manifiesto.
- Placeholder de `card/<id>`: hexágono del color del elemento con la inicial del nombre en la fuente de
  5 x 7.
- Si un archivo del manifiesto falla al cargar, se usa el placeholder.

## Producción

- Interfaz y tablero: Claude los produce con un script (`tools/art/`).
- Personajes: se generan con ChatGPT. Claude escribe los prompts en `docs/art/prompts-chatgpt.md`; Andrés
  los pega en ChatGPT, descarga cada imagen como `<id>.png` y la sube a `art-src/cards/` desde la web de
  GitHub. Claude hace el posproceso (quitar fondo, reducir a tamaño nativo sin suavizado, cuantizar a la
  paleta, recortar en hexágono, exportar WebP sin pérdida a `public/art/cards/`) y actualiza el manifiesto.
- `art-src/` guarda los originales sin procesar. El juego nunca los carga.
- Andrés aprueba el estilo con el primer lote antes de producir el resto, y puede reemplazar cualquier
  archivo por arte propio respetando nombre y tamaño.
- No se inventan personajes: solo se ilustran cartas que existen en `src/data/cards.json`.
