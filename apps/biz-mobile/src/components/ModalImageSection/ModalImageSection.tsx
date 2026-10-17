import React, { useRef } from "react";
import { CURATED_COVER_WALLPAPERS } from "@excited-live/biz";

export interface ModalImageSectionProps {
	value?: string;
	imageUrl?: string;
	onChange?: (value: string | undefined) => void;
	onImageChange?: (value: string) => void;
	onUserTouched?: () => void;
	emptyLabel?: string;
	label?: string;
	aspectRatio?: "square" | "cover";
	showCuratedWallpapers?: boolean;
}

const compressImage = (
	file: File,
	maxWidth = 480,
	maxHeight = 480,
	quality = 0.75,
): Promise<string> => {
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
	imageUrl,
	onChange,
	onImageChange,
	onUserTouched,
	emptyLabel = "Add Image",
	label,
	aspectRatio = "square",
	showCuratedWallpapers = false,
}) => {
	const effectiveValue = value ?? imageUrl;
	const effectiveLabel = label ?? emptyLabel;

	const handleImageChange = (val: string | undefined) => {
		onChange?.(val);
		onImageChange?.(val ?? "");
	};

	const fileInputRef = useRef<HTMLInputElement>(null);
	const isCover = aspectRatio === "cover";

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			onUserTouched?.();
			try {
				const maxW = isCover ? 1600 : 256;
				const maxH = isCover ? 900 : 256;
				const q = isCover ? 0.85 : 0.75;
				const compressed = await compressImage(file, maxW, maxH, q);
				handleImageChange(compressed);
			} catch {
				const reader = new FileReader();
				reader.onloadend = () => {
					if (typeof reader.result === "string") {
						handleImageChange(reader.result);
					}
				};
				reader.readAsDataURL(file);
			}
		}
		e.target.value = "";
	};

	const handleWallpaperSelect = (wallpaperUrl: string) => {
		onUserTouched?.();
		handleImageChange(wallpaperUrl);
	};

	const handleRemove = () => {
		onUserTouched?.();
		handleImageChange(undefined);
	};

	return (
		<div className="form-group">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileUpload}
				style={{ display: "none" }}
			/>

			{effectiveValue ? (
				<div className={`modal-image-preview-container ${isCover ? "cover" : ""}`}>
					<img src={effectiveValue} alt="Preview" className="modal-image-preview" />
					<div className="modal-image-actions">
						<button
							type="button"
							className="modal-image-btn primary"
							onClick={() => fileInputRef.current?.click()}
						>
							Change
						</button>
						<button
							type="button"
							className="modal-image-btn"
							onClick={handleRemove}
						>
							Remove
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					className={`modal-image-empty ${isCover ? "cover" : ""}` }
					onClick={() => fileInputRef.current?.click()}
				>
					<span className="modal-image-empty-icon">＋</span>
					<span>{effectiveLabel}</span>
				</button>
			)}

			{(showCuratedWallpapers || isCover) && (
				<div style={{ marginTop: 6 }}>
					<span style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-gray)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
						Curated Office Wallpapers
					</span>
					<div className="wallpaper-chips" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 0" }}>
						{CURATED_COVER_WALLPAPERS.map((wp) => (
							<button
								key={wp.id}
								type="button"
								className="preset-chip-btn"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									padding: "4px 8px",
									fontSize: 11,
									flexShrink: 0,
								}}
								onClick={() => handleWallpaperSelect(wp.imageUrl)}
							>
								<img
									src={wp.imageUrl}
									alt={wp.title}
									style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }}
								/>
								<span>{wp.title}</span>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
