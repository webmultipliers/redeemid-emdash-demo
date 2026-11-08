import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, passthroughImageService } from "astro/config";
import { redeemid, redeemidGuard } from "@redeemid/emdash";
import emdash from "emdash/astro";

const emdashPreviewUrl = process.env.EMDASH_PREVIEW_URL
	? new URL(process.env.EMDASH_PREVIEW_URL)
	: undefined;
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
			authProviders: [
				// The store comes from the REDEEMID_SHOPIFY_STORE_DOMAIN secret.
				redeemid({
					levels: [
						{ slug: "silver", name: "Silver", tags: ["silver-member"] },
						{ slug: "gold", name: "Gold", tags: ["gold-member"] },
						{ slug: "premium", name: "Gold + Silver", tags: ["gold-member", "silver-member"], match: "all" },
					],
					rules: [
						// Stories: the Access term decides. Free stories have no rule.
						{ collection: "posts", taxonomy: "access", term: "members", levels: [] },
						{ collection: "posts", taxonomy: "access", term: "silver", levels: ["silver"] },
						{ collection: "posts", taxonomy: "access", term: "gold", levels: ["gold"] },
						{ collection: "posts", taxonomy: "access", term: "premium", levels: ["premium"] },
						// Briefings need any signed-in member.
						{ collection: "briefings", levels: [] },
						// Reports need Gold; the Harbor Money series and its Port budgets child need
						// Gold + Silver; Pensions has its own rule, Silver.
						{ collection: "reports", levels: ["gold"] },
						{ collection: "reports", taxonomy: "series", term: "harbor-money", levels: ["premium"] },
						{ collection: "reports", taxonomy: "series", term: "port-budgets", levels: ["premium"] },
						{ collection: "reports", taxonomy: "series", term: "pensions", levels: ["silver"] },
						// City guides are open, except Fennel Hill (Silver).
						{ collection: "guides", taxonomy: "neighborhood", term: "fennel-hill", levels: ["silver"] },
						// Corrections are always free: no rule.
					],
				}),
			],
		}),
		redeemidGuard(),
	],
	devToolbar: { enabled: false },
});
