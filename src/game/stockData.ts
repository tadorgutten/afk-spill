/**
 * Alle aksjene i spillet.
 *
 * - shares:  antall aksjer selskapet har utstedt (brukes til markedsverdi og "andel i selskapet")
 * - price:   startpris (kr). Omtrent ekte pris delt på 10, siden spillet har 10x lavere verdier.
 * - profile: hvordan aksjen oppfører seg:
 *     stable   = rolige svingninger, høyt utbytte (f.eks. Coca-Cola)
 *     balanced = middels svingninger og utbytte
 *     growth   = store svingninger, kan stige mye, lite/ingen utbytte (f.eks. Tesla)
 *     risky    = store svingninger, usikker retning – høyt utbytte kan være en felle
 * - color:   farge på logo-merket (brukes når det ikke finnes et logobilde)
 */
export type StockProfile = 'stable' | 'balanced' | 'growth' | 'risky';

export interface StockDef {
  id: string;
  name: string;
  ticker: string;
  shares: number;
  price: number;
  profile: StockProfile;
  color: string;
}

export const STOCKS: StockDef[] = [
  // --- Bil ---
  { id: 'renault', name: 'Renault', ticker: 'RNO', shares: 295_000_000, price: 3.93, profile: 'balanced', color: '#f2c200' },
  { id: 'hyundai', name: 'Hyundai', ticker: 'HYU', shares: 1_732_954_545, price: 4.6, profile: 'balanced', color: '#002c5f' },
  { id: 'toyota', name: 'Toyota', ticker: 'TM', shares: 16_314_016_360, price: 1.9, profile: 'stable', color: '#eb0a1e' },
  { id: 'mercedes', name: 'Mercedes-Benz', ticker: 'MBG', shares: 1_069_837_447, price: 6.4, profile: 'stable', color: '#1f2933' },
  { id: 'bmw', name: 'BMW', ticker: 'BMW', shares: 638_000_000, price: 8.9, profile: 'stable', color: '#1c69d4' },
  { id: 'ford', name: 'Ford', ticker: 'F', shares: 3_990_000_000, price: 1.1, profile: 'risky', color: '#003478' },
  { id: 'volkswagen', name: 'Volkswagen', ticker: 'VOW', shares: 501_000_000, price: 9.8, profile: 'stable', color: '#001e50' },
  { id: 'porsche', name: 'Porsche', ticker: 'P911', shares: 911_000_000, price: 6.8, profile: 'balanced', color: '#a3832f' },
  { id: 'tesla', name: 'Tesla', ticker: 'TSLA', shares: 3_210_000_000, price: 25.4, profile: 'growth', color: '#cc0000' },
  { id: 'ferrari', name: 'Ferrari', ticker: 'RACE', shares: 180_000_000, price: 43.5, profile: 'balanced', color: '#d40000' },
  { id: 'volvocars', name: 'Volvo Cars', ticker: 'VOLCAR', shares: 2_980_000_000, price: 0.26, profile: 'risky', color: '#1b365d' },
  { id: 'gm', name: 'General Motors', ticker: 'GM', shares: 1_100_000_000, price: 5.1, profile: 'balanced', color: '#0170ce' },
  { id: 'honda', name: 'Honda', ticker: 'HMC', shares: 5_280_000_000, price: 1.0, profile: 'balanced', color: '#cc0000' },
  { id: 'nissan', name: 'Nissan', ticker: 'NSAN', shares: 3_910_000_000, price: 0.29, profile: 'risky', color: '#c3002f' },

  // --- Teknologi ---
  { id: 'microsoft', name: 'Microsoft', ticker: 'MSFT', shares: 7_430_000_000, price: 42.1, profile: 'balanced', color: '#00a4ef' },
  { id: 'apple', name: 'Apple', ticker: 'AAPL', shares: 15_200_000_000, price: 23.2, profile: 'balanced', color: '#555555' },
  { id: 'facebook', name: 'Facebook', ticker: 'FB', shares: 2_520_000_000, price: 58.4, profile: 'growth', color: '#1877f2' },
  { id: 'nvidia', name: 'Nvidia', ticker: 'NVDA', shares: 24_400_000_000, price: 13.6, profile: 'growth', color: '#76b900' },
  { id: 'alphabet', name: 'Alphabet (Google)', ticker: 'GOOGL', shares: 12_300_000_000, price: 17.1, profile: 'balanced', color: '#4285f4' },
  { id: 'amazon', name: 'Amazon', ticker: 'AMZN', shares: 10_500_000_000, price: 19.3, profile: 'growth', color: '#ff9900' },
  { id: 'samsung', name: 'Samsung', ticker: 'SMSN', shares: 5_970_000_000, price: 5.4, profile: 'balanced', color: '#1428a0' },
  { id: 'intel', name: 'Intel', ticker: 'INTC', shares: 4_300_000_000, price: 2.2, profile: 'risky', color: '#0071c5' },
  { id: 'amd', name: 'AMD', ticker: 'AMD', shares: 1_620_000_000, price: 15.2, profile: 'growth', color: '#ed1c24' },
  { id: 'netflix', name: 'Netflix', ticker: 'NFLX', shares: 428_000_000, price: 89.5, profile: 'growth', color: '#e50914' },
  { id: 'spotify', name: 'Spotify', ticker: 'SPOT', shares: 205_000_000, price: 45.0, profile: 'growth', color: '#1db954' },
  { id: 'sony', name: 'Sony', ticker: 'SONY', shares: 6_050_000_000, price: 2.3, profile: 'balanced', color: '#222222' },
  { id: 'ibm', name: 'IBM', ticker: 'IBM', shares: 925_000_000, price: 22.4, profile: 'stable', color: '#1f70c1' },
  { id: 'oracle', name: 'Oracle', ticker: 'ORCL', shares: 2_800_000_000, price: 17.3, profile: 'balanced', color: '#c74634' },
  { id: 'adobe', name: 'Adobe', ticker: 'ADBE', shares: 440_000_000, price: 49.8, profile: 'growth', color: '#fa0f00' },

  // --- Forbruk ---
  { id: 'cocacola', name: 'Coca-Cola', ticker: 'KO', shares: 4_310_000_000, price: 6.8, profile: 'stable', color: '#f40009' },
  { id: 'nike', name: 'Nike', ticker: 'NKE', shares: 1_480_000_000, price: 7.4, profile: 'balanced', color: '#111111' },
  { id: 'mcdonalds', name: "McDonald's", ticker: 'MCD', shares: 715_000_000, price: 29.1, profile: 'stable', color: '#ffc72c' },
  { id: 'pepsico', name: 'PepsiCo', ticker: 'PEP', shares: 1_370_000_000, price: 15.9, profile: 'stable', color: '#004b93' },
  { id: 'starbucks', name: 'Starbucks', ticker: 'SBUX', shares: 1_140_000_000, price: 9.6, profile: 'balanced', color: '#00704a' },
  { id: 'adidas', name: 'Adidas', ticker: 'ADS', shares: 178_000_000, price: 23.4, profile: 'balanced', color: '#000000' },
  { id: 'disney', name: 'Disney', ticker: 'DIS', shares: 1_810_000_000, price: 11.2, profile: 'balanced', color: '#113ccf' },
  { id: 'walmart', name: 'Walmart', ticker: 'WMT', shares: 8_040_000_000, price: 8.6, profile: 'stable', color: '#0071ce' },
  { id: 'nestle', name: 'Nestlé', ticker: 'NESN', shares: 2_620_000_000, price: 9.4, profile: 'stable', color: '#63513d' },
  { id: 'unilever', name: 'Unilever', ticker: 'ULVR', shares: 2_500_000_000, price: 6.1, profile: 'stable', color: '#1f36c7' },
  { id: 'loreal', name: "L'Oréal", ticker: 'OR', shares: 534_000_000, price: 41.8, profile: 'balanced', color: '#000000' },
  { id: 'pg', name: 'Procter & Gamble', ticker: 'PG', shares: 2_350_000_000, price: 16.6, profile: 'stable', color: '#003da5' },
  { id: 'visa', name: 'Visa', ticker: 'V', shares: 1_950_000_000, price: 30.2, profile: 'balanced', color: '#1a1f71' },

  // --- Norge ---
  { id: 'equinor', name: 'Equinor', ticker: 'EQNR', shares: 2_790_000_000, price: 2.4, profile: 'stable', color: '#ff1243' },
  { id: 'dnb', name: 'DNB', ticker: 'DNB', shares: 1_480_000_000, price: 2.1, profile: 'stable', color: '#007272' },
  { id: 'telenor', name: 'Telenor', ticker: 'TEL', shares: 1_370_000_000, price: 1.3, profile: 'stable', color: '#00acff' },
  { id: 'hydro', name: 'Norsk Hydro', ticker: 'NHY', shares: 1_980_000_000, price: 0.62, profile: 'balanced', color: '#0d3b66' },
  { id: 'orkla', name: 'Orkla', ticker: 'ORK', shares: 1_000_000_000, price: 0.95, profile: 'stable', color: '#e4003a' },
  { id: 'mowi', name: 'Mowi', ticker: 'MOWI', shares: 517_000_000, price: 1.8, profile: 'balanced', color: '#00205b' },
  { id: 'kongsberg', name: 'Kongsberg Gruppen', ticker: 'KOG', shares: 880_000_000, price: 13.0, profile: 'growth', color: '#002f5f' },
  { id: 'yara', name: 'Yara', ticker: 'YAR', shares: 255_000_000, price: 3.3, profile: 'risky', color: '#0063a3' },
];

export function stockById(id: string): StockDef | undefined {
  return STOCKS.find((s) => s.id === id);
}
