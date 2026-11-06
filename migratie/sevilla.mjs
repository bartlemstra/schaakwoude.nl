// Zet de Sevilla-exports van de oude site (/ftp) over.
//
//   node migratie/sevilla.mjs <uitgepakte ftp-map>
//
// - Kopieert de HTML en CSS naar public/ftp/, zodat oude links blijven werken.
//   De .sev-bestanden (Sevilla-databases) gaan niet mee: die horen niet openbaar.
// - Schrijft src/data/standen.json met de actuele stand van de lopende competities,
//   voor de pagina /standen.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const bron = process.argv[2];
if (!bron || !existsSync(bron)) {
	console.error("Gebruik: node migratie/sevilla.mjs <ftp-map>");
	process.exit(1);
}
const doel = "public/ftp";
rmSync(doel, { recursive: true, force: true });
mkdirSync(doel, { recursive: true });

const lees = (p) => readFileSync(p, "utf8").replace(/^﻿/, "");
const tekst = (h) =>
	h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&minus;/g, "−").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const mappen = [];
for (const naam of readdirSync(bron).sort()) {
	const map = join(bron, naam);
	if (!statSync(map).isDirectory()) continue;
	// Mappen met spaties zijn oude dubbelingen of leeg
	if (/\s/.test(naam)) continue;
	// Mappen die alleen in hoofdletters verschillen botsen op macOS en Windows:
	// alleen de kleine-letterversie houden (daar linken de oude berichten naar)
	if (naam !== naam.toLowerCase() && readdirSync(bron).includes(naam.toLowerCase())) continue;
	const bestanden = readdirSync(map).filter((f) => /\.(html|css)$/i.test(f));
	if (!bestanden.length || !bestanden.includes("index.html")) continue;
	mkdirSync(join(doel, naam), { recursive: true });
	for (const f of bestanden) {
		if (f.endsWith(".css")) {
			cpSync(join(map, f), join(doel, naam, f));
			continue;
		}
		// Links naar het .sev-bestand weghalen (dat bestand publiceren we niet)
		const html = lees(join(map, f)).replace(/<a href="[^"]+\.sev">([\s\S]*?)<\/a>/gi, "$1");
		writeFileSync(join(doel, naam, f), html);
	}
	const start = lees(join(map, "index.html")).match(/src="([^"]+\.html)"/i)?.[1];
	mappen.push({ map: naam, start });
}

// Actuele stand uit de laatste rondepagina
function stand({ map, start }) {
	if (!start) return null;
	const html = lees(join(doel, map, start));
	const tabel = html.match(/<table id="RankColumn"[\s\S]*?<\/table>/)?.[0];
	if (!tabel) return null;
	const ronde = tekst(tabel.match(/class="RankingTitle"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "");
	const kop = [...tabel.matchAll(/<td[^>]*class="(RC_\w+)"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => ({ id: m[1], label: tekst(m[2]) }));
	const rijen = [...tabel.matchAll(/<tr[^>]*class="Ranking(?:Odd|Even)Line"[^>]*>([\s\S]*?)<\/tr>/g)].map((r) =>
		[...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => tekst(c[1])),
	);
	const wil = ["RC_Pos", "RC_Name", "RC_Games", "RC_Wins", "RC_Draws", "RC_Losses", "RC_Score", "RC_Points", "RC_Rtg", "RC_TPR"];
	const idx = wil.map((w) => kop.findIndex((k) => k.id === w)).filter((i) => i >= 0);
	return {
		ronde,
		kolommen: idx.map((i) => kop[i].label),
		rijen: rijen.map((r) => idx.map((i) => r[i] ?? "")),
	};
}

// Naam en seizoen uit de mapnaam (de titels in Sevilla zijn vaak niet bijgewerkt)
const SOORTEN = [
	["Interne competitie", /^intern/],
	["Rapid", /^rapid/],
	["Snelschaak", /^snel/i],
	["Zomercompetitie", /^(simmer|zomer)/i],
	["Jeugd", /^jeugd/],
	["FK 2019", /^fk/],
];
// Mappen waarvan het seizoen niet uit de naam volgt
const SEIZOEN = { intern2025: "2025/26", intern2026: "2026/27", rapid2022: "2021/22", rapid2024: "2023/24", rapid2223: "2022/23", "zomer2021-2022": "2022" };
function beschrijf(map) {
	const soort = SOORTEN.find(([, re]) => re.test(map))?.[0] ?? map;
	let periode = SEIZOEN[map];
	let m;
	if (periode) {
	} else if ((m = map.match(/(\d{4})(\d{4})$/))) periode = `${m[1]}/${m[2].slice(2)}`;
	else if ((m = map.match(/^jeugd(\d{2})(voorjaar|najaar)$/))) periode = `${m[2]} 20${m[1]}`;
	else if ((m = map.match(/^jeugd(\d{4})$/))) periode = `voorjaar ${m[1]}`;
	else if ((m = map.match(/^fkgroep(\w)$/))) periode = `groep ${m[1].toUpperCase()}`;
	else if ((m = map.match(/(\d{4}|\d{2})$/))) periode = m[1].length === 2 ? `20${m[1]}` : m[1];
	const jaren = [...(periode ?? "").matchAll(/\d{2,4}/g)].map((x) => x[0]);
	let jaar = jaren.length ? Number(jaren.at(-1).length === 2 ? `20${jaren.at(-1)}` : jaren.at(-1)) : 2019;
	if (/najaar/.test(periode ?? "")) jaar += 0.5;
	return { soort, periode: periode ?? "", naam: `${soort} ${periode ?? ""}`.trim(), jaar };
}

const lijst = mappen.map((m) => ({ ...m, ...beschrijf(m.map) }));
const dubbel = new Set(lijst.map((m) => m.naam).filter((n, i, a) => a.indexOf(n) !== i));

// Lopende competities: de nieuwste map per soort
const actueel = SOORTEN.slice(0, 5)
	.map(([soort]) => {
		const m = lijst.filter((x) => x.soort === soort).sort((a, b) => b.jaar - a.jaar || b.map.localeCompare(a.map))[0];
		if (!m) return null;
		return { soort, naam: m.naam, url: `/ftp/${m.map}/`, stand: stand(m) };
	})
	.filter(Boolean);

const archief = lijst
	.sort((a, b) => b.jaar - a.jaar || SOORTEN.findIndex(([s]) => s === a.soort) - SOORTEN.findIndex(([s]) => s === b.soort) || a.map.localeCompare(b.map))
	.map((m) => ({ naam: dubbel.has(m.naam) ? `${m.naam} (${m.map})` : m.naam, soort: m.soort, seizoen: Math.floor(m.jaar), url: `/ftp/${m.map}/` }));

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/standen.json", JSON.stringify({ bijgewerkt: new Date().toISOString().slice(0, 10), actueel, archief }, null, "\t") + "\n");
console.log(`${mappen.length} competities naar ${doel}, ${actueel.length} actuele standen`);
