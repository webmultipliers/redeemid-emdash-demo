import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, passthroughImageService } from "astro/config";
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
		}),
	],
	devToolbar: { enabled: false },
});
