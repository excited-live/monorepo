import { useRef, useState } from "react"
import {
	ChatComposer,
	ChatMessage,
	ChatMessageBubble,
	ChatMessageList,
	ChatToolCalls,
	type ChatToolCallItem,
} from "@astryxdesign/core/Chat"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { formatBaht } from "../lib/format"
import { type PlanSummary } from "../lib/plan-service"

export interface AssistantRailProps {
	summary: PlanSummary
	t: (key: string, vars?: Record<string, string>) => string
}

export interface RailChatMessage {
	id: number
	role: "user" | "assistant"
	text: string
	/** Demo tool calls shown as collapsible rows above the reply text. */
	toolCalls?: ChatToolCallItem[]
}

/**
 * Assistant rail (right column)
 * Modeled on the Astryx "AI Chat Conversation" template: header, "Today"
 * separator, alternating turns (user bubble right / assistant plain text
 * with avatar left), and a floating composer card with an "Ask" selector
 * and a circular send button. The rail is always present. Replies are canned
 * summaries computed from the plan — the real assistant swaps in behind the
 * same props later.
 */
export function AssistantRail({ summary, t }: AssistantRailProps) {
	const [messages, setMessages] = useState<RailChatMessage[]>([])
	const [draft, setDraft] = useState("")
	const nextId = useRef(1)
	const logRef = useRef<HTMLDivElement | null>(null)

	/**
	 * Demo tool-call flow: the assistant "runs" two tools derived from the
	 * live plan before answering — each call flips from running → complete
	 * so the Astryx collapsible tool rows animate like a real assistant.
	 */
	const demoToolCalls = (question: string): ChatToolCallItem[] => {
		const q = question.toLowerCase()
		const v = summary.retirement
		const calls: ChatToolCallItem[] = [
			{ name: "get_plan_snapshot", target: "plan/current", node: "plan-engine" },
		]
		if (
			q.includes("retire") ||
			q.includes("เกษียณ") ||
			q.includes("run out") ||
			q.includes("หมด")
		) {
			calls.push({
				name: "simulate_retirement",
				target: v.funded ? `until ${v.endYear}` : `runs out ${v.unmetYear ?? ""}`,
				node: "monte-carlo",
				stats: "200 scenarios",
			})
		}
		if (q.includes("spend") || q.includes("afford") || q.includes("ใช้")) {
			calls.push({
				name: "solve_max_forever",
				target: "monthly withdrawal",
				node: "plan-engine",
			})
		}
		return calls
	}

	const send = () => {
		const text = draft.trim()
		if (!text) return
		const userId = nextId.current++
		const assistantId = nextId.current++
		const calls = demoToolCalls(text)
		// Turn 1: tool calls running (no text yet). Turn 2: calls complete +
		// the canned answer, once the "tools" have had time to finish.
		setMessages((current) => [
			...current,
			{ id: userId, role: "user", text },
			{
				id: assistantId,
				role: "assistant",
				text: "",
				toolCalls: calls.map((call) => ({
					...call,
					status: "running" as const,
				})),
			},
		])
		setDraft("")
		window.setTimeout(() => {
			setMessages((current) =>
				current.map((message) =>
					message.id === assistantId
						? {
								...message,
								text: mockReply(text, summary, t),
								toolCalls: calls.map((call) => ({
									...call,
									status: "complete" as const,
									duration: "0.4s",
								})),
							}
						: message,
				),
			)
		}, 900)
		window.setTimeout(() => {
			logRef.current?.scrollTo({
				top: logRef.current.scrollHeight,
				behavior: "smooth",
			})
		}, 950)
	}

	return (
		<Stack className="assistant-rail" role="log" aria-live="polite">
			<Stack
				direction="horizontal"
				justify="between"
				vAlign="center"
				className="assistant-rail__head"
			>
				<Stack gap={0}>
					<Text weight="semibold">{t("rail.title")}</Text>
					<Text size="sm" color="secondary">
						{t("rail.subtitle")}
					</Text>
				</Stack>
			</Stack>

			<Stack className="assistant-rail__log" ref={logRef}>
				<Text size="sm" color="secondary" className="assistant-rail__day">
					{t("rail.today")}
				</Text>
				<ChatMessageList
					className="assistant-rail__list"
					aria-label={t("rail.title")}
				>
					{messages.length === 0 ? (
						<Text size="sm" color="secondary">
							{t("chat.empty")}
						</Text>
					) : (
						messages.map((message) =>
							message.role === "user" ? (
								<ChatMessage key={message.id} sender="user">
									<ChatMessageBubble name={t("rail.you")}>
										{message.text}
									</ChatMessageBubble>
								</ChatMessage>
							) : (
								<ChatMessage
									key={message.id}
									sender="assistant"
									avatar={
										<Stack
											vAlign="center"
											className="assistant-avatar"
											aria-hidden="true"
										>
											A
										</Stack>
									}
								>
									{message.toolCalls && message.toolCalls.length > 0 ? (
										<ChatToolCalls calls={message.toolCalls} />
									) : null}
									{message.text ? (
										<ChatMessageBubble variant="ghost">
											{message.text}
										</ChatMessageBubble>
									) : null}
								</ChatMessage>
							),
						)
					)}
				</ChatMessageList>
			</Stack>

			<ChatComposer
				className="assistant-composer"
				value={draft}
				onChange={setDraft}
				onSubmit={send}
				placeholder={t("chat.placeholder")}
			/>
		</Stack>
	)
}

/** Canned demo answers derived from the live plan summary. */
export function mockReply(
	text: string,
	summary: PlanSummary,
	t: (key: string, vars?: Record<string, string>) => string,
): string {
	const question = text.toLowerCase()
	const v = summary.retirement
	if (question.includes("retire") || question.includes("เกษียณ")) {
		return t("chat.reply.retirement", {
			status: v.funded ? t("chat.status.funded") : t("chat.status.short"),
			detail: v.funded
				? t("info.retirement.left", {
						amount: formatBaht(v.remainingAtEnd),
						year: String(v.endYear),
					})
				: t("info.retirement.runsOut", {
						year: String(v.unmetYear ?? ""),
					}),
		})
	}
	if (question.includes("run out") || question.includes("หมด")) {
		const year = summary.runsOutYear
		return t("chat.reply.runway", {
			year: year === null ? t("info.runsOut.never") : String(year),
		})
	}
	if (
		question.includes("spend") ||
		question.includes("afford") ||
		question.includes("ใช้")
	) {
		return t("chat.reply.maxForever", {
			amount: formatBaht(summary.maxForeverMonthly),
		})
	}
	return t("chat.reply.fallback")
}
