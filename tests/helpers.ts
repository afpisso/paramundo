import { cellIndex, createGame, tierIndex } from '../src/core';
import type {
  CardInstance,
  EffectId,
  Element,
  GameState,
  Owner,
  PlayerId,
  Sides,
  ZoneElement,
} from '../src/core';
import { RULES } from '../src/data';

export const flat = (v: number): Sides => [v, v, v, v, v, v];

export function card(
  sides: Sides | number,
  element: Element = 'errante',
  effect: EffectId | null = null,
): CardInstance {
  const s = typeof sides === 'number' ? flat(sides) : sides;
  return {
    defId: 'test',
    element,
    sides: [...s] as Sides,
    effect,
    tier: tierIndex({ sides: s, effect }, RULES),
  };
}

/** Empty board. `hand0`/`hand1` default to six filler cards each so the match does not end early. */
export function game(
  hand0: CardInstance[] = Array.from({ length: 6 }, () => card(1)),
  hand1: CardInstance[] = Array.from({ length: 6 }, () => card(1)),
  starter: PlayerId = 0,
): GameState {
  return createGame({ level: null, hands: [hand0, hand1], starter }, RULES);
}

export const at = (q: number, r: number): number => cellIndex(q, r);

/** Puts a piece straight on the board (test setup only). */
export function put(
  s: GameState,
  q: number,
  r: number,
  c: CardInstance,
  owner: Owner,
  ownedMask?: number,
): number {
  const i = at(q, r);
  s.board[i] = { card: c, owner, ownedMask: ownedMask ?? (owner === 2 ? 0 : 1 << owner), firm: false };
  return i;
}

export const zone = (s: GameState, q: number, r: number, el: ZoneElement): void => {
  s.zones[at(q, r)] = el;
};

export const ownerAt = (s: GameState, q: number, r: number): Owner | undefined => s.board[at(q, r)]?.owner;
