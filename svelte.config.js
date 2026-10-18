// From Coachboard, svelte.config.js at commit 4ceafd4 (15 October 2026), unchanged.
import { vitePreprocess } from '@astrojs/svelte';

export default {
	preprocess: vitePreprocess(),
	// No window.__svelte version marker in the board's JS.
	compilerOptions: { discloseVersion: false },
}
