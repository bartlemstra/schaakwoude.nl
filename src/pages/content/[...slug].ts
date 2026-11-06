import type { APIRoute } from "astro";

/** Oude WordPress- en Drupal-adressen (/content/<slug>) naar het nieuws. */
export const GET: APIRoute = ({ params, redirect }) => {
	const slug = (params.slug ?? "").replace(/\/$/, "");
	return redirect(slug ? `/nieuws/${slug}` : "/nieuws", 301);
};
