import React, { useState, useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { InputField } from "../FormField";
import { ModalPage } from "../ModalPage";
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

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setImageUrl(initialData.imageUrl || "");
		} else {
			setName("");
			setImageUrl("");
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		if (initialData) {
			updateBusiness(initialData.id, name.trim(), imageUrl || undefined);
		} else {
			addBusiness(name.trim(), imageUrl || undefined);
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

				<Text className="text-[12px] text-slate">
					Treasury tracks liquid capital on hand, and projects end-of-month cash = liquid cash + revenues − operational
					burn.
				</Text>
			</Stack>
		</ModalPage>
	);
};
