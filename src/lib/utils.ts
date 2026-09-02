import { PALETTE } from './constants';

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffledPalette(n: number): string[] {
  let out: string[] = [];
  while (out.length < n) out = out.concat(shuffle(PALETTE));
  return out.slice(0, n);
}

export function randomHex(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

/** Hex colour to an rgba() string at the given alpha. */
export function hexA(hex: string | null | undefined, alpha: number): string {
  if (!hex) return `rgba(139,144,155,${alpha})`;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
