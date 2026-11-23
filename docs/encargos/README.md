# Encargos: cómo trabajan Claude y Codex

Claude dirige el proyecto desde una sesión en la nube. Codex implementa desde el computador de Andrés.
No hay canal directo entre los dos: lo que comparten es este repositorio. Andrés solo hace de puente.

## Flujo

Andrés no corre comandos ni revisa nada técnico: prueba abriendo enlaces. Lo técnico (tests, build,
workflow, caché) lo hacen Claude y Codex.

1. Claude escribe el encargo en `docs/encargos/NNN-nombre.md` y lo sube a `main`.
2. **Andrés** abre Codex en la carpeta del proyecto y le pega el mensaje fijo (abajo).
3. Codex hace `git pull`, toma el encargo con `Estado: pendiente` o `Estado: corregir` de número más bajo,
   cambia el estado a `en curso`, lo implementa con commits pequeños, comprueba `npm run check` y el
   workflow, llena la sección **Entrega**, cambia el estado a `entregado` y sube.
4. **Andrés** le escribe a Claude: "Codex terminó". Si Codex le hizo alguna pregunta, la pega.
5. Claude revisa (diff, tests, workflow y el juego publicado). Si cumple, pone `Estado: aprobado` y pasa
   las decisiones a `CLAUDE.md`. Si no, escribe **Correcciones**, pone `Estado: corregir` y le pide a
   Andrés repetir el paso 2.
6. **Andrés** prueba lo nuevo desde el enlace del juego o desde la página de estado.

Mensaje fijo para Codex (siempre el mismo):

```
Haz git pull. Lee docs/encargos/README.md y ejecuta el encargo con estado "pendiente" o "corregir" de número más bajo, siguiendo ese flujo. Al terminar dime en una línea qué encargo entregaste.
```

Enlaces de prueba (también en `CLAUDE.md`):

- Juego: https://afpisso.github.io/paramundo/ (abajo a la derecha muestra el commit y la fecha)
- Prototipo original: https://afpisso.github.io/paramundo/prototipo/
- Estado del proyecto y de los encargos: https://afpisso.github.io/paramundo/estado/

## Reglas para Codex

- Lee `CLAUDE.md` completo antes de cada encargo. Manda sobre cualquier otra cosa.
- Haz solo lo que pide el encargo. Si ves algo más que arreglar, anótalo en **Entrega**, no lo toques.
- Toca solo los archivos y carpetas que el encargo lista en "Archivos". Si necesitas tocar otro, hazlo
  solo si es imprescindible y dilo en **Entrega**.
- **No edites `CLAUDE.md`, `docs/art/` ni `public/art/`**: son de Claude. Las decisiones técnicas que
  tomes van en **Entrega**, sección "Decisiones", y Claude las pasa a `CLAUDE.md`.
- No ajustes balance ni valores de cartas. No inventes personajes, nombres ni lore.
- Si una decisión de diseño no está en `CLAUDE.md` ni en el encargo, no la inventes: usa el default más
  conservador, márcalo con `TODO(diseño)` en el código y anótalo en **Entrega**, sección "Preguntas".
- Si algo te bloquea de verdad, para, escribe el bloqueo en **Entrega**, deja el estado en `en curso`,
  sube lo que tengas y díselo a Andrés en una línea.
- **No le pidas a Andrés que corra comandos, revise tests ni mire GitHub Actions.** Lo técnico lo haces
  tú. Si algo exige su computador y no puedes hacerlo tú, explícale por qué en una línea y dale un solo
  paso.
- No toques `src/pwa.ts`, `tools/site/`, `public/sw-migrate.js` ni la configuración de la PWA en
  `vite.config.ts`: son la marca de versión, el aviso de actualización y la publicación del prototipo y
  de la página de estado. `main.ts` debe seguir llamando a `setupPwa()`.
- Antes de cada push: `npm run check` debe pasar. Después del push final, comprueba que el workflow de
  GitHub Actions quede en verde; si falla, arréglalo antes de marcar `entregado`.
- Commits pequeños y descriptivos, directo a `main`, sin pull request. `git pull --rebase` antes de subir.

## Reparto para no pisarse

| Quién  | Es dueño de                                                                                                                                                                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude | `CLAUDE.md`, `AGENTS.md`, `docs/`, `public/art/`, `public/sw-migrate.js`, `art-src/`, `tools/art/`, `tools/site/`, `src/pwa.ts`, configuración de la PWA en `vite.config.ts`, contenido de `src/data/*.json` (cartas, mazos, niveles, economía, textos de lore), revisiones |
| Codex  | `src/core/`, `src/scenes/`, `src/ui/`, `src/fx/`, `src/save/`, `tools/sim/`, `tests/`, y las partes de `src/data/` que el encargo indique (esquemas, claves nuevas de configuración, textos de interfaz)                                                                    |

Mientras un encargo está `en curso`, Claude no toca los archivos de ese encargo. Mientras no haya encargo
en curso, Codex no sube nada.

## Plantilla de Entrega (la llena Codex al final del encargo)

```
## Entrega

- Commits: <hash inicial>..<hash final>
- Qué quedó hecho: ...
- Cómo probarlo: ...
- Decisiones: (técnicas, una línea cada una con su porqué)
- Preguntas: (diseño sin resolver, marcadas con TODO(diseño) en el código)
- Fuera del encargo que vi y no toqué: ...
```

## Estado de los encargos

| N.º | Encargo                        | Fase |
| --- | ------------------------------ | ---- |
| 001 | IA con niveles                 | 1    |
| 002 | Simulador de balance           | 1    |
| 003 | Escena de combate en pixel art | 1    |

El estado real de cada uno está en la primera línea de su archivo y en
https://afpisso.github.io/paramundo/estado/.
