// Alleen voor de preview: ook de statische bestanden (oude Sevilla-pagina's onder /ftp)
// krijgen noindex, zodat zoekmachines de preview niet naast de echte site oppikken.
// De Astro-pagina's krijgen al een robots-meta zolang PUBLIC_THEMA_KIEZER=1.
import { appendFileSync } from "node:fs";

appendFileSync("dist/client/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n");
console.log("Preview: noindex-header toegevoegd aan dist/client/_headers");
