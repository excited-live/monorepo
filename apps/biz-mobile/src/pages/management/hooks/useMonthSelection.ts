import { useAppUI } from "../../../state";

export interface MonthSelectionSlice {
	selectedMonth: string;
	setSelectedMonth: (month: string) => void;
}

export function useMonthSelection(): MonthSelectionSlice {
	const { selectedMonth, setSelectedMonth } = useAppUI();

	return {
		selectedMonth,
		setSelectedMonth,
	};
}
