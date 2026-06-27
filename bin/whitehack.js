#!/usr/bin/env node
import { scan } from '../src/scan.js'
import { report } from '../src/report.js'

const args = process.argv.slice(2)
const cmd = args[0]
const target = args[1] || '.'

if (cmd !== 'scan') {
  console.log(`whitehack v0.4 — make software tell the truth about itself

usage:
  whitehack scan [path]   scan a directory (default: .) for honesty anti-patterns

whitehack flags where code lies about its own state — a failed read that
silently becomes 0, a cached value served as if live, a score shown to a
whitehack v0.4 adds protocol & auth checks:
WiFi (WPA2/3, TKIP, PMF, deauth), Bluetooth (Just Works, E0, HID),
password/auth (hardcoded, MD5/SHA1, JWT none, session in URL, no HTTPS),
insecure protocols, weak crypto, CORS, cookies, SQL injection.

It cannot prove honesty; it surfaces common lies.
Absence of findings is not proof of honesty.`)
  process.exit(cmd === undefined ? 0 : 1)
}

const findings = await scan(target)
const code = report(findings, target)
process.exit(code)
