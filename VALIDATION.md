# whitehack — willingness-to-pay validation

The Phase-2 plan is **conditional-go**. The condition, before building *any*
paid tier:

> **Get 5 small Solidity teams to say, in writing, they would pay** for the
> curated Pro rule pack. **No 5 yeses → keep whitehack a free MIT reputation
> asset and do not build the paid tier.** Indie willingness-to-pay for a
> continuous static check is unproven (the research had one data point); this
> step resolves it with evidence instead of faith.

This is a *bet*, not a foregone conclusion. A clear "no" here is a successful
outcome — it saves weeks building a paid surface nobody wants.

---

## What we're testing

Not "is the tool nice." Specifically: **would a small team pay ~$19/mo for a
curated, continuously-updated, regression-tested DeFi rule pack** (oracle
freshness + unchecked-transfer + spot-price), benchmarked against real
exploits — *on top of* free Slither/Aderyn they already run?

The free CLI + GitHub Action is the proof. The paid thing is the maintained
**intelligence feed**, not the checks themselves.

## The proof to lead with

`benchmarks/real-incidents/` — whitehack flags all 5 reconstructed
real-incident lines (Sherlock #579, oracle-no-freshness) and stays silent on
the 3 fixed versions. That's the concrete "we'd have caught this on the PR."

## Outreach draft (Yu sends — these are real people)

> **Important:** I (Claude) only draft this. Sending to real developers is
> outward-facing and yours to do — pick the recipients, send it yourself, and
> never anything misleading.

Short, honest, dev-to-dev. No hype. Targets: small Solidity teams active on
Sherlock/Code4rena who can't afford a $50k audit cadence.

---

**Subject:** quick question — would you pay for this?

Hey — I built a small open-source check that runs on every PR and flags three
DeFi bug classes free linters cover poorly: stale/unchecked price oracles,
unchecked ERC-20 transfer results, and spot-price-as-fair. It caught all the
lines in the Sherlock #579 unchecked-transfer finding and the
oracle-no-freshness pattern in my benchmark.

The tool itself is free and MIT, always will be — it's not an audit, just a
fast guardrail between commits and your next one. **Honest question, not a
sale:** if there were a paid tier (~$19/mo per org) that was a
continuously-updated, regression-tested rule pack benchmarked against new
exploits as they happen — would your team pay for that? Genuine yes / no /
"only if…" all help me decide whether to build it.

Repo: <link>  ·  Benchmark: <link to benchmarks/>

---

## Tracker (need 5 written "yes" / "yes if…")

| # | team / contact | channel | sent | response | would pay? | notes |
|---|----------------|---------|------|----------|------------|-------|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |

**Decision rule:** ≥5 credible yeses → build the Pro rule pack + MoR checkout.
<5 → ship the free tool well, build reputation, revisit monetization later
(consulting / audits / a deeper runtime-monitoring product).
