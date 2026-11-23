import { describe, expect, it } from 'vitest';
import { IllegalMoveError, applyMove, createGame, legalCells, score, sideValue } from '../../src/core';
import type { GameEvent, GameState, Move } from '../../src/core';
import { LEVELS, RULES } from '../../src/data';
import { at, card, game, ownerAt, put, zone } from '../helpers';

const play = (s: GameState, move: Move) => applyMove(s, move, RULES);
const center = at(0, 0);
const types = (events: GameEvent[]) => events.map((e) => e.type);
const clashes = (events: GameEvent[]) => events.flatMap((e) => (e.type === 'clash' ? [e.clash] : []));

describe('capture', () => {
  it('flips a rival only when strictly greater', () => {
    const s = game([card(5)]);
    put(s, 0, -1, card(4), 1);
    put(s, 1, -1, card(5), 1);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(ownerAt(state, 0, -1)).toBe(0);
    expect(ownerAt(state, 1, -1)).toBe(1);
    expect(clashes(events).map((c) => [c.total, c.defense, c.win])).toEqual([
      [5, 4, true],
      [5, 5, false],
    ]);
  });

  it('compares the attacker side against the side that faces it', () => {
    const s = game([card([9, 1, 1, 1, 1, 1])]);
    put(s, 0, -1, card([9, 9, 9, 1, 9, 9]), 1); // north of centre: its S side (1) faces us
    put(s, 0, 1, card([2, 9, 9, 9, 9, 9]), 1); // south of centre: its N side (2) faces our S (1)
    const { state } = play(s, { handIndex: 0, cell: center });
    expect(ownerAt(state, 0, -1)).toBe(0);
    expect(ownerAt(state, 0, 1)).toBe(1);
  });

  it('does not attack own cards and captures neutral totems', () => {
    const s = game([card(5)]);
    put(s, 0, -1, card(1), 0);
    put(s, 0, 1, card(4), 2);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(clashes(events)).toHaveLength(1);
    expect(ownerAt(state, 0, 1)).toBe(0);
  });

  it('does not mutate the previous state and is deterministic', () => {
    const s = game([card(5, 'fuego', 'embestida')]);
    put(s, 0, -1, card(4, 'monte', 'espinas'), 1);
    const before = JSON.stringify(s);
    const a = play(s, { handIndex: 0, cell: center });
    const b = play(s, { handIndex: 0, cell: center });
    expect(JSON.stringify(s)).toBe(before);
    expect(a).toEqual(b);
  });

  it('rejects illegal moves', () => {
    const s = createGame({ level: LEVELS[2] ?? null, hands: [[card(5)], [card(5)]], starter: 0 }, RULES);
    expect(() => play(s, { handIndex: 0, cell: center })).toThrow(IllegalMoveError); // rock
    expect(() => play(s, { handIndex: 0, cell: at(0, -2) })).toThrow(IllegalMoveError); // totem
    expect(() => play(s, { handIndex: 3, cell: at(1, 0) })).toThrow(IllegalMoveError);
    expect(() => play(s, { handIndex: 0, cell: at(1, 0), rotation: 1 })).toThrow(IllegalMoveError);
  });
});

describe('elements', () => {
  it('+1 against the element it beats, -1 against the one that beats it, Errantes neutral', () => {
    const s = game([card(5, 'fuego')]);
    put(s, 0, -1, card(5, 'monte'), 1); // fuego beats monte: 5+1 > 5
    put(s, 1, -1, card(4, 'agua'), 1); // agua beats fuego: 5-1 = 4, not > 4
    put(s, 1, 0, card(5, 'errante'), 1); // neutral: 5 = 5
    put(s, 0, 1, card(5, 'fuego'), 1); // same element: 5 = 5
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(clashes(events).map((c) => c.element)).toEqual([1, -1, 0, 0]);
    expect([
      ownerAt(state, 0, -1),
      ownerAt(state, 1, -1),
      ownerAt(state, 1, 0),
      ownerAt(state, 0, 1),
    ]).toEqual([0, 1, 1, 1]);
  });

  it('monte beats agua and agua beats fuego', () => {
    const a = game([card(5, 'monte')]);
    put(a, 0, -1, card(5, 'agua'), 1);
    expect(ownerAt(play(a, { handIndex: 0, cell: center }).state, 0, -1)).toBe(0);
    const b = game([card(5, 'agua')]);
    put(b, 0, -1, card(5, 'fuego'), 1);
    expect(ownerAt(play(b, { handIndex: 0, cell: center }).state, 0, -1)).toBe(0);
  });

  it('attack bonuses are added after the 1..10 cap: A with advantage beats A', () => {
    const s = game([card(10, 'fuego')]);
    put(s, 0, -1, card(10, 'monte'), 1);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(clashes(events)[0]).toMatchObject({ base: 10, total: 11, defense: 10, win: true });
    expect(ownerAt(state, 0, -1)).toBe(0);
  });
});

describe('zones', () => {
  it('+1 on its own element, -1 on the element that beats it, 0 otherwise', () => {
    const s = game();
    zone(s, 0, 0, 'agua');
    zone(s, 0, -1, 'agua');
    zone(s, 1, 0, 'agua');
    zone(s, 0, 1, 'agua');
    put(s, 0, 0, card(5, 'agua'), 0);
    put(s, 0, -1, card(5, 'fuego'), 0);
    put(s, 1, 0, card(5, 'monte'), 0);
    put(s, 0, 1, card(5, 'errante'), 0);
    expect([at(0, 0), at(0, -1), at(1, 0), at(0, 1)].map((c) => sideValue(s, c, 0, RULES))).toEqual([
      6, 4, 5, 5,
    ]);
  });

  it('applies to attacker and defender, capped to 1..10', () => {
    const s = game([card(5, 'agua')]);
    zone(s, 0, 0, 'agua');
    zone(s, 0, -1, 'monte');
    put(s, 0, -1, card(5, 'monte'), 1); // defends with 6, and monte beats agua: 6-1 < 6
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(clashes(events)[0]).toMatchObject({ base: 6, element: -1, total: 5, defense: 6, win: false });
    expect(ownerAt(state, 0, -1)).toBe(1);
    expect(events.find((e) => e.type === 'modifiers')).toMatchObject({ zone: 1, total: 1 });

    const capped = game();
    zone(capped, 0, 0, 'fuego');
    zone(capped, 0, 1, 'agua');
    put(capped, 0, 0, card(10, 'fuego'), 0);
    put(capped, 0, 1, card(1, 'fuego'), 0);
    expect(sideValue(capped, at(0, 0), 0, RULES)).toBe(10);
    expect(sideValue(capped, at(0, 1), 0, RULES)).toBe(1);
  });
});

describe('Embestida', () => {
  it('+1 when attacking the turn it is played, never when defending', () => {
    const s = game([card(5, 'errante', 'embestida'), card(1)], [card(5), card(1)]);
    put(s, 0, -1, card(5), 1);
    const first = play(s, { handIndex: 0, cell: center });
    expect(clashes(first.events)[0]).toMatchObject({ embestida: 1, total: 6, win: true });
    // the rival attacks it with a 5: it defends with a plain 5
    const second = play(first.state, { handIndex: 0, cell: at(0, 1) });
    expect(clashes(second.events).find((c) => c.defender === center)).toMatchObject({
      defense: 5,
      win: false,
    });
  });
});

describe('Reclamo', () => {
  it('+2 only against cards that were once yours', () => {
    const s = game([card(5, 'errante', 'reclamo')]);
    put(s, 0, -1, card(6), 1, 0b11); // was mine
    put(s, 0, 1, card(5), 1); // never mine
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(clashes(events).map((c) => c.reclamo)).toEqual([2, 0]);
    expect([ownerAt(state, 0, -1), ownerAt(state, 0, 1)]).toEqual([0, 1]);
  });

  it('remembers ownership through captures', () => {
    const s = game([card(1), card(5, 'errante', 'reclamo')], [card(9), card(1)]);
    const a = play(s, { handIndex: 0, cell: center }); // I play a 1
    const b = play(a.state, { handIndex: 0, cell: at(0, -1) }); // rival takes it
    expect(ownerAt(b.state, 0, 0)).toBe(1);
    expect(b.state.board[center]?.ownedMask).toBe(0b11);
    // my Reclamo 5 attacks my old card (now defending with 1) and the rival 9
    const c = play(b.state, { handIndex: 0, cell: at(1, -1) });
    expect(clashes(c.events).find((x) => x.defender === center)).toMatchObject({ reclamo: 2 });
    expect(clashes(c.events).find((x) => x.defender === at(0, -1))).toMatchObject({ reclamo: 0 });
  });
});

describe('Guardián', () => {
  const guardian = () => card(3, 'monte', 'guardian');

  it('when several cards of its owner would fall, only the Guardián falls', () => {
    const s = game([card(9)]);
    put(s, 0, -1, guardian(), 1);
    put(s, 1, -1, card(3), 1);
    put(s, 1, 0, card(3), 1);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect([ownerAt(state, 0, -1), ownerAt(state, 1, -1), ownerAt(state, 1, 0)]).toEqual([0, 1, 1]);
    expect(events.find((e) => e.type === 'guardian')).toMatchObject({
      guardians: [at(0, -1)],
      saved: [at(1, -1), at(1, 0)],
    });
  });

  it('works the same whoever its owner is', () => {
    const s = game(undefined, [card(9)], 1);
    put(s, 0, -1, guardian(), 0);
    put(s, 1, -1, card(3), 0);
    const { state } = play(s, { handIndex: 0, cell: center });
    expect([ownerAt(state, 0, -1), ownerAt(state, 1, -1)]).toEqual([1, 0]);
  });

  it('does not protect neutral totems: Guardián and totem both fall', () => {
    const s = game([card(9)]);
    put(s, 0, -1, guardian(), 1);
    put(s, 0, 1, card(4), 2);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect([ownerAt(state, 0, -1), ownerAt(state, 0, 1)]).toEqual([0, 0]);
    expect(events.some((e) => e.type === 'guardian')).toBe(false);
  });

  it('saves the cards of its owner while the totem next to them still falls', () => {
    const s = game([card(9)]);
    put(s, 0, -1, guardian(), 1);
    put(s, 1, -1, card(3), 1);
    put(s, 0, 1, card(4), 2);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect([ownerAt(state, 0, -1), ownerAt(state, 1, -1), ownerAt(state, 0, 1)]).toEqual([0, 1, 0]);
    expect(events.find((e) => e.type === 'guardian')).toMatchObject({ saved: [at(1, -1)] });
  });

  it('a totem does not count as "several cards": a lone rival card next to a totem gets no protection', () => {
    const s = game([card(9)]);
    put(s, 0, -1, card(3), 1);
    put(s, 0, 1, card(4), 2);
    const { state } = play(s, { handIndex: 0, cell: center });
    expect([ownerAt(state, 0, -1), ownerAt(state, 0, 1)]).toEqual([0, 0]);
  });

  it('a Guardián captured alone simply falls, and two Guardians fall together', () => {
    const one = game([card(9)]);
    put(one, 0, -1, guardian(), 1);
    expect(ownerAt(play(one, { handIndex: 0, cell: center }).state, 0, -1)).toBe(0);

    const two = game([card(9)]);
    put(two, 0, -1, guardian(), 1);
    put(two, 1, -1, guardian(), 1);
    put(two, 1, 0, card(3), 1);
    const { state } = play(two, { handIndex: 0, cell: center });
    expect([ownerAt(state, 0, -1), ownerAt(state, 1, -1), ownerAt(state, 1, 0)]).toEqual([0, 0, 1]);
  });
});

describe('Firme', () => {
  it('cannot be captured during the next rival move, and can after that', () => {
    const s = game([card(1, 'agua', 'firme'), card(1)], [card(9), card(9)]);
    const a = play(s, { handIndex: 0, cell: center });
    expect(a.state.board[center]?.firm).toBe(true);
    const b = play(a.state, { handIndex: 0, cell: at(0, -1) });
    expect(clashes(b.events)[0]).toMatchObject({ firm: true, win: false });
    expect(ownerAt(b.state, 0, 0)).toBe(0);
    expect(b.state.board[center]?.firm).toBe(false);
    const c = play(b.state, { handIndex: 0, cell: at(2, 0) });
    const d = play(c.state, { handIndex: 0, cell: at(0, 1) });
    expect(ownerAt(d.state, 0, 0)).toBe(1);
  });
});

describe('Espinas', () => {
  it('the card that captures it loses 1 on every side for the rest of the match, minimum 1', () => {
    const s = game([card([5, 1, 5, 5, 5, 5])]);
    put(s, 0, -1, card(3, 'monte', 'espinas'), 1);
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(state.board[center]?.card.sides).toEqual([4, 1, 4, 4, 4, 4]);
    expect(events.find((e) => e.type === 'espinas')).toMatchObject({ source: at(0, -1), target: center });
  });

  it('stacks when two Espinas are captured at once, and does nothing when not captured', () => {
    const s = game([card(5)]);
    put(s, 0, -1, card(3, 'monte', 'espinas'), 1);
    put(s, 0, 1, card(3, 'monte', 'espinas'), 1);
    put(s, 1, 0, card(9, 'monte', 'espinas'), 1);
    const { state } = play(s, { handIndex: 0, cell: center });
    expect(state.board[center]?.card.sides).toEqual([3, 3, 3, 3, 3, 3]);
    expect(ownerAt(state, 1, 0)).toBe(1);
  });
});

describe('Manada', () => {
  it('+1 per allied neighbour up to +2, dynamic, ignoring rivals and totems', () => {
    const s = game();
    const c = put(s, 0, 0, card(3, 'agua', 'manada'), 0);
    expect(sideValue(s, c, 0, RULES)).toBe(3);
    put(s, 0, -1, card(1), 0);
    expect(sideValue(s, c, 0, RULES)).toBe(4);
    put(s, 1, -1, card(1), 1);
    put(s, 1, 0, card(1), 2);
    expect(sideValue(s, c, 0, RULES)).toBe(4);
    put(s, 0, 1, card(1), 0);
    put(s, -1, 1, card(1), 0);
    expect(sideValue(s, c, 0, RULES)).toBe(5);
  });

  it('counts when attacking and when defending', () => {
    const s = game([card(3, 'agua', 'manada'), card(1)], [card(4), card(1)]);
    put(s, 0, -1, card(1), 0);
    put(s, 0, 1, card(1), 0);
    put(s, 1, 0, card(4), 1);
    const a = play(s, { handIndex: 0, cell: center });
    expect(a.events.find((e) => e.type === 'modifiers')).toMatchObject({ manada: 2, total: 2 });
    expect(ownerAt(a.state, 1, 0)).toBe(0); // 3+2 > 4
    const b = play(a.state, { handIndex: 0, cell: at(-1, 0) }); // rival 4 against 3+2
    expect(ownerAt(b.state, 0, 0)).toBe(0);
  });
});

describe('Siembra', () => {
  const zonesOf = (s: GameState) => s.zones.flatMap((z, i) => (z ? [[i, z]] : []));

  it('creates 1, 1, 2, 3, 3 zones by tier, in front of its highest sides', () => {
    const comun = game([card([1, 1, 6, 1, 5, 1], 'agua', 'siembra')]);
    expect(zonesOf(play(comun, { handIndex: 0, cell: center }).state)).toEqual([[at(1, 0), 'agua']]);

    const pocoComun = game([card(4, 'monte', 'siembra')]); // Frailín: ties keep N, NE, ... order
    expect(zonesOf(play(pocoComun, { handIndex: 0, cell: center }).state)).toEqual([[at(0, -1), 'monte']]);

    const rara = game([card([6, 5, 4, 5, 4, 5], 'agua', 'siembra')]); // 29 + 5 = 34
    expect(play(rara, { handIndex: 0, cell: center }).events.find((e) => e.type === 'siembra')).toMatchObject(
      {
        cells: [at(0, -1), at(1, -1)],
      },
    );

    const epica = game([card([7, 6, 5, 5, 5, 6], 'agua', 'siembra')]); // Riomán
    const r = play(epica, { handIndex: 0, cell: center });
    expect(r.events.find((e) => e.type === 'siembra')).toMatchObject({
      cells: [at(0, -1), at(1, -1), at(-1, 0)],
      element: 'agua',
    });
  });

  it('skips rocks and occupied cells, overwrites existing zones, and does nothing for Errantes', () => {
    const s = game([card(4, 'monte', 'siembra')]);
    s.rocks[at(0, -1)] = true;
    put(s, 1, -1, card(9), 1);
    zone(s, 1, 0, 'fuego');
    const { state } = play(s, { handIndex: 0, cell: center });
    expect([state.zones[at(1, 0)], state.zones[at(0, 1)], state.zones[at(0, -1)]]).toEqual([
      'monte',
      null,
      null,
    ]);

    const errante = game([card(4, 'errante', 'siembra')]);
    expect(play(errante, { handIndex: 0, cell: center }).state.zones.every((z) => z === null)).toBe(true);
  });
});

describe('Sello', () => {
  const farolero = () => card([6, 5, 5, 5, 5, 5], 'fuego', 'sello'); // rara: 2 cells

  it('blocks the rival in front of its weakest sides during their next turn only', () => {
    const s = game([farolero(), card(1)], [card(1), card(1)]);
    const a = play(s, { handIndex: 0, cell: center });
    const sealed = [at(1, -1), at(1, 0)];
    expect(a.state.seals).toEqual(sealed.map((cell) => ({ cell, owner: 0 })));
    expect(legalCells(a.state, 1)).not.toContain(at(1, 0));
    expect(legalCells(a.state, 0)).toContain(at(1, 0));
    expect(() => play(a.state, { handIndex: 0, cell: at(1, 0) })).toThrow(IllegalMoveError);
    const b = play(a.state, { handIndex: 0, cell: at(0, -1) });
    expect(b.state.seals).toEqual([]); // they expire as soon as the rival has played
    expect(legalCells(b.state, 1)).toContain(at(1, 0));
  });

  it('seals break when the rival would have no playable cell', () => {
    const s = game([farolero(), card(1)], [card(1), card(1)]);
    s.rocks.fill(true);
    for (const c of [center, at(1, -1), at(1, 0)]) s.rocks[c] = false;
    const { state, events } = play(s, { handIndex: 0, cell: center });
    expect(types(events)).toContain('seals_broken');
    expect(state.seals).toEqual([]);
    expect(legalCells(state, 1)).toHaveLength(2);
  });
});

describe('Giro', () => {
  it('rotates by sixths of a turn before being played', () => {
    const s = game([card([8, 5, 3, 6, 3, 5], 'errante', 'giro')]);
    put(s, 1, -1, card(7), 1); // NE of centre
    const still = play(s, { handIndex: 0, cell: center });
    expect(ownerAt(still.state, 1, -1)).toBe(1); // NE side is 5
    const turned = play(s, { handIndex: 0, cell: center, rotation: 1 });
    expect(turned.state.board[center]?.card.sides).toEqual([5, 8, 5, 3, 6, 3]);
    expect(ownerAt(turned.state, 1, -1)).toBe(0); // NE side is now 8
    expect(play(s, { handIndex: 0, cell: center, rotation: 5 }).state.board[center]?.card.sides).toEqual([
      5, 3, 6, 3, 5, 8,
    ]);
    expect(() => play(s, { handIndex: 0, cell: center, rotation: 6 })).toThrow(IllegalMoveError);
  });
});

describe('Cadena', () => {
  const candela = () => card([9, 7, 6, 4, 6, 7], 'fuego', 'cadena');

  it('captured cards attack their neighbours once; the chain does not go further', () => {
    const s = game([candela()]);
    put(s, 0, 0, card(3), 1); // A
    put(s, 1, 0, card(2), 1); // B, falls to A
    put(s, 2, 0, card(1), 1); // C, would fall to B if the chain continued
    const { state, events } = play(s, { handIndex: 0, cell: at(-1, 0) });
    expect([ownerAt(state, 0, 0), ownerAt(state, 1, 0), ownerAt(state, 2, 0)]).toEqual([0, 0, 1]);
    expect(types(events)).toEqual(['placed', 'clash', 'flip', 'cadena', 'clash', 'flip', 'turn']);
    expect(
      events.filter((e) => e.type === 'flip').map((e) => (e.type === 'flip' ? [e.wave, e.cells] : [])),
    ).toEqual([
      [1, [at(0, 0)]],
      [2, [at(1, 0)]],
    ]);
  });

  it('chained cards attack without their own Embestida or Reclamo, but with elements', () => {
    const s = game([candela()]);
    put(s, 0, 0, card(3, 'errante', 'embestida'), 1);
    put(s, 1, 0, card(3), 1); // 3 vs 3: Embestida would have won
    expect(ownerAt(play(s, { handIndex: 0, cell: at(-1, 0) }).state, 1, 0)).toBe(1);

    const el = game([candela()]);
    put(el, 0, 0, card(3, 'agua'), 1);
    put(el, 1, 0, card(3, 'fuego'), 1); // agua beats fuego: 3+1 > 3
    expect(ownerAt(play(el, { handIndex: 0, cell: at(-1, 0) }).state, 1, 0)).toBe(0);
  });

  it('Firme stops the chain too, and Espinas in the second wave hurts the chained attacker', () => {
    const s = game([candela()]);
    put(s, 0, 0, card(5), 1);
    const shielded = put(s, 1, 0, card(1), 1);
    const piece = s.board[shielded];
    if (piece) piece.firm = true;
    put(s, 0, 1, card(2, 'monte', 'espinas'), 1);
    const { state } = play(s, { handIndex: 0, cell: at(-1, 0) });
    expect(ownerAt(state, 1, 0)).toBe(1);
    expect(ownerAt(state, 0, 1)).toBe(0);
    expect(state.board[at(0, 0)]?.card.sides).toEqual([4, 4, 4, 4, 4, 4]);
    expect(state.board[at(-1, 0)]?.card.sides).toEqual([9, 7, 6, 4, 6, 7]);
  });

  /*
   * Decision (CLAUDE.md, "Guardián durante Cadena"): each chained card is its own strike, so
   * Guardián is evaluated per attacker.
   */
  describe('with Guardián: evaluated per chained attacker', () => {
    const setup = (withSecondAttacker: boolean) => {
      const s = game([candela()]);
      put(s, 0, -1, card(5), 1); // A1, captured in the first wave (9 > 5)
      if (withSecondAttacker) put(s, 1, -1, card(5), 1); // A2, captured in the first wave (7 > 5)
      put(s, 0, -2, card(4, 'monte', 'guardian'), 1); // G: neighbour of A1 only
      put(s, 1, -2, card(4), 1); // N1: neighbour of A1 and A2
      return play(s, { handIndex: 0, cell: center });
    };

    it('within one chained attack, the Guardián falls and its neighbour is saved', () => {
      const { state, events } = setup(false);
      expect([ownerAt(state, 0, -2), ownerAt(state, 1, -2)]).toEqual([0, 1]);
      expect(events.find((e) => e.type === 'guardian')).toMatchObject({
        wave: 2,
        guardians: [at(0, -2)],
        saved: [at(1, -2)],
      });
    });

    it('a card saved from one chained attacker still falls to another attacker of the same wave', () => {
      const { state, events } = setup(true);
      expect([ownerAt(state, 0, -2), ownerAt(state, 1, -2)]).toEqual([0, 0]);
      expect(events.find((e) => e.type === 'guardian')).toMatchObject({ wave: 2, saved: [at(1, -2)] });
      const wave2 = events.find((e) => e.type === 'flip' && e.wave === 2);
      expect(wave2).toMatchObject({ cells: [at(0, -2), at(1, -2)] });
    });
  });
});

describe('resolution order', () => {
  it('clashes, Guardián, flip, Espinas, then Siembra, then end of turn', () => {
    const s = game([card(9, 'monte', 'siembra')]);
    put(s, 0, -1, card(3, 'errante', 'guardian'), 1);
    put(s, 1, -1, card(3, 'errante', 'espinas'), 1);
    const guardianFirst = play(s, { handIndex: 0, cell: center });
    expect(types(guardianFirst.events)).toEqual([
      'placed',
      'clash',
      'clash',
      'guardian',
      'flip',
      'siembra',
      'turn',
    ]);

    const t = game([card([9, 9, 9, 9, 9, 2], 'monte', 'siembra')]);
    put(t, 0, -1, card(3, 'errante', 'espinas'), 1);
    const r = play(t, { handIndex: 0, cell: center });
    expect(types(r.events)).toEqual(['placed', 'clash', 'flip', 'espinas', 'siembra', 'turn']);
    // Siembra reads the sides after Espinas (8,8,8,8,8,1): N is taken, so NE, SE, S
    expect(r.events.find((e) => e.type === 'siembra')).toMatchObject({
      cells: [at(1, -1), at(1, 0), at(0, 1)],
    });
  });

  it('Sello comes after the flips', () => {
    const s = game([card([6, 5, 5, 5, 5, 5], 'fuego', 'sello')]);
    put(s, 0, -1, card(3), 1);
    expect(types(play(s, { handIndex: 0, cell: center }).events)).toEqual([
      'placed',
      'clash',
      'flip',
      'sello',
      'turn',
    ]);
  });
});

describe('match flow', () => {
  it('alternates turns, ends after 12 cards and scores cards on the board', () => {
    let s = game(
      Array.from({ length: 6 }, () => card(5)),
      Array.from({ length: 6 }, () => card(1)),
      1,
    );
    expect(s.turn).toBe(1);
    let last: GameEvent[] = [];
    for (let i = 0; i < 12; i++) {
      expect(s.turn).toBe(i % 2 === 0 ? 1 : 0);
      const cell = legalCells(s)[0] ?? -1;
      const r = play(s, { handIndex: 0, cell });
      s = r.state;
      last = r.events;
    }
    expect(s.over).toBe(true);
    expect(score(s, 0) + score(s, 1)).toBe(12);
    expect(last.at(-1)).toMatchObject({ type: 'game_over', scores: [score(s, 0), score(s, 1)] });
    expect(s.winner).toBe(score(s, 0) > score(s, 1) ? 0 : score(s, 0) < score(s, 1) ? 1 : 'draw');
    expect(() => play(s, { handIndex: 0, cell: 0 })).toThrow(IllegalMoveError);
  });

  it('sets up rocks, zones and neutral totems from a level', () => {
    const s = createGame({ level: LEVELS[3] ?? null, hands: [[], []], starter: 0 }, RULES);
    expect(s.rocks.filter(Boolean)).toHaveLength(4);
    expect(s.board[at(0, 0)]).toMatchObject({ owner: 2, ownedMask: 0, card: { sides: [6, 4, 6, 4, 6, 4] } });
    expect(s.zones[at(1, 0)]).toBe('monte');
  });
});
