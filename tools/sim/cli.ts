import { parseArgs } from 'node:util';
import type { AILevel } from '../../src/core';
import { DEFAULT_OPTIONS, formatReport, runSimulation } from './sim';

try {
  const { values } = parseArgs({
    options: {
      games: { type: 'string', default: String(DEFAULT_OPTIONS.games) },
      seed: { type: 'string', default: String(DEFAULT_OPTIONS.seed) },
      p0: { type: 'string', default: DEFAULT_OPTIONS.p0 },
      p1: { type: 'string', default: DEFAULT_OPTIONS.p1 },
      deck0: { type: 'string', default: DEFAULT_OPTIONS.deck0 },
      deck1: { type: 'string', default: DEFAULT_OPTIONS.deck1 },
      level: { type: 'string', default: DEFAULT_OPTIONS.level },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(
      'npm run sim -- [--games 1000] [--seed 1] [--p0 normal] [--p1 normal] [--deck0 starter] [--deck1 starter] [--level all] [--json]',
    );
    console.log(
      'IA: easy, normal, hard. Mazos: starter, easy, normal, hard. Tablero: all, none o id de levels.json.',
    );
  } else {
    // All CLI values, including these AI level casts, are validated by runSimulation before use.
    const report = runSimulation({
      games: Number(values.games),
      seed: Number(values.seed),
      p0: values.p0 as AILevel,
      p1: values.p1 as AILevel,
      deck0: values.deck0 ?? DEFAULT_OPTIONS.deck0,
      deck1: values.deck1 ?? DEFAULT_OPTIONS.deck1,
      level: values.level ?? DEFAULT_OPTIONS.level,
    });
    console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
