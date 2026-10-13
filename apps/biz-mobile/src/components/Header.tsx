import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BizOrbitMark } from "@excited-live/design-system";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

export const Header: React.FC = () => {
	const { accounts, activeEntityId, setActiveEntityId, activeTab } = useBiz();
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 4);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const { dismiss } = useModalBack(isOpen, () => setIsOpen(false));

	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;

	return (
		<>
			<header className={`top-header ${isScrolled ? "scrolled" : ""}`}>
				<div className="header-primary-row">
					<div className="header-brand-left" aria-label="excited.live logo" title="excited.live">
						<BizOrbitMark size={24} />
						<div className="header-brand-title">
							<span className="brand-root">excited</span>
							<span className="brand-dot">.</span>
							<span className="brand-tld">live</span>
						</div>
					</div>

					{activeTab === "capital" && (
						<button
							type="button"
							className="header-account-btn"
							onClick={() => setIsOpen(true)}
							aria-label="Switch Entity"
						>
							<span>{activeAccount.name}</span>
							<span className="header-account-caret">▾</span>
						</button>
					)}
				</div>

			</header>

			{/* Entity Switcher Sheet */}
			{isOpen &&
				createPortal(
					<div className="drawer-backdrop" onClick={dismiss}>
						<div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
							<div className="drawer-handle" />
							<div className="drawer-header">
								<div>
									<h3 className="drawer-title">Switch Account</h3>
									<p className="drawer-sub">Select treasury perspective</p>
								</div>
								<button
									type="button"
									className="drawer-close-btn"
									onClick={dismiss}
									aria-label="Close"
								>
									✕
								</button>
							</div>

							<div className="drawer-body">
								<div className="entity-list">
									{accounts.map((acc) => {
										const isSelected = acc.id === activeEntityId;
										return (
											<button
												key={acc.id}
												type="button"
												className={`entity-select-card ${isSelected ? "selected" : ""}`}
												onClick={() => {
													setActiveEntityId(acc.id);
													dismiss();
												}}
											>
												<div className="entity-card-row">
													<div className="entity-name-col">
														<span className="entity-name">{acc.name}</span>
														<span className="entity-type-badge">{acc.type === "business" ? "Venture" : "Personal"}</span>
													</div>
												<div className="entity-balance-col">
													<span className="entity-balance">฿{formatMoney(acc.cashReserve)}</span>
													<span className="entity-currency">THB</span>
												</div>
												</div>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
};
