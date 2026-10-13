import { useEffect, useState } from "react";

export type ImageTone = "light" | "dark";

export interface ImageToneResult {
	tone: ImageTone;
	tintRgb: string | null;
}

interface ImageStats {
	luminance: number;
	r: number;
	g: number;
	b: number;
}

const SAMPLE_SIZE = 32;
const LIGHT_IMAGE_LUMINANCE = 0.62;
const TINT_MIX = 0.72;
const LIGHT_TINT = [252, 251, 250] as const;
const DARK_TINT = [20, 20, 19] as const;

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Image failed to load"));
		image.src = url;
	});
}

async function analyzeImage(url: string): Promise<ImageStats> {
	const image = await loadImage(url);
	const canvas = document.createElement("canvas");
	canvas.width = SAMPLE_SIZE;
	canvas.height = SAMPLE_SIZE;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("Canvas 2D context unavailable");
	context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
	const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

	let rTotal = 0;
	let gTotal = 0;
	let bTotal = 0;
	let luminanceTotal = 0;
	let weight = 0;

	for (let i = 0; i < data.length; i += 4) {
		const alpha = (data[i + 3] ?? 0) / 255;
		if (alpha === 0) continue;
		const r = (data[i] ?? 0) / 255;
		const g = (data[i + 1] ?? 0) / 255;
		const b = (data[i + 2] ?? 0) / 255;
		rTotal += r * alpha;
		gTotal += g * alpha;
		bTotal += b * alpha;
		luminanceTotal += (0.2126 * r + 0.7152 * g + 0.0722 * b) * alpha;
		weight += alpha;
	}

	if (weight === 0) throw new Error("Image has no visible pixels");

	return {
		luminance: luminanceTotal / weight,
		r: rTotal / weight,
		g: gTotal / weight,
		b: bTotal / weight,
	};
}

function buildTintRgb(stats: ImageStats, tone: ImageTone): string {
	const target = tone === "light" ? LIGHT_TINT : DARK_TINT;
	const mix = (channel: number, targetChannel: number) =>
		Math.round(channel * 255 * (1 - TINT_MIX) + targetChannel * TINT_MIX);
	return `${mix(stats.r, target[0])}, ${mix(stats.g, target[1])}, ${mix(stats.b, target[2])}`;
}

export function useImageTone(imageUrl?: string): ImageToneResult {
	const [result, setResult] = useState<ImageToneResult>(() =>
		imageUrl ? { tone: "dark", tintRgb: null } : { tone: "light", tintRgb: null },
	);

	useEffect(() => {
		if (!imageUrl) {
			setResult({ tone: "light", tintRgb: null });
			return;
		}

		let cancelled = false;

		analyzeImage(imageUrl)
			.then((stats) => {
				if (cancelled) return;
				const tone: ImageTone = stats.luminance >= LIGHT_IMAGE_LUMINANCE ? "light" : "dark";
				setResult({ tone, tintRgb: buildTintRgb(stats, tone) });
			})
			.catch(() => {
				if (!cancelled) setResult({ tone: "dark", tintRgb: null });
			});

		return () => {
			cancelled = true;
		};
	}, [imageUrl]);

	return result;
}
