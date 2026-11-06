/**
 * Maakt van elk [data-partij]-blok een bord om na te spelen. Draait in de browser,
 * zodat de server geen PGN hoeft te verwerken.
 */
import { Chess } from "chess.js";

const GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const FIGUUR: Record<string, string> = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘" };
const BESTANDEN = "abcdefgh";
const FEN_ALLEEN = /^\s*([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+(\s+[wb]\s+\S+\s+\S+(\s+\d+\s+\d+)?)?\s*$/;

interface Stand {
	fen: string;
	van?: string;
	naar?: string;
}

function parse(pgn: string) {
	const spel = new Chess();
	if (FEN_ALLEEN.test(pgn)) {
		const fen = pgn.trim().split(/\s+/).length === 1 ? `${pgn.trim()} w - - 0 1` : pgn.trim();
		spel.load(fen, { skipValidation: true });
		return { standen: [{ fen: spel.fen() }] as Stand[], zetten: [] as string[], commentaren: new Map<number, string>() };
	}
	spel.loadPgn(pgn, { strict: false });
	const zetten = spel.history({ verbose: true });
	const commentaren = new Map<number, string>();
	for (const { fen, comment } of spel.getComments()) {
		const i = zetten.findIndex((z) => z.after === fen);
		if (i >= 0) commentaren.set(i + 1, comment);
	}
	const standen: Stand[] = [{ fen: zetten[0]?.before ?? spel.fen() }];
	for (const z of zetten) standen.push({ fen: z.after, van: z.from, naar: z.to });
	return { standen, zetten: zetten.map((z) => z.san), commentaren };
}

function maakBord(el: HTMLElement) {
	const pgn = el.dataset.pgn ?? "";
	const bord = el.querySelector<HTMLElement>(".partij__bord")!;
	const lijst = el.querySelector<HTMLElement>(".partij__zetten")!;
	let data: ReturnType<typeof parse>;
	try {
		data = parse(pgn);
	} catch {
		el.querySelector(".partij__knoppen")?.remove();
		bord.remove();
		lijst.innerHTML = `<p class="partij__melding">Deze partij kon niet worden ingelezen. De notatie:</p><pre></pre>`;
		lijst.querySelector("pre")!.textContent = pgn;
		return;
	}
	const { standen, zetten, commentaren } = data;
	let ply = 0;
	let gedraaid = el.dataset.zwartOnder === "1";
	const puzzel = el.dataset.modus === "puzzel";

	if (!zetten.length) el.querySelector(".partij__knoppen")?.remove();

	const zetHtml = zetten
		.map((san, i) => {
			const nr = i % 2 === 0 ? `<span class="nr">${i / 2 + 1}.</span>` : "";
			const tekst = san.replace(/[KQRBN]/g, (c) => `<span class="fig">${FIGUUR[c]}︎</span>`);
			const opm = commentaren.get(i + 1);
			return `${nr}<button type="button" data-ply="${i + 1}">${tekst}</button>${opm ? ` <span class="commentaar">${opm.replace(/</g, "&lt;")}</span>` : ""} `;
		})
		.join("");
	if (puzzel && zetten.length) {
		lijst.innerHTML = `<button type="button" class="knop knop--klein" data-act="toon">Toon de oplossing</button>`;
	} else {
		lijst.innerHTML = zetHtml;
	}

	function teken() {
		const stand = standen[ply]!;
		const rijen = stand.fen.split(" ")[0]!.split("/");
		const velden: { r: number; f: number; s: string | null }[] = [];
		rijen.forEach((rij, r) => {
			let f = 0;
			for (const ch of rij) {
				if (/\d/.test(ch)) for (let k = 0; k < Number(ch); k++) velden.push({ r, f: f++, s: null });
				else velden.push({ r, f: f++, s: ch });
			}
		});
		const volgorde = gedraaid ? velden.slice().reverse() : velden;
		bord.innerHTML = volgorde
			.map(({ r, f, s }) => {
				const naam = BESTANDEN[f]! + (8 - r);
				let binnen = s ? `<span class="stuk ${s === s.toUpperCase() ? "w" : "b"}">${GLYPH[s.toLowerCase()]}︎</span>` : "";
				if (gedraaid ? r === 0 : r === 7) binnen += `<span class="coord f">${BESTANDEN[f]}</span>`;
				if (gedraaid ? f === 7 : f === 0) binnen += `<span class="coord r">${8 - r}</span>`;
				const hl = naam === stand.van || naam === stand.naar ? " hl" : "";
				return `<div class="veld${(r + f) % 2 ? " d" : ""}${hl}">${binnen}</div>`;
			})
			.join("");
		lijst.querySelectorAll<HTMLButtonElement>("button[data-ply]").forEach((b) => {
			const aan = Number(b.dataset.ply) === ply;
			b.classList.toggle("aan", aan);
			if (aan) b.setAttribute("aria-current", "step");
			else b.removeAttribute("aria-current");
		});
		const huidig = lijst.querySelector<HTMLElement>("button.aan");
		if (huidig) {
			const top = huidig.offsetTop - lijst.offsetTop;
			if (top < lijst.scrollTop || top > lijst.scrollTop + lijst.clientHeight - 30) lijst.scrollTop = top - 60;
		}
	}
	const ga = (n: number) => {
		ply = Math.max(0, Math.min(zetten.length, n));
		teken();
	};

	el.addEventListener("click", async (e) => {
		const knop = (e.target as HTMLElement).closest("button");
		if (!knop) return;
		if (knop.dataset.ply) ga(Number(knop.dataset.ply));
		switch (knop.dataset.act) {
			case "start": return ga(0);
			case "prev": return ga(ply - 1);
			case "next": return ga(ply + 1);
			case "end": return ga(zetten.length);
			case "flip": gedraaid = !gedraaid; return teken();
			case "toon": lijst.innerHTML = zetHtml; return teken();
			case "kopieer":
				try {
					await navigator.clipboard.writeText(pgn);
					knop.textContent = "Gekopieerd";
				} catch {
					knop.textContent = "Kopiëren lukte niet";
				}
				return;
			case "download": {
				const url = URL.createObjectURL(new Blob([pgn], { type: "application/x-chess-pgn" }));
				const a = Object.assign(document.createElement("a"), { href: url, download: "partij.pgn" });
				a.click();
				URL.revokeObjectURL(url);
			}
		}
	});
	el.tabIndex = 0;
	el.addEventListener("keydown", (e) => {
		if (e.key === "ArrowRight") ga(ply + 1);
		else if (e.key === "ArrowLeft") ga(ply - 1);
		else if (e.key === "Home") ga(0);
		else if (e.key === "End") ga(zetten.length);
		else return;
		e.preventDefault();
	});
	teken();
}

for (const el of document.querySelectorAll<HTMLElement>("[data-partij]")) maakBord(el);
