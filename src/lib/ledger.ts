/** Shared helpers for the Ledger's pages: links, kickers and dates. */

/** The sections in the nav, in order. */
export const SECTIONS = [
	{ slug: "investigations", label: "Investigations" },
	{ slug: "city-hall", label: "City Hall" },
	{ slug: "business", label: "Business" },
	{ slug: "technology", label: "Technology" },
	{ slug: "science", label: "Science" },
	{ slug: "culture", label: "Culture" },
	{ slug: "opinion", label: "Opinion" },
] as const;

/** URL path for each collection's entries. */
export const PATHS: Record<string, string> = {
	posts: "stories",
	briefings: "briefings",
	reports: "reports",
	guides: "guides",
	corrections: "corrections",
};

/** Names for each collection, for kickers and headings. */
export const NAMES: Record<string, string> = {
	posts: "The Ledger",
	briefings: "Briefing",
	reports: "Ledger Report",
	guides: "City guide",
	corrections: "Correction",
};

/** Newest first: what every list uses. */
export const NEWEST = { orderBy: { published_at: "desc" } } as const;

type Term = { slug?: string; label?: string; name?: string };
type Entry = { id: string; data: Record<string, any> };

export function href(collection: string, entry: Entry): string {
	return `/${PATHS[collection] ?? collection}/${entry.id}/`;
}

/** The taxonomy that names an entry's kicker in each collection. */
const KICKER: Record<string, { taxonomy: string; base: string }> = {
	posts: { taxonomy: "category", base: "/category/" },
	briefings: { taxonomy: "edition", base: "" },
	guides: { taxonomy: "neighborhood", base: "" },
	reports: { taxonomy: "series", base: "/series/" },
};

/**
 * The kicker over an entry: its first category (or edition, neighborhood,
 * series), linked to its archive where there is one. A term's display name
 * is its `label`; `name` is the taxonomy's name.
 */
export function kicker(collection: string, entry: Entry): { label: string; href?: string } {
	const k = KICKER[collection];
	const term: Term | undefined = k ? entry.data.terms?.[k.taxonomy]?.[0] : undefined;
	if (term?.label) return { label: term.label, href: k!.base && term.slug ? `${k!.base}${term.slug}/` : undefined };
	return { label: NAMES[collection] ?? "The Ledger" };
}

/** Every term label on an entry for one taxonomy, joined. */
export function termLabels(entry: Entry, taxonomy: string): string {
	return (entry.data.terms?.[taxonomy] ?? []).map((t: Term) => t.label).filter(Boolean).join(", ");
}

const DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "November 10, 2026", or "" when the entry has no publish date. */
export function published(entry: Entry): string {
	const raw = entry.data.publishedAt ?? entry.data.createdAt;
	if (!raw) return "";
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? "" : DATE.format(date);
}

export function isoDate(entry: Entry): string | undefined {
	const raw = entry.data.publishedAt ?? entry.data.createdAt;
	return raw ? new Date(raw).toISOString() : undefined;
}
