/*
 * FOTBALLDATA: ligaer, klubber og spillere.
 * Logoer og bilder ligger i public/football/clubs/<id>.png og public/football/players/<id>.jpg
 * (hentet fra Wikipedia, se public/football/KILDER.txt). `wiki` = tittelen på Wikipedia-artikkelen.
 * Ratingene er omtrent som i virkeligheten (ca. 2025–2026).
 */

export interface LeagueDef {
  id: string;
  name: string;
  /** Laget må ha minst denne ratingen (snitt) for å bli med. */
  minRating: number;
  /** Motstanderne trekkes blant klubbene nærmest denne ratingen. */
  level: number;
  /** Premiepenger for 1., 2. og 3. plass (vises 10x høyere). */
  prizes: [number, number, number];
  /** Farge på pokalen. */
  color: string;
}

// Premie: 1. plass $ 10 M i Eliteserien, dobbelt så mye for hver liga oppover. 2. plass 40 %, 3. plass 20 %.
const prizes = (first: number): [number, number, number] => [first, first * 0.4, first * 0.2];

export const LEAGUES: LeagueDef[] = [
  { id: 'eliteserien', name: 'Eliteserien', minRating: 0, level: 59, prizes: prizes(1_000_000), color: '#2f6fd6' },
  { id: 'eredivisie', name: 'Eredivisie', minRating: 64, level: 68, prizes: prizes(2_000_000), color: '#e2581f' },
  { id: 'ligue1', name: 'Ligue 1', minRating: 69, level: 73, prizes: prizes(4_000_000), color: '#1b2a6b' },
  { id: 'seriea', name: 'Serie A', minRating: 73, level: 77, prizes: prizes(8_000_000), color: '#008fd7' },
  { id: 'laliga', name: 'La Liga', minRating: 76, level: 80, prizes: prizes(16_000_000), color: '#ff4b44' },
  { id: 'premier', name: 'Premier League', minRating: 79, level: 82, prizes: prizes(32_000_000), color: '#3d195b' },
  { id: 'ucl', name: 'Champions League', minRating: 82, level: 84, prizes: prizes(64_000_000), color: '#0b1d4f' },
];
export const leagueById = (id: string) => LEAGUES.find((l) => l.id === id) ?? LEAGUES[0];

export interface ClubDef {
  id: string;
  name: string;
  /** Kort navn (3 bokstaver) som vises hvis logoen mangler. */
  short: string;
  rating: number;
  wiki: string;
}

const club = (id: string, name: string, short: string, rating: number, wiki: string): ClubDef => ({ id, name, short, rating, wiki });

export const CLUBS: ClubDef[] = [
  // Norge
  club('bodo-glimt', 'Bodø/Glimt', 'BOD', 70, 'FK Bodø/Glimt'),
  club('brann', 'Brann', 'BRA', 66, 'SK Brann'),
  club('molde', 'Molde', 'MOL', 65, 'Molde FK'),
  club('rosenborg', 'Rosenborg', 'RBK', 64, 'Rosenborg BK'),
  club('viking', 'Viking', 'VIK', 64, 'Viking FK'),
  club('lillestrom', 'Lillestrøm', 'LSK', 61, 'Lillestrøm SK'),
  club('valerenga', 'Vålerenga', 'VIF', 61, 'Vålerenga Fotball'),
  club('sarpsborg', 'Sarpsborg 08', 'SAR', 60, 'Sarpsborg 08 FF'),
  club('tromso', 'Tromsø', 'TIL', 60, 'Tromsø IL'),
  club('fredrikstad', 'Fredrikstad', 'FFK', 60, 'Fredrikstad FK'),
  club('stromsgodset', 'Strømsgodset', 'SIF', 59, 'Strømsgodset IF'),
  club('hamkam', 'HamKam', 'HAM', 58, 'Hamarkameratene'),
  club('haugesund', 'Haugesund', 'FKH', 58, 'FK Haugesund'),
  club('sandefjord', 'Sandefjord', 'SAN', 58, 'Sandefjord Fotball'),
  club('kfum', 'KFUM Oslo', 'KFU', 57, 'KFUM-Kameratene Oslo'),
  club('kristiansund', 'Kristiansund', 'KBK', 57, 'Kristiansund BK'),
  club('odd', 'Odd', 'ODD', 56, 'Odds BK'),
  club('aalesund', 'Aalesund', 'AAF', 56, 'Aalesunds FK'),
  club('start', 'Start', 'IKS', 55, 'IK Start'),
  club('bryne', 'Bryne', 'BRY', 55, 'Bryne FK'),
  club('lyn', 'Lyn', 'LYN', 54, 'FK Lyn Oslo'),
  club('sogndal', 'Sogndal', 'SOG', 54, 'Sogndal Fotball'),
  club('ranheim', 'Ranheim', 'RAN', 53, 'Ranheim Fotball'),
  club('mjondalen', 'Mjøndalen', 'MIF', 53, 'Mjøndalen IF'),
  club('raufoss', 'Raufoss', 'RAU', 52, 'Raufoss IL'),
  club('moss', 'Moss', 'MOS', 52, 'Moss FK'),
  club('egersund', 'Egersund', 'EIK', 51, 'Egersunds IK'),
  // Sverige og Danmark
  club('malmo', 'Malmö FF', 'MFF', 67, 'Malmö FF'),
  club('elfsborg', 'Elfsborg', 'ELF', 64, 'IF Elfsborg'),
  club('djurgarden', 'Djurgården', 'DIF', 64, 'Djurgårdens IF Fotboll'),
  club('aik', 'AIK', 'AIK', 63, 'AIK Fotboll'),
  club('hammarby', 'Hammarby', 'HIF', 63, 'Hammarby Fotboll'),
  club('hacken', 'BK Häcken', 'HAC', 63, 'BK Häcken'),
  club('goteborg', 'IFK Göteborg', 'IFK', 61, 'IFK Göteborg'),
  club('mjallby', 'Mjällby', 'MAIF', 61, 'Mjällby AIF'),
  club('kobenhavn', 'FC København', 'FCK', 70, 'F.C. Copenhagen'),
  club('midtjylland', 'Midtjylland', 'FCM', 69, 'FC Midtjylland'),
  club('brondby', 'Brøndby', 'BIF', 66, 'Brøndby IF'),
  club('agf', 'AGF', 'AGF', 64, 'Aarhus Gymnastikforening'),
  club('nordsjaelland', 'Nordsjælland', 'FCN', 64, 'FC Nordsjælland'),
  club('silkeborg', 'Silkeborg', 'SIF', 61, 'Silkeborg IF'),
  club('viborg', 'Viborg', 'VFF', 60, 'Viborg FF'),
  // Nederland, Portugal, Belgia, Skottland, Tyrkia
  club('psv', 'PSV', 'PSV', 77, 'PSV Eindhoven'),
  club('feyenoord', 'Feyenoord', 'FEY', 76, 'Feyenoord'),
  club('ajax', 'Ajax', 'AJA', 75, 'AFC Ajax'),
  club('az', 'AZ Alkmaar', 'AZ', 72, 'AZ Alkmaar'),
  club('twente', 'Twente', 'TWE', 71, 'FC Twente'),
  club('utrecht', 'Utrecht', 'UTR', 69, 'FC Utrecht'),
  club('benfica', 'Benfica', 'BEN', 78, 'S.L. Benfica'),
  club('sporting', 'Sporting CP', 'SCP', 78, 'Sporting CP'),
  club('porto', 'Porto', 'POR', 77, 'FC Porto'),
  club('braga', 'Braga', 'BRA', 73, 'S.C. Braga'),
  club('brugge', 'Club Brugge', 'CLB', 74, 'Club Brugge KV'),
  club('anderlecht', 'Anderlecht', 'AND', 71, 'R.S.C. Anderlecht'),
  club('genk', 'Genk', 'GNK', 70, 'K.R.C. Genk'),
  club('celtic', 'Celtic', 'CEL', 73, 'Celtic F.C.'),
  club('rangers', 'Rangers', 'RAN', 71, 'Rangers F.C.'),
  club('galatasaray', 'Galatasaray', 'GAL', 77, 'Galatasaray S.K. (football)'),
  club('fenerbahce', 'Fenerbahçe', 'FEN', 76, 'Fenerbahçe S.K. (football)'),
  // Frankrike
  club('psg', 'Paris Saint-Germain', 'PSG', 87, 'Paris Saint-Germain FC'),
  club('marseille', 'Marseille', 'OM', 78, 'Olympique de Marseille'),
  club('monaco', 'Monaco', 'ASM', 78, 'AS Monaco FC'),
  club('lille', 'Lille', 'LIL', 77, 'Lille OSC'),
  club('lyon', 'Lyon', 'OL', 77, 'Olympique Lyonnais'),
  club('nice', 'Nice', 'NIC', 75, 'OGC Nice'),
  club('lens', 'Lens', 'RCL', 75, 'RC Lens'),
  club('rennes', 'Rennes', 'REN', 74, 'Stade Rennais F.C.'),
  // Italia
  club('inter', 'Inter', 'INT', 85, 'Inter Milan'),
  club('napoli', 'Napoli', 'NAP', 84, 'SSC Napoli'),
  club('juventus', 'Juventus', 'JUV', 82, 'Juventus FC'),
  club('milan', 'AC Milan', 'MIL', 81, 'AC Milan'),
  club('atalanta', 'Atalanta', 'ATA', 81, 'Atalanta BC'),
  club('roma', 'Roma', 'ROM', 79, 'AS Roma'),
  club('lazio', 'Lazio', 'LAZ', 78, 'SS Lazio'),
  club('fiorentina', 'Fiorentina', 'FIO', 77, 'ACF Fiorentina'),
  club('bologna', 'Bologna', 'BOL', 76, 'Bologna FC 1909'),
  // Spania
  club('real-madrid', 'Real Madrid', 'RMA', 88, 'Real Madrid CF'),
  club('barcelona', 'Barcelona', 'FCB', 87, 'FC Barcelona'),
  club('atletico', 'Atlético Madrid', 'ATM', 84, 'Atlético Madrid'),
  club('athletic', 'Athletic Bilbao', 'ATH', 80, 'Athletic Bilbao'),
  club('villarreal', 'Villarreal', 'VIL', 79, 'Villarreal CF'),
  club('real-sociedad', 'Real Sociedad', 'RSO', 78, 'Real Sociedad'),
  club('betis', 'Real Betis', 'BET', 77, 'Real Betis'),
  club('sevilla', 'Sevilla', 'SEV', 76, 'Sevilla FC'),
  club('girona', 'Girona', 'GIR', 75, 'Girona FC'),
  club('valencia', 'Valencia', 'VAL', 74, 'Valencia CF'),
  // England
  club('man-city', 'Manchester City', 'MCI', 87, 'Manchester City F.C.'),
  club('liverpool', 'Liverpool', 'LIV', 87, 'Liverpool F.C.'),
  club('arsenal', 'Arsenal', 'ARS', 87, 'Arsenal F.C.'),
  club('chelsea', 'Chelsea', 'CHE', 83, 'Chelsea F.C.'),
  club('tottenham', 'Tottenham', 'TOT', 81, 'Tottenham Hotspur F.C.'),
  club('newcastle', 'Newcastle', 'NEW', 81, 'Newcastle United F.C.'),
  club('man-united', 'Manchester United', 'MUN', 80, 'Manchester United F.C.'),
  club('aston-villa', 'Aston Villa', 'AVL', 80, 'Aston Villa F.C.'),
  club('forest', 'Nottingham Forest', 'NFO', 77, 'Nottingham Forest F.C.'),
  club('brighton', 'Brighton', 'BHA', 77, 'Brighton & Hove Albion F.C.'),
  club('west-ham', 'West Ham', 'WHU', 76, 'West Ham United F.C.'),
  club('crystal-palace', 'Crystal Palace', 'CRY', 76, 'Crystal Palace F.C.'),
  club('everton', 'Everton', 'EVE', 74, 'Everton F.C.'),
  // Tyskland
  club('bayern', 'Bayern München', 'FCB', 87, 'FC Bayern Munich'),
  club('leverkusen', 'Bayer Leverkusen', 'B04', 83, 'Bayer 04 Leverkusen'),
  club('dortmund', 'Borussia Dortmund', 'BVB', 82, 'Borussia Dortmund'),
  club('leipzig', 'RB Leipzig', 'RBL', 80, 'RB Leipzig'),
  club('stuttgart', 'Stuttgart', 'VFB', 78, 'VfB Stuttgart'),
  club('frankfurt', 'Eintracht Frankfurt', 'SGE', 78, 'Eintracht Frankfurt'),
  // Resten av verden
  club('al-hilal', 'Al-Hilal', 'HIL', 78, 'Al Hilal SFC'),
  club('al-nassr', 'Al-Nassr', 'NAS', 77, 'Al Nassr FC'),
  club('inter-miami', 'Inter Miami', 'MIA', 70, 'Inter Miami CF'),
];
export const clubById = (id: string) => CLUBS.find((c) => c.id === id);

export interface PlayerDef {
  id: string;
  name: string;
  rating: number;
  /** Klubben spilleren er i (id i CLUBS), brukes i kampmeldinger for motstanderen. */
  club: string;
  wiki: string;
}

const p = (id: string, name: string, rating: number, clubId: string, wiki = name): PlayerDef => ({ id, name, rating, club: clubId, wiki });

export const PLAYERS: PlayerDef[] = [
  // 88–91
  p('mbappe', 'Kylian Mbappé', 91, 'real-madrid'),
  p('haaland', 'Erling Haaland', 91, 'man-city'),
  p('rodri', 'Rodri', 90, 'man-city', 'Rodri (footballer, born 1996)'),
  p('vinicius', 'Vinícius Júnior', 90, 'real-madrid'),
  p('kane', 'Harry Kane', 90, 'bayern'),
  p('bellingham', 'Jude Bellingham', 90, 'real-madrid'),
  p('courtois', 'Thibaut Courtois', 89, 'real-madrid'),
  p('salah', 'Mohamed Salah', 89, 'liverpool'),
  p('van-dijk', 'Virgil van Dijk', 89, 'liverpool'),
  p('lautaro', 'Lautaro Martínez', 89, 'inter'),
  p('odegaard', 'Martin Ødegaard', 88, 'arsenal'),
  p('messi', 'Lionel Messi', 88, 'inter-miami'),
  p('valverde', 'Federico Valverde', 88, 'real-madrid'),
  p('dembele', 'Ousmane Dembélé', 88, 'psg'),
  p('alisson', 'Alisson Becker', 88, 'liverpool'),
  p('ronaldo', 'Cristiano Ronaldo', 87, 'al-nassr'),
  p('lewandowski', 'Robert Lewandowski', 87, 'barcelona'),
  p('yamal', 'Lamine Yamal', 87, 'barcelona'),
  p('pedri', 'Pedri', 87, 'barcelona'),
  p('saka', 'Bukayo Saka', 87, 'arsenal'),
  p('rice', 'Declan Rice', 87, 'arsenal'),
  p('wirtz', 'Florian Wirtz', 87, 'liverpool'),
  p('musiala', 'Jamal Musiala', 87, 'bayern'),
  p('kimmich', 'Joshua Kimmich', 87, 'bayern'),
  p('dias', 'Rúben Dias', 87, 'man-city'),
  p('saliba', 'William Saliba', 87, 'arsenal'),
  p('oblak', 'Jan Oblak', 87, 'atletico'),
  p('de-bruyne', 'Kevin De Bruyne', 87, 'napoli'),
  p('barella', 'Nicolò Barella', 86, 'inter'),
  p('vitinha', 'Vitinha', 86, 'psg', 'Vitinha (footballer, born 2000)'),
  p('hakimi', 'Achraf Hakimi', 86, 'psg'),
  p('raphinha', 'Raphinha', 86, 'barcelona'),
  p('griezmann', 'Antoine Griezmann', 86, 'atletico'),
  p('palmer', 'Cole Palmer', 86, 'chelsea'),
  p('isak', 'Alexander Isak', 86, 'liverpool'),
  p('bruno', 'Bruno Fernandes', 86, 'man-united'),
  p('kvaratskhelia', 'Khvicha Kvaratskhelia', 86, 'psg'),
  p('rudiger', 'Antonio Rüdiger', 86, 'real-madrid'),
  p('foden', 'Phil Foden', 85, 'man-city'),
  p('alvarez', 'Julián Álvarez', 85, 'atletico'),
  p('mac-allister', 'Alexis Mac Allister', 85, 'liverpool'),
  p('osimhen', 'Victor Osimhen', 85, 'galatasaray'),
  p('nico-williams', 'Nico Williams', 85, 'athletic'),
  p('leao', 'Rafael Leão', 84, 'milan'),
  p('gyokeres', 'Viktor Gyökeres', 84, 'arsenal'),
  p('mctominay', 'Scott McTominay', 84, 'napoli'),
  p('guirassy', 'Serhou Guirassy', 84, 'dortmund'),
  p('olmo', 'Dani Olmo', 84, 'barcelona'),
  p('sorloth', 'Alexander Sørloth', 83, 'atletico'),
  p('szoboszlai', 'Dominik Szoboszlai', 83, 'liverpool'),
  p('oyarzabal', 'Mikel Oyarzabal', 83, 'real-sociedad'),
  p('vlahovic', 'Dušan Vlahović', 83, 'juventus'),
  p('lookman', 'Ademola Lookman', 83, 'atalanta'),
  p('greenwood', 'Mason Greenwood', 82, 'marseille'),
  p('eze', 'Eberechi Eze', 82, 'arsenal'),
  p('bowen', 'Jarrod Bowen', 82, 'west-ham'),
  p('barcola', 'Bradley Barcola', 82, 'psg'),
  p('mbeumo', 'Bryan Mbeumo', 82, 'man-united'),
  p('watkins', 'Ollie Watkins', 82, 'aston-villa'),
  p('yildiz', 'Kenan Yıldız', 81, 'juventus'),
  p('gibbs-white', 'Morgan Gibbs-White', 81, 'forest'),
  p('cunha', 'Matheus Cunha', 81, 'man-united'),
  p('hojlund', 'Rasmus Højlund', 81, 'napoli'),
  p('aursnes', 'Fredrik Aursnes', 80, 'benfica'),
  p('mitoma', 'Kaoru Mitoma', 80, 'brighton'),
  p('ryerson', 'Julian Ryerson', 80, 'dortmund'),
  p('grealish', 'Jack Grealish', 79, 'everton'),
  p('mateta', 'Jean-Philippe Mateta', 79, 'crystal-palace'),
  p('berge', 'Sander Berge', 78, 'everton'),
  p('nusa', 'Antonio Nusa', 77, 'leipzig'),
  p('nyland', 'Ørjan Nyland', 77, 'sevilla'),
  p('ajer', 'Kristoffer Ajer', 76, 'brighton'),
  p('bobb', 'Oscar Bobb', 76, 'man-city'),
  p('schjelderup', 'Andreas Schjelderup', 75, 'benfica'),
  p('elyounoussi', 'Mohamed Elyounoussi', 74, 'kobenhavn'),
  p('berg', 'Patrick Berg', 74, 'bodo-glimt'),
  p('hauge', 'Jens Petter Hauge', 74, 'bodo-glimt'),
  p('holmgren', 'Marcus Holmgren Pedersen', 74, 'galatasaray'),
  p('thorsby', 'Morten Thorsby', 73, 'genk'),
  p('haikin', 'Nikita Haikin', 73, 'bodo-glimt'),
  p('hogh', 'Kasper Høgh', 72, 'bodo-glimt'),
  p('aasgaard', 'Thelo Aasgaard', 72, 'rangers'),
  p('botheim', 'Erik Botheim', 72, 'malmo'),
  p('heggem', 'Torbjørn Heggem', 72, 'bologna'),
  p('bjorkan', 'Fredrik André Bjørkan', 71, 'bodo-glimt'),
  p('saltnes', 'Ulrik Saltnes', 71, 'bodo-glimt'),
  p('eikrem', 'Magnus Wolff Eikrem', 70, 'molde'),
  p('selvik', 'Egil Selvik', 70, 'rosenborg'),
  p('gulliksen', 'Ole Sæter', 70, 'rosenborg', 'Ole Sæter'),
  p('brynhildsen', 'Ola Brynhildsen', 69, 'molde'),
  p('tripic', 'Zlatko Tripić', 69, 'viking'),
  p('daehli', 'Mats Møller Dæhli', 69, 'molde'),
  p('kitolano', 'Eric Kitolano', 68, 'molde'),
  p('linnes', 'Martin Linnes', 68, 'molde'),
  p('lode', 'Marius Lode', 68, 'stromsgodset'),
  p('berisha', 'Veton Berisha', 67, 'viking'),
  p('tagseth', 'Edvard Tagseth', 67, 'rosenborg'),
  p('nypan', 'Sverre Nypan', 67, 'man-city'),
  p('zafeiris', 'Christos Zafeiris', 66, 'brann', 'Christos Zafeiris'),
  p('knudsen', 'Fredrik Knudsen', 65, 'brann'),
];
export const playerDef = (id: string) => PLAYERS.find((x) => x.id === id);
