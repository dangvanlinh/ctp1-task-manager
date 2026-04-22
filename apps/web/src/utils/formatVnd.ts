// Format VND compactly: 1_200_000_000 → "1.2B", 850_000_000 → "850M", 12_500 → "12.5K".
// Accepts number or string (BigInt-safe since amounts are up to ~10^14, within safe-integer for display).
export function formatVnd(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!isFinite(n) || n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (s: string) => s.replace(/\.0$/, '');
  if (abs >= 1e12) return `${sign}${trim((abs / 1e12).toFixed(1))}T`;
  if (abs >= 1e9) return `${sign}${trim((abs / 1e9).toFixed(1))}B`;
  if (abs >= 1e6) return `${sign}${trim((abs / 1e6).toFixed(1))}M`;
  if (abs >= 1e3) return `${sign}${trim((abs / 1e3).toFixed(1))}K`;
  return `${sign}${abs}`;
}

// Parse user input "1.2B" | "850M" | "1,200,000,000" → number
export function parseVnd(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/[,\s_]/g, '');
  if (!s) return null;
  const match = s.match(/^(-?\d*\.?\d+)\s*([kmbt])?$/);
  if (!match) return null;
  const base = parseFloat(match[1]);
  if (!isFinite(base)) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[match[2] ?? ''] ?? 1;
  return Math.round(base * mult);
}
