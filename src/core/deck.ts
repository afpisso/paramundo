import type { Rng } from './rng';
import type { Ruleset } from './types';

export interface DeckValidation {
  ok: boolean;
  errors: DeckError[];
}

export type DeckError =
  | { code: 'size'; expected: number; actual: number }
  | { code: 'unknown_card'; cardId: string }
  | { code: 'too_many_copies'; cardId: string; max: number; actual: number };

/**
 * A deck is a list of card ids. Repeated ids are copies of the same card and are allowed.
 * `rules.deck.maxCopies` is null when there is no limit (the current decision); the check
 * stays so a limit can be set later from data without touching code.
 */
export function validateDeck(
  deck: readonly string[],
  knownIds: ReadonlySet<string>,
  rules: Ruleset,
): DeckValidation {
  const errors: DeckError[] = [];
  if (deck.length !== rules.deck.size) {
    errors.push({ code: 'size', expected: rules.deck.size, actual: deck.length });
  }
  const counts = new Map<string, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [cardId, actual] of counts) {
    if (!knownIds.has(cardId)) errors.push({ code: 'unknown_card', cardId });
    const max = rules.deck.maxCopies;
    if (max !== null && actual > max) errors.push({ code: 'too_many_copies', cardId, max, actual });
  }
  return { ok: errors.length === 0, errors };
}

/** Draws the hand for a match: `handSize` cards from the deck, without replacement. No draws during the match. */
export function drawHand(deck: readonly string[], rng: Rng, rules: Ruleset): string[] {
  return rng.shuffle([...deck]).slice(0, rules.handSize);
}
