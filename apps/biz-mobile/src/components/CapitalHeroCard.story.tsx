import React from "react";
import { CapitalHeroCard } from "./CapitalHeroCard";
import { TestScaffold } from "../testing/TestScaffold";
import { FIXTURE_ACCOUNTS } from "../testing/fixtures";

export const PersonalWealth = () => (
	<TestScaffold>
		<div style={{ padding: "16px" }}>
			<CapitalHeroCard account={FIXTURE_ACCOUNTS[0]!} />
		</div>
	</TestScaffold>
);

export const BusinessBookValue = () => (
	<TestScaffold>
		<div style={{ padding: "16px" }}>
			<CapitalHeroCard account={FIXTURE_ACCOUNTS[1]!} />
		</div>
	</TestScaffold>
);
