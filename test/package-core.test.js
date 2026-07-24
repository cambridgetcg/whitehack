import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'

import { CHECK_MANIFEST, CHECKS, ScanTextError, scanText } from '../src/core.js'
import { createScanErrorResult, createScanResult } from '../src/result.js'
import { ScanError, scan, scanDetailed } from '../src/scan.js'

const CLI = fileURLToPath(new URL('../bin/whitehack.js', import.meta.url))

async function temporaryRoot(prefix) {
  return mkdtemp(join(tmpdir(), prefix))
}

async function rejectsWithCode(operation, code) {
  await assert.rejects(operation, (error) => {
    assert.ok(error instanceof ScanError)
    assert.equal(error.code, code)
    return true
  })
}

test('pure core exposes deterministic findings and a frozen serializable manifest', () => {
  const source = 'eval(userCode)\n'
  const first = scanText(source, { file: 'src/example.js' })
  const second = scanText(source, { file: 'src/example.js' })
  assert.deepEqual(first, second)
  assert.ok(first.some(({ check }) => check === 'unsafe-eval'))
  assert.equal(CHECK_MANIFEST.length, CHECKS.length)
  assert.ok(Object.isFrozen(CHECK_MANIFEST))
  assert.ok(Object.isFrozen(CHECKS))
  assert.ok(CHECKS.every((entry) => Object.isFrozen(entry)))
  assert.ok(CHECKS.every((entry) => Object.isFrozen(entry.langs)))
  assert.ok(CHECK_MANIFEST.every((entry) => Object.isFrozen(entry)))
  assert.ok(CHECK_MANIFEST.every((entry) => Object.isFrozen(entry.languages)))
  assert.ok(!JSON.stringify(CHECK_MANIFEST).includes('detect'))
  assert.deepEqual(JSON.parse(JSON.stringify(CHECK_MANIFEST)), CHECK_MANIFEST)

  for (const lang of ['ts', 'mjs', 'javascript', 'JS']) {
    assert.ok(
      scanText(source, { file: 'virtual-input', lang }).some(({ check }) => check === 'unsafe-eval'),
      `${lang} must normalize to the JavaScript rule pack`,
    )
  }
  assert.throws(
    () => scanText(source, { file: 'virtual-input', lang: 'javascritp' }),
    /does not support language/,
  )
  assert.throws(
    () => scanText(source, { file: 'virtual-input' }),
    /cannot infer a supported language/,
  )

  const repeatedBind = scanText(
    "server.listen(port, '0.0.0.0')\nother.listen(port, '0.0.0.0')\n",
    { file: 'server.js' },
  ).filter(({ check }) => check === 'protocol-surface')
  assert.equal(repeatedBind.length, 2)
  assert.throws(
    () => scanText('eval(a)\neval(b)\n', { file: 'bounded.js', maxFindings: 1 }),
    (error) => error instanceof ScanTextError && error.code === 'scan_finding_limit_exceeded',
  )
  assert.throws(
    () => scanText('a\nb\nc\n', { file: 'bounded.js', maxLines: 3 }),
    (error) => error instanceof ScanTextError && error.code === 'scan_line_limit_exceeded',
  )
})

test('filesystem scan is deterministic and preserves the historical array API', async () => {
  const root = await temporaryRoot('whitehack-order-')
  try {
    await writeFile(join(root, 'z.js'), 'eval(z)\n')
    await writeFile(join(root, 'a.js'), 'eval(a)\n')
    await writeFile(join(root, 'ignored.txt'), 'eval(outsideLanguage)\n')
    await mkdir(join(root, '.github', 'workflows'), { recursive: true })
    await writeFile(join(root, '.github', 'workflows', 'audit.js'), 'eval(ciInput)\n')
    const detailed = await scanDetailed(root)
    assert.deepEqual(detailed.findings.map(({ file }) => file), [
      '.github/workflows/audit.js',
      'a.js',
      'z.js',
    ])
    assert.equal(detailed.scope.files_scanned, 3)
    assert.equal(detailed.scope.unsupported_files, 1)
    assert.ok(detailed.scope.excluded_basenames.includes('node_modules'))
    assert.equal(detailed.scope.excluded_basenames.includes('.github'), false)
    assert.deepEqual(await scan(root), detailed.findings)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('symlink roots, file entries, directory entries, and broken entries fail closed', async () => {
  const parent = await temporaryRoot('whitehack-symlink-')
  const root = join(parent, 'root')
  const outside = join(parent, 'outside')
  try {
    await mkdir(root)
    await mkdir(outside)
    await writeFile(join(root, 'safe.js'), 'export const safe = true\n')
    await writeFile(join(outside, 'finding.js'), 'eval(secretOutsideRoot)\n')

    const rootLink = join(parent, 'root-link')
    await symlink(root, rootLink)
    await rejectsWithCode(scan(rootLink), 'scan_root_symlink')

    await symlink(join(outside, 'finding.js'), join(root, 'outside.js'))
    await rejectsWithCode(scan(root), 'scan_path_symlink')
    await rm(join(root, 'outside.js'))

    await symlink(outside, join(root, 'outside-dir'))
    await rejectsWithCode(scan(root), 'scan_path_symlink')
    await rm(join(root, 'outside-dir'))

    await symlink(join(parent, 'missing.js'), join(root, 'broken.js'))
    await rejectsWithCode(scan(root), 'scan_path_symlink')
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('filesystem bounds and UTF-8 decoding fail without partial results', async () => {
  const root = await temporaryRoot('whitehack-bounds-')
  try {
    await writeFile(join(root, 'a.js'), 'x')
    await writeFile(join(root, 'b.js'), 'y')
    await scan(root, { limits: { maxFiles: 2, maxFileBytes: 1, maxTotalBytes: 2 } })
    await rejectsWithCode(
      scan(root, { limits: { maxFiles: 1 } }),
      'scan_file_limit_exceeded',
    )
    await rejectsWithCode(
      scan(root, { limits: { maxEntries: 1 } }),
      'scan_entry_limit_exceeded',
    )
    await rejectsWithCode(
      scan(root, { limits: { maxFileBytes: 1, maxTotalBytes: 1 } }),
      'scan_total_size_limit_exceeded',
    )
    await writeFile(join(root, 'a.js'), 'xx')
    await rejectsWithCode(
      scan(root, { limits: { maxFileBytes: 1 } }),
      'scan_file_size_limit_exceeded',
    )
    await writeFile(join(root, 'a.js'), Buffer.from([0xff]))
    await rm(join(root, 'b.js'))
    await rejectsWithCode(scan(root), 'scan_invalid_utf8')
    await rm(join(root, 'a.js'))
    await mkdir(join(root, 'one', 'two'), { recursive: true })
    await writeFile(join(root, 'one', 'two', 'deep.js'), 'x')
    await rejectsWithCode(
      scan(root, { limits: { maxDepth: 1 } }),
      'scan_depth_limit_exceeded',
    )
    await rm(join(root, 'one'), { recursive: true })
    await writeFile(join(root, 'findings.js'), 'eval(a)\neval(b)\n')
    await rejectsWithCode(
      scan(root, { limits: { maxFindings: 1 } }),
      'scan_finding_limit_exceeded',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('JSON CLI is closed, redactable, deterministic, and preserves exit 0/1/2', async () => {
  const root = await temporaryRoot('whitehack-json-')
  try {
    const source = join(root, 'source.js')
    const bidiSource = 'eval(\u202euserCode)\n'
    await writeFile(source, bidiSource)
    const args = [CLI, 'scan', source, '--json', '--redacted']
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' })
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' })
    assert.equal(first.status, 1)
    assert.equal(first.stderr, '')
    assert.equal(first.stdout, second.stdout)
    assert.equal(first.stdout.includes('\u202e'), false)
    const result = JSON.parse(first.stdout)
    assert.equal(result.document_type, 'whitehack-scan/v1')
    assert.equal(result.status, 'complete')
    assert.equal(result.complete, true)
    assert.equal(result.scanner.version, '0.9.0')
    assert.equal(result.redacted, true)
    assert.equal(result.findings[0].title, null)
    assert.equal(result.findings[0].message, null)
    assert.equal(result.findings[0].snippet, null)
    assert.equal(result.error, null)

    const unredacted = spawnSync(
      process.execPath,
      [CLI, 'scan', source, '--json'],
      { encoding: 'utf8' },
    )
    assert.equal(unredacted.status, 1)
    assert.equal(unredacted.stdout.includes('\u202e'), false)
    assert.equal(JSON.parse(unredacted.stdout).findings[0].snippet.includes('\u202e'), true)

    await writeFile(source, 'export const safe = true\n')
    const clean = spawnSync(process.execPath, [CLI, 'scan', source, '--json'], {
      encoding: 'utf8',
    })
    assert.equal(clean.status, 0)
    assert.equal(JSON.parse(clean.stdout).complete, true)

    const missing = spawnSync(
      process.execPath,
      [CLI, 'scan', join(root, 'missing.js'), '--json'],
      { encoding: 'utf8' },
    )
    assert.equal(missing.status, 2)
    const error = JSON.parse(missing.stdout)
    assert.equal(error.complete, false)
    assert.equal(error.status, 'error')
    assert.equal(error.error.code, 'scan_root_missing')
    assert.deepEqual(error.findings, [])

    const unsafeTarget = '\u202eunsafe.js'
    const unsafe = spawnSync(
      process.execPath,
      [CLI, 'scan', '--json', '--', unsafeTarget],
      { encoding: 'utf8' },
    )
    assert.equal(unsafe.status, 2)
    assert.equal(unsafe.stdout.includes(unsafeTarget), false)
    assert.equal(unsafe.stderr.includes(unsafeTarget), false)
    assert.equal(JSON.parse(unsafe.stdout).target, '[unsafe-path]')
    assert.equal(JSON.parse(unsafe.stdout).error.code, 'scan_path_unsafe')

    const unsafeOption = `--bidi\u202e`
    const humanUnsafe = spawnSync(
      process.execPath,
      [CLI, 'scan', unsafeOption],
      { encoding: 'utf8' },
    )
    assert.equal(humanUnsafe.status, 2)
    assert.equal(humanUnsafe.stderr.includes('\u202e'), false)
    assert.match(humanUnsafe.stderr, /\\u202e/)

    await rm(source)
    const empty = spawnSync(
      process.execPath,
      [CLI, 'scan', root, '--json', '--redacted', '--require-files'],
      { encoding: 'utf8' },
    )
    assert.equal(empty.status, 2)
    assert.equal(JSON.parse(empty.stdout).complete, false)
    assert.equal(JSON.parse(empty.stdout).error.code, 'scan_empty_scope')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('schema, package allowlist, and composite action keep authority surfaces separate', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const schema = JSON.parse(
    await readFile(new URL('../schema/scan-result-v1.schema.json', import.meta.url), 'utf8'),
  )
  const action = await readFile(new URL('../action-for-anyone/action.yml', import.meta.url), 'utf8')

  assert.equal(packageJson.name, '@agenttool/whitehack-scan')
  assert.equal(packageJson.version, '0.9.0')
  assert.deepEqual(packageJson.bin, { whitehack: 'bin/whitehack.js' })
  assert.deepEqual(packageJson.files, [
    'bin/whitehack.js',
    'src',
    'schema',
    'README.md',
    'LICENSE',
  ])
  assert.equal(packageJson.exports['./core'], './src/core.js')
  assert.equal(packageJson.exports['./schema.json'], './schema/scan-result-v1.schema.json')
  assert.equal(packageJson.exports['./understanding'], './src/understanding.js')
  assert.equal(
    packageJson.exports['./understanding-schema.json'],
    './schema/understanding-v1.schema.json',
  )
  assert.equal(packageJson.dependencies, undefined)
  assert.deepEqual(packageJson.devDependencies, { ajv: '8.17.1' })
  assert.deepEqual(packageJson.publishConfig, {
    access: 'public',
    registry: 'https://registry.npmjs.org/',
  })
  assert.equal(packageJson.scripts.preinstall, undefined)
  assert.equal(packageJson.scripts.install, undefined)
  assert.equal(packageJson.scripts.postinstall, undefined)
  assert.equal(schema.additionalProperties, false)
  assert.deepEqual(schema.properties.document_type, { const: 'whitehack-scan/v1' })
  assert.equal(
    schema.allOf[0].then.properties.findings.items.properties.snippet.type,
    'null',
  )
  assert.equal(
    schema.allOf[0].else.properties.findings.items.properties.snippet.type,
    'string',
  )

  const sourceFinding = scanText('eval(userInput)\n', { file: 'source.js' })[0]
  const callerScope = {
    files_scanned: 1,
    bytes_scanned: 16,
    entries_observed: 1,
    excluded_paths: 0,
    non_regular_paths: 0,
    unsupported_files: 0,
    excluded_basenames: [
      '.git', '.hg', '.next', '.svn', 'build', 'coverage', 'dist',
      'node_modules', 'out', 'vendor',
    ],
    limits: {
      maxFiles: 10,
      maxFileBytes: 1024,
      maxTotalBytes: 2048,
      maxEntries: 20,
      maxDepth: 4,
      maxPathBytes: 256,
      maxLinesPerFile: 100,
      maxFindings: 100,
    },
  }
  const complete = createScanResult({
    version: '0.9.0',
    checkCount: CHECK_MANIFEST.length,
    target: '.',
    findings: [sourceFinding],
    scope: callerScope,
  })
  const redacted = createScanResult({
    version: '0.9.0',
    checkCount: CHECK_MANIFEST.length,
    target: '.',
    findings: [sourceFinding],
    scope: callerScope,
    redacted: true,
  })
  const failed = createScanErrorResult({
    version: '0.9.0',
    checkCount: CHECK_MANIFEST.length,
    target: '.',
    code: 'scan_read_failed',
    redacted: true,
  })
  callerScope.files_scanned = 999
  callerScope.limits.maxFiles = 999
  assert.equal(complete.scope.files_scanned, 1)
  assert.equal(complete.scope.limits.maxFiles, 10)
  assert.ok(Object.isFrozen(complete.scope))
  assert.ok(Object.isFrozen(complete.scope.limits))

  const validate = new Ajv2020({ strict: true }).compile(schema)
  for (const document of [complete, redacted, failed]) {
    assert.equal(validate(document), true, JSON.stringify(validate.errors))
  }
  assert.equal(complete.findings[0].snippet, sourceFinding.snippet)
  assert.equal(redacted.findings[0].snippet, null)
  assert.throws(
    () => createScanResult({
      version: 'not-semver',
      checkCount: 0,
      target: '',
      findings: [],
      scope: callerScope,
    }),
    TypeError,
  )
  assert.match(action, /WHITEHACK_INPUT_PATH: \$\{\{ inputs\.path \}\}/)
  assert.match(action, /\$WHITEHACK_ACTION_PATH\/\.\.\/bin\/whitehack\.js/)
  assert.match(action, /-- "\$WHITEHACK_INPUT_PATH"/)
  assert.match(action, /--json --redacted --require-files/)
  assert.doesNotMatch(action, /npx github:cambridgetcg\/whitehack/)
})
