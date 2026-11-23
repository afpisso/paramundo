import { applyMove, chooseMove, createGame, createRng, drawHand, instantiate } from '../../src/core';
import type { AILevel, PlayerId } from '../../src/core';
import { AI_LEVELS, DECKS, getCard, LEVELS, RULES } from '../../src/data';

export interface SimulationOptions {
  games: number;
  seed: number;
  p0: AILevel;
  p1: AILevel;
  deck0: string;
  deck1: string;
  level: string;
}

export const DEFAULT_OPTIONS: Readonly<SimulationOptions> = {
  games: 1000,
  seed: 1,
  p0: 'normal',
  p1: 'normal',
  deck0: 'starter',
  deck1: 'starter',
  level: 'all',
};

const decks: Readonly<Record<string, readonly string[]>> = { starter: DECKS.starter, ...DECKS.rivals };
const percent = (wins: number, games: number): number => (games ? (wins / games) * 100 : 0);

export function resolveOptions(input: Partial<SimulationOptions> = {}): SimulationOptions {
  const options = { ...DEFAULT_OPTIONS, ...input };
  if (!Number.isSafeInteger(options.games) || options.games < 1) {
    throw new Error('--games debe ser un entero positivo.');
  }
  if (!Number.isInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) {
    throw new Error('--seed debe ser un entero entre 0 y 4294967295.');
  }
  for (const player of ['p0', 'p1'] as const) {
    if (!Object.hasOwn(AI_LEVELS, options[player])) {
      throw new Error(`--${player} debe ser easy, normal o hard.`);
    }
  }
  for (const deck of ['deck0', 'deck1'] as const) {
    if (!Object.hasOwn(decks, options[deck])) {
      throw new Error(`--${deck} debe ser ${Object.keys(decks).join(', ')}.`);
    }
  }
  if (!['all', 'none', ...LEVELS.map((level) => level.id)].includes(options.level)) {
    throw new Error(`--level debe ser all, none o ${LEVELS.map((level) => level.id).join(', ')}.`);
  }
  return options;
}

export interface CardReport {
  id: string;
  name: string;
  /** Distinct matches containing this card in at least one drawn hand. */
  games: number;
  /** One observation per player/match, regardless of duplicate copies. Both players can count. */
  ownerHands: number;
  ownerWins: number;
  winRate: number;
  plays: number;
  captures: number;
  capturesPerPlay: number;
}

export interface SimulationReport {
  options: SimulationOptions;
  games: number;
  p0: { wins: number; winRate: number };
  p1: { wins: number; winRate: number };
  draws: { count: number; rate: number };
  starter: { wins: number; winRate: number };
  second: { wins: number; winRate: number };
  moves: number;
  captures: { total: number; perMove: number; maxPerMove: number };
  levels: { id: string; games: number; p0Wins: number; p0WinRate: number }[];
  cards: CardReport[];
}

/** Uses one seeded RNG for draws and decisions. No clock or runtime measurements enter the report. */
export function runSimulation(input: Partial<SimulationOptions> = {}): SimulationReport {
  const options = resolveOptions(input);
  const rng = createRng(options.seed);
  const report: SimulationReport = {
    options,
    games: options.games,
    p0: { wins: 0, winRate: 0 },
    p1: { wins: 0, winRate: 0 },
    draws: { count: 0, rate: 0 },
    starter: { wins: 0, winRate: 0 },
    second: { wins: 0, winRate: 0 },
    moves: 0,
    captures: { total: 0, perMove: 0, maxPerMove: 0 },
    levels: [],
    cards: [],
  };
  const cards = new Map<string, CardReport>();
  for (let match = 0; match < options.games; match++) {
    const level =
      options.level === 'all'
        ? (LEVELS[match % LEVELS.length] ?? null)
        : (LEVELS.find((level) => level.id === options.level) ?? null);
    const levelId = level?.id ?? 'none';
    let levelReport = report.levels.find((entry) => entry.id === levelId);
    if (!levelReport) {
      levelReport = { id: levelId, games: 0, p0Wins: 0, p0WinRate: 0 };
      report.levels.push(levelReport);
    }
    levelReport.games++;
    const draw = (deck: string) =>
      drawHand(decks[deck] ?? [], rng, RULES).map((id) => instantiate(getCard(id), RULES));
    const starter: PlayerId = match % 2 === 0 ? 0 : 1;
    let state = createGame({ level, hands: [draw(options.deck0), draw(options.deck1)], starter }, RULES);
    const drawn = state.hands.map((hand) => new Set(hand.map((card) => card.defId)));
    for (const id of new Set(drawn.flatMap((hand) => [...hand]))) {
      let entry = cards.get(id);
      if (!entry) {
        entry = {
          id,
          name: getCard(id).name,
          games: 0,
          ownerHands: 0,
          ownerWins: 0,
          winRate: 0,
          plays: 0,
          captures: 0,
          capturesPerPlay: 0,
        };
        cards.set(id, entry);
      }
      entry.games++;
      entry.ownerHands += drawn.filter((hand) => hand.has(id)).length;
    }
    while (!state.over) {
      const config = AI_LEVELS[state.turn === 0 ? options.p0 : options.p1];
      const move = chooseMove(state, RULES, config, rng);
      const played = state.hands[state.turn][move.handIndex];
      if (!played) throw new Error('La IA eligió una carta inexistente.');
      const result = applyMove(state, move, RULES);
      const captures = result.events.reduce(
        (sum, event) => sum + (event.type === 'flip' ? event.cells.length : 0),
        0,
      );
      report.moves++;
      report.captures.total += captures;
      report.captures.maxPerMove = Math.max(report.captures.maxPerMove, captures);
      const entry = cards.get(played.defId);
      if (entry) {
        entry.plays++;
        entry.captures += captures;
      }
      state = result.state;
    }
    if (state.winner === 'draw') {
      report.draws.count++;
    } else if (state.winner !== null) {
      const winner = state.winner;
      (winner === 0 ? report.p0 : report.p1).wins++;
      (winner === starter ? report.starter : report.second).wins++;
      if (winner === 0) levelReport.p0Wins++;
      for (const id of drawn[winner] ?? []) {
        const entry = cards.get(id);
        if (entry) entry.ownerWins++;
      }
    }
  }
  for (const result of [report.p0, report.p1, report.starter, report.second]) {
    result.winRate = percent(result.wins, report.games);
  }
  report.draws.rate = percent(report.draws.count, report.games);
  report.captures.perMove = report.captures.total / report.moves;
  for (const entry of report.levels) entry.p0WinRate = percent(entry.p0Wins, entry.games);
  for (const entry of cards.values()) {
    entry.winRate = percent(entry.ownerWins, entry.ownerHands);
    entry.capturesPerPlay = entry.plays ? entry.captures / entry.plays : 0;
  }
  report.cards = [...cards.values()].sort(
    (a, b) => b.winRate - a.winRate || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return report;
}

export function formatReport(report: SimulationReport): string {
  const rate = (value: number) => `${value.toFixed(2)}%`;
  return [
    `Partidas: ${report.games} | semilla: ${report.options.seed}`,
    `IA: ${report.options.p0} vs ${report.options.p1} | mazos: ${report.options.deck0} vs ${report.options.deck1}`,
    `p0: ${report.p0.wins} (${rate(report.p0.winRate)}) | p1: ${report.p1.wins} (${rate(report.p1.winRate)}) | empates: ${report.draws.count} (${rate(report.draws.rate)})`,
    `Empieza: ${report.starter.wins} (${rate(report.starter.winRate)}) | segundo: ${report.second.wins} (${rate(report.second.winRate)})`,
    `Jugadas: ${report.moves} | capturas: ${report.captures.total} | promedio por jugada: ${report.captures.perMove.toFixed(3)} | máximo: ${report.captures.maxPerMove}`,
    '',
    'Por tablero (victorias de p0):',
    ...report.levels.map(
      (entry) => `  ${entry.id}: ${entry.games} partidas, ${entry.p0Wins} (${rate(entry.p0WinRate)})`,
    ),
    '',
    'Por carta (victorias por dueño/partida, copias sin duplicar; capturas incluyen Cadena y tótems):',
    ...report.cards.map(
      (entry) =>
        `  ${entry.name} [${entry.id}]: ${entry.games} partidas, ${entry.ownerHands} manos de dueños, ${entry.ownerWins} victorias (${rate(entry.winRate)}), ${entry.plays} jugadas, ${entry.capturesPerPlay.toFixed(3)} capturas/jugada`,
    ),
  ].join('\n');
}
