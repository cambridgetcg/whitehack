#!/usr/bin/env node
import { scan } from '../src/scan.js'
import { report } from '../src/report.js'

const args = process.argv.slice(2)
const cmd = args[0]
const target = args[1] || '.'

if (cmd !== 'scan') {
  console.log(`whitehack v0.2 — make software tell the truth about itself

usage:
  whitehack scan [path]   scan a directory (default: .) for honesty anti-patterns

whitehack flags where code lies about its own state — a failed read that
silently becomes 0, a cached value served as if live, a score shown to a
user with no way to ask why. v0.2 adds blockchain & financial checks:
stale price feeds read as live, ignored ERC-20 transfer results, spot
reserves used as a fair price, reasonless reverts, and currency handled as
a floating-point number. It cannot prove honesty; it surfaces common lies.
Absence of findings is not proof of honesty.`)
  process.exit(cmd === undefined ? 0 : 1)
}

const findings = await scan(target)
const code = report(findings, target)
process.exit(code)
