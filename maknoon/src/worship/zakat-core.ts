/**
 * Zakat arithmetic as a pure function (CLAUDE.md rule 6). It applies the single
 * rule the screen declares; it is NOT scholar-validated yet, so the screen shows a
 * review notice until CALCULATORS_REVIEWED.zakat is set (SPEC §2.10).
 */
export const ZAKAT_RATE = 0.025;
export const NISAB_GOLD_G = 85;
export const NISAB_SILVER_G = 595;

export type ZakatInput = {
  cash: number;
  goldG: number;
  goldPrice: number; // per gram
  silverG: number;
  silverPrice: number; // per gram
  trade: number;
  owed: number; // money others owe you
  debt: number; // money you owe
  basis: 'gold' | 'silver';
};

export function zakat(i: ZakatInput) {
  const net = i.cash + i.goldG * i.goldPrice + i.silverG * i.silverPrice + i.trade + i.owed - i.debt;
  const nisab = i.basis === 'gold' ? NISAB_GOLD_G * i.goldPrice : NISAB_SILVER_G * i.silverPrice;
  const due = nisab > 0 && net >= nisab;
  return { net, nisab, due, amount: due ? net * ZAKAT_RATE : 0 };
}
