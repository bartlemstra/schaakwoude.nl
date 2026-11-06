import type { PortableTextBlock } from "emdash";

type Blok = PortableTextBlock & { _type: string; children?: { text?: string }[]; asset?: { url?: string; _ref?: string }; alt?: string };

/** Eerste afbeelding uit de tekst, voor nieuwskaarten zonder eigen afbeelding. */
export function eersteAfbeelding(inhoud: unknown): { src: string; alt: string } | null {
	if (!Array.isArray(inhoud)) return null;
	for (const b of inhoud as Blok[]) {
		if (b._type !== "image") continue;
		const src = b.asset?.url ?? b.asset?._ref;
		if (src && /^(https?:)?\//.test(src)) return { src, alt: b.alt ?? "" };
	}
	return null;
}

/** Aantal partijen in een tekst. */
export const aantalPartijen = (inhoud: unknown) =>
	Array.isArray(inhoud) ? (inhoud as Blok[]).filter((b) => b._type === "partij").length : 0;

/** Leestijd in minuten. */
export function leestijd(inhoud: unknown) {
	if (!Array.isArray(inhoud)) return 1;
	const woorden = (inhoud as Blok[])
		.flatMap((b) => b.children ?? [])
		.map((c) => c.text ?? "")
		.join(" ")
		.split(/\s+/).length;
	return Math.max(1, Math.round(woorden / 220));
}

export const RUBRIEK_KLEUR: Record<string, string> = {
	"interne-competitie": "a",
	knsb: "b",
	fsb: "c",
	jeugd: "d",
	toernooien: "e",
	clubnieuws: "f",
};
