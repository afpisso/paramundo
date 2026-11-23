# Prompts de arte para ChatGPT

Cómo se usa:

1. Abre un chat nuevo en ChatGPT y pega el **mensaje de estilo**. Ya incluye la primera carta.
2. Para cada carta siguiente, pega su línea en el **mismo chat**, una por una, para que conserve el estilo.
3. Descarga cada imagen y renómbrala con el nombre indicado (`chigui.png`, etc.).
4. Súbelas en https://github.com/afpisso/paramundo/upload/main/art-src/cards (arrastra los archivos y
   pulsa "Commit changes").
5. Avísale a Claude: "subí el lote 1".

Si una imagen sale con texto, marco, sombra, varios personajes o el personaje cortado, pide en el mismo
chat: "Repite la última, sin <lo que sobró>".

Las descripciones salen de `src/data/cards.json` (inspiración, frase y tribu). Andrés puede cambiarlas:
son dirección de arte, no reglas.

## Mensaje de estilo (pegar primero)

```
Vas a ilustrar criaturas para un juego de cartas en pixel art. Voy a pedirte una criatura por mensaje. Usa exactamente el mismo estilo en todas:

- Pixel art de baja resolución, como un sprite de 32 x 32 píxeles ampliado: píxeles cuadrados grandes y nítidos, alineados a una rejilla, sin suavizado, sin degradados, sin desenfoque.
- Máximo 16 colores por imagen. Contorno oscuro de 1 píxel alrededor del personaje.
- Un solo personaje, de cuerpo entero, tierno y con carácter, en vista de tres cuartos mirando al frente, centrado, ocupando cerca del 60% del lienzo.
- Imagen cuadrada de 1024 x 1024. Fondo transparente; si no puedes, fondo liso magenta puro (#FF00FF) sin nada más.
- Sin texto, sin marco, sin suelo, sin sombra proyectada, sin otros objetos.
- Mundo: una Colombia del futuro cercano. Cada criatura pertenece a una tribu que define sus colores de acento:
  - Agua (río de neón): cian y magenta brillantes sobre azules.
  - Monte (selva biopunk): verdes con puntos bioluminiscentes.
  - Fuego (vapor y trapiche): naranjas, cobre y humo.
  - Errantes (ciudad pirata): violetas, lona y óxido.

Primera criatura: Chigüi, tribu Agua. Un chigüiro (capibara) gordito y tranquilo, al que nada estresa.
```

## Lote 1: mazo inicial (8 cartas)

| Archivo          | Línea para pegar                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chigui.png`     | (ya va en el mensaje de estilo)                                                                                                                                 |
| `doradita.png`   | `Siguiente criatura, mismo estilo: Doradita, tribu Monte. Una rana dorada venenosa del Chocó: pequeñita, brillante y mejor no tocarla.`                         |
| `guaca.png`      | `Siguiente criatura, mismo estilo: Guaca, tribu Fuego. Una guacamaya bandera (roja, amarilla y azul) que grita y se lanza de frente.`                           |
| `titin.png`      | `Siguiente criatura, mismo estilo: Titín, tribu Errantes. Un mono tití cabeciblanco, con su cresta de pelo blanco, travieso e imitador.`                        |
| `anteojitos.png` | `Siguiente criatura, mismo estilo: Anteojitos, tribu Monte. Un oso de anteojos andino, grande, tranquilo y protector.`                                          |
| `frailin.png`    | `Siguiente criatura, mismo estilo: Frailín, tribu Monte. Un frailejón del páramo convertido en criatura: tallo grueso y una roseta de hojas peludas plateadas.` |
| `rosadito.png`   | `Siguiente criatura, mismo estilo: Rosadito, tribu Agua. Un delfín rosado del Amazonas, juguetón y escurridizo.`                                                |
| `zumbi.png`      | `Siguiente criatura, mismo estilo: Zumbi, tribu Fuego. Un colibrí velocísimo, en pleno vuelo.`                                                                  |

## Lote 2: raras y superiores (11 cartas)

Pendiente. Se escribe cuando Andrés apruebe el estilo del lote 1.
