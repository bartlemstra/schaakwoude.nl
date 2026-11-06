import type { PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

/**
 * Voegt het blok "Partij" toe aan de editor: plak een PGN (uit ChessBase, Lichess,
 * Chesslytix of een notatiebiljet) en de site toont een bord om na te spelen.
 * Met alleen een FEN wordt het een stelling, bijvoorbeeld voor een puzzel.
 */
export function schaakpartijPlugin(): PluginDescriptor {
	return {
		id: "schaakpartij",
		version: "0.1.0",
		entrypoint: "@schaakwoude/schaakpartij",
		componentsEntry: "@schaakwoude/schaakpartij/astro",
		options: {},
	};
}

export function createPlugin(): ResolvedPlugin {
	return definePlugin({
		id: "schaakpartij",
		version: "0.1.0",
		capabilities: [],
		admin: {
			portableTextBlocks: [
				{
					type: "partij",
					label: "Schaakpartij",
					icon: "code",
					description: "Partij om na te spelen (PGN) of een stelling (FEN)",
					fields: [
						{
							type: "text_input",
							action_id: "pgn",
							label: "PGN of FEN",
							placeholder: '[White "..."]\n[Black "..."]\n\n1. e4 e5 2. Nf3 ...',
							multiline: true,
						},
						{ type: "text_input", action_id: "titel", label: "Titel (laat leeg voor wit – zwart)" },
						{
							type: "select",
							action_id: "modus",
							label: "Weergave",
							options: [
								{ label: "Partij naspelen", value: "partij" },
								{ label: "Puzzel: zetten eerst verborgen", value: "puzzel" },
							],
						},
						{ type: "toggle", action_id: "zwart_onder", label: "Bord vanuit zwart bekijken" },
					],
				},
			],
		},
	});
}

export default createPlugin;
