/** Design tokens. The interface is meant to be re-skinned: no colour or font literal outside this file. */
export const TOKENS = {
  color: {
    bg: 0x12101a,
    surface: 0x1d1a2b,
    line: 0x3a3550,
    ink: 0xf3ecdf,
    muted: 0xa99fb8,
    accent: 0xf4c95d,
    player: 0x3fa9e0,
    rival: 0xec6a4f,
    neutral: 0x8a8398,
    fuego: 0xffa53b,
    agua: 0x6fd6ff,
    monte: 0x86dc5e,
    errante: 0xcfc6dc,
    tier: [0xa7adb5, 0x6fcf6f, 0x5aa9ff, 0xb57bff, 0xf4c95d],
  },
  font: {
    display: '"Chakra Petch", "Trebuchet MS", system-ui, sans-serif',
    body: 'Barlow, system-ui, sans-serif',
  },
  /** Logical portrait canvas; Phaser scales it to fit the screen. */
  screen: { width: 720, height: 1280 },
} as const;

export const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
