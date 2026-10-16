import React from "react";
import { HeroCarousel } from "./HeroCarousel";
import { CapitalHeroCard } from "./CapitalHeroCard";
import { TestScaffold } from "../testing/TestScaffold";
import { FIXTURE_ACCOUNTS } from "../testing/fixtures";

export const MultiAccount = () => (
	<TestScaffold>
		<div style={{ padding: "16px" }}>
			<HeroCarousel
				accounts={FIXTURE_ACCOUNTS}
				activeEntityId={FIXTURE_ACCOUNTS[0]!.id}
				onSelectEntity={() => {}}
				renderCard={(acc) => <CapitalHeroCard account={acc} />}
			/>
		</div>
	</TestScaffold>
);
