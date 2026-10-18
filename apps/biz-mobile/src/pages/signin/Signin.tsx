import React from "react";
import { Img, Link } from "@excited-live/design-system";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { GoogleIcon } from "./components";
import { useSignIn } from "./hooks";

/**
 * Sign-in & Sign-up page (in-app). Email + password and native Google sign-in
 * against the Better Auth tokens mount on the API (/api/v1/auth/*).
 * Pure cloud-first: no offline demo mode, all data lives on Excited Cloud.
 */
const INPUT_CLASS = "h-[50px] rounded-[14px] bg-white";

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

	const isBusy = isLoading || isGoogleLoading;
	const isSignUp = mode === "signup";

	const switchMode = (next: "signin" | "signup") => {
		setMode(next);
		setError(null);
	};

	return (
		<Stack align="center" justify="center" width="100%" maxWidth={440} className="mx-auto min-h-dvh px-5 py-6">
			<Stack align="center" width="100%" gap={1.5} className="mb-6 text-center">
				<Img src="/logo-mark.png" alt="Excited Live" className="mb-2 h-12 w-14 object-contain" />
				<Heading level={1} className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">
					Excited Live
				</Heading>
				<Text className="text-sm text-slate">{label("title")}</Text>
			</Stack>

			<Stack gap={4} width="100%">
				<HStack gap={2} width="100%">
					<Button
						label={label("tabSignIn")}
						size="lg"
						variant={isSignUp ? "secondary" : "primary"}
						width="100%"
						onClick={() => switchMode("signin")}
					/>
					<Button
						label={label("tabSignUp")}
						size="lg"
						variant={isSignUp ? "primary" : "secondary"}
						width="100%"
						onClick={() => switchMode("signup")}
					/>
				</HStack>

				<Stack as="form" gap={4} width="100%" onSubmit={handleSubmit}>
					{isSignUp && (
						<TextInput
							className={INPUT_CLASS}
							label={label("name")}
							htmlName="name"
							autoComplete="name"
							required
							value={name}
							onChange={setName}
							placeholder={label("namePlaceholder")}
							isDisabled={isBusy}
						/>
					)}

					<TextInput
							className={INPUT_CLASS}
						label={label("email")}
						htmlName="email"
						type="email"
						autoComplete="email"
						required
						value={email}
						onChange={setEmail}
						placeholder="you@domain.com"
						isDisabled={isBusy}
					/>

					<TextInput
							className={INPUT_CLASS}
						label={label("password")}
						htmlName="password"
						type="password"
						autoComplete={isSignUp ? "new-password" : "current-password"}
						required
						minLength={8}
						value={password}
						onChange={setPassword}
						placeholder="••••••••"
						isDisabled={isBusy}
					/>

					<HStack gap={2} className="items-start">
						<CheckboxInput
							isLabelHidden
							label={`${label("agreePrefix")}${label("termsLink")}`}
							value={acceptedTerms}
							onChange={setAcceptedTerms}
							isDisabled={isBusy}
						/>
						<Text
							className="cursor-pointer text-[12.5px] leading-snug text-slate"
							onClick={() => !isBusy && setAcceptedTerms(!acceptedTerms)}
						>
							{label("agreePrefix")}
							<Link
								href="https://excited.live/docs/terms"
								onClick={(e) => {
									e.stopPropagation();
									handleTermsClick(e);
								}}
								target="_blank"
								rel="noreferrer"
								className="font-semibold text-signal no-underline"
							>
								{label("termsLink")}
							</Link>
						</Text>
					</HStack>

					{error && (
						<Text as="p" role="alert" className="text-[13px] text-signal">
							{error}
						</Text>
					)}

					<Button
						type="submit"
						label={
							isLoading
								? isSignUp
									? label("submittingSignUp")
									: label("submittingSignIn")
								: isSignUp
									? label("signUpWithEmail")
									: label("signInWithEmail")
						}
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!acceptedTerms || isBusy}
					/>

					<Button
						label={isSignUp ? label("haveAccount") : label("needAccount")}
						variant="ghost"
						onClick={() => switchMode(isSignUp ? "signin" : "signup")}
						className="self-center text-[13px] text-granite underline"
					/>
				</Stack>

				<Divider label="or" />

				<Button
					label={isGoogleLoading ? label("googleSubmitting") : label("google")}
					icon={<GoogleIcon />}
					size="lg"
					variant="secondary"
					width="100%"
					className="h-12"
					onClick={handleGoogleSignIn}
					isDisabled={!acceptedTerms || isBusy}
				/>

				<Text as="p" className="mt-1 text-center text-[11px] leading-snug text-slate">
					{label("cloudNotice")}
				</Text>
			</Stack>
		</Stack>
	);
};

export const SignIn = Signin;
export const SignInView = Signin;
