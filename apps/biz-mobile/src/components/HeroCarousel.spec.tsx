import { test, expect } from "@playwright/test";

test.describe("HeroCarousel Component Visual", () => {
	test("renders multi-account hero carousel and matches screenshot", async ({ mount }) => {
		const component = await mount("components/HeroCarousel/MultiAccount");
		await expect(component).toHaveScreenshot("hero-carousel-multi.png");
	});
});
