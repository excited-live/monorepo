import React from "react";
import { LedgerHeroCard } from "./LedgerHeroCard";
import { TestScaffold } from "../testing/TestScaffold";
import { FIXTURE_ACCOUNTS } from "../testing/fixtures";

export const Default = () => (
	<TestScaffold>
		<div style={{ padding: "16px" }}>
			<LedgerHeroCard account={FIXTURE_ACCOUNTS[0]!} yearMonth="2026-10" />
		</div>
	</TestScaffold>
);
