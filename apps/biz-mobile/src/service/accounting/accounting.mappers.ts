import type { BookAsset, BookIncome, CapitalTransfer, Income, RevenueStream } from "@excited-live/accounting";
import type { Patch, SetCareerInput, UpdateTransferInput } from "./accounting.api";

/**
 * Pure helpers for the mobile service layer: local dates and the UI's
 * destination and career conventions. No React, no I/O.
 */

/** Target id the UI uses for the entity's primary cash (its default wallet). */
export const PRIMARY_CASH_TARGET = "primary_cash";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local calendar month (YYYY-MM). The server's default is the UTC month, so send the local one. */
export function localMonth(now: Date): string {
	return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/** Local calendar day (YYYY-MM-DD). */
export function localDay(now: Date): string {
	return `${localMonth(now)}-${pad2(now.getDate())}`;
}

/**
 * Transfer destination: a specific asset, or the entity's default cash wallet
 * when the target is absent or the primary cash marker.
 */
export function transferDestination(
	targetAssetId: string | undefined,
	toEntityId: string,
): { toAssetId: string } | { toEntityId: string } {
	return targetAssetId && targetAssetId !== PRIMARY_CASH_TARGET
		? { toAssetId: targetAssetId }
		: { toEntityId };
}

/** Destination of an existing transfer, keeping a liability destination as it is. */
export function transferEndpointsPatch(transfer: CapitalTransfer): Pick<UpdateTransferInput, "toLiabilityId" | "toAssetId" | "toEntityId"> {
	if (transfer.toLiabilityId !== undefined) {
		return { toLiabilityId: transfer.toLiabilityId };
	}
	return transferDestination(transfer.targetAssetId, transfer.toEntityId);
}

/** Earliest-starting salary of an entity (ties keep list order): the one the server treats as primary. */
export function primarySalary(revenues: Income[], entityId: string): number {
	let primary: Income | undefined;
	for (const revenue of revenues) {
		if (revenue.entityId !== entityId || revenue.source !== "salary") continue;
		if (!primary || (revenue.startMonth ?? "") < (primary.startMonth ?? "")) primary = revenue;
	}
	return primary?.amount ?? 0;
}

/** Body of POST /incomes/career for the entity, from the UI's career fields. */
export function careerInput(
	entityId: string,
	career: {
		careerTitle?: string;
		careerCompany?: string;
		careerImageUrl?: string;
		salary?: number;
		paydayDayOfMonth?: number;
	},
	revenues: RevenueStream[],
): SetCareerInput {
	return {
		entityId,
		salary: career.salary ?? primarySalary(revenues, entityId),
		paydayDayOfMonth: career.paydayDayOfMonth,
		title: career.careerTitle,
		company: career.careerCompany,
		imageUrl: career.careerImageUrl,
	};
}

/** Id of the entity's default cash asset (or its first cash asset when none is marked default). */
export function defaultCashAssetId(assets: BookAsset[], entityId: string): string | undefined {
	const cash = assets.filter((asset) => asset.entityId === entityId && asset.kind === "cash");
	return (cash.find((asset) => asset.kind === "cash" && asset.isDefault) ?? cash[0])?.id;
}

/** Primary employment income of an entity: earliest startMonth, ties keep list order. */
export function primaryEmploymentIncome(incomes: BookIncome[], entityId: string): BookIncome | undefined {
	let primary: BookIncome | undefined;
	for (const income of incomes) {
		if (income.entityId !== entityId || income.kind !== "employment") continue;
		if (!primary || income.startMonth < primary.startMonth) primary = income;
	}
	return primary;
}


/**
 * PATCH body that replaces a record the UI edited as a whole: the listed optional
 * fields the UI can clear are sent as null when absent, so clearing them persists.
 */
export function replacing<T extends object>(record: T, clearable: readonly (keyof T)[]): Patch<T> {
	const patch: Record<string, unknown> = { ...(record as Record<string, unknown>) };
	for (const key of clearable) {
		if (patch[key as string] === undefined) patch[key as string] = null;
	}
	return patch as Patch<T>;
}
