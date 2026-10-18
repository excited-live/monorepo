import type { AccountingSnapshot, Income } from "../types";

export function addIncome(
	snapshot: AccountingSnapshot,
	input: Omit<Income, "id"> & { id?: string },
): { snapshot: AccountingSnapshot; income: Income } {
	const newIncome: Income = {
		...input,
		id: input.id ?? `rev_${Date.now()}`,
	};

	return {
		snapshot: {
			...snapshot,
			revenues: [...snapshot.revenues, newIncome],
		},
		income: newIncome,
	};
}

export function updateIncome(
	snapshot: AccountingSnapshot,
	income: Income,
): AccountingSnapshot {
	return {
		...snapshot,
		revenues: snapshot.revenues.map((r) =>
			r.id === income.id ? income : r,
		),
	};
}

export function deleteIncome(
	snapshot: AccountingSnapshot,
	id: string,
): AccountingSnapshot {
	const rev = snapshot.revenues.find((r) => r.id === id);
	let accounts = snapshot.accounts;
	if (rev && (rev.source === "salary" || rev.id === "rev_career_prame")) {
		accounts = accounts.map((acc) =>
			acc.id === rev.entityId ? { ...acc, salary: 0 } : acc,
		);
	}

	return {
		...snapshot,
		accounts,
		revenues: snapshot.revenues.filter((r) => r.id !== id),
	};
}

export function setCareerIncome(
	snapshot: AccountingSnapshot,
	input: {
		entityId: string;
		salary: number;
		paydayDayOfMonth?: number;
		title?: string;
		company?: string;
		imageUrl?: string;
		startMonth?: string;
		endMonth?: string;
	},
): AccountingSnapshot {
	const {
		entityId,
		salary,
		paydayDayOfMonth = 28,
		title,
		company,
		imageUrl,
		startMonth,
		endMonth,
	} = input;

	const accounts = snapshot.accounts.map((acc) =>
		acc.id === entityId
			? {
					...acc,
					salary,
					paydayDayOfMonth,
					...(title ? { careerTitle: title } : {}),
					...(company ? { careerCompany: company } : {}),
					...(imageUrl ? { careerImageUrl: imageUrl } : {}),
				}
			: acc,
	);

	const existingIdx = snapshot.revenues.findIndex(
		(r) =>
			r.entityId === entityId &&
			(r.source === "salary" || r.id === "rev_career_prame"),
	);

	let revenues = [...snapshot.revenues];
	if (existingIdx >= 0) {
		const curr = revenues[existingIdx]!;
		revenues[existingIdx] = {
			...curr,
			amount: salary,
			name: title || curr.name || "Career Base Salary",
			active: salary > 0,
			source: "salary",
			...(startMonth !== undefined ? { startMonth: startMonth || undefined } : {}),
			...(endMonth !== undefined ? { endMonth: endMonth || undefined } : {}),
		};
	} else if (salary > 0) {
		revenues = [
			{
				id: `rev_career_${Date.now()}`,
				entityId,
				name: title || "Career Base Salary",
				amount: salary,
				frequency: "monthly",
				source: "salary",
				active: true,
				startMonth: startMonth || undefined,
				endMonth: endMonth || undefined,
			},
			...revenues,
		];
	}

	return {
		...snapshot,
		accounts,
		revenues,
	};
}
