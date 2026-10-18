import React, { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FormField, InputField, SelectField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { SectionCard } from "../../../../components/SectionCard";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import {
	calculateAvailableCash,
	calculateRunwayProjection,
	isCashAsset,
	type CapitalTransfer,
	type EntityAccount,
} from "@excited-live/accounting";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useFinances, useAppUI } from "../../../../state";
import { formatMoney } from "../../../../utils/format";

const todayIso = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const CapitalDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: CapitalTransfer | null;
}> = ({ isOpen, onClose, initialData }) => {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		injectCapital,
		updateCapitalTransfer,
		deleteCapitalTransfer,
	} = useFinances();
	const { activeEntityId, selectedMonth } = useAppUI();

	const { dismiss } = useModalBack(isOpen, onClose);

	const personalAccount = accounts.find((a) => a.type === "personal") || accounts[0]!;
	const businessAccounts = accounts.filter((a) => a.type === "business");

	const defaultTarget = businessAccounts.find((b) => b.id === activeEntityId) || businessAccounts[0] || personalAccount;
	const [targetBizId, setTargetBizId] = useState(initialData?.toEntityId || defaultTarget.id);
	const [targetAssetId, setTargetAssetId] = useState(initialData?.targetAssetId || "");
	const [frequency, setFrequency] = useState<"one_time" | "monthly">(initialData?.frequency || "one_time");
	const [amount, setAmount] = useState<string>(initialData ? String(initialData.amount) : "20000");
	const [note, setNote] = useState<string>(initialData?.note ?? "Founder seed capital");

	useEffect(() => {
		if (initialData) {
			setTargetBizId(initialData.toEntityId);
			setTargetAssetId(initialData.targetAssetId || "");
			setFrequency(initialData.frequency || "one_time");
			setAmount(String(initialData.amount));
			setNote(initialData.note);
		} else {
			const bId = defaultTarget.id;
			setTargetBizId(bId);
			const bizCash = hardware.filter((h) => h.entityId === bId && isCashAsset(h));
			setTargetAssetId(bizCash[0]?.id || "primary_cash");
			setFrequency("one_time");
			setAmount("20000");
			setNote("Founder seed capital");
		}
	}, [initialData, defaultTarget.id, hardware]);

	if (!isOpen) return null;

	const targetBiz = accounts.find((a) => a.id === targetBizId) || businessAccounts[0]!;
	const targetBizCashAssets = hardware.filter((h) => h.entityId === targetBiz.id && isCashAsset(h));
	const transferAmount = Number(amount) || 0;

	// Runway before/after: replay the month-by-month ledger with the draft transfer
	// swapped in, so one-offs, monthly transfers and income end dates all count.
	// New transfers are saved with today's date (see injectCapital), edits keep theirs.
	const otherTransfers = initialData ? transfers.filter((t) => t.id !== initialData.id) : transfers;
	const { targetAssetId: _previousTarget, ...initialRest } = initialData ?? {};
	const draftTransfer: CapitalTransfer = {
		...initialRest,
		id: initialData?.id ?? "draft_transfer",
		fromEntityId: personalAccount.id,
		toEntityId: targetBiz.id,
		amount: transferAmount,
		date: initialData?.date ?? todayIso(),
		note,
		frequency,
		...(targetAssetId && targetAssetId !== "primary_cash" ? { targetAssetId } : {}),
	};
	const simulatedTransfers = transferAmount > 0 ? [...otherTransfers, draftTransfer] : otherTransfers;
	const flowParams = { hardware, subscriptions, revenues, liabilities };
	const runwayOf = (account: EntityAccount, txs: CapitalTransfer[]) =>
		calculateRunwayProjection({ account, transfers: txs, ...flowParams, yearMonth: selectedMonth });

	const personalRunway = runwayOf(personalAccount, transfers);
	const personalNewRunway = runwayOf(personalAccount, simulatedTransfers);
	const bizRunway = runwayOf(targetBiz, transfers);
	const bizNewRunway = runwayOf(targetBiz, simulatedTransfers);

	// Cash personal can move in the transfer's month without this transfer
	const availablePersonalCash = calculateAvailableCash({
		account: personalAccount,
		transfers: otherTransfers,
		...flowParams,
		yearMonth: draftTransfer.date.slice(0, 7),
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (transferAmount <= 0) return;
		if (initialData) {
			updateCapitalTransfer({
				...initialData,
				fromEntityId: personalAccount.id,
				toEntityId: targetBiz.id,
				amount: transferAmount,
				note: note || "Capital transfer",
				frequency,
				targetAssetId: targetAssetId || undefined,
			});
		} else {
			injectCapital(personalAccount.id, targetBiz.id, transferAmount, note, frequency, targetAssetId || undefined);
		}
		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		deleteCapitalTransfer(initialData.id);
		dismiss();
	};

	const canSubmit = transferAmount > 0 && transferAmount <= availablePersonalCash;
	const formatRunway = ({ runwayMonths, isDefaultAlive }: { runwayMonths: number | null; isDefaultAlive: boolean }) =>
		runwayMonths !== null ? `${runwayMonths} mos` : isDefaultAlive ? "∞ (Default Alive)" : "∞";

	return (
		<ModalPage
			title={initialData ? "Edit Capital Transfer" : "Transfer Capital"}
			onClose={dismiss}
			footer={
				<HStack gap={2} width="100%">
					{initialData && (
						<Button label="Delete" size="lg" variant="destructive" className="flex-1" onClick={handleDelete} />
					)}
					<Button
						type="submit"
						form="capital-form"
						label={initialData ? "Save Changes" : "Confirm Injection"}
						size="lg"
						variant="primary"
						className="h-12 flex-[2]"
						isDisabled={!canSubmit}
					/>
				</HStack>
			}
		>
			<Text className="text-[13px] text-slate">Deploy seed funds from Personal reserve into business treasury.</Text>

			<Stack as="form" id="capital-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<InputField
					label="Source Reserve"
					value={`Personal (Available: ฿${formatMoney(availablePersonalCash)})`}
					disabled
					readOnly
				/>

				<SelectField
					label="Target Business"
					value={targetBizId}
					onChange={(e) => {
						const nextBizId = e.target.value;
						setTargetBizId(nextBizId);
						const bizCash = hardware.filter((h) => h.entityId === nextBizId && isCashAsset(h));
						setTargetAssetId(bizCash[0]?.id || "primary_cash");
					}}
				>
					{businessAccounts.map((b) => (
						<option key={b.id} value={b.id}>
							{b.name}
						</option>
					))}
				</SelectField>

				<SelectField
					label="Target Cash Account / Asset"
					hint="Choose the specific cash account receiving this capital injection."
					value={targetAssetId}
					onChange={(e) => setTargetAssetId(e.target.value)}
				>
					{targetBizCashAssets.length > 0 ? (
						targetBizCashAssets.map((asset) => (
							<option key={asset.id} value={asset.id}>
								{asset.name} (Current: ฿{formatMoney(asset.cost)})
							</option>
						))
					) : (
						<option value="primary_cash">Primary Cash Account</option>
					)}
				</SelectField>

				<Stack gap={1.5} width="100%">
					<Text className="text-[12px] font-bold uppercase tracking-[0.04em] text-slate">Transfer Schedule</Text>
					<SegmentedControl
						label="Transfer Schedule"
						value={frequency}
						onChange={(v) => setFrequency(v as "one_time" | "monthly")}
					>
						<SegmentedControlItem value="one_time" label="One-Time Injection" />
						<SegmentedControlItem value="monthly" label="Monthly Recurring" />
					</SegmentedControl>
					<Text className="text-[11px] text-slate">
						{frequency === "monthly"
							? "Transfers automatically every month starting from selected month."
							: "One-off capital injection for this month only."}
					</Text>
				</Stack>

				<FormField label="Transfer Amount (THB)">
					<CurrencyInput value={amount} onChange={setAmount} required autoFocus />
				</FormField>

				<InputField
					label="Reference Note"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="e.g. Founder seed for server costs"
				/>

				{/* Live Runway Impact Simulation Box */}
				<SectionCard title="Simulated Runway Impact" tint="bg-ink/[0.03]">
					<HStack width="100%" justify="between" gap={2}>
						<Text className="text-[13px] text-slate">Personal Runway</Text>
						<Text className="text-[13px] font-semibold">
							{formatRunway(personalRunway)} →{" "}
							<Text className="text-signal">{formatRunway(personalNewRunway)}</Text>
						</Text>
					</HStack>
					<HStack width="100%" justify="between" gap={2}>
						<Text className="text-[13px] text-slate">{targetBiz.name} Runway</Text>
						<Text className="text-[13px] font-semibold">
							{formatRunway(bizRunway)} →{" "}
							<Text className="text-[#059669]">{formatRunway(bizNewRunway)}</Text>
						</Text>
					</HStack>
				</SectionCard>
			</Stack>
		</ModalPage>
	);
};
