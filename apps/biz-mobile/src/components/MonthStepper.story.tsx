import React from "react";
import { MonthStepper } from "./MonthStepper";
import { TestScaffold } from "../testing/TestScaffold";

export const Default = () => (
	<TestScaffold>
		<div style={{ padding: "20px" }}>
			<MonthStepper />
		</div>
	</TestScaffold>
);
