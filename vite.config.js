import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Der Moos-O-Mat wird an zwei Stellen ausgeliefert: auf GitHub Pages unter
// /moos-o-mat/ und auf moosburg.eu unter /archiv/moos-o-mat/. Ein relativer
// base-Pfad bedient beide aus demselben Build, ohne zweiten Lauf mit --base.
//
// viteSingleFile buendelt JS, CSS und Schriften in eine einzige index.html.
// Das war schon vorher die Form des Projekts, und fuer einen eingefrorenen
// Archivstand ist sie die haltbarste: nichts, was von einem fremden Host
// nachgeladen wird und dort in ein paar Jahren fehlen kann. Damit faellt
// zugleich der Grund weg, aus dem /archiv/ auf moosburg.eu die serverweite
// CSP abschaltet.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    // Die drei woff2-Subsets sind zusammen 91 kB und muessen ueber der
    // Standardgrenze von 4 kB liegen, sonst schreibt Vite sie als eigene
    // Dateien neben die HTML und die Einzeldatei ist keine mehr.
    assetsInlineLimit: 128 * 1024,
  },
});
