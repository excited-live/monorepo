import React, { useRef } from "react";

interface ModalImageSectionProps {
	value?: string;
	onChange: (value: string | undefined) => void;
	emptyLabel?: string;
}

export const ModalImageSection: React.FC<ModalImageSectionProps> = ({
	value,
	onChange,
	emptyLabel = "Add Image",
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				if (typeof reader.result === "string") {
					onChange(reader.result);
				}
			};
			reader.readAsDataURL(file);
		}
		e.target.value = "";
	};

	if (value) {
		return (
			<div className="modal-image-preview-container">
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleFileUpload}
					style={{ display: "none" }}
				/>
				<img src={value} alt="Preview" className="modal-image-preview" />
				<div className="modal-image-actions">
					<button
						type="button"
						className="modal-image-btn primary"
						onClick={() => fileInputRef.current?.click()}
					>
						Change Image
					</button>
					<button
						type="button"
						className="modal-image-btn"
						onClick={() => onChange(undefined)}
					>
						Remove
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="modal-image-preview-container">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileUpload}
				style={{ display: "none" }}
			/>
			<button
				type="button"
				className="modal-image-empty"
				onClick={() => fileInputRef.current?.click()}
			>
				<span className="modal-image-empty-icon">＋</span>
				<span>{emptyLabel}</span>
			</button>
		</div>
	);
};
