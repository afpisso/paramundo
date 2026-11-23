import { describe, expect, it } from 'vitest';
import { createRng, drawHand, validateDeck } from '../../src/core';
import { CARD_IDS, DECKS, RULES } from '../../src/data';

describe('deck validation', () => {
  it('accepts a deck with repeated cards (copies are allowed)', () => {
    const deck = [
      'chigui',
      'chigui',
      'chigui',
      'chigui',
      'guaca',
      'guaca',
      'guaca',
      'doradita',
      'doradita',
      'titin',
      'titin',
      'titin',
    ];
    expect(validateDeck(deck, CARD_IDS, RULES)).toEqual({ ok: true, errors: [] });
  });

  it('accepts twelve copies of the same card: there is no copy limit', () => {
    expect(RULES.deck.maxCopies).toBeNull();
    expect(validateDeck(Array<string>(12).fill('chigui'), CARD_IDS, RULES).ok).toBe(true);
  });

  it('accepts the starter deck', () => {
    expect(validateDeck(DECKS.starter, CARD_IDS, RULES).ok).toBe(true);
    expect(new Set(DECKS.starter).size).toBeLessThan(DECKS.starter.length);
  });

  it('rejects wrong size and unknown cards', () => {
    expect(validateDeck(['chigui'], CARD_IDS, RULES).errors).toEqual([
      { code: 'size', expected: 12, actual: 1 },
    ]);
    const r = validateDeck([...Array<string>(11).fill('chigui'), 'nope'], CARD_IDS, RULES);
    expect(r.errors).toEqual([{ code: 'unknown_card', cardId: 'nope' }]);
  });

  it('enforces a copy limit only when data sets one', () => {
    const limited = { ...RULES, deck: { size: 12, maxCopies: 2 } };
    const r = validateDeck(
      [...Array<string>(3).fill('chigui'), ...Array<string>(9).fill('guaca')],
      CARD_IDS,
      limited,
    );
    expect(r.errors.map((e) => e.code)).toEqual(['too_many_copies', 'too_many_copies']);
  });
});

describe('drawing the hand', () => {
  it('draws 6 of 12 without replacement, deterministically for a seed', () => {
    const a = drawHand(DECKS.starter, createRng(7), RULES);
    const b = drawHand(DECKS.starter, createRng(7), RULES);
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    const left = [...DECKS.starter];
    for (const id of a) {
      const i = left.indexOf(id);
      expect(i).toBeGreaterThanOrEqual(0);
      left.splice(i, 1);
    }
    expect(drawHand(DECKS.starter, createRng(8), RULES)).not.toEqual(a);
  });

  it('can draw the same card twice when the deck holds copies', () => {
    const hand = drawHand(Array<string>(12).fill('chigui'), createRng(1), RULES);
    expect(hand).toEqual(Array<string>(6).fill('chigui'));
  });
});
