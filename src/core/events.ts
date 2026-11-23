import type { CardInstance, Owner, PlayerId, Sides, ZoneElement } from './types';

/**
 * Everything that happens while a move resolves, in order. The visual layer only replays this list
 * as animations; it never recomputes rules.
 */
export type GameEvent =
  | { type: 'placed'; cell: number; player: PlayerId; card: CardInstance; rotation: number }
  | { type: 'firm'; cell: number }
  /** Modifiers the placed card gets where it lands. `total` is added to every side (before the 1..10 cap). */
  | { type: 'modifiers'; cell: number; zone: number; manada: number; embestida: number; total: number }
  | { type: 'clash'; wave: 1 | 2; clash: Clash }
  | { type: 'guardian'; wave: 1 | 2; guardians: number[]; saved: number[] }
  | { type: 'flip'; wave: 1 | 2; cells: number[]; from: Owner[]; to: PlayerId }
  | { type: 'espinas'; source: number; target: number; sides: Sides }
  | { type: 'cadena'; cell: number; sources: number[] }
  | { type: 'siembra'; cell: number; cells: number[]; element: ZoneElement }
  | { type: 'sello'; cell: number; cells: number[]; player: PlayerId }
  | { type: 'seals_broken' }
  | { type: 'turn'; player: PlayerId }
  | { type: 'game_over'; scores: [number, number]; winner: PlayerId | 'draw' };

/** One comparison on a shared edge, with every term the tag must show (for example `5+1 > 5`). */
export interface Clash {
  attacker: number;
  defender: number;
  /** Direction from attacker to defender. */
  dir: number;
  /** Attacker side including zone and Manada, capped to 1..10. */
  base: number;
  element: number;
  embestida: number;
  reclamo: number;
  /** base + element + embestida + reclamo (not capped). */
  total: number;
  /** Defender side including zone and Manada, capped to 1..10. */
  defense: number;
  /** The defender is protected by Firme. */
  firm: boolean;
  win: boolean;
}
