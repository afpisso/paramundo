/** Shared types of the rules core. Nothing here may depend on Phaser, the DOM or data files. */

export type ZoneElement = 'fuego' | 'agua' | 'monte';
export type Element = ZoneElement | 'errante';

export type EffectId =
  | 'embestida'
  | 'reclamo'
  | 'guardian'
  | 'firme'
  | 'espinas'
  | 'manada'
  | 'siembra'
  | 'sello'
  | 'giro'
  | 'cadena';

export type TierId = 'comun' | 'poco_comun' | 'rara' | 'epica' | 'legendaria';

/** Six side values in order N, NE, SE, S, SO, NO. 10 is displayed as "A". */
export type Sides = [number, number, number, number, number, number];

export type PlayerId = 0 | 1;
/** Owner 2 is neutral: totems that belong to nobody until captured. */
export type Owner = PlayerId | 2;
export const NEUTRAL = 2 as const;

/** Static card definition, as it lives in data. Power and tier are always computed, never stored. */
export interface CardDef {
  id: string;
  name: string;
  element: Element;
  sides: Sides;
  effect: EffectId | null;
}

/** A card inside a match. `sides` can change during the match (Giro, Espinas); the definition never does. */
export interface CardInstance {
  defId: string;
  element: Element;
  sides: Sides;
  effect: EffectId | null;
  /** Tier index (0 = comun ... 4 = legendaria), fixed when the instance is created. */
  tier: number;
}

export interface Piece {
  card: CardInstance;
  owner: Owner;
  /** Bitmask of players that have ever owned this piece (bit p = player p). Used by Reclamo. */
  ownedMask: number;
  /** Firme shield: cannot be captured until the turn returns to its owner. */
  firm: boolean;
}

export interface Seal {
  cell: number;
  /** The player who placed the seal; it blocks the other player. */
  owner: PlayerId;
}

export interface GameState {
  board: (Piece | null)[];
  zones: (ZoneElement | null)[];
  rocks: boolean[];
  seals: Seal[];
  hands: [CardInstance[], CardInstance[]];
  turn: PlayerId;
  starter: PlayerId;
  /** Number of cards played so far. */
  placed: number;
  over: boolean;
  /** Set when the match is over: 0, 1 or 'draw'. */
  winner: PlayerId | 'draw' | null;
}

export interface Move {
  handIndex: number;
  cell: number;
  /** Sixths of a turn clockwise, 0 to 5. Only cards with Giro may use a value other than 0. */
  rotation?: number;
}

export interface TotemDef {
  cell: [number, number];
  sides: Sides;
  element: Element;
}

export interface LevelDef {
  id: string;
  rocks: [number, number][];
  zones: [number, number, ZoneElement][];
  totems: TotemDef[];
}

export interface TierRule {
  id: TierId;
  minPower: number;
}

/** Every balance number the core uses. Lives in data (src/data/rules.json and effects.json). */
export interface Ruleset {
  handSize: number;
  deck: { size: number; maxCopies: number | null };
  sides: { min: number; max: number };
  /** Cost of side values above the linear range; any value not listed costs itself. */
  sideCost: Record<string, number>;
  /** Ordered from lowest to highest. */
  tiers: TierRule[];
  elements: { beats: Record<ZoneElement, ZoneElement>; advantage: number; disadvantage: number };
  zones: { match: number; weak: number };
  effects: {
    embestida: { cost: number; attackBonus: number };
    reclamo: { cost: number; attackBonus: number };
    guardian: { cost: number };
    firme: { cost: number };
    espinas: { cost: number; penalty: number };
    manada: { cost: number; perAlly: number; cap: number };
    siembra: { cost: number; cellsByTier: number[] };
    sello: { cost: number; cellsByTier: number[] };
    giro: { cost: number };
    cadena: { cost: number; minTier: TierId };
  };
}
