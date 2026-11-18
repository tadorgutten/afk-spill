import type { CapacitorConfig } from '@capacitor/cli';

/** Innstillinger for Android-appen. */
const config: CapacitorConfig = {
  appId: 'no.afkspill.app', // unik ID for appen (kan endres før den legges ut i Play Store)
  appName: 'Pengebingen',
  webDir: 'dist', // mappa Vite bygger spillet til
  backgroundColor: '#000000', // svart, som åpningsskjermen (Torfor Studios)
  // Forteller spillet at appen har et svart startbilde som sier fra når logoen kan starte
  appendUserAgent: 'PengebingenSplash',
  server: {
    // Appen henter spillet fra GitHub Pages, så den oppdateres hver gang du pusher til GitHub.
    // Fjern denne linja hvis appen skal bruke filene som er bygget inn i APK-en i stedet.
    url: 'https://tadorgutten.github.io/afk-spill/',
    // Uten nett: bruk versjonen som er bygget inn i APK-en
    errorPath: 'index.html',
  },
};

export default config;
