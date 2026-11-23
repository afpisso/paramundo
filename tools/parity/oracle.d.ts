export interface OracleCard {
  s: number[];
  el: number;
  fx: string | null;
  t?: number;
}
export interface OraclePiece {
  card: OracleCard;
  owner: number;
  was: number;
  shield?: boolean;
}
export interface OracleState {
  board: (OraclePiece | null)[];
  zones: number[];
  rocks: boolean[];
  seals: { i: number; owner: number }[];
  hands: OracleCard[][];
  turn: number;
  starter: number;
  over: boolean;
  placed: number;
}
export interface OracleLevel {
  rocks: number[][];
  zones: number[][];
  totems: { c: number[]; s: number[]; el: number }[];
}
export interface Oracle {
  st: OracleState;
  CELLS: { q: number; r: number }[];
  newGame(level: OracleLevel | null, hands: OracleCard[][], starter: number): void;
  play(handIndex: number, cell: number, rotation?: number): boolean;
  legal(cell: number, player: number): boolean;
  score(player: number): number;
  power(card: OracleCard): number;
  tierOf(card: OracleCard): number;
  canRotate(card: OracleCard): boolean;
}
export const PROTOTYPE_FX_COUNTS: number[];
export function createOracle(opt?: { fxCounts?: number[]; guardianOwnOnly?: boolean }): Oracle;
