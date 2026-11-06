import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { schaakpartijPlugin } from "@schaakwoude/schaakpartij";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

// Lettertypes worden bij de build gedownload en vanaf de eigen site geserveerd
// (geen verzoeken naar Google vanuit de browser van bezoekers).
const google = fontProviders.google();
const lettertype = (name, cssVariable, weights, extra = {}) => ({
	provider: google,
	name,
	cssVariable,
	weights,
	styles: ["normal"],
	subsets: ["latin", "latin-ext"],
	fallbacks: ["system-ui", "sans-serif"],
	...extra,
});

export default defineConfig({
	site: "https://www.schaakwoude.nl",
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [schaakpartijPlugin()],
			admin: {
				// Alleen Nederlands (en Engels als terugval) meeleveren: elke taal kost
				// ~80 kB en de Worker moet op het gratis plan onder 3 MB blijven.
				locales: ["en", "nl"],
				hiddenNavItems: ["comments", "widgets"],
			},
		}),
	],
	fonts: [
		// Thema "Fries"
		lettertype("Bricolage Grotesque", "--lt-fries-kop", [600, 700, 800]),
		lettertype("Atkinson Hyperlegible", "--lt-fries-tekst", [400, 700], { styles: ["normal", "italic"] }),
		// Thema "Clubblad"
		lettertype("Fraunces", "--lt-blad-kop", [600, 700, 900], { styles: ["normal", "italic"], fallbacks: ["Georgia", "serif"] }),
		lettertype("Literata", "--lt-blad-tekst", [400, 600], { styles: ["normal", "italic"], fallbacks: ["Georgia", "serif"] }),
		// Thema "Toernooi"
		lettertype("Barlow Condensed", "--lt-toer-kop", [600, 700, 800]),
		lettertype("Barlow", "--lt-toer-tekst", [400, 500, 700], { styles: ["normal", "italic"] }),
		// Gedeeld
		lettertype("IBM Plex Mono", "--lt-mono", [400, 600], { fallbacks: ["ui-monospace", "monospace"] }),
		lettertype("Noto Sans Symbols 2", "--lt-schaak", [400], { subsets: ["symbols"], fallbacks: ["Segoe UI Symbol", "DejaVu Sans", "sans-serif"] }),
	],
	devToolbar: { enabled: false },
});
