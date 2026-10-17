import React, { useRef } from "react";
import { HStack, Img, NativeInput, PlainButton, Stack, Text } from "@excited-live/design-system";
import { ChipButton } from "../ChipButton";
import { CURATED_COVER_WALLPAPERS } from "@excited-live/biz";

const OVERLAY_BTN = "cursor-pointer rounded-pill px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-[8px]";

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
	const coverHeight = isCover ? "h-40" : "h-[120px]";

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
		<Stack gap={1.5} width="100%" className="min-w-0">
			<NativeInput ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

			{effectiveValue ? (
				<Stack
					className={`relative mb-0.5 w-full shrink-0 overflow-hidden rounded-3xl border border-line shadow-card ${coverHeight}`}
				>
					<Img src={effectiveValue} alt="Preview" className="size-full object-cover" />
					<HStack gap={1.5} className="absolute top-2 right-2">
						<PlainButton className={`${OVERLAY_BTN} bg-ink/90`} onClick={() => fileInputRef.current?.click()}>
							Change
						</PlainButton>
						<PlainButton className={`${OVERLAY_BTN} bg-ink/75`} onClick={handleRemove}>
							Remove
						</PlainButton>
					</HStack>
				</Stack>
			) : (
				<PlainButton
					className={`mb-0.5 flex w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-3xl border-[1.5px] border-dashed border-line-strong bg-ink/[0.03] text-[13px] font-semibold text-granite active:bg-ink/[0.06] ${coverHeight}`}
					onClick={() => fileInputRef.current?.click()}
				>
					<Text className="text-[18px] leading-none">＋</Text>
					<Text className="[font:inherit]">{effectiveLabel}</Text>
				</PlainButton>
			)}

			{(showCuratedWallpapers || isCover) && (
				<Stack className="mt-1.5">
					<Text className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate">
						Curated Office Wallpapers
					</Text>
					<HStack gap={2} className="overflow-x-auto py-1.5">
						{CURATED_COVER_WALLPAPERS.map((wp) => (
							<ChipButton
								key={wp.id}
								className="px-2 py-1 font-medium"
								onClick={() => handleWallpaperSelect(wp.imageUrl)}
							>
								<Img src={wp.imageUrl} alt={wp.title} className="size-[18px] rounded object-cover" />
								<Text className="[font:inherit]">{wp.title}</Text>
							</ChipButton>
						))}
					</HStack>
				</Stack>
			)}
		</Stack>
	);
};
