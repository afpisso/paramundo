/**
 * Combat rules. Pure and deterministic: `applyMove` takes a state and a move and returns a new state
 * plus the ordered list of events. Behaviour replicates `play()` in referencias/prototipo-hex-triad.html,
 * except for the deviations recorded in CLAUDE.md ("Decisiones").
 *
 * Resolution order of a move:
 *   1. place the card (rotation for Giro, Firme shield)
 *   2. modifiers (zone, Manada, Embestida)
 *   3. clashes against every rival or neutral neighbour
 *   4. Guardián
 *   5. flip
 *   6. Espinas
 *   7. Cadena: second wave (clashes, Guardián, flip, Espinas), once
 *   8. Siembra
 *   9. Sello
 *  10. end of turn (seals and Firme shields expire, game over check)
 */
import { CELL_COUNT, DIR_COUNT, NEIGHBORS, cellIndex, oppositeDir } from './board';
import { rotateSidesBy, tierIndex } from './cards';
import type { Clash, GameEvent } from './events';
import {
  NEUTRAL,
  type CardInstance,
  type Element,
  type GameState,
  type LevelDef,
  type Move,
  type Owner,
  type Piece,
  type PlayerId,
  type Ruleset,
  type Sides,
  type ZoneElement,
} from './types';

export interface GameSetup {
  level: LevelDef | null;
  hands: [CardInstance[], CardInstance[]];
  starter: PlayerId;
}

export interface MoveResult {
  state: GameState;
  events: GameEvent[];
}

export class IllegalMoveError extends Error {}

const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);
const cloneCard = (c: CardInstance): CardInstance => ({ ...c, sides: [...c.sides] as Sides });
const neighborsOf = (cell: number): readonly number[] => NEIGHBORS[cell] ?? [];
const sideOf = (card: CardInstance, dir: number): number => card.sides[dir] ?? 0;

export function cloneState(s: GameState): GameState {
  return {
    ...s,
    board: s.board.map((p) => (p ? { ...p, card: cloneCard(p.card) } : null)),
    zones: [...s.zones],
    rocks: [...s.rocks],
    seals: s.seals.map((x) => ({ ...x })),
    hands: [s.hands[0].map(cloneCard), s.hands[1].map(cloneCard)],
  };
}

export function createGame(setup: GameSetup, rules: Ruleset): GameState {
  const state: GameState = {
    board: Array<Piece | null>(CELL_COUNT).fill(null),
    zones: Array<ZoneElement | null>(CELL_COUNT).fill(null),
    rocks: Array<boolean>(CELL_COUNT).fill(false),
    seals: [],
    hands: [setup.hands[0].map(cloneCard), setup.hands[1].map(cloneCard)],
    turn: setup.starter,
    starter: setup.starter,
    placed: 0,
    over: false,
    winner: null,
  };
  const at = (q: number, r: number): number => {
    const i = cellIndex(q, r);
    if (i < 0) throw new Error(`Level cell out of board: ${q},${r}`);
    return i;
  };
  if (setup.level) {
    for (const [q, r] of setup.level.rocks) state.rocks[at(q, r)] = true;
    for (const [q, r, el] of setup.level.zones) state.zones[at(q, r)] = el;
    for (const t of setup.level.totems) {
      const card: CardInstance = {
        defId: 'totem',
        element: t.element,
        sides: [...t.sides] as Sides,
        effect: null,
        tier: tierIndex({ sides: t.sides, effect: null }, rules),
      };
      state.board[at(t.cell[0], t.cell[1])] = { card, owner: NEUTRAL, ownedMask: 0, firm: false };
    }
  }
  return state;
}

/* ---------- queries ---------- */

const pieceAt = (s: GameState, cell: number): Piece | null => s.board[cell] ?? null;

/** Empty and not a rock (seals ignored). */
export const isFreeCell = (s: GameState, cell: number): boolean =>
  cell >= 0 && cell < CELL_COUNT && !s.board[cell] && !s.rocks[cell];

/** Free and not sealed against `player`. */
export const isLegalCell = (s: GameState, cell: number, player: PlayerId): boolean =>
  isFreeCell(s, cell) && !s.seals.some((x) => x.cell === cell && x.owner !== player);

export function legalCells(s: GameState, player: PlayerId = s.turn): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) if (isLegalCell(s, i, player)) out.push(i);
  return out;
}

/** +advantage when `a` beats `b`, +disadvantage when `b` beats `a`. Errantes are neutral. */
export function elementBonus(a: Element, b: Element, rules: Ruleset): number {
  if (a === 'errante' || b === 'errante') return 0;
  if (rules.elements.beats[a] === b) return rules.elements.advantage;
  if (rules.elements.beats[b] === a) return rules.elements.disadvantage;
  return 0;
}

/** Zone modifier for a card standing on `zone`. */
export function zoneModifier(element: Element, zone: ZoneElement | null, rules: Ruleset): number {
  if (!zone || element === 'errante') return 0;
  if (element === zone) return rules.zones.match;
  return rules.elements.beats[zone] === element ? rules.zones.weak : 0;
}

/** Manada: bonus per allied neighbour, capped. Dynamic: it changes as neighbours change. Totems never count. */
export function manadaBonus(s: GameState, cell: number, rules: Ruleset): number {
  const p = pieceAt(s, cell);
  if (!p || p.owner === NEUTRAL || p.card.effect !== 'manada') return 0;
  const allies = neighborsOf(cell).filter((n) => n >= 0 && pieceAt(s, n)?.owner === p.owner).length;
  return Math.min(rules.effects.manada.cap, allies * rules.effects.manada.perAlly);
}

/** Modifier applied to every side of the piece at `cell` (zone + Manada). */
export function cellModifier(s: GameState, cell: number, rules: Ruleset): number {
  const p = pieceAt(s, cell);
  if (!p) return 0;
  return zoneModifier(p.card.element, s.zones[cell] ?? null, rules) + manadaBonus(s, cell, rules);
}

const clampSide = (v: number, rules: Ruleset): number =>
  Math.max(rules.sides.min, Math.min(rules.sides.max, v));

/** Effective value of a side on the board: printed side + modifiers, capped to the side range. */
export function sideValue(s: GameState, cell: number, dir: number, rules: Ruleset): number {
  const p = pieceAt(s, cell);
  if (!p) return 0;
  return clampSide(sideOf(p.card, dir) + cellModifier(s, cell, rules), rules);
}

export function score(s: GameState, player: PlayerId): number {
  return s.board.filter((p) => p?.owner === player).length + s.hands[player].length;
}

/* ---------- resolution ---------- */

interface AttackResult {
  clashes: Clash[];
  captures: number[];
  guardians: number[];
  saved: number[];
}

/**
 * Compares the piece at `cell` against every neighbour it does not own.
 * `chained` is true for the Cadena second wave: Embestida and Reclamo only apply the turn a card is played.
 */
function resolveAttack(s: GameState, cell: number, chained: boolean, rules: Ruleset): AttackResult {
  const a = pieceAt(s, cell);
  if (!a || a.owner === NEUTRAL) return { clashes: [], captures: [], guardians: [], saved: [] };
  const me = a.owner;
  const clashes: Clash[] = [];
  for (let dir = 0; dir < DIR_COUNT; dir++) {
    const n = neighborsOf(cell)[dir] ?? -1;
    const b = n >= 0 ? pieceAt(s, n) : null;
    if (!b || b.owner === me) continue;
    const base = sideValue(s, cell, dir, rules);
    const element = elementBonus(a.card.element, b.card.element, rules);
    const embestida = !chained && a.card.effect === 'embestida' ? rules.effects.embestida.attackBonus : 0;
    const reclamo =
      !chained && a.card.effect === 'reclamo' && (b.ownedMask & (1 << me)) !== 0
        ? rules.effects.reclamo.attackBonus
        : 0;
    const total = base + element + embestida + reclamo;
    const defense = sideValue(s, n, oppositeDir(dir), rules);
    const firm = b.firm;
    clashes.push({
      attacker: cell,
      defender: n,
      dir,
      base,
      element,
      embestida,
      reclamo,
      total,
      defense,
      firm,
      win: !firm && total > defense,
    });
  }
  const wins = clashes.filter((c) => c.win).map((c) => c.defender);
  /*
   * Guardián (decision 2026-11-23): it only protects cards of its own owner. Neutral totems are never
   * saved by it and do not count towards "several cards fall". If several Guardians fall at once,
   * all of them fall (as in the prototype).
   */
  const owned = wins.filter((n) => pieceAt(s, n)?.owner !== NEUTRAL);
  const guardians = owned.filter((n) => pieceAt(s, n)?.card.effect === 'guardian');
  const saved = owned.length > 1 && guardians.length > 0 ? owned.filter((n) => !guardians.includes(n)) : [];
  return {
    clashes,
    captures: wins.filter((n) => !saved.includes(n)),
    guardians: saved.length ? guardians : [],
    saved,
  };
}

function emitAttack(r: AttackResult, wave: 1 | 2, events: GameEvent[]): void {
  for (const clash of r.clashes) events.push({ type: 'clash', wave, clash });
  if (r.saved.length) events.push({ type: 'guardian', wave, guardians: r.guardians, saved: r.saved });
}

/** Flips `cells` to `me`, then applies Espinas of every captured card to the card that captured it. */
function flip(
  s: GameState,
  cells: number[],
  me: PlayerId,
  attackerOf: (cell: number) => number,
  wave: 1 | 2,
  rules: Ruleset,
  events: GameEvent[],
): void {
  const from: Owner[] = [];
  for (const n of cells) {
    const p = pieceAt(s, n);
    if (!p) continue;
    from.push(p.owner);
    p.owner = me;
    p.ownedMask |= 1 << me;
    p.firm = false;
  }
  events.push({ type: 'flip', wave, cells: [...cells], from, to: me });
  for (const n of cells) {
    if (pieceAt(s, n)?.card.effect !== 'espinas') continue;
    const target = attackerOf(n);
    const attacker = pieceAt(s, target);
    if (!attacker) continue;
    attacker.card.sides = attacker.card.sides.map((v) =>
      Math.max(rules.sides.min, v - rules.effects.espinas.penalty),
    ) as Sides;
    events.push({ type: 'espinas', source: n, target, sides: [...attacker.card.sides] as Sides });
  }
}

/** Free neighbours ordered by the printed side that faces them: highest first for Siembra, lowest first for Sello. */
function facingCells(s: GameState, cell: number, card: CardInstance, highFirst: boolean): number[] {
  const out: { n: number; v: number }[] = [];
  for (let dir = 0; dir < DIR_COUNT; dir++) {
    const n = neighborsOf(cell)[dir] ?? -1;
    if (n >= 0 && isFreeCell(s, n)) out.push({ n, v: sideOf(card, dir) });
  }
  // Array.prototype.sort is stable: ties keep direction order (N, NE, SE, S, SO, NO).
  return out.sort((x, y) => (highFirst ? y.v - x.v : x.v - y.v)).map((o) => o.n);
}

function finishTurn(s: GameState, me: PlayerId, events: GameEvent[]): void {
  const handsEmpty = s.hands[0].length === 0 && s.hands[1].length === 0;
  let anyFree = false;
  for (let i = 0; i < CELL_COUNT; i++) if (isFreeCell(s, i)) anyFree = true;
  if (handsEmpty || !anyFree) {
    s.over = true;
    s.seals = [];
    for (const p of s.board) if (p) p.firm = false;
    const scores: [number, number] = [score(s, 0), score(s, 1)];
    s.winner = scores[0] === scores[1] ? 'draw' : scores[0] > scores[1] ? 0 : 1;
    events.push({ type: 'game_over', scores, winner: s.winner });
    return;
  }
  let next = other(me);
  if (s.hands[next].length === 0) next = me;
  s.turn = next;
  // Seals placed by `next` blocked the player who just moved: they expire now.
  s.seals = s.seals.filter((x) => x.owner !== next);
  // Firme lasted through the rival's move: it expires when the turn returns to its owner.
  for (const p of s.board) if (p && p.firm && p.owner === next) p.firm = false;
  if (s.seals.length > 0 && legalCells(s, next).length === 0) {
    s.seals = [];
    events.push({ type: 'seals_broken' });
  }
  events.push({ type: 'turn', player: next });
}

export function applyMove(prev: GameState, move: Move, rules: Ruleset): MoveResult {
  if (prev.over) throw new IllegalMoveError('The match is over.');
  const s = cloneState(prev);
  const events: GameEvent[] = [];
  const me = s.turn;
  const card = s.hands[me][move.handIndex];
  if (!card) throw new IllegalMoveError(`No card at hand index ${move.handIndex}.`);
  if (!isLegalCell(s, move.cell, me)) throw new IllegalMoveError(`Cell ${move.cell} is not playable.`);
  const rotation = move.rotation ?? 0;
  if (!Number.isInteger(rotation) || rotation < 0 || rotation >= DIR_COUNT) {
    throw new IllegalMoveError(`Invalid rotation ${rotation}.`);
  }
  if (rotation !== 0 && card.effect !== 'giro')
    throw new IllegalMoveError('Only cards with Giro can rotate.');

  // 1. place
  s.hands[me].splice(move.handIndex, 1);
  card.sides = rotateSidesBy(card.sides, rotation);
  const cell = move.cell;
  s.board[cell] = { card, owner: me, ownedMask: 1 << me, firm: card.effect === 'firme' };
  s.placed++;
  events.push({ type: 'placed', cell, player: me, card: cloneCard(card), rotation });
  if (card.effect === 'firme') events.push({ type: 'firm', cell });

  // 2. modifiers
  const zone = zoneModifier(card.element, s.zones[cell] ?? null, rules);
  const manada = manadaBonus(s, cell, rules);
  const embestida = card.effect === 'embestida' ? rules.effects.embestida.attackBonus : 0;
  if (zone || manada || embestida) {
    events.push({ type: 'modifiers', cell, zone, manada, embestida, total: zone + manada });
  }

  // 3-6. clashes, Guardián, flip, Espinas
  const first = resolveAttack(s, cell, false, rules);
  emitAttack(first, 1, events);
  if (first.captures.length) flip(s, first.captures, me, () => cell, 1, rules, events);

  // 7. Cadena: every card just captured attacks its own neighbours, once.
  if (card.effect === 'cadena' && first.captures.length) {
    /*
     * Guardián during Cadena (decision 2026-11-23, see CLAUDE.md): each chained card is its own
     * strike, so Guardián is evaluated per attacker, exactly like a normal attack. A card saved
     * from one chained attacker can still fall to another one in the same wave. All chained attacks
     * are computed on the board as it stands after the first flip, then flipped together.
     */
    const wave: number[] = [];
    const source = new Map<number, number>();
    const chained: AttackResult[] = [];
    for (const from of first.captures) {
      const r = resolveAttack(s, from, true, rules);
      chained.push(r);
      for (const n of r.captures) {
        if (!source.has(n)) {
          source.set(n, from);
          wave.push(n);
        }
      }
    }
    if (chained.some((r) => r.clashes.length > 0)) {
      events.push({ type: 'cadena', cell, sources: [...first.captures] });
      for (const r of chained) emitAttack(r, 2, events);
      if (wave.length) flip(s, wave, me, (n) => source.get(n) ?? cell, 2, rules, events);
    }
  }

  // 8. Siembra
  if (card.effect === 'siembra' && card.element !== 'errante') {
    const count = rules.effects.siembra.cellsByTier[card.tier] ?? 0;
    const cells = facingCells(s, cell, card, true).slice(0, count);
    if (cells.length) {
      for (const n of cells) s.zones[n] = card.element;
      events.push({ type: 'siembra', cell, cells, element: card.element });
    }
  }

  // 9. Sello
  if (card.effect === 'sello') {
    const count = rules.effects.sello.cellsByTier[card.tier] ?? 0;
    const cells = facingCells(s, cell, card, false).slice(0, count);
    if (cells.length) {
      s.seals = s.seals.filter((x) => !cells.includes(x.cell));
      for (const n of cells) s.seals.push({ cell: n, owner: me });
      events.push({ type: 'sello', cell, cells, player: me });
    }
  }

  // 10. end of turn
  finishTurn(s, me, events);
  return { state: s, events };
}
