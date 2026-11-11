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

/** Each section's colour, as on the WordPress demo: a dot before kickers. */
export const TONES: Record<string, string> = {
	investigations: "#7a1f2b",
	"city-hall": "#1d3f63",
	business: "#0d5c58",
	technology: "#3d3a7a",
	science: "#2f6440",
	culture: "#8a4b12",
	opinion: "#4a5160",
	briefings: "#102a3c",
	reports: "#102a3c",
	guides: "#00654c",
	corrections: "#5c6670",
};

/** The colour for an entry: its first section's, else its collection's. */
export function tone(collection: string, entry: Entry): string {
	const slug = entry.data.terms?.category?.[0]?.slug;
	return (slug && TONES[slug]) || TONES[collection] || "#102a3c";
}
