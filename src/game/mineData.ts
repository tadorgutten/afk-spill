/*
 * GRUVEDATA: mineraler, gruver og graveverktøy.
 * Bildene av gruvene ligger i public/mines/<id>.jpg (fra Wikipedia, se public/mines/KILDER.txt).
 * Alle beløp er 1/10 av det som vises (som resten av spillet).
 */

// --- Mineraler ----------------------------------------------------------------------------------
export type MineralId = 'coal' | 'iron' | 'copper' | 'silver' | 'gold' | 'emerald' | 'diamond';

export interface MineralDef {
  id: MineralId;
  name: string;
  /** Normalpris per kg (prisen svinger rundt denne). */
  price: number;
  /** Farge på ikonet. */
  color: string;
  /** Edelstein (eget ikon) eller metall/kull. */
  gem?: boolean;
}

export const MINERALS: MineralDef[] = [
  { id: 'coal', name: 'Kull', price: 0.3, color: '#3b3b40' },
  { id: 'iron', name: 'Jern', price: 0.8, color: '#8a5a44' },
  { id: 'copper', name: 'Kobber', price: 2.5, color: '#c46f3a' },
  { id: 'silver', name: 'Sølv', price: 12, color: '#9aa3ad' },
  { id: 'gold', name: 'Gull', price: 70, color: '#d4a62a' },
  { id: 'emerald', name: 'Smaragd', price: 300, color: '#2e9d6a', gem: true },
  { id: 'diamond', name: 'Diamant', price: 1200, color: '#5fb6d9', gem: true },
];
export const mineralById = (id: MineralId) => MINERALS.find((m) => m.id === id)!;
/** Hvor høyt opp i rekken mineralet er (0 = kull, 6 = diamant). */
export const mineralTier = (id: MineralId) => MINERALS.findIndex((m) => m.id === id);

// --- Gruver -------------------------------------------------------------------------------------
export interface MineDef {
  id: string;
  name: string;
  place: string;
  country: string;
  /** Hvor verdifullt hvert tonn er sammenlignet med den første gruva. Ganger også prisen på verktøy. */
  mult: number;
  /** Hva man finner (andel av funnene, summerer til 1). */
  finds: Partial<Record<MineralId, number>>;
  /** Pris (den første gruva følger med bedriften). */
  price: number;
  /** Timer fra kjøp til gruva er klar. */
  openHours: number;
}

const mine = (
  id: string,
  name: string,
  place: string,
  country: string,
  index: number,
  finds: Partial<Record<MineralId, number>>,
): MineDef => ({
  id,
  name,
  place,
  country,
  mult: Math.round(1.45 ** index * 100) / 100,
  finds,
  price: index === 0 ? 0 : Math.round(400_000_000 * 1.6 ** (index - 1)),
  openHours: index,
});

export const MINES: MineDef[] = [
  mine('svalbard', 'Kullgruva', 'Svalbard', 'Norge', 0, { coal: 1 }),
  mine('kiruna', 'Kiruna-gruva', 'Kiruna', 'Sverige', 1, { coal: 0.65, iron: 0.35 }),
  mine('chuquicamata', 'Chuquicamata', 'Atacamaørkenen', 'Chile', 2, { iron: 0.45, copper: 0.5, silver: 0.05 }),
  mine('potosi', 'Cerro Rico', 'Potosí', 'Bolivia', 3, { copper: 0.4, silver: 0.55, gold: 0.05 }),
  mine('mponeng', 'Mponeng', 'Johannesburg', 'Sør-Afrika', 4, { silver: 0.4, gold: 0.55, diamond: 0.05 }),
  mine('muzo', 'Muzo-gruvene', 'Muzo', 'Colombia', 5, { gold: 0.4, emerald: 0.55, diamond: 0.05 }),
  mine('jwaneng', 'Jwaneng', 'Kalahari', 'Botswana', 6, { gold: 0.3, diamond: 0.7 }),
];
export const mineById = (id: string) => MINES.find((m) => m.id === id) ?? MINES[0];

// --- Graveverktøy -------------------------------------------------------------------------------
export interface ToolDef {
  id: string;
  name: string;
  /** Tonn masse per time. */
  rate: number;
  /** Hvor mange timer det graver før det er slitt ut. */
  lifeHours: number;
  /** Pris i den første gruva (ganges med gruvas verdi). */
  price: number;
}

export const TOOLS: ToolDef[] = [
  { id: 'mini', name: 'Minigraver', rate: 1_000, lifeHours: 48, price: 2_500_000 },
  { id: 'excavator', name: 'Gravemaskin', rate: 2_000, lifeHours: 60, price: 7_000_000 },
  { id: 'big', name: 'Stor gravemaskin', rate: 3_500, lifeHours: 72, price: 15_000_000 },
  { id: 'drill', name: 'Borerigg', rate: 5_500, lifeHours: 84, price: 27_000_000 },
  { id: 'tbm', name: 'Tunnelboremaskin', rate: 7_500, lifeHours: 96, price: 42_000_000 },
  { id: 'wheel', name: 'Skovelhjulsgraver', rate: 10_000, lifeHours: 120, price: 70_000_000 },
];
export const toolById = (id: string) => TOOLS.find((t) => t.id === id) ?? TOOLS[0];
