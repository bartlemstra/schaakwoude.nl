import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async ({ site, url }) => {
	const basis = site ?? new URL(url.origin);
	const instellingen = await getSiteSettings();
	const { entries } = await getEmDashCollection("posts", { orderBy: { published_at: "desc" }, limit: 20 });
	const items = entries
		.map((b) => {
			const link = new URL(`/nieuws/${b.id}`, basis).href;
			return `<item><title>${xml(b.data.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid>${
				b.data.publishedAt ? `<pubDate>${b.data.publishedAt.toUTCString()}</pubDate>` : ""
			}<description>${xml(b.data.excerpt ?? "")}</description></item>`;
		})
		.join("");
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(instellingen.title || "Schaakwoude")}</title><link>${basis.href}</link><description>${xml(instellingen.tagline || "")}</description><language>nl-nl</language>${items}</channel></rss>`,
		{ headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
	);
};
