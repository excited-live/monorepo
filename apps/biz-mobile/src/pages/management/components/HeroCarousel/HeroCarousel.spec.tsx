import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("HeroCarousel Component Visual", () => {
	test("renders multi-account hero carousel and matches screenshot", async ({ mount }) => {
		const component = await mount("HeroCarousel", {
			accounts: FIXTURE_ACCOUNTS,
			activeEntityId: FIXTURE_ACCOUNTS[0]!.id,
		});
		await expect(component).toHaveScreenshot("hero-carousel-multi.png");
	});
});
