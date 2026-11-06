import type { APIRoute } from "astro";
import { agendaItems } from "../lib/agenda";

/** De agenda als iCalendar-feed, om te abonneren in Google Agenda, Outlook of op de iPhone. */
const ics = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const tekst = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export const GET: APIRoute = async ({ site, url }) => {
	const basis = site ?? new URL(url.origin);
	const { entries } = await agendaItems();
	const stempel = ics(new Date());
	const regels = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Schaakwoude//Agenda//NL", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Schaakwoude", "X-WR-TIMEZONE:Europe/Amsterdam"];
	for (const a of entries) {
		const begin = new Date(a.data.begin);
		const eind = a.data.eind ? new Date(a.data.eind) : new Date(begin.getTime() + 3 * 3600_000);
		regels.push(
			"BEGIN:VEVENT",
			`UID:${a.data.id}@schaakwoude.nl`,
			`DTSTAMP:${stempel}`,
			a.data.hele_dag ? `DTSTART;VALUE=DATE:${ics(begin).slice(0, 8)}` : `DTSTART:${ics(begin)}`,
			...(a.data.hele_dag ? [] : [`DTEND:${ics(eind)}`]),
			`SUMMARY:${tekst(a.data.title)}`,
			...(a.data.locatie ? [`LOCATION:${tekst(a.data.locatie)}`] : []),
			...(a.data.omschrijving ? [`DESCRIPTION:${tekst(a.data.omschrijving)}`] : []),
			`URL:${new URL(a.data.link || `/agenda#${a.id}`, basis).href}`,
			"END:VEVENT",
		);
	}
	regels.push("END:VCALENDAR");
	return new Response(regels.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
