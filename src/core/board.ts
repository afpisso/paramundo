/**
 * Board geometry: radius-2 hexagon (19 cells), flat-top hexes, axial coordinates.
 * Cell order matches the prototype (q ascending, then r ascending) so indices are comparable.
 */

export const BOARD_RADIUS = 2;

/** Directions in order N, NE, SE, S, SO, NO. */
export const DIRS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

export const DIR_COUNT = 6;

export const oppositeDir = (d: number): number => (d + 3) % DIR_COUNT;

export interface Cell {
  q: number;
  r: number;
}

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
      if (Math.abs(q + r) <= BOARD_RADIUS) cells.push({ q, r });
    }
  }
  return cells;
}

export const CELLS: readonly Cell[] = buildCells();
export const CELL_COUNT = CELLS.length;

const INDEX = new Map<string, number>(CELLS.map((c, i) => [`${c.q},${c.r}`, i]));

/** Index of the cell at axial (q, r), or -1 when it is off the board. */
export const cellIndex = (q: number, r: number): number => INDEX.get(`${q},${r}`) ?? -1;

/** NEIGHBORS[cell][dir] is the neighbouring cell index, or -1 at the edge. */
export const NEIGHBORS: readonly (readonly number[])[] = CELLS.map((c) =>
  DIRS.map(([dq, dr]) => cellIndex(c.q + dq, c.r + dr)),
);

export const neighbor = (cell: number, dir: number): number => NEIGHBORS[cell]?.[dir] ?? -1;
