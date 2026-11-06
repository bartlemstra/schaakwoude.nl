// Zet de WordPress-export (migratie/uit/wp.json, gemaakt door exporteer_wp.py) om
// naar een EmDash-seed met alle inhoud: nieuws, pagina's, partijen, teams, agenda,
// eregalerij, sponsors en doorverwijzingen van de oude adressen.
//
//   node migratie/naar-seed.mjs migratie/uit/wp.json migratie/uit/seed-met-inhoud.json
//
// Daarna: pnpm emdash seed migratie/uit/seed-met-inhoud.json -d <database>
import { readFileSync, writeFileSync } from "node:fs";
import { gutenbergToPortableText, htmlToPortableText } from "@emdash-cms/gutenberg-to-portable-text";

import { clubdata } from "./clubdata.mjs";

const [, , invoer = "migratie/uit/wp.json", uitvoer = "migratie/uit/seed-met-inhoud.json"] =
	process.argv;
const wp = JSON.parse(readFileSync(invoer, "utf8"));
const schema = JSON.parse(readFileSync(new URL("../seed/seed.json", import.meta.url), "utf8"));

const OUDE_SITE = "https://www.schaakwoude.nl";
let sleutel = 0;
const nieuweSleutel = () => `k${(++sleutel).toString(36)}`;

// ---------- HTML opschonen ----------

const ENTITEITEN = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…" };
function decodeer(tekst) {
	return tekst
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&(\w+);/g, (m, n) => ENTITEITEN[n] ?? m);
}

function verwijderWordRommel(html) {
	return html
		.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
		.replace(/<!--(?! ?\/?wp:)[\s\S]*?-->/g, "")
		.replace(/<(meta|link)\b[^>]*>/gi, "")
		.replace(/<style\b[\s\S]*?<\/style>/gi, "")
		.replace(/<\/?o:p>/gi, "")
		.replace(/<\/?(font|span)\b[^>]*>/gi, "")
		.replace(/\s(class|style|lang)="[^"]*"/gi, (m, attr, off, s) =>
			// classes van Gutenberg-blokken laten staan, Word-classes weg
			attr === "class" && /wp-(block|image)/.test(m) ? m : "",
		);
}

const BLOKTAG = /^<(p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|pre|figure|hr|img|!--)/i;
/** Simpele variant van WordPress' wpautop() voor berichten uit de klassieke editor. */
function autop(html) {
	return html
		.replace(/\r\n/g, "\n")
		.split(/\n\s*\n/)
		.map((stuk) => stuk.trim())
		.filter(Boolean)
		.map((stuk) => (BLOKTAG.test(stuk) ? stuk : `<p>${stuk.replace(/\n/g, "<br />\n")}</p>`))
		.join("\n\n");
}

// ---------- shortcodes ----------

function pgnOpschonen(ruw) {
	return decodeer(
		ruw
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/p>\s*<p[^>]*>/gi, "\n")
			.replace(/<[^>]+>/g, ""),
	)
		.replace(/[“”„″]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/ /g, " ")
		.split("\n")
		.map((r) => r.trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function pgnTitel(pgn) {
	const kop = (naam) => pgn.match(new RegExp(`\\[${naam} "([^"]*)"\\]`))?.[1]?.trim();
	const wit = kop("White");
	const zwart = kop("Black");
	if (wit && zwart && wit !== "?" && zwart !== "?") return `${wit} – ${zwart}`;
	return kop("Event") || "";
}

function tabelHtml(id) {
	const tabel = wp.tabellen[id];
	if (!tabel) return "";
	const rijen = tabel.rijen.filter((r) => r.some((c) => String(c).trim()));
	if (!rijen.length) return "";
	const [kop, ...rest] = rijen;
	const cel = (tag) => (c) => `<${tag}>${c}</${tag}>`;
	return (
		`<figure class="wp-block-table"><table><thead><tr>${kop.map(cel("th")).join("")}</tr></thead>` +
		`<tbody>${rest.map((r) => `<tr>${r.map(cel("td")).join("")}</tr>`).join("")}</tbody></table></figure>`
	);
}

/** Vervangt shortcodes door markeringen of HTML; geeft de partijen apart terug. */
function shortcodes(html) {
	const partijen = [];
	const gutenberg = html.includes("<!-- wp:");
	html = html.replace(/\[pgn([^\]]*)\]([\s\S]*?)\[\/pgn\]/gi, (_, attrs, ruw) => {
		const pgn = pgnOpschonen(ruw);
		const puzzel = /showmoves\s*=\s*puzzle/i.test(attrs);
		partijen.push({ pgn, puzzel });
		return `\n\n<p>@@PARTIJ${partijen.length - 1}@@</p>\n\n`;
	});
	html = html.replace(
		/<!-- wp:tablepress\/table \{"id":"(\d+)"\} -->[\s\S]*?<!-- \/wp:tablepress\/table -->/g,
		(_, id) => `<!-- wp:table -->${tabelHtml(id)}<!-- /wp:table -->`,
	);
	html = html.replace(/\[table id=(\d+)\s*\/\]/g, (_, id) =>
		gutenberg ? `<!-- wp:table -->${tabelHtml(id)}<!-- /wp:table -->` : `\n\n${tabelHtml(id)}\n\n`,
	);
	html = html.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_, binnen) => {
		const img = binnen.match(/<a[^>]*>\s*<img[^>]*>\s*<\/a>|<img[^>]*>/i)?.[0] ?? "";
		const onderschrift = binnen.replace(img, "").trim();
		return `<figure>${img}<figcaption>${onderschrift}</figcaption></figure>`;
	});
	return { html, partijen };
}

// ---------- links en afbeeldingen ----------

const berichtSlugs = new Set(wp.inhoud.filter((i) => i.type === "post").map((i) => i.slug));
const paginaSlugs = new Map(); // oude slug -> nieuwe slug (gevuld bij de pagina's)

function nieuweUrl(url) {
	const m = url.match(/^(?:https?:)?\/\/(?:www\.)?schaakwoude\.nl(\/[^"'#?\s]*)?(\?[^"'#\s]*)?(#\S*)?$/i);
	if (!m) return url;
	const pad = m[1] ?? "/";
	if (pad.startsWith("/wp-content/") || pad.startsWith("/ftp/")) return OUDE_SITE + pad + (m[2] ?? "");
	const content = pad.match(/^\/content\/([^/]+)\/?$/);
	if (content) {
		const slug = decodeURIComponent(content[1]);
		if (berichtSlugs.has(slug)) return `/nieuws/${slug}`;
		if (paginaSlugs.has(slug)) return `/${paginaSlugs.get(slug)}`;
		return pad;
	}
	const pagina = pad.match(/^\/([^/]+)\/?$/);
	if (pagina && paginaSlugs.has(pagina[1])) return `/${paginaSlugs.get(pagina[1])}`;
	return pad + (m[3] ?? "");
}

function herschrijfLinks(html) {
	return html.replace(/(href|src)=(["'])([^"']+)\2/gi, (_, attr, q, url) => `${attr}=${q}${nieuweUrl(url)}${q}`);
}

// ---------- omzetten naar Portable Text ----------

function naarPortableText(item) {
	let html = verwijderWordRommel(item.inhoud);
	const shortcode = shortcodes(html);
	html = shortcode.html;
	if (!html.includes("<!-- wp:")) html = autop(html);
	html = herschrijfLinks(html);
	let blokken = gutenbergToPortableText(html, { keyGenerator: nieuweSleutel }).flatMap((b) =>
		// klassieke HTML tussen Gutenberg-blokken komt terug als HTML-blok; zet die ook om
		b._type === "htmlBlock" && !b.originalBlockName
			? htmlToPortableText(autop(b.html), { keyGenerator: nieuweSleutel })
			: [b],
	);
	// Word-plakwerk gebruikte reeksen harde spaties als tabstop
	const spaties = (t) => t.replace(/[\u00a0 ]{2,}/g, " ");
	for (const b of blokken) for (const c of b.children ?? []) if (c.text) c.text = spaties(c.text);

	// markeringen vervangen door partij-blokken
	const uit = [];
	for (const blok of blokken) {
		const tekst = blok._type === "block" ? (blok.children ?? []).map((c) => c.text ?? "").join("") : "";
		const markeringen = [...tekst.matchAll(/@@PARTIJ(\d+)@@/g)];
		if (!markeringen.length) {
			uit.push(blok);
			continue;
		}
		const rest = tekst.replace(/@@PARTIJ\d+@@/g, "").trim();
		if (rest) {
			for (const c of blok.children) if (c.text) c.text = c.text.replace(/@@PARTIJ\d+@@/g, "");
			uit.push(blok);
		}
		for (const m of markeringen) {
			const p = shortcode.partijen[Number(m[1])];
			uit.push({
				_type: "partij",
				_key: nieuweSleutel(),
				pgn: p.pgn,
				titel: pgnTitel(p.pgn),
				...(p.puzzel ? { modus: "puzzel" } : {}),
			});
		}
	}
	// lege alinea's weg (komen veel voor in oude berichten)
	blokken = uit.filter(
		(b) =>
			!(
				b._type === "block" &&
				!(b.children ?? []).some((c) => (c.text ?? "").replace(/[\s ]/g, "")) &&
				!b.listItem
			),
	);
	return blokken;
}

function platteTekst(blokken, max = 220) {
	const tekst = blokken
		.filter((b) => b._type === "block" && !b.style?.startsWith("h"))
		.map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
	if (tekst.length <= max) return tekst;
	return tekst.slice(0, tekst.lastIndexOf(" ", max)) + "…";
}

// ---------- rubrieken ----------

const RUBRIEKEN = [
	["jeugd", /jeugd|jongeren|schoolschaak|pupil|stappen/i],
	["knsb", /knsb/i],
	["fsb", /\bfsb\b|friese schaakbond|hoofdklasse|bekercompetitie/i],
	["toernooien", /toernooi|open\b|cup\b|kampioenschap|simultaan|grand prix|\bgp\b|rapid(?!competitie)/i],
	["interne-competitie", /ronde\s*\d|interne|intern\b|stand\b|uitslag|keizer|rapidcompetitie|snelschaak|zomercompetitie|simmer/i],
];
function rubriek(titel, tekst) {
	for (const [slug, re] of RUBRIEKEN) if (re.test(titel)) return slug;
	for (const [slug, re] of RUBRIEKEN.slice(0, 3)) if (re.test(tekst.slice(0, 400))) return slug;
	return "clubnieuws";
}


// ---------- bouwen ----------

const datum = (s) => new Date(s.replace(" ", "T") + "+01:00").toISOString();
const auteurs = new Map();
function byline(naam) {
	if (!naam) return [];
	const slug = naam.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
	if (!auteurs.has(slug)) auteurs.set(slug, { id: `byline-${slug}`, slug, displayName: naam, isGuest: true });
	return [{ byline: `byline-${slug}` }];
}

// Pagina's die een nieuwe plek krijgen in de nieuwe structuur
const PAGINA_NIEUW = {
	"algemene-informatie": "club",
	"jeugdschaken-2": "jeugd",
	"interne-competitie": "competitie",
	"privacy-statement": "privacy",
	"competitiereglement": "competitiereglement",
	"koppelingen-2": "koppelingen",
	"reglement-2": "reglement-fk",
	"eregalerij-2": null, // wordt de eigen eregalerij-pagina
	"agenda-2": null, // agenda wordt een eigen collectie
	"kalender-2": null,
	"sponsoren-3": null, // sponsors worden een eigen collectie
	"externe-competitie": null, // teams worden een eigen collectie
	"schaakwoude-1": null,
	"schaakwoude-2": null,
	"schaakwoude-3": null,
	"fsb-schaakwoude-i": null,
	"fsb-schaakwoude-ii": null,
	"fsb-schaakwoude-iv": null,
	"fsb-schaakwoude-v": null,
};
const VASTE_ROUTES = { "eregalerij-2": "eregalerij", "agenda-2": "agenda", "kalender-2": "agenda", "sponsoren-3": "sponsors", "externe-competitie": "teams", "schaakwoude-1": "teams#knsb-1", "schaakwoude-2": "teams#knsb-2", "schaakwoude-3": "teams#fsb-3", "fsb-schaakwoude-i": "teams#fsb-1", "fsb-schaakwoude-ii": "teams#fsb-2", "fsb-schaakwoude-iv": "teams", "fsb-schaakwoude-v": "teams" };

const paginas = wp.inhoud.filter((i) => i.type === "page");
for (const p of paginas) {
	if (p.slug in PAGINA_NIEUW) paginaSlugs.set(p.slug, PAGINA_NIEUW[p.slug] ?? VASTE_ROUTES[p.slug]);
	else {
		// WordPress plakte "-2" achter slugs die al eens gebruikt waren; haal dat weg
		// als het kan zonder botsing (niet bij "ronde-2" en dergelijke).
		const kaal = p.slug.replace(/-2$/, "");
		const bezet = paginas.some((q) => q.slug === kaal) || /(\d|ronde)$/.test(kaal);
		paginaSlugs.set(p.slug, bezet ? p.slug : kaal);
	}
}

const redirects = [];
const voegRedirectToe = (bron, doel) => {
	if (bron !== doel && !redirects.some((r) => r.source === bron))
		redirects.push({ source: bron, destination: doel, type: 301, groupName: "Oude website" });
};

const paginaEntries = [];
for (const p of paginas) {
	const nieuw = paginaSlugs.get(p.slug);
	if (PAGINA_NIEUW[p.slug] === null) {
		voegRedirectToe(`/${p.slug}`, `/${nieuw.split("#")[0]}`);
		continue;
	}
	const inhoud = naarPortableText(p);
	paginaEntries.push({
		id: `pagina-${p.id}`,
		slug: nieuw,
		status: "published",
		data: {
			title: p.titel.replace(/^Algemene Informatie$/, "Over de club").replace(/^Jeugdschaken$/, "Jeugdschaak").replace(/^Interne Competitie$/, "Competitie"),
			content: inhoud,
		},
	});
	voegRedirectToe(`/${p.slug}`, `/${nieuw}`);
}
// Nieuwe pagina's zonder WordPress-voorganger
for (const extra of clubdata.paginas) {
	if (!paginaEntries.some((p) => p.slug === extra.slug)) paginaEntries.push(extra);
	else Object.assign(paginaEntries.find((p) => p.slug === extra.slug).data, extra.data);
}

const berichten = wp.inhoud
	.filter((i) => i.type === "post" && !/^test(-\d+)?$/.test(i.slug))
	.sort((a, b) => a.datum.localeCompare(b.datum));
const slugsGezien = new Set();
const berichtEntries = [];
let metPartij = 0;
for (const b of berichten) {
	let slug = b.slug || `bericht-${b.id}`;
	while (slugsGezien.has(slug)) slug += "-2";
	slugsGezien.add(slug);
	const inhoud = naarPortableText(b);
	if (inhoud.some((x) => x._type === "partij")) metPartij++;
	const samenvatting = b.samenvatting?.trim() || platteTekst(inhoud);
	berichtEntries.push({
		id: `bericht-${b.id}`,
		slug,
		status: "published",
		publishedAt: datum(b.datum),
		createdAt: datum(b.datum),
		data: {
			title: decodeer(b.titel).trim() || "(zonder titel)",
			excerpt: samenvatting,
			content: inhoud,
		},
		bylines: byline(b.auteur),
		taxonomies: { category: [rubriek(b.titel, samenvatting)] },
	});
}

// Doorverwijzingen: /content/<slug> wordt in de code afgehandeld (zie src/middleware).
// Drupal-adressen die niet meer als WordPress-slug bestaan, koppelen we op titel.
const opTitel = new Map(berichtEntries.map((e) => [e.data.title.toLowerCase(), e.slug]));
let drupalGekoppeld = 0;
for (const a of wp.drupal_adressen) {
	const slug = a.pad.replace(/^content\//, "");
	if (!a.pad.startsWith("content/") || berichtSlugs.has(slug)) continue;
	const doel = a.titel && opTitel.get(a.titel.toLowerCase());
	if (doel) {
		voegRedirectToe(`/${a.pad}`, `/nieuws/${doel}`);
		drupalGekoppeld++;
	}
}

const seed = {
	...schema,
	redirects: [...(schema.redirects ?? []), ...redirects],
	bylines: [...auteurs.values()],
	content: {
		pages: paginaEntries,
		posts: berichtEntries,
		agenda: clubdata.agenda(wp.tabellen["27"]),
		teams: clubdata.teams,
		sponsors: clubdata.sponsors,
		eregalerij: clubdata.eregalerij(wp.tabellen["1"]),
		ereleden: clubdata.ereleden(wp.tabellen["10"]),
	},
};
writeFileSync(uitvoer, JSON.stringify(seed));
console.log(
	`${berichtEntries.length} berichten (${metPartij} met partijen), ${paginaEntries.length} pagina's, ` +
		`${seed.content.agenda.length} agenda-items, ${redirects.length} doorverwijzingen ` +
		`(${drupalGekoppeld} van Drupal), ${auteurs.size} auteurs -> ${uitvoer}`,
);
