#!/usr/bin/env python3
"""Independent recompute of @excited-live/biz math — pure Python, no shared code.

Recomputes:
1. Prame's verified baseline subscriptions (฿2,577.50/mo)
2. October 2026 straight-line depreciation (฿537.23/mo)
3. Combined October 2026 headline burn (฿3,114.73/mo)
4. November 2026 iPad drop-off (฿2,933.06/mo)
5. Capital transfer runway impact
"""

import sys

# 1. Recurring Subscriptions
SUBSCRIPTIONS = [
    ("BTS SkyTrain", 1400.0, "monthly"),
    ("AIS Fibre", 540.0, "monthly"),
    ("Opencode Go", 360.0, "monthly"),
    ("Mobile Internet", 170.0, "monthly"),
    ("Make (Integromat)", 57.5, "monthly"),
    ("Domain Name", 360.0, "yearly"),
    ("Phone Line", 20.0, "monthly"),
]

def monthly_equiv(amount, cycle):
    if cycle == "monthly":
        return amount
    elif cycle == "yearly":
        return round(amount / 12.0, 2)
    elif cycle == "weekly":
        return round((amount * 52.0) / 12.0, 2)
    return amount

total_sub = sum(monthly_equiv(amt, cyc) for _, amt, cyc in SUBSCRIPTIONS)
print(f"1. Total Recurring Subscriptions: ฿{total_sub:,.2f}/mo (Expected: ฿2,577.50)")
assert abs(total_sub - 2577.50) < 0.01, f"Recurring mismatch: {total_sub}"

# 2. Hardware Assets (Straight-line depreciation)
# (Name, Cost, LifespanMonths, PurchaseYM)
# Note: iPad purchased 2021-11 reaches 60th active month in 2026-10, dropping in 2026-11
HARDWARE = [
    ("Workstation PC", 30000.0, 60, "Historical"),
    ("iPad Gen 9", 10900.0, 60, (2021, 11)),
    ("Nothing Phone 2a", 10000.0, 60, (2024, 3)),
    ("SoundCore Space 1", 2800.0, 36, (2024, 3)),
    ("SoundCore Open-Ear", 1000.0, 36, (2026, 5)),
    ("Amazfit Active Edge", 3000.0, 36, (2025, 8)),
]

def depreciation_rate(cost, lifespan_mo, purchase, as_of_ym):
    if purchase == "Historical":
        return 0.0
    p_yr, p_mo = purchase
    c_yr, c_mo = as_of_ym
    elapsed = (c_yr - p_yr) * 12 + (c_mo - p_mo)
    if elapsed >= lifespan_mo:
        return 0.0
    return round(cost / lifespan_mo, 2)

# Oct 2026
dep_oct = sum(depreciation_rate(cost, life, purch, (2026, 10)) for _, cost, life, purch in HARDWARE)
print(f"2. Oct 2026 Total Depreciation: ฿{dep_oct:,.2f}/mo (Expected: ฿537.23)")
assert abs(dep_oct - 537.23) < 0.01, f"Depreciation Oct mismatch: {dep_oct}"

# Unified Headline Oct 2026
headline_oct = round(total_sub + dep_oct, 2)
print(f"3. Combined Oct 2026 Headline Burn: ฿{headline_oct:,.2f}/mo (Expected: ฿3,114.73)")
assert abs(headline_oct - 3114.73) < 0.01, f"Headline Oct mismatch: {headline_oct}"

# Nov 2026 (iPad finishes month 60, drops to 0)
dep_nov = sum(depreciation_rate(cost, life, purch, (2026, 11)) for _, cost, life, purch in HARDWARE)
print(f"4. Nov 2026 Total Depreciation: ฿{dep_nov:,.2f}/mo (Expected: ฿355.56)")
assert abs(dep_nov - 355.56) < 0.01, f"Depreciation Nov mismatch: {dep_nov}"

headline_nov = round(total_sub + dep_nov, 2)
print(f"5. Combined Nov 2026 Headline Burn: ฿{headline_nov:,.2f}/mo (Expected: ฿2,933.06)")
assert abs(headline_nov - 2933.06) < 0.01, f"Headline Nov mismatch: {headline_nov}"

# Capital Transfer Simulation
p_cash_0, p_burn = 125000.0, 3114.73
b_cash_0, b_net_burn = 45000.0, 2472.50
transfer = 20000.0

p_cash_1 = p_cash_0 - transfer
b_cash_1 = b_cash_0 + transfer
p_runway_1 = round(p_cash_1 / p_burn, 2)
b_runway_1 = round(b_cash_1 / b_net_burn, 2)

print(f"6. Transfer ฿20k -> Personal Runway: {p_runway_1} mos | Business Runway: {b_runway_1} mos")
assert abs(p_runway_1 - 33.71) < 0.01
assert abs(b_runway_1 - 26.29) < 0.01

print("\nAll independent Python recomputations PASS 100%!")
