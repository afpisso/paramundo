/**
 * Loads every data file, validates it and exposes typed, ready-to-use values.
 * Anything wrong in a JSON file fails here, at load time, with a readable message.
 */
import { cardPower, cellIndex, tierId, tierIndex, validateDeck } from '../core';
import type { CardDef, LevelDef, Ruleset } from '../core';
import cardsJson from './cards.json';
import decksJson from './decks.json';
import effectsJson from './effects.json';
import levelsJson from './levels.json';
import rulesJson from './rules.json';
import stringsJson from './strings.es.json';
import {
  cardsFileSchema,
  decksFileSchema,
  effectsFileSchema,
  levelsFileSchema,
  rulesFileSchema,
  type CardData,
} from './schemas';

export const RULES: Ruleset = {
  ...rulesFileSchema.parse(rulesJson),
  effects: effectsFileSchema.parse(effectsJson),
};

export const CARDS: readonly CardData[] = cardsFileSchema.parse(cardsJson).cards;
export const CARD_BY_ID: ReadonlyMap<string, CardData> = new Map(CARDS.map((c) => [c.id, c]));
export const CARD_IDS: ReadonlySet<string> = new Set(CARDS.map((c) => c.id));

export const LEVELS: readonly LevelDef[] = levelsFileSchema.parse(levelsJson).levels;
export const DECKS = decksFileSchema.parse(decksJson);
export const STRINGS = stringsJson;

export function getCard(id: string): CardData {
  const card = CARD_BY_ID.get(id);
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}

/** Rules that span more than one file. Returns the list of problems (empty when the data is sound). */
export function validateData(
  cards: readonly CardDef[] = CARDS,
  levels: readonly LevelDef[] = LEVELS,
  rules: Ruleset = RULES,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.id)) problems.push(`Duplicate card id: ${c.id}`);
    seen.add(c.id);
    if (c.effect === 'siembra' && c.element === 'errante') {
      problems.push(`${c.id}: Siembra needs an element, Errantes cannot have it.`);
    }
    if (c.effect === 'cadena') {
      const min = rules.tiers.findIndex((t) => t.id === rules.effects.cadena.minTier);
      if (tierIndex(c, rules) < min) {
        problems.push(
          `${c.id}: Cadena is only for ${rules.effects.cadena.minTier} (power ${cardPower(c, rules)}, ${tierId(c, rules)}).`,
        );
      }
    }
  }
  for (const l of levels) {
    const cells = [...l.rocks, ...l.zones.map(([q, r]) => [q, r] as const), ...l.totems.map((t) => t.cell)];
    for (const [q, r] of cells)
      if (cellIndex(q, r) < 0) problems.push(`${l.id}: cell ${q},${r} is off the board.`);
  }
  const starter = validateDeck(DECKS.starter, new Set(cards.map((c) => c.id)), rules);
  if (!starter.ok) problems.push(`Starter deck invalid: ${JSON.stringify(starter.errors)}`);
  return problems;
}

const problems = validateData();
if (problems.length) throw new Error(`Invalid game data:\n${problems.join('\n')}`);
