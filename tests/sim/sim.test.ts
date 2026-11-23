import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyMove, chooseMove, createGame, createRng, drawHand, instantiate } from '../../src/core';
import { AI_LEVELS, DECKS, getCard, LEVELS, RULES } from '../../src/data';
import { DEFAULT_OPTIONS, formatReport, resolveOptions, runSimulation } from '../../tools/sim/sim';
import type { SimulationReport } from '../../tools/sim/sim';

describe('balance simulator', () => {
  it('produces identical reports with identical seeds and options', () => {
    const options = { games: 20, seed: 123, deck1: 'hard', p1: 'hard' as const };
    expect(runSimulation(options)).toEqual(runSimulation(options));
  });

  it('reconciles match, turn, capture and per-card totals across every board', () => {
    const report = runSimulation({ games: 25, seed: 9 });
    expect(report.p0.wins + report.p1.wins + report.draws.count).toBe(report.games);
    expect(report.starter.wins + report.second.wins).toBe(report.p0.wins + report.p1.wins);
    expect(report.p0.winRate + report.p1.winRate + report.draws.rate).toBeCloseTo(100);
    expect(report.levels.map((level) => [level.id, level.games])).toEqual(
      LEVELS.map((level) => [level.id, 5]),
    );
    expect(report.levels.reduce((sum, level) => sum + level.p0Wins, 0)).toBe(report.p0.wins);
    expect(report.moves).toBe(report.games * RULES.handSize * 2);
    expect(report.cards.reduce((sum, card) => sum + card.plays, 0)).toBe(report.moves);
    expect(report.cards.reduce((sum, card) => sum + card.captures, 0)).toBe(report.captures.total);
    expect(report.captures.perMove).toBe(report.captures.total / report.moves);
    expect(report.captures.maxPerMove).toBeGreaterThanOrEqual(report.captures.perMove);
    for (const [i, card] of report.cards.entries()) {
      expect(card.games).toBeLessThanOrEqual(report.games);
      expect(card.ownerHands).toBeGreaterThanOrEqual(card.games);
      expect(card.ownerHands).toBeLessThanOrEqual(card.games * 2);
      expect(card.ownerWins).toBeLessThanOrEqual(card.games);
      expect(card.winRate).toBe((card.ownerWins / card.ownerHands) * 100);
      expect(card.capturesPerPlay).toBe(card.captures / card.plays);
      if (i > 0) expect(report.cards[i - 1]?.winRate).toBeGreaterThanOrEqual(card.winRate);
    }
    expect(formatReport(report)).toContain('Por carta');
  });

  it('rotates boards without skipping the remainder and supports a specific board or none', () => {
    expect(runSimulation({ games: 7 }).levels.map((level) => level.games)).toEqual([2, 2, 1, 1, 1]);
    for (const level of ['none', 'ruinas']) {
      expect(runSimulation({ games: 2, level }).levels).toMatchObject([{ id: level, games: 2 }]);
    }
  });

  it('matches an independent core replay, including unique owners, duplicate copies and both capture waves', () => {
    const seed = 31;
    const rng = createRng(seed);
    const draw = () => drawHand(DECKS.rivals.hard, rng, RULES).map((id) => instantiate(getCard(id), RULES));
    const hands = [draw(), draw()] as const;
    const drawn = hands.map((hand) => new Set(hand.map((card) => card.defId)));
    expect(drawn.some((ids, player) => ids.size < (hands[player]?.length ?? 0))).toBe(true);
    let state = createGame({ level: null, hands: [hands[0], hands[1]], starter: 0 }, RULES);
    let total = 0;
    let max = 0;
    while (!state.over) {
      const config = state.turn === 0 ? AI_LEVELS.easy : AI_LEVELS.normal;
      const result = applyMove(state, chooseMove(state, RULES, config, rng), RULES);
      const count = result.events
        .filter((e) => e.type === 'flip')
        .reduce((sum, e) => sum + e.cells.length, 0);
      total += count;
      max = Math.max(max, count);
      state = result.state;
    }
    const report = runSimulation({ games: 1, seed, level: 'none', deck0: 'hard', deck1: 'hard', p0: 'easy' });
    expect(report.captures.total).toBe(total);
    expect(report.captures.maxPerMove).toBe(max);
    expect(report.p0.wins).toBe(state.winner === 0 ? 1 : 0);
    expect(report.p1.wins).toBe(state.winner === 1 ? 1 : 0);
    expect(report.starter.wins).toBe(report.p0.wins);
    for (const card of report.cards) {
      expect(card.games).toBe(1);
      expect(card.ownerHands).toBe(drawn.filter((hand) => hand.has(card.id)).length);
      const winnerHasCard = typeof state.winner === 'number' && drawn[state.winner]?.has(card.id);
      expect(card.ownerWins).toBe(winnerHasCard ? 1 : 0);
    }
  });

  it('validates defaults and rejects invalid options before simulating', () => {
    expect(resolveOptions()).toEqual(DEFAULT_OPTIONS);
    for (const options of [
      { games: 0 },
      { games: -1 },
      { games: 1.5 },
      { games: Infinity },
      { seed: -1 },
      { seed: 0x100000000 },
      { seed: NaN },
      { deck0: 'missing' },
      { deck1: '__proto__' },
      { level: 'missing' },
    ]) {
      expect(() => resolveOptions(options)).toThrow();
    }
  });
});

describe('sim CLI', () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, ['--import', 'tsx', 'tools/sim/cli.ts', ...args], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      encoding: 'utf8',
    });

  it('emits only valid JSON and accepts all supported options', () => {
    const result = run(
      '--games',
      '2',
      '--seed',
      '0',
      '--p0',
      'easy',
      '--p1',
      'hard',
      '--deck0',
      'easy',
      '--deck1',
      'hard',
      '--level',
      'caldera',
      '--json',
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as SimulationReport;
    expect(report.options).toEqual({
      games: 2,
      seed: 0,
      p0: 'easy',
      p1: 'hard',
      deck0: 'easy',
      deck1: 'hard',
      level: 'caldera',
    });
    expect(report.games).toBe(2);
  });

  it('rejects invalid difficulty, missing arguments and unknown flags with a nonzero exit', () => {
    for (const args of [['--p0', 'invalid'], ['--games'], ['--unknown']]) {
      const result = run(...args);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Error:');
      expect(result.stdout).toBe('');
    }
  });
});
