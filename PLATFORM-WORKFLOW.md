# WHITEHACK Platform Workflow Guide

## Platform Comparison

| Feature | Immunefi | HackerOne | HackenProof | Bugcrowd | Code4rena |
|---------|---------|-----------|-------------|---------|-----------|
| Model | Bug bounty | Bug bounty | Bug bounty | Bug bounty | Competitive audit |
| Rate limit | 1/24h (new account) | None known | None known | None known | Contest window |
| Payment | Crypto (ALCX etc) | PayPal/USDC/BTC/Bank | USDC (2FA needed) | PayPal/crypto | USDC |
| KYC | Program-specific | No (most programs) | No (most programs) | No | Tax form required |
| PoC required | Always (Alchemix) | Usually | Usually | Usually | Yes |
| Report format | Markdown (5 sections) | Structured form | Markdown | Structured form | Markdown |
| Triage speed | 4 days avg (Alchemix) | Varies | Triaged by HackenProof | Varies | 7-14 days post-contest |

---

## Platform Accounts

| Platform | Username | URL | Payment Status |
|----------|---------|-----|----------------|
| Immunefi | contact@cambridgetcg.com | bugs.immunefi.com | Kwok wallet verified ✅ |
| HackerOne | kwok_whitehat | hackerone.com/kwok_whitehat | Not set up ⚠️ |
| HackenProof | kwok-whitehat | hackenproof.com/hackers/kwok-whitehat | Needs 2FA for wallet ⚠️ |
| Bugcrowd | kwok-whitehat | bugcrowd.com/kwok-whitehat | 2FA enabled, payment TBD ⚠️ |
| Code4rena | kwok_whitehat | code4rena.com/kwok_whitehat | Tax form needed, Discord verify needed ⚠️ |

---

## Submission Workflows

### Immunefi
1. `bugs.immunefi.com/dashboard/new-submission`
2. Select program → confirm name → select asset → select impact
3. Choose severity → fill title/description/PoC → wallet (Kwok)
4. Accept T&Cs → anti-spam confirm → Submit
5. **Rate limit**: 1/24h on new accounts. Next slot: daily after 11:00 AM
6. **Best for**: DeFi protocols, bridges, smart contracts

### HackerOne
1. `hackerone.com/<program>/reports/new`
2. Fill: title, severity (CVSS), weakness, URL/asset, description, impact, PoC
3. Submit — no rate limit
4. **Setup needed**: Add payment method (PayPal fastest, no ID; USDC needs ID verify)
5. **Best for**: CEX infrastructure (Coinbase, Kraken), Uniswap ($2.25M!), Ethereum Foundation

### HackenProof
1. `dashboard.hackenproof.com/` → Submit report
2. Select program → fill structured form
3. **Setup needed**: 2FA for wallet withdrawal (TOTP secret: 7X53UPP2GGJGXS5ATSRSRCQA)
4. **Best for**: New programs (idOS just launched Mar 17, Citrea $250k, DeltaPrime $250k)
5. Payments held in USDC balance until wallet withdrawal enabled

### Bugcrowd
1. `bugcrowd.com/<program>` → Submit button
2. Similar to HackerOne — structured form
3. 2FA live ✅
4. **Best for**: Enterprise/CEX (Coinbase, Intel), some DeFi
5. **Setup needed**: Payment method

### Code4rena (Competitive)
1. Join Chainlink Payment Abstraction V2 contest (started tonight Mar 18, 8PM)
2. Submit findings at `code4rena.com/audits/2026-03-chainlink-payment-abstraction-v2`
3. **Setup needed**: Discord verification (`discord.gg/code4rena` → run verify bot)
4. ETH payment address needed for payouts
5. **Best for**: Large prize pools, EVM-specific deep audits, building reputation

---

## Target Priority Matrix

### Immunefi (1/day rate limit — prioritise highest severity)
| Priority | Target | Max | Est | Submit Date |
|----------|--------|-----|-----|-------------|
| 1 | Lombard M-02 | $250k | $4-10k | Mar 19 |
| 2 | Lombard M-03 | $250k | $4-10k | Mar 20 |
| 3 | XION | $250k | TBD | Mar 21 |
| 4 | Ern H | $50k | $10-25k | Mar 22 |
| 5 | Ern M | $50k | $4k | Mar 23 |
| 6 | DKIM Critical | TBD | $50k+ | Mar 24 |
| 7-8 | Axelar AXL-01/02 | TBD | TBD | Mar 25-26 |

### HackerOne (no rate limit — submit as ready)
| Priority | Target | Max | Why |
|----------|--------|-----|-----|
| 1 | Uniswap v4 | $2.25M | Highest payout in crypto, fewer smart contract hunters |
| 2 | Ethereum Foundation AA | $250k | ERC-4337 account abstraction — complex, less audited |
| 3 | Coinbase | $50k | Infrastructure + web, reliable payer |

### HackenProof (no rate limit — submit as ready)
| Priority | Target | Max | Why |
|----------|--------|-----|-----|
| 1 | Citrea Protocol | $250k | Bitcoin EVM rollup, fresh (Jan 2026) |
| 2 | DeltaPrime | $250k | Leveraged lending, Arbitrum |
| 3 | 1inch | $500k | DEX aggregator, complex routing |
| 4 | idOS | $10k | 2 days old! Launched Mar 17 |

### Bugcrowd (no rate limit — submit as ready)
| Priority | Target | Max | Why |
|----------|--------|-----|-----|
| 1 | Coinbase (Bugcrowd) | TBD | Overlap with H1? Check |
| 2 | Any blockchain program | varies | Survey their programs |

### Code4rena (deadline-driven)
| Contest | Prize | Deadline |
|---------|-------|---------|
| Chainlink Payment Abstraction V2 | $65k | Mar 27 8PM |

---

## PoC Standards by Platform

**Immunefi**: Foundry test or cast commands on anvil fork. Must prove impact.
**HackerOne**: Steps to reproduce sufficient for web/infra; Foundry for SC.
**HackenProof**: Same as Immunefi.
**Bugcrowd**: CVSS score + reproduction steps + impact statement.
**Code4rena**: Foundry test file in their forge-poc-templates format.

---

## Quick Reference: anvil fork command
```bash
~/.foundry/bin/anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/Bj3WYqKITlTLGOup3h4iy --port 8545
```

## Quick Reference: slither scan
```bash
solc-select use <version>
slither contracts/ --exclude-dependencies --json - 2>/dev/null
```
