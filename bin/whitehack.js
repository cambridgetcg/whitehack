#!/usr/bin/env node
import { CHECKS, ScanError, scanDetailed } from '../src/scan.js'
import {
  canonicalizeEvidenceCapsule,
  createEvidenceCapsule,
} from '../src/evidence-capsule.js'
import { report, VERSION } from '../src/report.js'
import { escapeTerminal, stringifyJsonSafe } from '../src/output-text.js'
import {
  createScanErrorResult,
  createScanResult,
  exitCodeForFindings,
} from '../src/result.js'

const HELP = `whitehack ${VERSION} — make software tell the truth about itself

usage:
  whitehack scan [path] [--json] [--redacted] [--require-files]
  whitehack capsule [path] [--require-files]

options:
  --json       emit one closed whitehack-scan/v1 JSON document
  --redacted   emit JSON with finding title, message, and snippet removed
  --require-files
               fail with exit 2 when no supported regular files were scanned

capsule emits exact canonical whitehack-evidence-capsule/v1 JSON bytes. It
retains aggregate bundled-check metadata only: no target, paths, lines, source,
messages, snippets, scan scope, or other caller text. It performs no upload.

whitehack flags where code lies about its own state — a failed read that
silently becomes 0, a cached value served as if live, or a score shown with
no inspectable reason.

whitehack ${VERSION} includes protocol, auth, and bounded crypto-awareness checks:
WiFi (WPA2/3, TKIP, PMF, deauth), Bluetooth (Just Works, E0, HID),
password/auth (hardcoded, MD5/SHA1, JWT none, session in URL, no HTTPS),
private material, weak randomness, static AEAD nonces, signature fail-open,
signed-webhook bytes/replay, wallet key egress, request-to-signing, unbounded
capabilities, broadcast retries, unlimited approvals, insecure protocols,
CORS, cookies, SQL injection.

It cannot prove honesty; it surfaces common lies.
Absence of findings is not proof of honesty.`

class CliUsageError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CliUsageError'
    this.code = 'cli_usage'
  }
}

function parseScanArguments(args) {
  let target
  let json = false
  let redacted = false
  let requireFiles = false
  let positionalOnly = false

  for (const arg of args) {
    if (!positionalOnly && arg === '--') {
      positionalOnly = true
      continue
    }
    if (!positionalOnly && arg === '--json') {
      json = true
      continue
    }
    if (!positionalOnly && arg === '--redacted') {
      redacted = true
      json = true
      continue
    }
    if (!positionalOnly && arg === '--require-files') {
      requireFiles = true
      continue
    }
    if (!positionalOnly && arg.startsWith('-')) {
      throw new CliUsageError(`unknown option: ${JSON.stringify(arg)}`)
    }
    if (target !== undefined) throw new CliUsageError('scan accepts at most one path')
    target = arg
  }

  return { target: target ?? '.', json, redacted, requireFiles }
}

function parseCapsuleArguments(args) {
  let target
  let requireFiles = false
  let positionalOnly = false

  for (const arg of args) {
    if (!positionalOnly && arg === '--') {
      positionalOnly = true
      continue
    }
    if (!positionalOnly && arg === '--require-files') {
      requireFiles = true
      continue
    }
    if (!positionalOnly && arg.startsWith('-')) {
      throw new CliUsageError(`unknown option: ${JSON.stringify(arg)}`)
    }
    if (target !== undefined) throw new CliUsageError('capsule accepts at most one path')
    target = arg
  }

  return { target: target ?? '.', requireFiles }
}

function writeJson(document) {
  process.stdout.write(`${stringifyJsonSafe(document)}\n`)
}

function errorCode(error) {
  if (error instanceof ScanError || error instanceof CliUsageError) return error.code
  return 'unexpected_error'
}

function safeErrorTarget(target, code) {
  return code === 'scan_path_unsafe' ? '[unsafe-path]' : target
}

async function run(argv) {
  const command = argv[0]
  if (command === '--version' || command === '-v') {
    process.stdout.write(`${VERSION}\n`)
    return 0
  }
  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(`${HELP}\n`)
    return 0
  }

  if (command === 'capsule') {
    let parsed
    try {
      parsed = parseCapsuleArguments(argv.slice(1))
    } catch (error) {
      process.stderr.write(`whitehack: capsule failed: ${errorCode(error)}\n`)
      return 2
    }

    try {
      const scanned = await scanDetailed(parsed.target)
      if (parsed.requireFiles && scanned.scope.files_scanned === 0) {
        throw new ScanError('scan_empty_scope', 'no supported regular files were scanned')
      }
      const scanResult = createScanResult({
        version: VERSION.slice(1),
        checkCount: CHECKS.length,
        target: parsed.target,
        findings: scanned.findings,
        scope: scanned.scope,
        redacted: true,
      })
      const capsule = createEvidenceCapsule(scanResult)
      const bytes = canonicalizeEvidenceCapsule(capsule)
      process.stdout.write(bytes)
      return 0
    } catch (error) {
      process.stderr.write(`whitehack: capsule failed: ${errorCode(error)}\n`)
      return 2
    }
  }

  const jsonRequested = argv.includes('--json') || argv.includes('--redacted')
  if (command !== 'scan') {
    const error = new CliUsageError(`unknown command: ${JSON.stringify(command)}`)
    if (jsonRequested) {
      writeJson(createScanErrorResult({
        version: VERSION.slice(1),
        checkCount: CHECKS.length,
        target: '.',
        code: error.code,
        redacted: argv.includes('--redacted'),
      }))
      process.stderr.write(`whitehack: ${error.code}\n`)
    } else {
      process.stdout.write(`${HELP}\n`)
    }
    return 2
  }

  let parsed
  try {
    parsed = parseScanArguments(argv.slice(1))
  } catch (error) {
    if (jsonRequested) {
      writeJson(createScanErrorResult({
        version: VERSION.slice(1),
        checkCount: CHECKS.length,
        target: '.',
        code: errorCode(error),
        redacted: argv.includes('--redacted'),
      }))
      process.stderr.write(`whitehack: ${errorCode(error)}\n`)
    } else {
      process.stderr.write(`whitehack: ${escapeTerminal(error.message)}\n`)
    }
    return 2
  }

  try {
    const scanned = await scanDetailed(parsed.target)
    if (parsed.requireFiles && scanned.scope.files_scanned === 0) {
      throw new ScanError('scan_empty_scope', 'no supported regular files were scanned')
    }
    if (parsed.json) {
      writeJson(createScanResult({
        version: VERSION.slice(1),
        checkCount: CHECKS.length,
        target: parsed.target,
        findings: scanned.findings,
        scope: scanned.scope,
        redacted: parsed.redacted,
      }))
      return exitCodeForFindings(scanned.findings)
    }
    return report(scanned.findings, parsed.target)
  } catch (error) {
    if (parsed.json) {
      const code = errorCode(error)
      writeJson(createScanErrorResult({
        version: VERSION.slice(1),
        checkCount: CHECKS.length,
        target: safeErrorTarget(parsed.target, code),
        code,
        redacted: parsed.redacted,
      }))
      process.stderr.write(`whitehack: scan failed: ${code}\n`)
    } else {
      process.stderr.write(`whitehack: scan failed: ${escapeTerminal(error.message)}\n`)
    }
    return 2
  }
}

process.exitCode = await run(process.argv.slice(2))
