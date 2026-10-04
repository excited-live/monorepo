import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import type React from "react"
import "@astryxdesign/core/reset.css"
import "@astryxdesign/core/astryx.css"
import "@excited-live/design-system/mastercard-theme.css"
import "../../src/styles.css"

const stories = import.meta.glob("../../src/**/*.story.{tsx,jsx}")
const id = (f: string) => f.replace(/^(\.\.\/)+src\//, "").replace(/\.story\.\w+$/, "")

async function resolve(storyId: string) {
	const sep = storyId.lastIndexOf("/")
	const [path, name] = [storyId.slice(0, sep), storyId.slice(sep + 1)]
	const file = Object.keys(stories).find((f) => id(f) === path || id(f).endsWith("/" + path))
	if (!file) {
		throw new Error(
			`Cannot find file for story "${storyId}". Available: ${Object.keys(stories)
				.map(id)
				.join(", ")}`,
		)
	}
	const loader = stories[file]
	if (!loader) {
		throw new Error(`Loader not found for ${file}`)
	}
	const mod = (await loader()) as Record<string, unknown>
	const component = mod?.[name] ?? mod?.default
	if (!component) {
		throw new Error(
			`Export "${name}" not found in ${file}. Available exports: ${Object.keys(mod ?? {}).join(", ")}`,
		)
	}
	return component as React.ComponentType<Record<string, unknown>>
}

const rootEl = document.getElementById("root")!
let root: Root | undefined

declare global {
	interface Window {
		mount: (params: { story: string; props?: Record<string, unknown> }) => Promise<void>
		unmount: () => Promise<void>
	}
}

window.mount = async ({
	story,
	props,
}: {
	story: string
	props?: Record<string, unknown>
}) => {
	const Story = await resolve(story)
	root ??= createRoot(rootEl)
	flushSync(() => root!.render(<Story {...(props ?? {})} />))
}

window.unmount = async () => {
	root?.unmount()
	root = undefined
}
