import { getEmDashCollection } from "emdash";

/** Alle agenda-items, oudste eerst. Een seizoen telt zo'n honderd items. */
export async function agendaItems() {
	const res = await getEmDashCollection("agenda", { orderBy: { begin: "desc" }, limit: 300 });
	return { ...res, entries: res.entries.slice().reverse() };
}

export const SOORT_LABEL: Record<string, string> = {
	Clubavond: "Clubavond",
	"Interne competitie": "Intern",
	Jeugd: "Jeugd",
	KNSB: "KNSB",
	FSB: "FSB",
	Toernooi: "Toernooi",
	Club: "Club",
	Vergadering: "Vergadering",
	Vakantie: "Vrij",
};
