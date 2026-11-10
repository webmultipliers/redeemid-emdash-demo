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
// Levels, features, rules, the meter, the join link and protected folders are
// set in the admin (Plugins → RedeemID → Access), not here, so staff can
// change them without a deploy.
const redeemidConfig = {
	// Member preferences: customer fields defined in Shopify (Settings → Custom
	// data → Customers). Fields not defined there are left out.
	preferences: [{ key: "ledger.topics" }, { key: "ledger.newsletter" }],
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
			// REDEEMID_SHOPIFY_ADMIN_APP_CLIENT_SECRET (webhooks), REDEEMID_SHOPIFY_ADMIN_APP_CLIENT_ID
			// (staff tools and preferences),
			// REDEEMID_SHOPIFY_STOREFRONT_PRIVATE_TOKEN (Join page plans and checkout).
			authProviders: [redeemid(redeemidConfig)],
			// RedeemID in the admin (Members, Status) and its editor blocks: Paywall break, Plan.
			plugins: [redeemidPlugin(redeemidConfig)],
		}),
		redeemidGuard({ rateLimit: true }),
	],
	devToolbar: { enabled: false },
});
