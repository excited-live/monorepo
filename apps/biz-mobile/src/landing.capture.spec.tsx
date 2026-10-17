import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";

/**
 * Landing-page screenshot capture. Not a visual-regression test: it renders the
 * real app screens with marketing demo data (`landing-fixtures.ts`) and writes
 * PNGs straight into the landing site's public folder.
 *
 *   pnpm --filter @excited-live/biz-mobile capture:landing
 *
 * `capture-mobile` (iPhone 14) and `capture-desktop` (1280x800) run from the one
 * config in playwright.config.ts, so every shot exists in both form factors:
 *   apps/landingpage/public/app/{mobile,desktop}/<shot>.png
 *
 * Mobile crops to the app column. Desktop keeps the whole 1280x800 viewport, which
 * is how the app really opens on a wide screen: a centred column on the canvas.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../landingpage/public/app");

type Shot = {
	name: string;
	story: string;
	/** Visible text of a tab/button to click before capturing. */
	click?: string;
};

const SHOTS: Shot[] = [
	{ name: "home", story: "Home" },
	{ name: "runway", story: "Management" },
	{ name: "expenses", story: "Management", click: "Expense" },
	{ name: "gear", story: "Management", click: "Assets" },
	{ name: "liabilities", story: "Management", click: "Liability" },
	{ name: "settings", story: "Settings" },
];

test.describe("landing capture", () => {
	for (const shot of SHOTS) {
		test(shot.name, async ({ page, mount }, testInfo) => {
			await page.addInitScript(() => {
				// Read by playwright/gallery/main.tsx to swap in the marketing demo data.
				(window as { __EXL_FIXTURES__?: string }).__EXL_FIXTURES__ = "landing";
			});
			await mount(shot.story);
			if (shot.click) {
				await page.getByRole("button", { name: shot.click, exact: true }).click();
			}
			// The gallery has no app shell; mirror `.mobile-shell` (max 480px, 16px gutters)
			// so cards and the hero banner sit exactly as they do in the real app.
			await page.addStyleTag({
				content:
					"#root{max-width:480px;margin:0 auto;padding:0 16px;box-sizing:border-box}",
			});
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(400);
			const form = testInfo.project.name.replace("capture-", "");
			const file = path.join(OUT, form, `${shot.name}.png`);
			if (form === "desktop") {
				await page.screenshot({ path: file, animations: "disabled" });
			} else {
				await page.locator("#root").screenshot({ path: file, animations: "disabled" });
			}
		});
	}
});
