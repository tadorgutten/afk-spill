/*
 * NFT-er: 15 pikselportretter som koster ETH (kryptovalutaen Ethereum man eier).
 * Bildene tegnes i koden (24 × 24 piksler), så de ser like ut hver gang.
 */

export interface NftDef {
  id: string;
  name: string;
  /** Pris i ETH. */
  eth: number;
  /** Mørk eller rosa bakgrunn (som i originalen). */
  bg: string;
  hair: string;
  hair2: string;
  skin: string;
  shirt: string;
  /** Tilbehør. */
  extra: 'none' | 'shades' | 'hearts' | 'mask' | 'crown' | 'laser' | 'gold';
}

const PINK = '#e58ae6';
const DARK = '#2a2f45';
const NAVY = '#3b4361';

export const NFT_COLLECTION = 'Pikselfolket';
export const NFT_TEXT = 'Ingenting som dette – bare piksler.';

export const NFTS: NftDef[] = [
  { id: 'n1', name: 'Neo', eth: 1, bg: PINK, hair: '#22243a', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#f2efe8', extra: 'none' },
  { id: 'n2', name: 'Grå Neo', eth: 15, bg: DARK, hair: '#22243a', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#6e7899', extra: 'none' },
  { id: 'n3', name: 'Doktor Neo', eth: 85, bg: NAVY, hair: '#1c1e30', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#22263a', extra: 'shades' },
  { id: 'n4', name: 'Forelsket Neo', eth: 219, bg: PINK, hair: '#22243a', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#f2efe8', extra: 'hearts' },
  { id: 'n5', name: 'Djevel-Neo', eth: 666, bg: PINK, hair: '#3a3d5c', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#f2efe8', extra: 'none' },
  { id: 'n6', name: 'Klovnen', eth: 1_000, bg: DARK, hair: '#2f6b3a', hair2: '#4c9a52', skin: '#e8e8f0', shirt: '#f2efe8', extra: 'mask' },
  { id: 'n7', name: 'Regnbue', eth: 33_300, bg: DARK, hair: '#e2a12f', hair2: '#7f3fc4', skin: '#f6eadb', shirt: '#2f9e57', extra: 'none' },
  { id: 'n8', name: 'Gullsmil', eth: 100_000, bg: PINK, hair: '#22243a', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#f2efe8', extra: 'gold' },
  { id: 'n9', name: 'Lyseblå', eth: 250_000, bg: NAVY, hair: '#5fb6d9', hair2: '#cdeaf6', skin: '#f6eadb', shirt: '#2a5d8f', extra: 'none' },
  { id: 'n10', name: 'Rødtopp', eth: 700_000, bg: PINK, hair: '#c4382f', hair2: '#f08a5d', skin: '#f6eadb', shirt: '#22263a', extra: 'shades' },
  { id: 'n11', name: 'Laser-Neo', eth: 750_000, bg: DARK, hair: '#22243a', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#22263a', extra: 'laser' },
  { id: 'n12', name: 'Hjerteknuser', eth: 900_000, bg: DARK, hair: '#e58ae6', hair2: '#f6c6f6', skin: '#f6eadb', shirt: '#f2efe8', extra: 'hearts' },
  { id: 'n13', name: 'Kong Neo', eth: 1_600_000, bg: PINK, hair: '#22243a', hair2: '#8b93b3', skin: '#f6eadb', shirt: '#7f3fc4', extra: 'crown' },
  { id: 'n14', name: 'Gull-Neo', eth: 10_000_000, bg: DARK, hair: '#e2b33f', hair2: '#fbe08a', skin: '#f3d27a', shirt: '#b8862b', extra: 'gold' },
  { id: 'n15', name: 'Den ene', eth: 45_000_000, bg: NAVY, hair: '#f2efe8', hair2: '#b9bfd6', skin: '#f6eadb', shirt: '#e2b33f', extra: 'crown' },
];
export const nftById = (id: string) => NFTS.find((n) => n.id === id);

/** Tegner et pikselportrett som SVG (24 × 24 ruter). */
export function nftSvg(n: NftDef): string {
  const px: string[] = [];
  const box = (x: number, y: number, w: number, h: number, c: string) =>
    px.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  box(0, 0, 24, 24, n.bg);
  // Kropp / skjorte
  box(5, 19, 14, 5, n.shirt);
  box(4, 21, 16, 3, n.shirt);
  box(10, 17, 4, 3, '#1b1d2b');
  // Hår (to farger, delt på midten)
  box(5, 5, 7, 9, n.hair);
  box(12, 5, 7, 10, n.hair2);
  box(6, 3, 6, 3, n.hair);
  box(12, 3, 5, 3, n.hair2);
  box(4, 7, 2, 8, n.hair);
  box(18, 7, 2, 9, n.hair2);
  // Ansikt
  box(8, 9, 8, 8, n.skin);
  box(9, 17, 6, 1, n.skin);
  // Øyne og munn
  if (n.extra === 'shades') {
    box(8, 11, 3, 2, '#000');
    box(13, 11, 3, 2, '#000');
    box(11, 11, 2, 1, '#000');
  } else if (n.extra === 'hearts') {
    box(8, 11, 3, 2, '#d0459b');
    box(13, 11, 3, 2, '#d0459b');
    box(9, 13, 1, 1, '#d0459b');
    box(14, 13, 1, 1, '#d0459b');
  } else if (n.extra === 'laser') {
    box(9, 11, 2, 1, '#ff3030');
    box(13, 11, 2, 1, '#ff3030');
    box(15, 11, 9, 1, '#ff6060');
  } else {
    box(9, 11, 2, 1, '#1b1d2b');
    box(13, 11, 2, 1, '#1b1d2b');
  }
  if (n.extra === 'mask') {
    box(8, 10, 8, 2, '#d43c3c');
    box(9, 15, 6, 1, '#d43c3c');
    box(10, 14, 4, 1, '#d43c3c');
  } else {
    box(10, 15, 4, 1, n.extra === 'gold' ? '#f5c542' : '#1b1d2b');
  }
  box(11, 13, 2, 1, '#e8b4b4');
  if (n.extra === 'crown') {
    box(7, 1, 10, 2, '#f5c542');
    box(7, 0, 2, 1, '#f5c542');
    box(11, 0, 2, 1, '#f5c542');
    box(15, 0, 2, 1, '#f5c542');
    box(11, 1, 2, 1, '#d43c3c');
  }
  if (n.extra === 'gold') box(5, 19, 14, 1, '#f5c542');
  return `<svg class="nft-svg" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${px.join('')}</svg>`;
}
