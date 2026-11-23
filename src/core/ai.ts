import { NEIGHBORS, oppositeDir } from './board';
import { cardPower, rotateSidesBy } from './cards';
import type { GameEvent } from './events';
import type { Rng } from './rng';
import {
  applyMove,
  cellModifier,
  elementBonus,
  IllegalMoveError,
  isFreeCell,
  legalCells,
  sideValue,
  zoneModifier,
} from './rules';
import type { AIConfig, GameState, Move, Ruleset } from './types';

function* moves(state: GameState): Generator<Move> {
  for (const cell of legalCells(state)) {
    for (const [handIndex, card] of state.hands[state.turn].entries()) {
      const rotations = card.effect === 'giro' ? 6 : 1;
      for (let rotation = 0; rotation < rotations; rotation++) {
        yield { cell, handIndex, rotation };
      }
    }
  }
}

const captures = (events: GameEvent[], firstOnly = false): number =>
  events.reduce(
    (total, event) =>
      total + (event.type === 'flip' && (!firstOnly || event.wave === 1) ? event.cells.length : 0),
    0,
  );

/** Prototype threat estimate: unrotated rival hand, zones and Embestida, before any captures. */
function threat(state: GameState, cell: number, rules: Ruleset): number {
  const mine = state.board[cell];
  if (!mine || mine.card.effect === 'firme') return 0;
  let count = 0;
  for (const [dir, neighbor] of (NEIGHBORS[cell] ?? []).entries()) {
    if (!isFreeCell(state, neighbor)) continue;
    const defense = sideValue(state, cell, dir, rules);
    const threatened = state.hands[state.turn === 0 ? 1 : 0].some((card) => {
      const base = Math.max(
        rules.sides.min,
        Math.min(
          rules.sides.max,
          (card.sides[oppositeDir(dir)] ?? 0) +
            zoneModifier(card.element, state.zones[neighbor] ?? null, rules),
        ),
      );
      const bonus = card.effect === 'embestida' ? rules.effects.embestida.attackBonus : 0;
      return base + elementBonus(card.element, mine.card.element, rules) + bonus > defense;
    });
    if (threatened) count++;
  }
  return count;
}

/** Chooses for state.turn. Only the supplied RNG advances; the input state is never mutated. */
export function chooseMove(state: GameState, rules: Ruleset, config: AIConfig, rng: Rng): Move {
  if (state.over) throw new IllegalMoveError('The match is over.');
  const candidates: { move: Move; score: number; next: GameState }[] = [];
  for (const move of moves(state)) {
    const source = state.hands[state.turn][move.handIndex];
    if (!source) continue;
    const card = { ...source, sides: rotateSidesBy(source.sides, move.rotation ?? 0) };
    // A shallow board copy is enough: evaluation only reads this pre-capture position.
    const placed = { ...state, board: [...state.board] };
    placed.board[move.cell] = {
      card,
      owner: state.turn,
      ownedMask: 1 << state.turn,
      firm: card.effect === 'firme',
    };
    const result = applyMove(state, move, rules);
    const weight = card.effect === 'cadena' ? config.cadenaCaptureWeight : config.captureWeight;
    const score =
      captures(result.events, true) * weight -
      (config.threatWeight ? threat(placed, move.cell, rules) * config.threatWeight : 0) +
      cellModifier(placed, move.cell, rules) * config.modifierWeight -
      cardPower(card, rules) * config.powerWeight +
      rng.next() * config.noise;
    candidates.push({ move, score, next: result.state });
  }
  // Stable sorting preserves cell/hand/rotation order when scores tie.
  candidates.sort((a, b) => b.score - a.score);
  const finalists = config.lookahead ? candidates.slice(0, config.lookahead.candidates) : candidates;
  let best: Move | undefined;
  let bestScore = -Infinity;
  for (const candidate of finalists) {
    let score = candidate.score;
    if (config.lookahead && !candidate.next.over) {
      let replyCaptures = 0;
      for (const reply of moves(candidate.next)) {
        replyCaptures = Math.max(replyCaptures, captures(applyMove(candidate.next, reply, rules).events));
      }
      score -= config.lookahead.replyWeight * replyCaptures;
    }
    // Hard-mode ties must also follow original enumeration, not the normal-score ranking.
    if (score > bestScore || (score === bestScore && best && comesBefore(candidate.move, best))) {
      bestScore = score;
      best = candidate.move;
    }
  }
  if (!best) throw new IllegalMoveError('No legal move available.');
  return best;
}

function comesBefore(a: Move, b: Move): boolean {
  return (
    a.cell < b.cell ||
    (a.cell === b.cell &&
      (a.handIndex < b.handIndex || (a.handIndex === b.handIndex && (a.rotation ?? 0) < (b.rotation ?? 0))))
  );
}
