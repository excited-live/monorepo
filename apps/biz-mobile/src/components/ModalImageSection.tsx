import React, { useRef } from "react";

interface ModalImageSectionProps {
	value?: string;
	onChange: (value: string | undefined) => void;
	emptyLabel?: string;
}

const compressImage = (file: File, maxWidth = 480, maxHeight = 480, quality = 0.75): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let { width, height } = img;
				if (width > maxWidth || height > maxHeight) {
					if (width > height) {
						height = Math.round((height * maxWidth) / width);
						width = maxWidth;
					} else {
						width = Math.round((width * maxHeight) / height);
						height = maxHeight;
					}
				}
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(reader.result as string);
					return;
				}
				ctx.drawImage(img, 0, 0, width, height);
				resolve(canvas.toDataURL("image/jpeg", quality));
			};
			img.onerror = reject;
			img.src = e.target?.result as string;
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
};

export const ModalImageSection: React.FC<ModalImageSectionProps> = ({
	value,
	onChange,
	emptyLabel = "Add Image",
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			try {
				const compressed = await compressImage(file);
				onChange(compressed);
			} catch {
				const reader = new FileReader();
				reader.onloadend = () => {
					if (typeof reader.result === "string") {
						onChange(reader.result);
					}
				};
				reader.readAsDataURL(file);
			}
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
