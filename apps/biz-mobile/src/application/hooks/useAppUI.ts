import { useUIContext, type UIContextValue } from "../../app/ui-context";

export type AppUISlice = UIContextValue;

export function useAppUI(): AppUISlice {
	return useUIContext();
}
