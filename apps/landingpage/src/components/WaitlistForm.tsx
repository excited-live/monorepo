import { useEffect, useState, type FormEvent } from 'react';

const WEBHOOK_URL =
	(import.meta.env.PUBLIC_WAITLIST_WEBHOOK_URL as string | undefined) ||
	'https://leads.fromsukong.com/waitlist';

const HP_FIELD = 'company_website';

type Status = 'idle' | 'sending' | 'success' | 'error' | 'invalid';

const COPY = {
	en: {
		placeholder: 'you@email.com',
		button: 'Join the waitlist',
		sending: 'Joining…',
		successTitle: "You're on the list!",
		successBody: ' We saved your spot — see you at launch.',
		errorTitle: 'Something went wrong',
		errorBody: " Couldn't reach the server, so we saved your email on this device. Please try again later.",
		invalidEmail: 'Please enter a valid email address.',
		note: 'No spam — one email at launch, that’s it.',
	},
	th: {
		placeholder: 'อีเมลของคุณ',
		button: 'ลงทะเบียนรอเปิดตัว',
		sending: 'กำลังลงทะเบียน…',
		successTitle: 'อยู่ในลิสต์แล้ว!',
		successBody: ' เก็บสิทธิ์ของคุณไว้ให้แล้ว เจอกันตอนเปิดตัว',
		errorTitle: 'เกิดข้อผิดพลาด',
		errorBody: ' ติดต่อเซิร์ฟเวอร์ไม่ได้ เราบันทึกอีเมลไว้บนเครื่องนี้ให้แล้ว ลองใหม่ภายหลังนะ',
		invalidEmail: 'กรุณากรอกอีเมลที่ถูกต้อง',
		note: 'ไม่สแปม — ส่งแค่อีเมลตอนเปิดตัวครั้งเดียว',
	},
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readLang(): 'en' | 'th' {
	return document.documentElement.dataset.lang === 'th' ? 'th' : 'en';
}

export default function WaitlistForm({ dark = false }: { dark?: boolean }) {
	const [lang, setLang] = useState<'en' | 'th'>('en');
	const [email, setEmail] = useState('');
	const [status, setStatus] = useState<Status>('idle');

	// Re-render when the pure-CSS language toggle flips <html data-lang>.
	useEffect(() => {
		setLang(readLang());
		const observer = new MutationObserver(() => setLang(readLang()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-lang'],
		});
		return () => observer.disconnect();
	}, []);

	const t = COPY[lang];

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (status === 'sending') return;

		const form = event.currentTarget;
		const source = dark ? 'footer' : 'hero';
		const honeypot = (form.elements.namedItem(HP_FIELD) as HTMLInputElement | null)?.value;
		if (honeypot) {
			// Silently accept bot submissions without touching the backend.
			setStatus('success');
			return;
		}

		if (!EMAIL_RE.test(email.trim())) {
			setStatus('error');
			return;
		}

		setStatus('sending');
		try {
			const res = await fetch(WEBHOOK_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					lang,
					source,
					page: window.location.pathname,
				}),
			});
			if (!res.ok) {
				// 400 invalid_email is a validation answer, not an outage — never
				// park it in the on-device list.
				const body = (await res.json().catch(() => null)) as { error?: string } | null;
				if (res.status === 400 && body?.error === 'invalid_email') {
					setStatus('invalid');
					return;
				}
				throw new Error(`HTTP ${res.status}`);
			}
			setStatus('success');
			// GA4 lead event — no-op where GA isn't loaded (previews, localhost).
			window.gtag?.('event', 'generate_lead', { method: 'waitlist', source });
		} catch {
			// Fallback: keep the signup on-device so nobody is lost.
			try {
				const key = 'exl-waitlist-local';
				const raw = localStorage.getItem(key);
				const list: string[] = raw ? JSON.parse(raw) : [];
				if (!list.includes(email.trim())) list.push(email.trim());
				localStorage.setItem(key, JSON.stringify(list));
			} catch {
				/* storage unavailable — surface error as usual */
			}
			setStatus('error');
		}
	}

	if (status === 'success') {
		return (
			<div className="waitlist-success" role="status">
				<span className="check" aria-hidden="true">
					✓
				</span>
				<span>
					<strong>{t.successTitle}</strong>
					{t.successBody}
				</span>
			</div>
		);
	}

	return (
		<form className="waitlist" onSubmit={handleSubmit} noValidate>
			<div className="waitlist-row">
				<input
					type="email"
					name="email"
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						if (status === 'error' || status === 'invalid') setStatus('idle');
					}}
					placeholder={t.placeholder}
					aria-label={t.placeholder}
					autoComplete="email"
					required
				/>
				{/* honeypot — hidden from humans, catches dumb bots */}
				<div className="hp-field" aria-hidden="true">
					<label>
						Leave this empty
						<input type="text" name={HP_FIELD} tabIndex={-1} autoComplete="off" />
					</label>
				</div>
				<button type="submit" className="btn-ink" disabled={status === 'sending'}>
					{status === 'sending' ? t.sending : t.button}
				</button>
			</div>
			{status === 'invalid' || (status === 'error' && !EMAIL_RE.test(email.trim())) ? (
				<p className="waitlist-error" role="alert">
					{t.invalidEmail}
				</p>
			) : status === 'error' ? (
				<p className="waitlist-error" role="alert">
					<strong>{t.errorTitle}.</strong>
					{t.errorBody}
				</p>
			) : (
				<p className="waitlist-note">{t.note}</p>
			)}
		</form>
	);
}
