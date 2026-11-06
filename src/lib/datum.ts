/** Datums altijd in Nederlandse tijd tonen, ook als de server in UTC draait. */
const TZ = "Europe/Amsterdam";
const fmt = (opties: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, ...opties });

const lang = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const kort = fmt({ day: "numeric", month: "short", year: "numeric" });
const dagMaand = fmt({ day: "numeric", month: "long" });
const tijd = fmt({ hour: "2-digit", minute: "2-digit" });
const delen = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const d = (x: Date | string) => (typeof x === "string" ? new Date(x) : x);

export const datumLang = (x: Date | string) => lang.format(d(x));
export const datumKort = (x: Date | string) => kort.format(d(x));
export const datumDagMaand = (x: Date | string) => dagMaand.format(d(x));
export const tijdstip = (x: Date | string) => tijd.format(d(x)).replace(":", ".");

/** Losse onderdelen voor een datumblokje: { dag: "do", nummer: "12", maand: "nov", jaar: "2026" } */
export function datumDelen(x: Date | string) {
	const p = Object.fromEntries(delen.formatToParts(d(x)).map((q) => [q.type, q.value]));
	return { dag: p.weekday.replace(".", ""), nummer: p.day, maand: p.month.replace(".", ""), jaar: p.year };
}

/** Sleutel per maand voor groeperen, bv. "2026-11". */
export function maandSleutel(x: Date | string) {
	const p = Object.fromEntries(fmt({ year: "numeric", month: "2-digit" }).formatToParts(d(x)).map((q) => [q.type, q.value]));
	return `${p.year}-${p.month}`;
}
export const maandNaam = (sleutel: string) =>
	fmt({ month: "long", year: "numeric" }).format(new Date(`${sleutel}-15T12:00:00Z`));

/** Seizoen van een datum: augustus t/m juli. */
export function seizoen(x: Date | string) {
	const jaar = Number(fmt({ year: "numeric" }).format(d(x)));
	const maand = Number(fmt({ month: "numeric" }).format(d(x)));
	return maand >= 8 ? `${jaar}/${jaar + 1}` : `${jaar - 1}/${jaar}`;
}
