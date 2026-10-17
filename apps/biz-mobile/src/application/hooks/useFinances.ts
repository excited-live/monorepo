import { useBiz } from "../context/useBiz";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz";

export interface FinancesSlice {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
	addBusiness: (name: string, imageUrl?: string, startingTreasury?: number) => string;
	updateBusiness: (id: string, name: string, imageUrl?: string) => void;
	deleteBusiness: (id: string) => void;
	addSubscription: (sub: Omit<RecurringSubscription, "id">) => void;
	updateSubscription: (sub: RecurringSubscription) => void;
	deleteSubscription: (id: string) => void;
	addHardware: (hw: Omit<HardwareAsset, "id">) => void;
	updateHardware: (hw: HardwareAsset) => void;
	deleteHardware: (id: string) => void;
	addRevenue: (rev: Omit<RevenueStream, "id">) => void;
	updateRevenue: (rev: RevenueStream) => void;
	deleteRevenue: (id: string) => void;
	addLiability: (liab: Omit<LiabilityStream, "id">) => void;
	updateLiability: (liab: LiabilityStream) => void;
	deleteLiability: (id: string) => void;
	injectCapital: (
		fromEntityId: string,
		toEntityId: string,
		amount: number,
		note?: string,
		frequency?: "one_time" | "monthly",
		targetAssetId?: string,
	) => void;
	updateCapitalTransfer: (transfer: CapitalTransfer) => void;
	deleteCapitalTransfer: (id: string) => void;
	setCareerIncome: (
		entityId: string,
		salary: number,
		paydayDayOfMonth?: number,
		title?: string,
		company?: string,
		imageUrl?: string,
		startMonth?: string,
		endMonth?: string,
	) => void;
	updateCareer: (
		entityId: string,
		career: {
			careerTitle?: string;
			careerCompany?: string;
			careerImageUrl?: string;
			salary?: number;
			paydayDayOfMonth?: number;
		},
	) => void;
}

export function useFinances(): FinancesSlice {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		addBusiness,
		updateBusiness,
		deleteBusiness,
		addSubscription,
		updateSubscription,
		deleteSubscription,
		addHardware,
		updateHardware,
		deleteHardware,
		addRevenue,
		updateRevenue,
		deleteRevenue,
		addLiability,
		updateLiability,
		deleteLiability,
		injectCapital,
		updateCapitalTransfer,
		deleteCapitalTransfer,
		setCareerIncome,
		updateCareer,
	} = useBiz();

	return {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		addBusiness,
		updateBusiness,
		deleteBusiness,
		addSubscription,
		updateSubscription,
		deleteSubscription,
		addHardware,
		updateHardware,
		deleteHardware,
		addRevenue,
		updateRevenue,
		deleteRevenue,
		addLiability,
		updateLiability,
		deleteLiability,
		injectCapital,
		updateCapitalTransfer,
		deleteCapitalTransfer,
		setCareerIncome,
		updateCareer,
	};
}
