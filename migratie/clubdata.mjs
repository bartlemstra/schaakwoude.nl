// Clubgegevens die niet (goed) uit de WordPress-database te halen zijn, of die in
// de nieuwe site een eigen collectie krijgen. Alles hier is ook nu al openbaar op
// schaakwoude.nl. Na de livegang beheert de club dit in het CMS, niet hier.

let n = 0;
const k = () => `c${(++n).toString(36)}`;
const span = (text, marks = []) => ({ _type: "span", _key: k(), text, marks });
export const alinea = (...delen) => ({
	_type: "block",
	_key: k(),
	style: "normal",
	markDefs: [],
	children: delen.map((d) => (typeof d === "string" ? span(d) : span(d.text, d.marks))),
});
export const kop = (text, style = "h2") => ({ _type: "block", _key: k(), style, markDefs: [], children: [span(text)] });
const punt = (text) => ({ ...alinea(text), listItem: "bullet", level: 1 });
const vet = (text) => ({ text, marks: ["strong"] });

// ---------- teams (seizoen 2026/2027) ----------
const team = (slug, title, bond, klasse, teamleider, spelers, netstand_url, volgorde) => ({
	id: `team-${slug}`,
	slug,
	status: "published",
	data: { title, bond, klasse, teamleider, spelers: spelers.map((naam) => ({ naam })), netstand_url, volgorde },
});
const teams = [
	team("knsb-1", "Schaakwoude 1", "KNSB", "", "Ronald van der Veen",
		["Sven Broersma", "Hendrik Heikamp", "Albert Jan Hummel", "Bart Lemstra", "Teun Meindersma", "Gert Jan Rauw", "Ronald van der Veen", "Mathijs Visser"],
		"https://knsb.netstand.nl/divisions/view/662", 1),
	team("knsb-2", "Schaakwoude 2", "KNSB", "", "Gerben van der Heide",
		["Cees Banning", "Henk Broersma", "Gerben van der Heide", "Henk van der Heide", "Christiaan Houpst", "Sebastiaan Houpst", "Theo Meindersma", "Pieter Postma", "Jan Torensma", "Jan Sybren Zagema"],
		"https://knsb.netstand.nl/divisions/view/677", 2),
	team("fsb-1", "Schaakwoude I", "FSB", "", "", ["Gerben van der Heide", "Gerke Ros", "Jan Torensma", "Ronald van der Veen"], "https://fsb.netstand.nl", 3),
	team("fsb-2", "Schaakwoude II", "FSB", "", "", ["Evert Drijver", "Henk van der Heide", "Christiaan Houpst", "Menno Veenstra"], "https://fsb.netstand.nl", 4),
	team("fsb-3", "Schaakwoude III", "FSB", "", "", ["Kees Appel", "Fokke de Haan", "Auke Postma", "Hessel Sijbersma", "Sander Visser"], "https://fsb.netstand.nl", 5),
];

// ---------- sponsors ----------
const WP = "https://www.schaakwoude.nl/wp-content/uploads/";
const SPONSORS = [
	["Dijkstra", "https://bgdd.nl/", "2024/04/dijkstra-1.png", "Hoofdsponsor"],
	["Primera van der Weg", "https://www.facebook.com/Primera-van-der-Weg-1682116072013175/", "2021/10/primera.png"],
	["Schaafsma Rijwielen", "http://www.mschaafsma.nl/", "2024/01/2024.01.25-schaafsma-rijwielen-advertentie-logo.jpg"],
	["Van der Hoop", "", "2021/07/vanderhoop.png"],
	["Autobedrijf Boersma", "https://www.autobedrijfboersma.nl/", "2021/07/12.adv_.-autobedr.-boersma-1.png"],
	["Slagerij Jitta de Haan", "https://www.facebook.com/slagerijjittadehaan/", "2023/06/jittadehaan.png"],
	["Rentmeester AJDG", "https://www.ajdg.net/", "2024/10/2024.10.09-schaakwoude-Rentmeester-Advertentie-advertentie.jpg"],
	["Adema Architecten", "https://www.adema-architecten.nl/", "2024/05/logoaa.png"],
	["Rosier Administraties", "https://www.rosieradministraties.nl/", "2021/07/14.adv_.-rosier-1-e1626087245154.png"],
	["Adema Damwoude", "https://www.adema-damwoude.nl/", "2021/07/bertadema.jpg"],
	["Handelsonderneming Schaafsma", "https://www.handelsondernemingschaafsma.nl/", "2024/03/schaafsma.png"],
	["Max Voordeelshop", "https://www.facebook.com/damwaldmaxx/", "2024/11/2024.11.09-schaakwoude-max-voordeelshop-logo.jpg"],
	["De Zwart", "https://www.dezwartonline.nl/", "2021/07/dezwart-1-e1626887355906.png"],
	["Auto en Motor Totaal", "https://autoenmotortotaal.nl/", "2024/04/autoenmotor.jpeg"],
	["Jilderda Bloemen", "https://www.jilderdabloemen.nl/", "2020/10/jilderda-1.png"],
	["Koninklijke Damstra", "https://damstra.nl/", "2024/06/2024.05.29-schaakwoude-koninklijke-damstra-instatatiegroep-advertentie.png"],
	["De Jong Damwoude", "", "2021/07/adv.-De-Jong-1.png"],
	["De Fakman Wygersmits", "https://www.facebook.com/defakmanwygersmits", "2025/10/Bord-111x745cm_2-2_1759455680414_page-0001.jpg"],
	["Hekstra", "https://www.hekstra.nl/", "2021/11/Hekstra_bies_logo-scaled.jpg"],
	["Allprint", "https://www.allprint.nl/", "2021/07/adv.-Allprint-1-e1626868679890.png"],
];
const sponsors = SPONSORS.map(([title, website, logo, niveau = "Sponsor"], i) => ({
	id: `sponsor-${i + 1}`,
	slug: title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
	status: "published",
	data: {
		title,
		website: website || undefined,
		niveau,
		volgorde: i + 1,
		logo: { $media: { url: WP + logo, alt: `Logo ${title}`, filename: logo.split("/").pop() } },
	},
}));

// ---------- agenda ----------
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const tijdstip = (jaar, maand, dag, tijd) => {
	const d = `${jaar}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
	// Nederland: zomertijd (UTC+2) van eind maart tot eind oktober
	const zomer = maand > 3 && maand < 10 || (maand === 3 && dag >= 29) || (maand === 10 && dag < 25);
	return `${d}T${tijd}:00${zomer ? "+02:00" : "+01:00"}`;
};
const SPEELZAAL = "IJsclub De Wâlden, Damwâld";

function agenda(tabel) {
	const items = [];
	const voeg = (id, title, begin, soort, extra = {}) =>
		items.push({ id, slug: id, status: "published", data: { title, begin, soort, ...extra } });

	for (const [dag, maandNaam, jaar, extern, senioren, jeugd] of tabel?.rijen ?? []) {
		const maand = MAANDEN.indexOf(maandNaam.trim().toLowerCase()) + 1;
		if (!maand || !dag.trim()) continue;
		const id = `${jaar}-${maand}-${dag}`.replace(/\s/g, "");
		const e = extern.trim();
		if (e === "KNSB") voeg(`knsb-${id}`, "KNSB-competitie", tijdstip(jaar, maand, dag, "13:00"), "KNSB", { locatie: "Zie het teamschema" });
		else if (e === "ALV") voeg(`alv-${id}`, "Algemene ledenvergadering", tijdstip(jaar, maand, dag, "20:00"), "Vergadering", { locatie: SPEELZAAL });
		else if (/vakantie|donderdag|hemelvaart/i.test(e)) voeg(`vrij-${id}`, `${e[0].toUpperCase()}${e.slice(1)}: geen clubavond`, tijdstip(jaar, maand, dag, "19:45"), "Vakantie", { hele_dag: true });
		else if (e.startsWith("BBQ")) voeg(`bbq-${id}`, "Clubbarbecue (onder voorbehoud)", tijdstip(jaar, maand, dag, "18:00"), "Club", {});
		const s = senioren.replace(/<[^>]+>/g, "").trim();
		if (/^\d+$/.test(s)) voeg(`intern-${id}`, `Interne competitie, ronde ${s}`, tijdstip(jaar, maand, dag, "19:45"), "Interne competitie", { locatie: SPEELZAAL });
		else if (/^R\d$/.test(s)) voeg(`rapid-${id}`, `Rapidcompetitie, avond ${s.slice(1)}`, tijdstip(jaar, maand, dag, "19:45"), "Interne competitie", { locatie: SPEELZAAL });
		else if (/^Z ?\d$/.test(s)) voeg(`zomer-${id}`, `Zomercompetitie, avond ${s.slice(-1)}`, tijdstip(jaar, maand, dag, "19:45"), "Interne competitie", { locatie: SPEELZAAL });
		else if (s === "S") voeg(`snel-${id}`, "Snelschaakcompetitie", tijdstip(jaar, maand, dag, "19:45"), "Interne competitie", { locatie: SPEELZAAL });
		else if (s === "Inhaalronde") voeg(`inhaal-${id}`, "Inhaalronde", tijdstip(jaar, maand, dag, "19:45"), "Interne competitie", { locatie: SPEELZAAL });
		else if (s === "P") voeg(`prijs-${id}`, "Prijsuitreiking", tijdstip(jaar, maand, dag, "19:45"), "Club", { locatie: SPEELZAAL });
		const j = jeugd.replace(/<[^>]+>/g, "").trim();
		if (/^\d+$/.test(j)) voeg(`jeugd-${id}`, `Jeugdcompetitie, ronde ${j}`, tijdstip(jaar, maand, dag, "18:45"), "Jeugd", { locatie: SPEELZAAL });
	}

	// Seizoen 2026/2027: de kalender is nog niet aangeleverd. Wel bekend:
	voeg("simultaan-sipke-ernst-2026", "Simultaan tegen grootmeester Sipke Ernst", tijdstip(2026, 11, 7, "13:00"), "Toernooi", {
		locatie: "Winkelcentrum Damwâld",
		uitgelicht: true,
		omschrijving: "Erelid en grootmeester Sipke Ernst speelt simultaan. Iedereen die kan schaken mag aanschuiven, van beginner tot ervaren speler. Deelname is gratis.",
		link: "/nieuws/aanstaande-za-1300-simultaan-in-winkelcentrum",
	});
	for (const dag of [12, 19, 26]) voeg(`clubavond-2026-11-${dag}`, "Clubavond", tijdstip(2026, 11, dag, "18:45"), "Clubavond", { locatie: SPEELZAAL, omschrijving: "Jeugd van 18.45 tot 19.45 uur, daarna de senioren." });
	for (const dag of [3, 10, 17]) voeg(`clubavond-2026-12-${dag}`, "Clubavond", tijdstip(2026, 12, dag, "18:45"), "Clubavond", { locatie: SPEELZAAL, omschrijving: "Jeugd van 18.45 tot 19.45 uur, daarna de senioren." });
	return items;
}

// ---------- eregalerij ----------
function eregalerij(tabel) {
	const [, ...rijen] = tabel?.rijen ?? [];
	return rijen
		.filter((r) => r.slice(1).some((c) => c.trim()))
		.map(([seizoen, i1, i2, i3, rapid, snel, zomer, jeugd]) => ({
			id: `seizoen-${seizoen.replace("/", "-")}`,
			slug: seizoen.replace("/", "-"),
			status: "published",
			data: Object.fromEntries(
				Object.entries({ title: seizoen, intern_1: i1, intern_2: i2, intern_3: i3, rapid, snelschaak: snel, zomer, jeugd })
					.map(([k2, v]) => [k2, v.trim()])
					.filter(([, v]) => v && v !== "-"),
			),
		}));
}
function ereleden(tabel) {
	const [, ...rijen] = tabel?.rijen ?? [];
	return rijen.map(([jaar, titel, voornaam, achternaam], i) => ({
		id: `erelid-${i + 1}`,
		slug: `${voornaam} ${achternaam}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
		status: "published",
		data: { title: `${voornaam} ${achternaam}`, eretitel: titel, sinds: Number(jaar) },
	}));
}

// ---------- pagina's ----------
const pagina = (slug, title, content, extra = {}) => ({ id: `pagina-${slug}`, slug, status: "published", data: { title, content, ...extra } });

const paginas = [
	pagina("lid-worden", "Lid worden", [
		alinea("Kom gerust eerst een paar donderdagavonden meespelen. Je hoeft niets mee te nemen: borden, stukken en klokken zijn er. Bevalt het, dan meld je je aan bij de secretaris."),
		kop("Wanneer en waar"),
		punt("Jeugd (6 tot 16 jaar): donderdag van 18.45 tot 19.45 uur, met les volgens de Stappenmethode."),
		punt("Senioren: donderdag vanaf 19.45 uur, interne competitie en rapid- en snelschaakavonden."),
		punt("Gebouw ijsclub De Wâlden, Wyger Martensstrjitte 4, 9104 JM Damwâld."),
		kop("Contributie"),
		alinea(vet("[In te vullen door de penningmeester]"), " Bedragen per seizoen voor senioren, jeugd en donateurs. Leden die extern spelen staan ingeschreven bij de KNSB."),
		kop("Aanmelden"),
		alinea("Spreek iemand aan op de clubavond of mail de secretaris (", vet("[e-mailadres secretaris]"), "). Na je aanmelding schrijft de secretaris je in bij de KNSB."),
	], { intro: "Iedereen die kan schaken, of het wil leren, is welkom bij Schaakwoude." }),
];

export const clubdata = { teams, sponsors, agenda, eregalerij, ereleden, paginas };
