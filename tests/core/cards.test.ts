import { describe, expect, it } from 'vitest';
import {
  CELLS,
  CELL_COUNT,
  NEIGHBORS,
  cardPower,
  cellIndex,
  oppositeDir,
  rotateSides,
  sideCost,
  tierId,
} from '../../src/core';
import { CARDS, RULES, validateData } from '../../src/data';

describe('board', () => {
  it('has 19 cells and symmetric neighbours', () => {
    expect(CELL_COUNT).toBe(19);
    CELLS.forEach((_, i) => {
      (NEIGHBORS[i] ?? []).forEach((n, d) => {
        if (n >= 0) expect(NEIGHBORS[n]?.[oppositeDir(d)]).toBe(i);
      });
    });
  });
  it('uses N, NE, SE, S, SO, NO from the centre', () => {
    const c = cellIndex(0, 0);
    expect(NEIGHBORS[c]).toEqual([
      cellIndex(0, -1),
      cellIndex(1, -1),
      cellIndex(1, 0),
      cellIndex(0, 1),
      cellIndex(-1, 1),
      cellIndex(-1, 0),
    ]);
  });
});

describe('power and tiers', () => {
  it('costs sides: linear to 6, then 8, 10, 12, 15', () => {
    expect([1, 6, 7, 8, 9, 10].map((v) => sideCost(v, RULES))).toEqual([1, 6, 8, 10, 12, 15]);
  });

  it('computes power and tier of the 19 cards (with the approved effect reassignments)', () => {
    const expected: Record<string, [string | null, number, string]> = {
      chigui: ['manada', 24, 'comun'],
      doradita: ['espinas', 21, 'comun'],
      guaca: ['embestida', 24, 'comun'],
      titin: ['manada', 22, 'comun'],
      anteojitos: ['guardian', 31, 'poco_comun'],
      frailin: ['siembra', 29, 'poco_comun'],
      rosadito: ['firme', 31, 'poco_comun'],
      zumbi: ['giro', 28, 'poco_comun'],
      lloraluz: ['reclamo', 36, 'rara'],
      caimanero: ['sello', 33, 'rara'],
      farolero: ['sello', 35, 'rara'],
      patasombra: ['espinas', 36, 'rara'],
      silbo: ['giro', 35, 'rara'],
      'ala-ancha': ['manada', 35, 'rara'],
      rioman: ['siembra', 40, 'epica'],
      musgamadre: ['espinas', 42, 'epica'],
      trapichero: ['embestida', 43, 'epica'],
      candela: ['cadena', 51, 'legendaria'],
      'mil-caras': ['reclamo', 47, 'legendaria'],
    };
    expect(CARDS.map((c) => c.id).sort()).toEqual(Object.keys(expected).sort());
    for (const c of CARDS) {
      expect([c.id, c.effect, cardPower(c, RULES), tierId(c, RULES)]).toEqual([
        c.id,
        ...(expected[c.id] ?? []),
      ]);
    }
  });

  it('tier boundaries: 26/27, 32/33, 38/39, 45/46', () => {
    const t = (sides: number[]) => tierId({ sides: sides as never, effect: null }, RULES);
    expect(t([6, 6, 6, 6, 1, 1])).toBe('comun'); // 26
    expect(t([6, 6, 6, 6, 2, 1])).toBe('poco_comun'); // 27
    expect(t([6, 6, 6, 6, 6, 2])).toBe('poco_comun'); // 32
    expect(t([6, 6, 6, 6, 6, 3])).toBe('rara'); // 33
    expect(t([7, 6, 6, 6, 6, 6])).toBe('rara'); // 38
    expect(t([7, 7, 6, 6, 6, 5])).toBe('epica'); // 39
    expect(t([7, 7, 7, 7, 7, 5])).toBe('epica'); // 45
    expect(t([7, 7, 7, 7, 7, 6])).toBe('legendaria'); // 46
  });

  it('rotates one sixth clockwise', () => {
    expect(rotateSides([8, 5, 3, 6, 3, 5])).toEqual([5, 8, 5, 3, 6, 3]);
  });
});

describe('data validation', () => {
  it('shipped data is sound', () => {
    expect(validateData()).toEqual([]);
  });
  it('rejects Cadena below legendaria and Siembra on Errantes', () => {
    const bad = [
      {
        id: 'a',
        name: 'A',
        element: 'fuego' as const,
        sides: [3, 3, 3, 3, 3, 3] as never,
        effect: 'cadena' as const,
      },
      {
        id: 'b',
        name: 'B',
        element: 'errante' as const,
        sides: [3, 3, 3, 3, 3, 3] as never,
        effect: 'siembra' as const,
      },
    ];
    expect(validateData(bad).filter((p) => p.startsWith('a:') || p.startsWith('b:'))).toHaveLength(2);
  });
});
