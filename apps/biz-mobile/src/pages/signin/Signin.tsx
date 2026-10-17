import React from "react";
import { GoogleIcon } from "./components";
import { useSignIn } from "./hooks";

/**
 * Sign-in & Sign-up page (in-app). Email + password and native Google sign-in
 * against the Better Auth tokens mount on the API (/api/v1/auth/*).
 * Pure cloud-first: no offline demo mode, all data lives on Excited Cloud.
 */
export const Signin: React.FC<{ onSignedIn?: () => void }> = ({ onSignedIn }) => {
	const {
		mode,
		setMode,
		name,
		setName,
		email,
		setEmail,
		password,
		setPassword,
		acceptedTerms,
		setAcceptedTerms,
		isLoading,
		isGoogleLoading,
		error,
		setError,
		label,
		handleSubmit,
		handleGoogleSignIn,
		handleTermsClick,
	} = useSignIn(onSignedIn);

	return (
		<div className="signin-container">
			<div className="signin-hero">
				<img
					src="/logo-mark.png"
					alt="Excited Live"
					className="signin-logo"
				/>
				<h1 className="signin-app-title">Excited Live</h1>
				<p className="signin-app-tagline">{label("title")}</p>
			</div>

			<div className="signin-card">
				{/* Tab switcher: Sign In vs Sign Up */}
				<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
					<button
						type="button"
						className={`action-pill-btn ${mode === "signin" ? "primary" : ""}`}
						style={{ flex: 1, justifyContent: "center" }}
						onClick={() => {
							setMode("signin");
							setError(null);
						}}
					>
						{label("tabSignIn")}
					</button>
					<button
						type="button"
						className={`action-pill-btn ${mode === "signup" ? "primary" : ""}`}
						style={{ flex: 1, justifyContent: "center" }}
						onClick={() => {
							setMode("signup");
							setError(null);
						}}
					>
						{label("tabSignUp")}
					</button>
				</div>

				<form onSubmit={handleSubmit} className="signin-form">
					{mode === "signup" && (
						<div className="signin-field">
							<label htmlFor="signin-name" className="signin-label">
								{label("name")}
							</label>
							<input
								id="signin-name"
								name="name"
								type="text"
								autoComplete="name"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="signin-input"
								placeholder={label("namePlaceholder")}
								disabled={isLoading || isGoogleLoading}
							/>
						</div>
					)}

					<div className="signin-field">
						<label htmlFor="signin-email" className="signin-label">
							{label("email")}
						</label>
						<input
							id="signin-email"
							name="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="signin-input"
							placeholder="you@domain.com"
							disabled={isLoading || isGoogleLoading}
						/>
					</div>

					<div className="signin-field">
						<label htmlFor="signin-password" className="signin-label">
							{label("password")}
						</label>
						<input
							id="signin-password"
							name="password"
							type="password"
							autoComplete={mode === "signup" ? "new-password" : "current-password"}
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="signin-input"
							minLength={8}
							placeholder="••••••••"
							disabled={isLoading || isGoogleLoading}
						/>
					</div>

					<label className="signin-checkbox-label">
						<input
							type="checkbox"
							checked={acceptedTerms}
							onChange={(e) => setAcceptedTerms(e.target.checked)}
							disabled={isLoading || isGoogleLoading}
						/>
						<span>
							{label("agreePrefix")}
							<a
								href="https://excited.live/docs/terms"
								onClick={handleTermsClick}
								target="_blank"
								rel="noreferrer"
								className="signin-link"
							>
								{label("termsLink")}
							</a>
						</span>
					</label>

					{error && (
						<p role="alert" className="signin-error">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={!acceptedTerms || isLoading || isGoogleLoading}
						className="signin-button primary"
					>
						{isLoading
							? mode === "signup"
								? label("submittingSignUp")
								: label("submittingSignIn")
							: mode === "signup"
								? label("signUpWithEmail")
								: label("signInWithEmail")}
					</button>

					<div style={{ textAlign: "center", marginTop: "10px" }}>
						<button
							type="button"
							onClick={() => {
								setMode(mode === "signin" ? "signup" : "signin");
								setError(null);
							}}
							style={{
								background: "none",
								border: "none",
								color: "var(--granite)",
								fontSize: "13px",
								cursor: "pointer",
								textDecoration: "underline",
							}}
						>
							{mode === "signin" ? label("needAccount") : label("haveAccount")}
						</button>
					</div>
				</form>

				<div className="signin-divider">
					<span>or</span>
				</div>

				<button
					type="button"
					onClick={handleGoogleSignIn}
					disabled={!acceptedTerms || isLoading || isGoogleLoading}
					className="signin-button google"
				>
					<GoogleIcon />
					<span>
						{isGoogleLoading ? label("googleSubmitting") : label("google")}
					</span>
				</button>

				<p
					style={{
						fontSize: "11px",
						color: "var(--slate-gray)",
						textAlign: "center",
						marginTop: "16px",
						lineHeight: 1.4,
					}}
				>
					{label("cloudNotice")}
				</p>
			</div>
		</div>
	);
};

export const SignIn = Signin;
export const SignInView = Signin;
