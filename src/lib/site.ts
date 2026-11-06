/** Instellingen van de site die niet in het CMS horen. */

export const THEMAS = [
	{ id: "fries", naam: "Fries", omschrijving: "Fris en helder, in de kleuren van de Friese vlag" },
	{ id: "clubblad", naam: "Clubblad", omschrijving: "Klassiek, als een clubblad of krant" },
	{ id: "toernooi", naam: "Toernooi", omschrijving: "Donker en sportief, als een toernooizaal" },
] as const;
export type ThemaId = (typeof THEMAS)[number]["id"];

/** Het thema van de site. Het bestuur kiest er één; tot die tijd "fries". */
export const THEMA: ThemaId = (import.meta.env.PUBLIC_THEMA as ThemaId) || "fries";

/**
 * Toon de themakiezer bovenaan elke pagina (voor de preview voor het bestuur).
 * Aan met PUBLIC_THEMA_KIEZER=1.
 */
export const THEMA_KIEZER = import.meta.env.PUBLIC_THEMA_KIEZER === "1";

export const CLUB = {
	naam: "Schaakvereniging Schaakwoude",
	kort: "Schaakwoude",
	opgericht: 1979,
	plaats: "Damwâld",
	speelzaal: { naam: "Gebouw ijsclub De Wâlden", adres: "Wyger Martensstrjitte 4", plaats: "9104 JM Damwâld" },
	knsbZaal: { naam: "Grand Café de Nije Warf", adres: "Foarwei 31A", plaats: "9113 PA Wâlterswâld" },
	speeltijden: "Elke donderdag: jeugd van 18.45 tot 19.45 uur, senioren vanaf 19.45 uur.",
	social: [
		{ naam: "Facebook", url: "https://www.facebook.com/Schaakwoude" },
	],
};

/** Een partij uit het archief die op de voorpagina staat. */
export const ARCHIEFPARTIJ = { collectie: "pages", slug: "partijen-groep-a-ronde-1", index: 0 } as const;

/** Huidige standen van de interne competitie (Sevilla-export, tot Clubstand live is). */
export const STANDEN = [
	{ naam: "Interne competitie 2026", url: "/ftp/intern2026" },
	{ naam: "Rapid 2025-2026", url: "/ftp/rapid20252026/" },
	{ naam: "Snelschaak 2026", url: "/ftp/snelschaak2026" },
	{ naam: "Zomercompetitie (Simmer) 2026", url: "/ftp/simmer2026" },
];
