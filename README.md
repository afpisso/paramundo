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

## Deploy

Cada push corre typecheck, lint, tests y build (`.github/workflows/deploy.yml`). En `main`, además,
publica `dist/` en GitHub Pages.

Configuración única del repo en GitHub: Settings, Pages, Source: **GitHub Actions**.
