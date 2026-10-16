import React from "react";
import { BottomDock } from "./BottomDock";
import { TestScaffold } from "../testing/TestScaffold";

export const HomeActive = () => (
	<TestScaffold>
		<div style={{ minHeight: "200px", position: "relative" }}>
			<BottomDock />
		</div>
	</TestScaffold>
);
