import { describe, expect, it } from 'vitest';
import {
  applyMove,
  chooseMove,
  createGame,
  createRng,
  drawHand,
  IllegalMoveError,
  instantiate,
  legalCells,
} from '../../src/core';
import type { AIConfig, AILevel, GameState } from '../../src/core';
import { AI_LEVELS, CARDS, DECKS, getCard, LEVELS, RULES } from '../../src/data';
import { at, card, game, put } from '../helpers';

const quiet = (level: AILevel): AIConfig => ({ ...AI_LEVELS[level], noise: 0 });
const pick = (state: GameState, config = quiet('normal')) => chooseMove(state, RULES, config, createRng(42));
const flips = (state: GameState, config: AIConfig): number =>
  applyMove(state, pick(state, config), RULES).events.reduce(
    (sum, event) => sum + (event.type === 'flip' ? event.cells.length : 0),
    0,
  );

/** Seals restrict candidate moves while keeping empty neighbours visible to the threat estimate. */
function allowOnly(state: GameState, cells: number[]): void {
  state.seals = legalCells(state)
    .filter((cell) => !cells.includes(cell))
    .map((cell) => ({ cell, owner: state.turn === 0 ? 1 : 0 }));
}

describe('chooseMove', () => {
  it('is deterministic for every level and never mutates its input', () => {
    const state = game(CARDS.slice(0, 6).map((c) => instantiate(c, RULES)));
    put(state, 0, 0, card(3, 'monte', 'espinas'), 1);
    const before = structuredClone(state);
    for (const config of Object.values(AI_LEVELS)) {
      expect(chooseMove(state, RULES, config, createRng(73))).toEqual(
        chooseMove(state, RULES, config, createRng(73)),
      );
    }
    expect(state).toEqual(before);
  });

  it('breaks equal scores by cell, hand index and rotation in that order', () => {
    const state = game([card(5, 'errante', 'giro'), card(5)]);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      expect(pick(state, { ...quiet(level), threatWeight: 0, powerWeight: 0 })).toEqual({
        cell: 0,
        handIndex: 0,
        rotation: 0,
      });
    }
  });

  it('prefers a capture over an empty placement at every level', () => {
    const state = game([card(5)]);
    put(state, 0, 0, card(1), 1);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      expect(flips(state, quiet(level))).toBe(1);
    }
  });

  it('finds the first Giro rotation that captures', () => {
    const state = game([card([1, 1, 1, 1, 1, 9], 'errante', 'giro')]);
    put(state, 0, -1, card(8), 1);
    allowOnly(state, [at(0, 0)]);
    expect(pick(state, quiet('easy'))).toEqual({ cell: at(0, 0), handIndex: 0, rotation: 1 });
  });

  it('normal avoids exposure, while Firme makes threat zero', () => {
    const state = game([card(5)], [card(6)]);
    const center = at(0, 0);
    const corner = at(2, 0);
    allowOnly(state, [center, corner]);
    expect(pick(state).cell).toBe(corner);
    state.hands[0] = [card(5, 'errante', 'firme')];
    expect(pick(state).cell).toBe(center);
  });

  it('counts threat before captures and the resulting Espinas penalty', () => {
    const state = game([card(5)], [card(5)]);
    const center = at(0, 0);
    put(state, 0, -1, card(1, 'errante', 'espinas'), 1);
    allowOnly(state, [center, at(2, 0)]);
    expect(pick(state, { ...quiet('normal'), captureWeight: 0 }).cell).toBe(center);
  });

  it('hard rejects a capture whose rival reply takes three cards', () => {
    const state = game([card(5)], [card(6)]);
    const greedy = at(0, 0);
    const safe = at(1, 0);
    put(state, 0, -1, card(1), 1);
    put(state, 2, 0, card(1), 0);
    put(state, 1, 1, card(1), 0);
    for (const cell of legalCells(state)) {
      if (cell !== greedy && cell !== safe) state.rocks[cell] = true;
    }
    expect(pick(state, { ...quiet('normal'), threatWeight: 0 }).cell).toBe(greedy);
    expect(pick(state, { ...quiet('hard'), threatWeight: 0 }).cell).toBe(safe);
  });

  it('hard counts both waves of a rival Cadena reply', () => {
    const state = game([card(5)], [card(6, 'errante', 'cadena')]);
    const greedy = at(0, 0);
    const safe = at(2, 0);
    put(state, -1, 0, card(1), 1);
    put(state, -1, 1, card(1), 0);
    put(state, 0, 1, card(1), 0);
    allowOnly(state, [greedy, safe]);
    const normal = { ...quiet('normal'), threatWeight: 0 };
    const hard = { ...quiet('hard'), threatWeight: 0 };
    expect(pick(state, normal).cell).toBe(greedy);
    expect(pick(state, hard).cell).toBe(safe);
  });

  it('does not search replies after a terminal move and rejects finished games', () => {
    const state = game([card(5)], []);
    const move = pick(state, quiet('hard'));
    const end = applyMove(state, move, RULES).state;
    expect(end.over).toBe(true);
    expect(() => pick(end)).toThrow(IllegalMoveError);
    expect(() => pick(game([], []))).toThrow(IllegalMoveError);
  });

  it('plays 200 seeded complete matches across every AI and board level with legal moves', () => {
    const levels: AILevel[] = ['easy', 'normal', 'hard'];
    const coverage = new Set<string>();
    let maxHardMs = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(seed);
      const level = LEVELS[seed % LEVELS.length] ?? null;
      const a = levels[Math.floor(seed / LEVELS.length) % levels.length] ?? 'easy';
      const b = levels[Math.floor(seed / (LEVELS.length * levels.length)) % levels.length] ?? 'easy';
      const hand = (difficulty: AILevel) =>
        drawHand(DECKS.rivals[difficulty], rng, RULES).map((id) => instantiate(getCard(id), RULES));
      let state = createGame({ level, hands: [hand(a), hand(b)], starter: seed % 2 === 0 ? 0 : 1 }, RULES);
      let turns = 0;
      while (!state.over) {
        const difficulty = state.turn === 0 ? a : b;
        coverage.add(`${level?.id}:${difficulty}`);
        const started = performance.now();
        const move = chooseMove(state, RULES, AI_LEVELS[difficulty], rng);
        const elapsed = performance.now() - started;
        if (difficulty === 'hard') maxHardMs = Math.max(maxHardMs, elapsed);
        expect(legalCells(state)).toContain(move.cell);
        expect(state.hands[state.turn][move.handIndex]).toBeDefined();
        state = applyMove(state, move, RULES).state;
        expect(++turns).toBeLessThanOrEqual(RULES.handSize * 2);
      }
      expect(state.winner).not.toBeNull();
    }
    expect(coverage.size).toBe(LEVELS.length * levels.length);
    console.info(`200 AI matches completed; slowest hard move: ${maxHardMs.toFixed(2)} ms`);
    expect(maxHardMs).toBeLessThan(150);
  }, 60_000);
});
