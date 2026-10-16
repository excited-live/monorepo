import React, { useState } from "react";
import { CurrencyInput } from "./CurrencyInput";
import { TestScaffold } from "../testing/TestScaffold";

const StatefulCurrencyInput = ({ initial }: { initial: string | number }) => {
	const [val, setVal] = useState(initial);
	return (
		<div style={{ padding: "20px" }}>
			<CurrencyInput value={val} onChange={setVal} placeholder="0.00" />
		</div>
	);
};

export const Empty = () => (
	<TestScaffold>
		<StatefulCurrencyInput initial="" />
	</TestScaffold>
);

export const FormattedValue = () => (
	<TestScaffold>
		<StatefulCurrencyInput initial="1250000.5" />
	</TestScaffold>
);
