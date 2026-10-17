/*
 * Converts the PNGs written by `pnpm capture:landing` (apps/biz-mobile) into
 * WebP next to them and removes the PNGs, so only the light files are committed.
 */
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/app');

for (const form of ['mobile', 'desktop']) {
	const dir = path.join(root, form);
	for (const file of await readdir(dir).catch(() => [])) {
		if (!file.endsWith('.png')) continue;
		const src = path.join(dir, file);
		await sharp(src).webp({ quality: 84 }).toFile(src.replace(/\.png$/, '.webp'));
		await unlink(src);
	}
}
