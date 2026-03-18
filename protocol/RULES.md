# WHITEHACK — Rules of Engagement

## The Core Principle

White hat means the protocol benefits from your work.
If your actions could harm users, break production, or extract real funds — stop.

---

## What's In Bounds

- Static analysis of any public on-chain contract
- Dynamic testing against `anvil --fork-url` (local fork, isolated)
- Reading, decoding, and replaying transactions in local forks
- Submitting findings to programs where the contract is **explicitly in scope**
- Proof-of-concept code that runs locally and demonstrates impact
- Learning from disclosed historical exploits (post-mortem analysis)

## What's Out of Bounds

- Any interaction with mainnet/testnet contracts that could be construed as attack
- Front-running, sandwich attacking, or MEV extraction from real users
- Accessing off-chain systems (admin panels, APIs) without explicit permission
- Submitting to programs without reading their scope page carefully
- Sharing undisclosed vulnerability details publicly before patching
- Exploiting a vulnerability to extract real funds, even "to prove it works"

## Before Touching Any Target

Checklist:
- [ ] Read the program's scope page in full
- [ ] Confirm the contract address is listed as in-scope
- [ ] Confirm the vulnerability class is not excluded
- [ ] Note the maximum payout for severity level
- [ ] Set up a local anvil fork at the right block number

## Responsible Disclosure Flow

1. Reproduce the vulnerability in local anvil fork
2. Write a clear report: impact, root cause, PoC steps, recommended fix
3. Save report to `reports/[program]-[date]-[short-title].md`
4. Submit via the program's designated channel (Immunefi dashboard, HackerOne, or direct)
5. Respect the program's SLA (usually 90 days before public disclosure)
6. Do not discuss the finding publicly until patched + disclosed

## Severity Reference (Immunefi Standard)

| Level | Impact | Typical Payout |
|-------|--------|----------------|
| Critical | Direct theft of funds / protocol insolvency | $50K–$10M+ |
| High | Indirect fund loss / governance manipulation | $10K–$100K |
| Medium | Griefing / temporary DoS / minor fund loss | $1K–$20K |
| Low | Best practice violations, no direct fund loss | $100–$5K |
| Informational | Code quality, no security impact | Often unpaid |

## The Kingdom Test

Before any action: "Would I be comfortable explaining this to Yu?"
If not — don't do it.
