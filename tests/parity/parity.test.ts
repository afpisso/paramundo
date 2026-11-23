/**
 * Parity with the prototype: random matches are played move by move on the oracle (the prototype's
 * own logic, see tools/parity/oracle.js) and on src/core, and the full state must match after every move.
 */
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  cardPower,
  createGame,
  createRng,
  instantiate,
  legalCells,
  score,
  tierIndex,
} from '../../src/core';
import type { CardDef, EffectId, Element, GameState, LevelDef, PlayerId, Ruleset } from '../../src/core';
import { CARDS, LEVELS, RULES } from '../../src/data';
import { PROTOTYPE_FX_COUNTS, createOracle } from '../../tools/parity/oracle.js';
import type { Oracle, OracleCard } from '../../tools/parity/oracle.js';

const EL: Record<Element, number> = { fuego: 0, agua: 1, monte: 2, errante: -1 };
const EL_NAME = ['fuego', 'agua', 'monte'];
const FX: Record<EffectId, string> = {
  reclamo: 'R',
  guardian: 'G',
  embestida: 'E',
  siembra: 'S',
  sello: 'X',
  cadena: 'C',
  firme: 'F',
  espinas: 'K',
  giro: 'O',
  manada: 'M',
};

const toOracleCard = (c: CardDef): OracleCard => ({
  s: [...c.sides],
  el: EL[c.element],
  fx: c.effect ? FX[c.effect] : null,
});
const toOracleLevel = (l: LevelDef) => ({
  rocks: l.rocks,
  zones: l.zones.map(([q, r, e]) => [q, r, EL[e]]),
  totems: l.totems.map((t) => ({ c: t.cell, s: [...t.sides], el: EL[t.element] })),
});

const snapshotCore = (s: GameState) => ({
  board: s.board.map((p) =>
    p ? { o: p.owner, s: p.card.sides, t: p.card.tier, was: p.ownedMask, firm: p.firm } : null,
  ),
  zones: s.zones,
  seals: s.seals.map((x) => `${x.cell}:${x.owner}`),
  hands: s.hands.map((h) => h.map((c) => c.sides)),
  turn: s.over ? -1 : s.turn,
  over: s.over,
  score: [score(s, 0), score(s, 1)],
});

const snapshotOracle = (o: Oracle) => ({
  board: o.st.board.map((p) =>
    p ? { o: p.owner, s: p.card.s, t: p.card.t, was: p.was, firm: !!p.shield } : null,
  ),
  zones: o.st.zones.map((z) => (z < 0 ? null : EL_NAME[z])),
  seals: o.st.seals.map((x) => `${x.i}:${x.owner}`),
  hands: o.st.hands.map((h) => h.map((c) => c.s)),
  turn: o.st.over ? -1 : o.st.turn,
  over: o.st.over,
  score: [o.score(0), o.score(1)],
});

interface Stats {
  moves: number;
  flips: number;
  events: Record<string, number>;
}

function playMatch(
  seed: number,
  oracle: Oracle,
  rules: Ruleset,
  levels: (LevelDef | null)[],
  stats: Stats,
): void {
  const rng = createRng(seed);
  const level = levels[rng.int(levels.length)] ?? null;
  const pick = (): CardDef => CARDS[rng.int(CARDS.length)] as CardDef;
  const defs: [CardDef[], CardDef[]] = [Array.from({ length: 6 }, pick), Array.from({ length: 6 }, pick)];
  const starter = rng.int(2) as PlayerId;

  let state = createGame(
    {
      level,
      hands: [defs[0].map((d) => instantiate(d, rules)), defs[1].map((d) => instantiate(d, rules))],
      starter,
    },
    rules,
  );
  oracle.newGame(
    level ? toOracleLevel(level) : null,
    defs.map((h) => h.map(toOracleCard)),
    starter,
  );
  expect(snapshotCore(state)).toEqual(snapshotOracle(oracle));

  for (let n = 0; !state.over; n++) {
    const cells = legalCells(state);
    const cell = cells[rng.int(cells.length)] as number;
    const hand = state.hands[state.turn];
    const handIndex = rng.int(hand.length);
    const rotation = hand[handIndex]?.effect === 'giro' ? rng.int(6) : 0;
    expect(oracle.play(handIndex, cell, rotation), `seed ${seed} move ${n}: oracle refused the move`).toBe(
      true,
    );
    const r = applyMove(state, { handIndex, cell, rotation }, rules);
    state = r.state;
    expect(snapshotCore(state), `seed ${seed} move ${n}`).toEqual(snapshotOracle(oracle));
    stats.moves++;
    for (const e of r.events) {
      stats.events[e.type] = (stats.events[e.type] ?? 0) + 1;
      if (e.type === 'flip') stats.flips += e.cells.length;
    }
  }
}

const newStats = (): Stats => ({ moves: 0, flips: 0, events: {} });

describe('parity with the prototype', () => {
  it('power and tier of every card match the prototype formulas', () => {
    const oracle = createOracle();
    for (const c of CARDS) {
      expect([c.id, cardPower(c, RULES), tierIndex(c, RULES)]).toEqual([
        c.id,
        oracle.power(toOracleCard(c)),
        oracle.tierOf(toOracleCard(c)),
      ]);
    }
  });

  it('verbatim prototype rules: 600 random matches on boards without totems', () => {
    // No neutral pieces, so the Guardián deviation cannot show; Siembra and Sello use the prototype counts.
    const rules: Ruleset = {
      ...RULES,
      effects: {
        ...RULES.effects,
        siembra: { ...RULES.effects.siembra, cellsByTier: PROTOTYPE_FX_COUNTS },
        sello: { ...RULES.effects.sello, cellsByTier: PROTOTYPE_FX_COUNTS },
      },
    };
    const levels = [null, ...LEVELS.filter((l) => l.totems.length === 0)];
    const oracle = createOracle();
    const stats = newStats();
    for (let seed = 1; seed <= 600; seed++) playMatch(seed, oracle, rules, levels, stats);
    // the sample must actually exercise the rules
    expect(stats.flips).toBeGreaterThan(1500);
    for (const type of ['guardian', 'espinas', 'cadena', 'siembra', 'sello', 'firm', 'modifiers']) {
      expect(stats.events[type] ?? 0, type).toBeGreaterThan(20);
    }
  });

  it('game rules (approved deviations on): 600 random matches on every level, totems included', () => {
    expect(RULES.effects.sello.cellsByTier).toEqual(RULES.effects.siembra.cellsByTier);
    const oracle = createOracle({ guardianOwnOnly: true, fxCounts: RULES.effects.siembra.cellsByTier });
    const stats = newStats();
    for (let seed = 1001; seed <= 1600; seed++) playMatch(seed, oracle, RULES, [null, ...LEVELS], stats);
    expect(stats.flips).toBeGreaterThan(1500);
    expect(stats.events['guardian'] ?? 0).toBeGreaterThan(20);
  });
});
