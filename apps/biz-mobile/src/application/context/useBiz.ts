import { useContext } from "react";
import { BizContext, type BizContextType } from "./BizContext";

export function useBiz(): BizContextType {
	const context = useContext(BizContext);
	if (!context) {
		throw new Error("useBiz must be used within a BizProvider");
	}
	return context;
}
