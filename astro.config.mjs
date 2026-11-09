import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, passthroughImageService } from "astro/config";
import { redeemid, redeemidGuard, redeemidPlugin } from "@redeemid/emdash";
import emdash from "emdash/astro";

const emdashPreviewUrl = process.env.EMDASH_PREVIEW_URL
	? new URL(process.env.EMDASH_PREVIEW_URL)
	: undefined;
// The store comes from the REDEEMID_SHOPIFY_STORE_DOMAIN secret.
const redeemidConfig = {
	levels: [
		{
			slug: "silver",
			name: "Silver",
			tags: ["silver-member"],
			wall: "This is a Silver story. Silver members read our culture desk, features and neighborhood guides.",
		},
		{
			slug: "gold",
			name: "Gold",
			tags: ["gold-member"],
			wall: "This is a Gold story. Gold members read every investigation and Ledger Report in full.",
		},
		{
			slug: "premium",
			name: "Gold + Silver",
			tags: ["gold-member", "silver-member"],
			match: "all",
			wall: "This story is for members with both Gold and Silver: everything the Ledger publishes.",
		},
	],
	// Features, as on the WordPress demo. The member card lists them; Support thanks supporters.
	features: [
		{ slug: "ad-free", name: "Ad-free reading", levels: ["gold"], tags: ["ad-free-addon"] },
		{ slug: "early-briefing", name: "Early briefing", levels: ["silver", "gold"] },
		{ slug: "supporter", name: "Supporter", tags: ["supporter"] },
	],
	// The wall's join link.
	join: { href: "/join/", label: "Become a member" },
	// Signed-in readers without access open 2 locked stories a month free.
	meter: { limit: 2, period: "month" },
	// Content rules, as on the WordPress demo. A story's own Paywall break can
	// pick its levels; a break with none picked follows these rules.
	rules: [
		// Sections: Investigations needs Gold, Culture needs Silver. A story in
		// both needs both (rules combine most restrictive).
		{ collection: "posts", taxonomy: "category", term: "investigations", levels: ["gold"] },
		{ collection: "posts", taxonomy: "category", term: "culture", levels: ["silver"] },
		// "Free to read" opens a story whatever its section says.
		{ collection: "posts", taxonomy: "tag", term: "free-to-read", levels: [], open: true },
		// Briefings need any signed-in member; the Weekend edition is open.
		{ collection: "briefings", levels: ["signed-in"] },
		{ collection: "briefings", taxonomy: "edition", term: "weekend", levels: [], open: true },
		// Reports need Gold. The Harbor Money series needs Gold + Silver, and its
		// Port budgets child inherits that; Pensions has its own rule, Silver.
		{ collection: "reports", levels: ["gold"] },
		{ collection: "reports", taxonomy: "series", term: "harbor-money", levels: ["premium"] },
		{ collection: "reports", taxonomy: "series", term: "pensions", levels: ["silver"] },
		// City guides are open, except Fennel Hill (Silver).
		{ collection: "guides", taxonomy: "neighborhood", term: "fennel-hill", levels: ["silver"] },
		// Elections 2026 coverage needs a signed-in reader, in every collection
		// but Corrections, which are always free.
		...["posts", "briefings", "reports", "guides"].map((collection) => ({
			collection,
			taxonomy: "topic",
			term: "elections-2026",
			levels: ["signed-in"],
		})),
	],
};

export default defineConfig({
	vite: {
		server: emdashPreviewUrl
			? {
				hmr: {
					protocol: emdashPreviewUrl.protocol === "https:" ? "wss" : "ws",
					host: emdashPreviewUrl.hostname,
					clientPort: Number(
						emdashPreviewUrl.port || (emdashPreviewUrl.protocol === "https:" ? 443 : 80),
					),
				},
			}
			: undefined, ssr: { optimizeDeps: { noDiscovery: true, ignoreOutdatedRequests: true, exclude: ["astro/app/manifest"], include: ["emdash > zod"] } } },
	output: "server",
	adapter: cloudflare(),
	image: {
		// The Cloudflare image binding can terminate local streamed HTML midway
		// through an <Image> render. Generated sites still use EmDash's Image
		// component; local previews serve its resolved media URL without an
		// additional Astro transform.
		service: passthroughImageService(),
		layout: "constrained",
		responsiveStyles: true,
	},
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		// EmDash's admin uses React. Public pages must remain Astro-only.
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			// The builder chooses the site's EmDash version; its owner cannot act on an update notice.
			updateCheck: false,
			// RedeemID: sign in with the store's customer account; access from Shopify tags.
			// Secrets: REDEEMID_SHOPIFY_STORE_DOMAIN, REDEEMID_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
			// REDEEMID_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET (confidential clients only),
			// REDEEMID_SHOPIFY_ADMIN_APP_CLIENT_SECRET (webhooks),
			// REDEEMID_SHOPIFY_STOREFRONT_PRIVATE_TOKEN (Join page plans and checkout).
			authProviders: [redeemid(redeemidConfig)],
			// RedeemID in the admin (Members, Status) and its editor blocks: Paywall break, Plan.
			plugins: [redeemidPlugin(redeemidConfig)],
		}),
		redeemidGuard(),
	],
	devToolbar: { enabled: false },
});
