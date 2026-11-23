import { z } from 'zod';

export const zoneElementSchema = z.enum(['fuego', 'agua', 'monte']);
export const elementSchema = z.enum(['fuego', 'agua', 'monte', 'errante']);
export const effectIdSchema = z.enum([
  'embestida',
  'reclamo',
  'guardian',
  'firme',
  'espinas',
  'manada',
  'siembra',
  'sello',
  'giro',
  'cadena',
]);
export const tierIdSchema = z.enum(['comun', 'poco_comun', 'rara', 'epica', 'legendaria']);

const side = z.number().int().min(1).max(10);
export const sidesSchema = z.tuple([side, side, side, side, side, side]);
const axial = z.tuple([z.number().int(), z.number().int()]);

export const cardSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  element: elementSchema,
  sides: sidesSchema,
  effect: effectIdSchema.nullable(),
  region: z.string(),
  quote: z.string(),
  whyEffect: z.string(),
  inspiredBy: z.string(),
});
export const cardsFileSchema = z.strictObject({ cards: z.array(cardSchema).min(1) });

const cost = z.number().int().min(0);
const cellsByTier = z.array(z.number().int().min(0)).length(5);
export const effectsFileSchema = z.strictObject({
  embestida: z.strictObject({ cost, attackBonus: z.number().int() }),
  reclamo: z.strictObject({ cost, attackBonus: z.number().int() }),
  guardian: z.strictObject({ cost }),
  firme: z.strictObject({ cost }),
  espinas: z.strictObject({ cost, penalty: z.number().int().min(0) }),
  manada: z.strictObject({ cost, perAlly: z.number().int(), cap: z.number().int().min(0) }),
  siembra: z.strictObject({ cost, cellsByTier }),
  sello: z.strictObject({ cost, cellsByTier }),
  giro: z.strictObject({ cost }),
  cadena: z.strictObject({ cost, minTier: tierIdSchema }),
});

export const rulesFileSchema = z.strictObject({
  handSize: z.number().int().min(1),
  deck: z.strictObject({ size: z.number().int().min(1), maxCopies: z.number().int().min(1).nullable() }),
  sides: z.strictObject({ min: z.number().int(), max: z.number().int() }),
  sideCost: z.record(z.string().regex(/^\d+$/), z.number().int().min(0)),
  tiers: z.array(z.strictObject({ id: tierIdSchema, minPower: z.number().int().min(0) })).length(5),
  elements: z.strictObject({
    beats: z.strictObject({ fuego: zoneElementSchema, agua: zoneElementSchema, monte: zoneElementSchema }),
    advantage: z.number().int(),
    disadvantage: z.number().int(),
  }),
  zones: z.strictObject({ match: z.number().int(), weak: z.number().int() }),
});

export const levelSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  rocks: z.array(axial),
  zones: z.array(z.tuple([z.number().int(), z.number().int(), zoneElementSchema])),
  totems: z.array(z.strictObject({ cell: axial, sides: sidesSchema, element: elementSchema })),
});
export const levelsFileSchema = z.strictObject({ levels: z.array(levelSchema).min(1) });

export const decksFileSchema = z.strictObject({ starter: z.array(z.string()) });

export type CardData = z.infer<typeof cardSchema>;
