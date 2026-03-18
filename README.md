# WHITEHACK

> Hands-on security learning through structured vulnerability research on live protocols.
> Every finding is reported responsibly. Every exploit stays in the lab.

## What This Is

A personal security research protocol for:
1. **Learning** — deeply understand how production smart contracts break
2. **Testing** — reproduce known vulnerability classes in a local lab
3. **Hunting** — identify novel issues in in-scope bug bounty programs
4. **Earning** — submit valid findings via Immunefi / direct programs
5. **Building** — feed Zerone's architecture with real attacker knowledge

## Directory Structure

```
whitehack/
├── protocol/           # WHITEHACK methodology & rules of engagement
│   └── RULES.md       # What's in bounds, what's not
├── lab/               # Local sandbox environment
│   ├── contracts/     # Vulnerable contracts for learning (CTF-style)
│   ├── exploits/      # PoC exploit scripts (anvil local fork only)
│   └── tests/         # Foundry test suite
├── scanner/           # Automated analysis scripts
│   ├── scan.py        # Slither wrapper + report generator
│   └── fetch.py       # Pull contracts from chain for analysis
├── targets/           # Active bounty program research
│   └── [program]/     # One folder per target: scope, notes, findings
├── reports/           # Drafted bug reports (before submission)
└── docs/              # Learning notes, vulnerability class writeups
```

## Toolchain

| Tool | Purpose |
|------|---------|
| `forge` | Compile, test, PoC development |
| `anvil` | Local EVM fork for safe exploitation |
| `cast` | Chain interaction, calldata decoding |
| `slither` | Static analysis — automated vulnerability detection |
| `chisel` | Solidity REPL for quick experiments |

## Quick Start

```bash
# Start local fork of mainnet
cd lab && anvil --fork-url $ETH_RPC --block-number latest

# Run static analysis on a contract
python3 scanner/scan.py <contract_address>

# Run lab exploits
forge test --match-path lab/tests/*

# List active targets
ls targets/
```

## The Rule

**PoC code never runs against mainnet or any live network.**
All exploits run against `anvil` forks only.
Valid findings → responsible disclosure via program's designated channel.
