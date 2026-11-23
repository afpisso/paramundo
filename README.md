# Paramundo

Vertical slice de un juego de cartas hexagonales para celular. Phaser 3 + TypeScript + Vite, PWA.
La biblia del proyecto (visión, reglas, decisiones) está en [CLAUDE.md](CLAUDE.md).

## Comandos

```bash
npm install
npm run dev      # servidor local, abre la URL de red desde el celular
npm run check    # typecheck + lint + tests
npm run build    # build de producción en dist/
```

## Simulador de balance

```bash
npm run sim -- --games 2000 --p0 normal --p1 normal --deck0 starter --deck1 normal --level all --seed 1
npm run sim -- --games 200 --level none --json
```

Por defecto: 1000 partidas, IA normal y mazo `starter` para ambos, todos los tableros y semilla 1.
IA: `easy`, `normal`, `hard`. Mazos: `starter`, `easy`, `normal`, `hard`. Tablero: `all`, `none` o un id
de `src/data/levels.json`. `all` rota por los cinco tableros; quien empieza se alterna desde p0.
La misma configuración y semilla producen el mismo reporte. `--help` muestra las opciones.

Las tasas incluyen los empates en el denominador. Por carta se cuentan partidas distintas y manos de
dueños: una observación por jugador y partida, aunque tenga varias copias; si ambos la roban, hay dos
observaciones. La tasa de victoria usa esas manos de dueños. Las capturas por carta incluyen ambas
oleadas y tótems, se atribuyen a la carta jugada y se dividen entre las veces que se jugó.
Para consumir solo JSON sin el encabezado de npm: `npm run --silent sim -- --games 200 --json`.

## Deploy

Cada push corre typecheck, lint, tests y build (`.github/workflows/deploy.yml`). En `main`, además,
publica `dist/` en GitHub Pages.

Configuración única del repo en GitHub: Settings, Pages, Source: **GitHub Actions**.
