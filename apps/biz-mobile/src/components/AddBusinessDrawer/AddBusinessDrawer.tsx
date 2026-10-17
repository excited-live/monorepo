import React, { useState, useEffect } from "react";
import { Button, Stack, Text } from "@excited-live/design-system";
import { FormField, InputField } from "../FormField";
import { ModalPage } from "../ModalPage";
import { CurrencyInput } from "../CurrencyInput";
import type { EntityAccount } from "@excited-live/biz";
import { ModalImageSection } from "../ModalImageSection";
import { useModalBack } from "../../hooks/useModalBack";
import { useBiz } from "../../state";

interface AddBusinessDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: EntityAccount | null;
}

export const AddBusinessDrawer: React.FC<AddBusinessDrawerProps> = ({ isOpen, onClose, initialData }) => {
	const { addBusiness, updateBusiness, deleteBusiness } = useBiz();
	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [startingTreasury, setStartingTreasury] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setImageUrl(initialData.imageUrl || "");
			setStartingTreasury("");
		} else {
			setName("");
			setImageUrl("");
			setStartingTreasury("");
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		if (initialData) {
			updateBusiness(initialData.id, name.trim(), imageUrl || undefined);
		} else {
			const initCash = Number(startingTreasury) || 0;
			addBusiness(name.trim(), imageUrl || undefined, initCash > 0 ? initCash : undefined);
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (
			confirm(
				`Are you sure you want to delete business "${initialData.name}"? All associated hardware, subscriptions, and revenue will also be removed.`,
			)
		) {
			deleteBusiness(initialData.id);
			dismiss();
		}
	};

	const canSubmit = name.trim().length > 0;
	const isEditMode = Boolean(initialData);

	return (
		<ModalPage
			title={isEditMode ? "Edit Business" : "Add Business"}
			onClose={dismiss}
			footer={
				<>
					<Button
						type="submit"
						form="business-form"
						label={isEditMode ? "Save Business" : "Create Business"}
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!canSubmit}
					/>

					{isEditMode && (
						<Button label="Delete Business" size="lg" variant="destructive" width="100%" onClick={handleDelete} />
					)}
				</>
			}
		>
			<ModalImageSection value={imageUrl} onChange={(v) => setImageUrl(v ?? "")} />

			<Stack as="form" id="business-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<InputField
					label="Business Name"
					placeholder="e.g. Studio Neon Co., Ltd."
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					autoFocus={!isEditMode}
				/>

				{!isEditMode && (
					<FormField label="Starting Treasury / Capital (Optional)">
						<CurrencyInput placeholder="0.00" value={startingTreasury} onChange={setStartingTreasury} />
						<Text className="text-[12px] text-slate">Initial liquid bank balance allocated to this business.</Text>
					</FormField>
				)}

				<Text className="text-[12px] text-slate">
					Treasury tracks liquid capital on hand, and projects end-of-month cash = liquid cash + revenues − operational
					burn.
				</Text>
			</Stack>
		</ModalPage>
	);
};
