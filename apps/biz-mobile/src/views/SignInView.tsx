import React, { useState } from "react";
import { BizOrbitMark } from "@excited-live/design-system";
import { useBiz } from "../state";

export const SignInView: React.FC = () => {
	const { loginWithWorkOS, updateUserProfile } = useBiz();
	const [isLoading, setIsLoading] = useState(false);

	const handleSignIn = async () => {
		setIsLoading(true);
		try {
			await loginWithWorkOS();
		} finally {
			setIsLoading(false);
		}
	};

	const handleGuestAccess = () => {
		updateUserProfile({
			id: "usr_guest",
			name: "Guest Solopreneur",
			email: "guest@excited.live",
			orgName: "Preview Venture",
			isAuthenticated: true,
		});
	};

	return (
		<div className="signin-container">
			<div className="signin-hero">
				<div className="signin-medallion">
					<BizOrbitMark size={56} />
				</div>

				<div className="header-brand-title" style={{ fontSize: "22px", marginBottom: "8px" }}>
					<span className="brand-root">excited</span>
					<span className="brand-dot">.</span>
					<span className="brand-tld">biz</span>
				</div>

				<h1 className="signin-title">Autonomous Solopreneur Treasury</h1>

				<p className="signin-subtitle">
					Real-time cash reserves, runway simulations, and capital isolation designed specifically for independent builders.
				</p>

				<div className="signin-actions">
					<button
						type="button"
						className="signin-btn-primary"
						onClick={handleSignIn}
						disabled={isLoading}
					>
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								backgroundColor: "var(--signal-orange, #CF4500)",
								display: "inline-block",
							}}
						/>
						{isLoading ? "Launching Auth..." : "Sign In with WorkOS AuthKit"}
					</button>

					<button
						type="button"
						className="signin-btn-guest"
						onClick={handleGuestAccess}
					>
						Explore Offline Demo
					</button>
				</div>
			</div>

			<footer className="signin-footer">
				<div className="signin-footer-brand">
					<img
						src="/logo-mark.png"
						alt="excited.live"
						style={{
							width: "18px",
							height: "16px",
							objectFit: "contain",
							display: "block",
						}}
					/>
					<span>
						Powered by{" "}
						<strong
							style={{
								background: "linear-gradient(135deg, #C41E3A 0%, #FF7A00 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
							}}
						>
							excited.live
						</strong>
					</span>
				</div>
				<p className="signin-footer-sub">
					Connects seamlessly with the excited.live ecosystem
				</p>
			</footer>
		</div>
	);
};
