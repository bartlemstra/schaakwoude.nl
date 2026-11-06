import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { schaakpartijPlugin } from "@schaakwoude/schaakpartij";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

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
	devToolbar: { enabled: false },
});
