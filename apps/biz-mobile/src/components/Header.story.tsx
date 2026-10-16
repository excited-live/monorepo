import React from "react";
import { Header } from "./Header";
import { TestScaffold } from "../testing/TestScaffold";

export const Default = () => (
	<TestScaffold>
		<Header />
	</TestScaffold>
);

export const Scrolled = () => (
	<TestScaffold>
		<Header />
		<div style={{ height: "120vh", padding: "100px 16px" }}>Scroll test background</div>
	</TestScaffold>
);
