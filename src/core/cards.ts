import type { CardDef, CardInstance, Ruleset, Sides, TierId } from './types';

/** Cost of one side value: linear up to the listed thresholds, then the table in the ruleset. */
export const sideCost = (value: number, rules: Ruleset): number => rules.sideCost[String(value)] ?? value;

/** Power = sum of side costs + effect cost. */
export function cardPower(card: Pick<CardDef, 'sides' | 'effect'>, rules: Ruleset): number {
  const sides = card.sides.reduce((total, v) => total + sideCost(v, rules), 0);
  return sides + (card.effect ? rules.effects[card.effect].cost : 0);
}

/** Tier index (0 = lowest) for a power value. */
export function tierIndexForPower(power: number, rules: Ruleset): number {
  let tier = 0;
  rules.tiers.forEach((t, i) => {
    if (power >= t.minPower) tier = i;
  });
  return tier;
}

export const tierIndex = (card: Pick<CardDef, 'sides' | 'effect'>, rules: Ruleset): number =>
  tierIndexForPower(cardPower(card, rules), rules);

export const tierId = (card: Pick<CardDef, 'sides' | 'effect'>, rules: Ruleset): TierId =>
  (rules.tiers[tierIndex(card, rules)] as { id: TierId }).id;

/** One sixth of a turn clockwise: the value that faced NO now faces N. */
export const rotateSides = (s: Sides): Sides => [s[5], s[0], s[1], s[2], s[3], s[4]];

export function rotateSidesBy(sides: Sides, steps: number): Sides {
  let out = sides;
  for (let i = 0; i < steps; i++) out = rotateSides(out);
  return out;
}

/** Creates the in-match copy of a card. The tier is fixed here and does not change during the match. */
export function instantiate(def: CardDef, rules: Ruleset): CardInstance {
  return {
    defId: def.id,
    element: def.element,
    sides: [...def.sides] as Sides,
    effect: def.effect,
    tier: tierIndex(def, rules),
  };
}
