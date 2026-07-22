import assert from 'node:assert/strict'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { CHECKS, scan } from '../src/scan.js'
import { report } from '../src/report.js'
import { exposedConfig } from '../src/checks/exposed-config.js'
import { hardcodedSecret } from '../src/checks/hardcoded-secret.js'
import { weakCrypto } from '../src/checks/weak-crypto.js'
import { staticAeadNonce } from '../src/checks/static-aead-nonce.js'
import { signatureFailOpen } from '../src/checks/signature-fail-open.js'
import { webhookReencodedBody } from '../src/checks/webhook-reencoded-body.js'
import { signedWebhookWithoutReplayGuard } from '../src/checks/signed-webhook-without-replay-guard.js'
import { walletKeyEgress } from '../src/checks/wallet-key-egress.js'
import { walletDirectRequestSigning } from '../src/checks/wallet-direct-request-signing.js'
import { walletCapabilityUnbounded } from '../src/checks/wallet-capability-unbounded.js'
import { walletBroadcastAutoRetry } from '../src/checks/wallet-broadcast-auto-retry.js'
import { unlimitedTokenApproval } from '../src/checks/unlimited-token-approval.js'
import { calculateGateRank, parseWhitehackOutput, scanRepo } from '../bin/whitehack-gate-bridge.js'

const EXPECTED_CHECK_IDS = [
  'api-bare-fetch',
  'api-error-without-shape',
  'api-missing-rate-limit',
  'api-missing-versioning',
  'api-status-lie',
  'bluetooth-paired-stranger',
  'bluetooth-protocol',
  'bluetooth-protocol-flaws',
  'cache-as-live',
  'cookie-insecure',
  'cors-wildcard',
  'decision-without-why',
  'disabled-cert-verification',
  'dns-plaintext',
  'exposed-config',
  'float-money',
  'hardcoded-secret',
  'insecure-protocol',
  'password-auth',
  'performed-ignorance',
  'protocol-surface',
  'signature-fail-open',
  'signed-webhook-without-replay-guard',
  'silent-failure',
  'silent-revert',
  'spot-price-as-fair',
  'sql-injection',
  'stale-oracle',
  'static-aead-nonce',
  'trust-by-authority',
  'unchecked-transfer',
  'unlimited-token-approval',
  'unsafe-eval',
  'wallet-broadcast-auto-retry',
  'wallet-capability-unbounded',
  'wallet-direct-request-signing',
  'wallet-key-egress',
  'weak-crypto',
  'weak-wifi-encryption',
  'webhook-reencoded-body',
  'wifi-deauth-accept',
  'wifi-evil-twin',
  'wifi-krack-vulnerable',
  'wifi-pmk-exposure',
  'wifi-protocol',
  'wifi-protocol-flaws',
  'wpa2-krack',
]

const CRYPTO_CHECK_FILES = [
  '../src/checks/hardcoded-secret.js',
  '../src/checks/weak-crypto.js',
  '../src/checks/static-aead-nonce.js',
  '../src/checks/signature-fail-open.js',
  '../src/checks/webhook-reencoded-body.js',
  '../src/checks/signed-webhook-without-replay-guard.js',
  '../src/checks/wallet-key-egress.js',
  '../src/checks/wallet-direct-request-signing.js',
  '../src/checks/wallet-capability-unbounded.js',
  '../src/checks/wallet-broadcast-auto-retry.js',
  '../src/checks/unlimited-token-approval.js',
]

function detect(check, source, lang) {
  return check.detect(source, source.split('\n'), { lang })
}

function effectiveConfidence(check, hit) {
  return hit.confidence || check.confidence
}

function assertNoHits(check, cases, lang) {
  for (const [name, source] of Object.entries(cases)) {
    assert.deepEqual(detect(check, source, lang), [], name)
  }
}

test('registers exactly the unique 47-check pack', () => {
  const ids = CHECKS.map((check) => check.id)
  assert.equal(ids.length, 47)
  assert.equal(new Set(ids).size, 47)
  assert.deepEqual([...ids].sort(), EXPECTED_CHECK_IDS)
  for (const check of CHECKS) {
    assert.match(check.id, /^[a-z][a-z0-9-]{0,63}$/)
  }
})

test('exposes the canonical scanner at the package root', async () => {
  const packageApi = await import('@agenttool/whitehack-scan')
  assert.equal(packageApi.scan, scan)
  assert.equal(packageApi.CHECKS, CHECKS)
})

test('CLI help and version are successful introspection commands', () => {
  const cli = fileURLToPath(new URL('../bin/whitehack.js', import.meta.url))
  const version = execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' })
  const help = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' })
  assert.equal(version.trim(), 'v0.7.1')
  assert.match(help, /usage:/)
  assert.match(help, /47|bounded crypto-awareness/i)
})

test('fails closed when the requested scan root does not exist', async () => {
  const missing = join(tmpdir(), `whitehack-missing-${process.pid}-${Date.now()}`)
  await assert.rejects(scan(missing), /cannot access scan root/)
})

test('README inventory stays aligned with registered check metadata', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  const rows = new Map()
  for (const line of readme.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim())
    const id = cells[1]?.match(/^`([a-z][a-z0-9-]+)`$/)?.[1]
    if (id && cells.length >= 6) {
      rows.set(id, { doctrine: cells[3], confidence: cells[4] })
    }
  }

  assert.equal(rows.size, CHECKS.length, 'README must document every check exactly once')
  for (const check of CHECKS) {
    const row = rows.get(check.id)
    assert.ok(row, `README is missing ${check.id}`)
    assert.equal(row.doctrine.replace(/\s+/g, '-'), check.doctrine, `${check.id} doctrine`)
    assert.ok(
      row.confidence.split('/').map((value) => value.trim()).includes(check.confidence),
      `${check.id} default confidence`,
    )
  }

  for (let principle = 1; principle <= 5; principle++) {
    const line = readme.split('\n').find((candidate) => candidate.includes(`**#${principle} —`))
    assert.ok(line, `README is missing Clear Standard #${principle}`)
    const documented = [...line.matchAll(/`([a-z][a-z0-9-]+)`/g)]
      .map((match) => match[1])
      .sort()
    const registered = CHECKS.filter((check) => check.principle === principle)
      .map((check) => check.id)
      .sort()
    assert.deepEqual(documented, registered, `Clear Standard #${principle} mapping`)
  }
})

test('moving-main installer selects the extracted child and installs a runnable full package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'whitehack-installer-test-'))
  const fixtureParent = join(root, 'fixture')
  const fixtureRoot = join(fixtureParent, 'whitehack-main')
  const archive = join(root, 'whitehack-main.tar.gz')
  const fakeBin = join(root, 'bin')
  const installRoot = join(root, 'installed')
  const required = [
    'bin', 'src', 'test', 'examples', 'package.json',
    'README.md', 'LICENSE', 'LEARN.md', 'LOOP.md', 'CONTRIBUTING.md', 'SHARE.md',
  ]

  try {
    await mkdir(fixtureRoot, { recursive: true })
    await mkdir(fakeBin, { recursive: true })
    for (const path of required) {
      await cp(new URL(`../${path}`, import.meta.url), join(fixtureRoot, path), { recursive: true })
    }
    execFileSync('tar', ['-czf', archive, '-C', fixtureParent, 'whitehack-main'])

    const fakeCurl = join(fakeBin, 'curl')
    await writeFile(fakeCurl, `#!/usr/bin/env bash
set -euo pipefail
out=''
while [ "$#" -gt 0 ]; do
  if [ "$1" = '-o' ]; then out="$2"; shift 2; else shift; fi
done
test -n "$out"
cp "$WHITEHACK_TEST_ARCHIVE" "$out"
`)
    await chmod(fakeCurl, 0o755)

    const env = {
      ...process.env,
      HOME: join(root, 'home'),
      NO_PATH: '1',
      PATH: `${fakeBin}:${process.env.PATH}`,
      WHITEHACK_TEST_ARCHIVE: archive,
    }
    execFileSync('bash', [fileURLToPath(new URL('../install.sh', import.meta.url)), installRoot], {
      env,
      stdio: 'pipe',
    })
    execFileSync(join(installRoot, 'bin/whitehack'), [], { env, stdio: 'pipe' })
    assert.equal((await stat(join(installRoot, 'bin/whitehack.js'))).mode & 0o111, 0o111)
    assert.ok(await readFile(join(installRoot, 'src/checks/static-aead-nonce.js'), 'utf8'))
    assert.equal((await stat(new URL('../install.sh', import.meta.url))).mode & 0o111, 0o111)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('legacy gate bridge preserves high confidence and current check identity', () => {
  const output = [
    '  config.js',
    '    ! L3  Config file contains embedded credentials  (substrate-honesty · high · CS#2)',
  ].join('\n')
  const findings = parseWhitehackOutput(output)
  assert.deepEqual(findings, [{
    check_id: 'exposed-config',
    file: 'config.js',
    line: 3,
    severity: 'high',
    message: 'Config file contains embedded credentials',
  }])
  assert.equal(calculateGateRank(findings, null), 'C')
  assert.equal(calculateGateRank([{
    check_id: 'hardcoded-secret',
    severity: 'heuristic',
  }], null), 'E', 'a per-hit heuristic must not inherit a confident check bonus')
})

test('report preserves high confidence in its summary and exit code', () => {
  const output = []
  const originalLog = console.log
  console.log = (...parts) => output.push(parts.join(' '))
  try {
    const code = report([{
      file: 'config\u001b[31m.json',
      line: 1,
      check: 'exposed-config',
      title: 'Config file contains embedded credentials',
      confidence: 'high',
      doctrine: 'substrate-honesty',
      principle: 2,
      message: 'synthetic finding',
      snippet: '[redacted: sensitive source match]\u202e',
    }], '.\u001b[31m')
    assert.equal(code, 1)
  } finally {
    console.log = originalLog
  }
  assert.match(output.join('\n'), /1 finding\(s\) — 1 high/)
  assert.doesNotMatch(output.join('\n'), /1 medium-high/)
  assert.equal(output.join('\n').includes('\u001b'), false)
  assert.equal(output.join('\n').includes('\u202e'), false)
  assert.match(output.join('\n'), /\\u001b/)
  assert.match(output.join('\n'), /\\u202e/)
})

test('legacy gate bridge passes repository metacharacters as literal argv', async () => {
  const root = await mkdtemp(join(tmpdir(), 'whitehack-bridge-argv-'))
  const hostile = join(root, `repo-$${'(printf INJECTED)'}`)
  try {
    await mkdir(hostile)
    await writeFile(join(hostile, 'safe.js'), 'export const safe = true\n')
    assert.deepEqual(scanRepo(hostile), [])
    const bridgeOutput = execFileSync(
      process.execPath,
      [fileURLToPath(new URL('../bin/whitehack-gate-bridge.js', import.meta.url)), 'scan', hostile],
      { encoding: 'utf8' },
    )
    assert.match(bridgeOutput, /No registered anti-patterns matched/)
    assert.doesNotMatch(bridgeOutput, /No findings — the code tells the truth/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('crypto checks import only local text helpers and expose no active capabilities', async () => {
  const forbiddenCalls = [
    /\bfetch\s*\(/,
    /\bnew\s+(?:WebSocket|JsonRpcProvider|Web3|Wallet)\s*\(/,
    /\.(?:sendTransaction|signTransaction|signMessage)\s*\(/,
    /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/,
  ]

  for (const relativePath of CRYPTO_CHECK_FILES) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
    const importLines = source.split('\n').filter((line) => /^\s*import\b/.test(line))
    for (const line of importLines) {
      const match = line.match(
        /\bfrom\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/,
      )
      assert.ok(match, `${relativePath}: import must be statically inspectable`)
      const specifier = match[1] || match[2]
      assert.match(specifier, /^\.\.?\//, `${relativePath}: non-local import ${specifier}`)
    }
    assert.doesNotMatch(source, /\bimport\s*\(/, `${relativePath}: dynamic import`)
    assert.doesNotMatch(
      source,
      /\brequire\s*\(\s*['"](?:node:)?(?:child_process|net|http|https|tls|dgram|dns)['"]\s*\)/,
      `${relativePath}: capability module`,
    )
    for (const forbidden of forbiddenCalls) {
      assert.doesNotMatch(source, forbidden, `${relativePath}: active capability call`)
    }
  }

  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  for (const lifecycle of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly']) {
    assert.equal(pkg.scripts?.[lifecycle], undefined, `unexpected lifecycle script: ${lifecycle}`)
  }
})

test('recognises private-key material and redacts every check-level hit', () => {
  const privateKey = `0x${'1a'.repeat(32)}`
  const recoveryPhrase = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
    'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
  ].join(' ')
  const source = [
    `const signing_private_key = "${privateKey}"`,
    `recovery_phrase = "${recoveryPhrase}"`,
    'const embedded_key_pem = `',
    '-----BEGIN PRIVATE KEY-----',
    'synthetic-pem-payload',
    '-----END PRIVATE KEY-----',
    '`',
  ].join('\n')

  const hits = detect(hardcodedSecret, source)
  assert.equal(hits.length, 3)
  assert.equal(effectiveConfidence(hardcodedSecret, hits[0]), 'high')
  assert.equal(effectiveConfidence(hardcodedSecret, hits[1]), 'heuristic')
  assert.equal(effectiveConfidence(hardcodedSecret, hits[2]), 'high')
  assert.ok(hits.every((hit) => hit.snippet === '[redacted: sensitive source match]'))
  assert.ok(!JSON.stringify(hits).includes(privateKey))
  assert.ok(!JSON.stringify(hits).includes(recoveryPhrase))
})

test('hardcoded-secret filters only the captured value, never unrelated context', () => {
  const privateKey = `0x${'2b'.repeat(32)}`
  const shapedCredential = 'synthetic-marker-123456'

  assert.equal(detect(
    hardcodedSecret,
    `private_key = "${privateKey}" # replace_me after deploy`,
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `const client_secret = "${shapedCredential}"; const other = process.env.OTHER`,
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `const example_client_secret = "${shapedCredential}"`,
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `const stripeApiKey = "${shapedCredential}"`,
    'js',
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `const apiKey: string = "${shapedCredential}"`,
    'js',
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `const apiKey = \`${shapedCredential}\``,
    'js',
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `{"wallet_private_key":"${privateKey}"}`,
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    'const client_secret = "example-placeholder"; const api_key = "realish-marker-123456"',
  ).length, 1)
  assert.equal(detect(
    exposedConfig,
    '{"client_secret":"example-placeholder","apiKey":"realish-marker-123456"}',
  ).length, 1)
  const urlCredential = detect(
    exposedConfig,
    'const apiUrl = "https://service.invalid/path?token=realish-marker-123456"',
    'js',
  )
  assert.equal(urlCredential.length, 1)
  assert.equal(effectiveConfidence(exposedConfig, urlCredential[0]), 'heuristic')
  assert.equal(urlCredential[0].snippet, '[redacted: sensitive source match]')
  assert.ok(!JSON.stringify(urlCredential).includes('realish-marker-123456'))

  assertNoHits(hardcodedSecret, {
    'placeholder value': 'const client_secret = "example-placeholder"',
    'environment value': 'const client_secret = process.env.CLIENT_SECRET',
    'JavaScript PEM comment': '// -----BEGIN PRIVATE KEY-----',
    'Python encrypted-PEM comment': '# -----BEGIN ENCRYPTED PRIVATE KEY-----',
    'public key': `const public_key = "0x${'3c'.repeat(32)}"`,
    'quoted JSON example': `const docs = '{"wallet_private_key":"${privateKey}"}'`,
    'PEM docs name': 'const keyboardDocs = `\n-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----\n`',
    'explicit example PEM': 'const privateKeyExample = `\n-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----\n`',
  })
  assertNoHits(exposedConfig, {
    'quoted config documentation': 'const docs = \'{"apiKey":"realish-marker-123456"}\'',
    'quoted URL documentation': 'const docs = "https://service.invalid/?token=realish-marker-123456"',
  })
  assertNoHits(exposedConfig, {
    monkey: 'const monkey=abcdefgh',
    'generic key variable': 'const key=cacheKeyValue',
    'generic token variable': 'const token=sessionIdentifier',
    'unquoted password variable': 'const password=environmentValue',
    'generic JSON key': '{"key":"navigation-marker-123456"}',
    'multiline block docs': '/*\n{"apiKey":"realish-marker-123456"}\n*/',
  }, 'js')
  assertNoHits(exposedConfig, {
    'Python docstring': 'docs = """\n{"apiKey":"realish-marker-123456"}\n"""',
  }, 'py')
})

test('language-aware secret lexing preserves JS private fields and Python comment rules', () => {
  const privateKey = `0x${'5e'.repeat(32)}`
  assert.equal(detect(
    hardcodedSecret,
    `class Vault { #apiKey = "synthetic-marker-123456"; }`,
    'js',
  ).length, 1)
  assert.equal(detect(
    hardcodedSecret,
    `half = n // 2; private_key = "${privateKey}"`,
    'py',
  ).length, 1)
  assert.deepEqual(detect(
    hardcodedSecret,
    `x = 1# private_key = "${privateKey}"`,
    'py',
  ), [])
  const multiline = detect(
    hardcodedSecret,
    `private_key = """\n${privateKey}\n"""`,
    'py',
  )
  assert.equal(multiline.length, 1)
  assert.equal(effectiveConfidence(hardcodedSecret, multiline[0]), 'high')
})

test('public CHECKS detectors enforce fixed redaction for sensitive rules', () => {
  const marker = 'SYNTHETIC-MARKER-123456'
  const cases = [
    ['exposed-config', `{"apiKey":"${marker}"}`, 'json'],
    ['cookie-insecure', `res.cookie("session", "${marker}")`, 'js'],
  ]
  for (const [id, source, lang] of cases) {
    const check = CHECKS.find(({ id: candidate }) => candidate === id)
    const hits = detect(check, source, lang)
    assert.ok(hits.length > 0, id)
    assert.ok(hits.every(({ snippet }) => snippet === '[redacted: sensitive source match]'), id)
    assert.ok(!JSON.stringify(hits).includes(marker), id)
  }
})

test('encrypted PEM and mnemonic-shaped prose stay non-gating heuristics', () => {
  const encrypted = [
    '-----BEGIN ENCRYPTED PRIVATE KEY-----',
    'synthetic-encrypted-payload',
    '-----END ENCRYPTED PRIVATE KEY-----',
  ].join('\n')
  const phrase = 'recovery_phrase = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima"'
  const tripleQuotedPhrase = 'recovery_phrase = """alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima"""'

  const encryptedHits = detect(hardcodedSecret, encrypted)
  const phraseHits = detect(hardcodedSecret, phrase)
  const tripleQuotedHits = detect(hardcodedSecret, tripleQuotedPhrase, 'py')
  assert.equal(encryptedHits.length, 1)
  assert.equal(phraseHits.length, 1)
  assert.equal(tripleQuotedHits.length, 1)
  assert.equal(effectiveConfidence(hardcodedSecret, encryptedHits[0]), 'heuristic')
  assert.equal(effectiveConfidence(hardcodedSecret, phraseHits[0]), 'heuristic')
  assert.equal(effectiveConfidence(hardcodedSecret, tripleQuotedHits[0]), 'heuristic')
})

test('canonical scan output cannot copy credential-shaped source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'whitehack-redaction-'))
  const marker = ['SENSITIVE', 'SYNTHETIC', 'MARKER', '123456789'].join('-')
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ client_secret: marker }))
    await writeFile(
      join(root, 'overlap.js'),
      `const client_secret = "${marker}"; eval(userCode)\n`,
    )
    await writeFile(
      join(root, 'cookie.js'),
      `res.cookie("session", "${marker}-COOKIE", { secure: false })\n`,
    )
    await writeFile(
      join(root, 'private-field.js'),
      `class Vault { #apiKey = "${marker}"; run() { eval(userCode) } }\n`,
    )
    const findings = await scan(root)
    assert.ok(findings.some((finding) => finding.check === 'exposed-config'))
    assert.ok(findings.some((finding) => finding.check === 'unsafe-eval'))
    assert.ok(findings.some((finding) => finding.check === 'cookie-insecure'))
    assert.ok(findings.every((finding) => !JSON.stringify(finding).includes(marker)))
    for (const finding of findings.filter(({ check }) => (
      check === 'exposed-config' || check === 'hardcoded-secret' || check === 'unsafe-eval'
    ))) {
      assert.equal(finding.snippet, '[redacted: sensitive source match]')
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('recognises JS and Python general-purpose RNGs only at security bindings', () => {
  const jsHits = detect(weakCrypto, 'const authToken = Math.random().toString(36)')
  const pyHits = detect(weakCrypto, 'import random\nreset_token = random.getrandbits(128)')
  assert.equal(jsHits.length, 1)
  assert.equal(pyHits.length, 1)
  assert.equal(effectiveConfidence(weakCrypto, jsHits[0]), 'heuristic')
  assert.equal(effectiveConfidence(weakCrypto, pyHits[0]), 'heuristic')

  assertNoHits(weakCrypto, {
    'Web Crypto': 'const authToken = crypto.randomBytes(32)',
    'Python secrets': 'reset_token = secrets.token_bytes(32)',
    animation: 'const animationDelay = Math.random()',
    keyframe: 'const keyframeDelay = Math.random()',
    'unrelated nearby key': 'const key = "panel"\nconst x = 1\nconst animationDelay = Math.random()',
    'inline comment': 'const delay = Math.random() // auth token example',
    'quoted example': 'const example = "const authToken = Math.random()"',
    'asset token value': 'const tokenPrice = Math.random()',
    SystemRandom: 'random = secrets.SystemRandom()\nauth_token = random.choice(alphabet)',
  })
})

test('a separate SystemRandom does not silence an insecure Python random call', () => {
  const source = [
    'secure_rng = secrets.SystemRandom()',
    'auth_token = random.choice(alphabet)',
  ].join('\n')
  assert.equal(detect(weakCrypto, source).length, 1)
})

test('weak algorithm calls remain detectable while comments and quoted examples stay quiet', () => {
  assert.equal(detect(weakCrypto, 'const digest = crypto.createHash("md5").update(authToken)').length, 1)
  assert.equal(detect(weakCrypto, 'digest = hashlib.sha1(auth_token).digest()').length, 1)
  assertNoHits(weakCrypto, {
    'Python comment': '# hashlib.sha1(auth_token) is forbidden here',
    'JavaScript quoted example': 'const example = "crypto.createHash(\\"md5\\").update(authToken)"',
    'mixed-quote documentation': 'const docs = \'crypto.createHash("md5").update(authToken)\'',
    'MD5 ETag': 'const etag = crypto.createHash("md5").update(assetBytes).digest("hex")',
    'Git object id': 'const objectId = crypto.createHash("sha1").update(gitObject).digest("hex")',
  })

  const legacyHmac = detect(
    weakCrypto,
    'const otp = crypto.createHmac("sha1", authKey).update(counter).digest()',
  )
  assert.equal(legacyHmac.length, 1)
  assert.equal(effectiveConfidence(weakCrypto, legacyHmac[0]), 'heuristic')
  assert.match(legacyHmac[0].message, /do not directly break HMAC/)
})

test('block comments, template examples, and Python docstrings never become crypto code', () => {
  const privateKey = `0x${'4d'.repeat(32)}`
  assertNoHits(hardcodedSecret, {
    'JavaScript block comment': `/*\nprivate_key = "${privateKey}"\n*/`,
    'Python docstring': `docs = '''\nprivate_key = "${privateKey}"\n'''`,
    'PEM documentation string': 'docs = `\n-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----\n`',
  })
  assertNoHits(signatureFailOpen, {
    'single-line block comment': '/* if (!verifySignature(payload, signature)) return true */',
    'multiline block comment': '/*\nif (!verifySignature(payload, signature)) return true\n*/',
    'Python docstring': `docs = '''\nif not verify_signature(payload, signature): return True\n'''`,
    'template example': 'const docs = `verifySignature(payload, signature) || true`',
  })
  assertNoHits(weakCrypto, {
    'block-comment digest': '/* crypto.createHash("md5").update(authToken) */',
    'docstring RNG': `docs = """\nauth_token = random.choice(alphabet)\n"""`,
  })
  assertNoHits(staticAeadNonce, {
    'commented nonce': '/*\nconst nonce = Buffer.alloc(12)\nconst c = createCipheriv("aes-256-gcm", key, nonce)\n*/',
  })
})

test('recognises only direct signature fail-open expressions as gating findings', () => {
  const unsafe = [
    'const accepted = verifySignature(payload, signature) || true',
    'accepted = verify_signature(payload, signature) or True',
    'if (!verifySignature(payload, signature)) return true',
    'const accepted = verifySignature(payload, signature).catch(() => true)',
    'const options = { verifySignature: false }',
    'claims = jwt.decode(token, key, algorithms=["HS256"], options={"verify_signature": False})',
  ]
  for (const source of unsafe) {
    const hits = detect(signatureFailOpen, source)
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(signatureFailOpen, hits[0]), 'medium-high', source)
  }
})

test('normal fail-closed signature control flow, comments, and examples stay quiet', () => {
  assertNoHits(signatureFailOpen, {
    'single-line rejection': 'if (!verifySignature(payload, signature)) return false',
    'multiline branch': [
      'function check(payload, signature) {',
      '  if (!verifySignature(payload, signature)) {',
      '    return false',
      '  }',
      '  return true',
      '}',
    ].join('\n'),
    'try-catch rejection': [
      'function check(payload, signature) {',
      '  try { verifySignature(payload, signature) }',
      '  catch (error) {',
      '    return false',
      '  }',
      '  return true',
      '}',
    ].join('\n'),
    'unrelated catch': [
      'const signed = verifySignature(payload, signature)',
      'try { cache.read() } catch (error) {',
      '  return true',
      '}',
    ].join('\n'),
    'branch comment': [
      'if (!verifySignature(payload, signature)) {',
      '  // never return true here',
      '  return false',
      '}',
    ].join('\n'),
    'inline comment': 'const ok = verifySignature(payload, signature) // do not use || true',
    'quoted example': 'const example = "verifySignature(payload, signature) || true"',
    'verification enabled': 'claims = jwt.decode(token, key, options={"verify_signature": True})',
    'type alias': 'type UnverifiedPayload = { verifySignature: false }',
    'interface': 'interface Options {\n  verifySignature: false\n}',
    'multiline type union': 'type Options =\n | { verifySignature: false }\n | { verifySignature: true }',
    'interface brace on next line': 'interface Options\n{\nverifySignature: false\n}',
  })
})

test('static AEAD nonce detection is heuristic across JS and Python', () => {
  const unsafe = [
    'const nonce = Buffer.alloc(12)\nconst cipher = createCipheriv("aes-256-gcm", key, nonce)',
    'nonce = bytes(12)\nciphertext = AESGCM(key).encrypt(nonce, plaintext, aad)',
    'cipher = AES.new(key, AES.MODE_GCM, nonce=bytes(12))',
    'const nonce = Buffer.from("00112233445566778899aabb", "hex")\nconst ciphertext = AESGCM.encrypt(nonce, plaintext)',
  ]
  for (const source of unsafe) {
    const hits = detect(staticAeadNonce, source)
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(staticAeadNonce, hits[0]), 'heuristic')
  }
})

test('generated AEAD nonces and non-AEAD IVs stay quiet', () => {
  assertNoHits(staticAeadNonce, {
    randomBytes: 'const nonce = crypto.randomBytes(12)\nconst cipher = createCipheriv("aes-256-gcm", key, nonce)',
    getRandomValues: [
      'const nonce = new Uint8Array(12)',
      'crypto.getRandomValues(nonce)',
      'const ciphertext = AESGCM.encrypt(nonce, plaintext)',
    ].join('\n'),
    Python: 'nonce = os.urandom(12)\nciphertext = AESGCM(key).encrypt(nonce, plaintext, aad)',
    CBC: 'const iv = Buffer.alloc(16)\nconst cipher = createCipheriv("aes-256-cbc", key, iv)',
    scratch: 'const scratch = Buffer.alloc(12)\nconst nonce = crypto.randomBytes(12)\nconst ciphertext = AESGCM.encrypt(nonce, scratch)',
  })
})

test('recognises re-encoded verifier inputs in JS and Python', () => {
  const unsafe = [
    'function webhook(req, signature) { return constructEvent(JSON.stringify(req.body), signature, secret) }',
    'def webhook(request, sig):\n  return stripe.Webhook.construct_event(json.dumps(request.get_json()), sig, secret)',
    [
      'function webhook(req, signature) {',
      '  return constructEvent(',
      '    JSON.stringify(req.body),',
      '    signature,',
      '    secret,',
      '  )',
      '}',
    ].join('\n'),
  ]
  for (const source of unsafe) {
    const hits = detect(webhookReencodedBody, source)
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(webhookReencodedBody, hits[0]), 'heuristic')
  }
})

test('raw webhook bytes and unrelated serialization stay quiet', () => {
  assertNoHits(webhookReencodedBody, {
    JavaScript: 'function webhook(rawBody, signature) { return constructEvent(rawBody, signature, secret) }',
    Python: 'def webhook(request, sig):\n  return stripe.Webhook.construct_event(request.get_data(cache=False), sig, secret)',
    logging: [
      'function webhook(req) {',
      '  const audit = JSON.stringify(req.body)',
      '  return verifyWebhook(req.rawBody, req.signature)',
      '}',
    ].join('\n'),
    'comment-only context': 'const encoded = verifySignature(JSON.stringify(body), sig) // webhook example only',
    'quoted example': 'const example = "constructEvent(JSON.stringify(req.body), signature, secret)"',
  })
})

test('replay awareness is heuristic and requires an actual guard, not vocabulary', () => {
  const unsafe = [
    'function webhook(rawBody, signature) { return verifyWebhook(rawBody, signature) }',
    'def webhook(raw_body, sig):\n  return stripe.Webhook.construct_event(raw_body, sig, secret)',
    'const uniqueUsers = new Set()\nfunction webhook(rawBody, signature) { return verifyWebhook(rawBody, signature) }',
    'function webhook(rawBody, signature, event_id) { return verifyWebhook(rawBody, signature) }',
    'function webhook(rawBody, signature) { return verifyWebhook(rawBody, signature) } // TODO idempotency',
    'const timestamp = Date.now()\nfunction webhook(rawBody, signature) { return verifyWebhook(rawBody, signature) }',
    'const max_age = 300\nfunction webhook(rawBody, signature) { return verifyWebhook(rawBody, signature) }',
    'function webhook(rawBody, signature, event_id) { rememberProcessed(event_id); return verifyWebhook(rawBody, signature) }',
  ]
  for (const source of unsafe) {
    const hits = detect(signedWebhookWithoutReplayGuard, source)
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(signedWebhookWithoutReplayGuard, hits[0]), 'heuristic')
  }

  const safe = [
    [
      'function webhook(rawBody, signature, event_id) {',
      '  if (alreadyProcessed(event_id)) return false',
      '  rememberProcessedEvent(event_id)',
      '  return verifyWebhook(rawBody, signature)',
      '}',
    ].join('\n'),
    [
      'function webhook(rawBody, signature, timestamp, tolerance) {',
      '  if (Math.abs(Date.now() - timestamp) > tolerance) return false',
      '  return verifyWebhook(rawBody, signature)',
      '}',
    ].join('\n'),
  ]
  for (const source of safe) assert.deepEqual(detect(signedWebhookWithoutReplayGuard, source), [])
})

test('does not claim domain, chain, or address guarantees from vocabulary alone', () => {
  const source = [
    'const domain = { name: "Example", verifyingContract }',
    'const signature = await wallet.signTypedData(domain, types, value)',
    'const sameAddress = getAddress(recovered) === getAddress(expected)',
  ].join('\n')
  for (const check of [
    weakCrypto,
    staticAeadNonce,
    signatureFailOpen,
    webhookReencodedBody,
    signedWebhookWithoutReplayGuard,
    walletKeyEgress,
    walletDirectRequestSigning,
    walletCapabilityUnbounded,
    walletBroadcastAutoRetry,
    unlimitedTokenApproval,
  ]) {
    assert.deepEqual(detect(check, source), [], check.id)
  }
})

test('recognises explicit wallet key output surfaces and keeps source redacted', () => {
  const unsafe = [
    'console.log(privateKey)',
    'logger.info({ wallet_private_key })',
    'logging.info(private_key)',
    'print(recovery_phrase)',
    'return c.json({ mnemonic })',
  ]
  for (const source of unsafe) {
    const lang = /^(?:logging\.|print\()/i.test(source) ? 'py' : 'js'
    const hits = detect(walletKeyEgress, source, lang)
    assert.equal(hits.length, 1, source)
    assert.equal(hits[0].snippet, '[redacted: crypto-awareness match]')
  }
  assert.equal(effectiveConfidence(walletKeyEgress, detect(walletKeyEgress, unsafe[0], 'js')[0]), 'medium-high')
  assert.equal(effectiveConfidence(walletKeyEgress, detect(walletKeyEgress, unsafe[4], 'js')[0]), 'heuristic')
  assertNoHits(walletKeyEgress, {
    descriptor: 'return c.json({ signer_key_id, exportable: false })',
    'public material': 'console.log(walletPublicKey)',
    'encrypted envelope': 'return c.json({ encrypted_private_key_envelope })',
    'private field name': 'class Signer { #privateKeyId = keyId }',
    comment: '// console.log(privateKey)',
    documentation: 'const docs = "export function getPrivateKey()"',
    'explicit refusal': 'function getPrivateKey() { throw new Error("non-exportable") }',
  }, 'js')
})

test('recognises direct request-to-signing paths but respects visible local guards', () => {
  const unsafe = [
    'return wallet.signTransaction(req.body)',
    'return await signer.sign_message(request.json)',
    'const tx = await c.req.json()\nreturn kms.sign(tx)',
    'payload = request.get_json()\nreturn account.sign_transaction(payload)',
  ]
  for (const source of unsafe) {
    const hits = detect(walletDirectRequestSigning, source, source.includes('request.get_json') ? 'py' : 'js')
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(walletDirectRequestSigning, hits[0]), 'heuristic')
  }
  assertNoHits(walletDirectRequestSigning, {
    'validated request': [
      'const tx = await c.req.json()',
      'const intent = validateIntent(tx)',
      'const authorization = assertIntentWithinCapabilityStatic(intent)',
      'return signer.sign_exact(authorization.exactBytes)',
    ].join('\n'),
    'internal exact bytes': 'return signer.sign_exact(signingRequest)',
    'request metadata only': 'const requestId = req.params.id\nreturn signer.sign_exact(preparedPayload)',
    'database transaction': 'return database.sendTransaction(req.body)',
    'cross-function alias': [
      'function readRequest(req) { const tx = req.body; return tx }',
      'function signPrepared() { return wallet.signTransaction(tx) }',
    ].join('\n'),
    comment: '// return wallet.signTransaction(req.body)',
    docs: 'const example = "wallet.signTransaction(req.body)"',
  }, 'js')
})

test('labels explicit unbounded wallet capability values as heuristics', () => {
  const unsafe = [
    'const capability = { actions: ["transfer"], targets: ["*"], expiresAt: now + 60_000 }',
    'const walletPolicy = { maxSpend: Infinity, expiresAt }',
    'const sessionKey = { actions: ["execute"], permissions: { anyContract: true }, expiresAt }',
    'wallet_capability:\n  actions: [transfer]\n  deadline: null',
  ]
  for (const source of unsafe) {
    const hits = detect(walletCapabilityUnbounded, source, source.includes('wallet_capability:') ? 'yaml' : 'js')
    assert.ok(hits.length >= 1, source)
    assert.ok(hits.every((hit) => effectiveConfidence(walletCapabilityUnbounded, hit) === 'heuristic'))
  }
  assertNoHits(walletCapabilityUnbounded, {
    bounded: 'const capability = { targets: [merchant], maxSpend: "1000", maxIntents: 2, expiresAt }',
    'unrelated infinity': 'const graphPolicy = { maxDepth: Infinity }',
    'permissions without allow all': 'const walletPermissions = { methods: ["erc20.transfer"] }',
    'read-only wildcard': 'const walletCapability = { actions: ["readBalance"], accounts: ["*"], expiresAt: tomorrow }',
    'zero disables authority': 'const walletCapability = { actions: ["signTransaction"], expiresAt: 0, maxSpend: 0 }',
    'filesystem capability': 'const capability = { actions: ["writeFile"], targets: ["*"] }',
    'generic write permission': 'const capability = { permissions: ["write"], expiresAt: null }',
    'generic execute permission': 'const capability = { permissions: ["execute"], expiresAt: null }',
    'generic call capability': 'const capability = { actions: ["call"], targets: ["*"] }',
    comment: '// const capability = { targets: ["*"] }',
    docs: 'const example = "const capability = { unlimited: true }"',
  }, 'js')
})

test('recognises automatic wallet broadcast retries and leaves reconciliation paths quiet', () => {
  const unsafe = [
    'return pRetry(() => provider.sendTransaction(signedPayload))',
    'await retryOperation(\n  () => rpc.broadcastTransaction(rawTx),\n)',
    'for (let attempt = 0; attempt < 3; attempt++) {\n  await broadcaster.broadcast_once(payload)\n}',
    '@retry(stop=stop_after_attempt(3))\ndef submit():\n  return rpc.send_raw_transaction(payload)',
  ]
  for (const source of unsafe) {
    const hits = detect(walletBroadcastAutoRetry, source, source.includes('@retry') ? 'py' : 'js')
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(walletBroadcastAutoRetry, hits[0]), 'heuristic')
  }
  assertNoHits(walletBroadcastAutoRetry, {
    once: 'const result = await broadcaster.broadcast_once(payload)',
    reconcile: 'const status = await provider.getTransaction(operationId)',
    'operator-approved recovery': 'if (operatorApproved) await broadcaster.broadcast_once(replacement)',
    'unrelated retry': 'await retry(() => cache.read())\nreturn provider.sendTransaction(signedPayload)',
    'database retry': 'return retry(() => database.sendTransaction(record))',
    'retry disabled': 'return retry(() => provider.sendTransaction(tx), { retries: 0 })',
    'manual recovery function': [
      'async function retryBroadcast(signedPayload, freshApproval) {',
      '  assertFreshApproval(freshApproval)',
      '  return broadcaster.broadcast_once(signedPayload)',
      '}',
    ].join('\n'),
    comment: '// return pRetry(() => provider.sendTransaction(signedPayload))',
    docs: 'const example = "pRetry(() => provider.sendTransaction(payload))"',
  }, 'js')
})

test('recognises maximum token approvals while exact approvals stay quiet', () => {
  const unsafe = [
    'await token.approve(spender, ethers.MaxUint256)',
    'await token.approve(spender, ethers.constants.MaxUint256)',
    'token.safeApprove(spender, type(uint256).max);',
    'token.forceApprove(\n  spender,\n  MAX_UINT256\n)',
  ]
  for (const source of unsafe) {
    const lang = source.includes('type(uint256)') ? 'sol' : 'js'
    const hits = detect(unlimitedTokenApproval, source, lang)
    assert.equal(hits.length, 1, source)
    assert.equal(effectiveConfidence(unlimitedTokenApproval, hits[0]), 'heuristic')
  }
  assertNoHits(unlimitedTokenApproval, {
    exact: 'await token.approve(spender, intent.amount)',
    revoke: 'await token.approve(spender, 0)',
    scoped: 'await token.approve(spender, 1000n)',
    constant: 'const MAX_UINT256 = (1n << 256n) - 1n',
    'signed sentinel outside uint context': 'await permissions.approve(spender, -1)',
    'NFT operator approval is a separate rule': 'await nft.setApprovalForAll(operator, true)',
    comment: '// token.approve(spender, ethers.MaxUint256)',
    docs: 'const example = "token.approve(spender, ethers.MaxUint256)"',
  }, 'js')
})

test('the canonical scanner executes the registered crypto pack', async () => {
  const root = await mkdtemp(join(tmpdir(), 'whitehack-crypto-awareness-'))
  try {
    await writeFile(
      join(root, 'handler.ts'),
      'const accepted = verifySignature(payload, signature) || true\n',
    )
    const findings = await scan(root)
    const finding = findings.find(({ check }) => check === 'signature-fail-open')
    assert.ok(finding)
    assert.equal(finding.confidence, 'medium-high')
    assert.equal(finding.snippet, '[redacted: sensitive source match]')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
