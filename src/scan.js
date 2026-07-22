import { constants } from 'node:fs'
import { lstat, open, opendir, realpath } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path'

import {
  CHECK_MANIFEST,
  CHECKS,
  DEFAULT_TEXT_LIMITS,
  LANGUAGE_BY_EXTENSION,
  ScanTextError,
  scanText,
} from './core.js'

export {
  CHECK_MANIFEST,
  CHECKS,
  DEFAULT_TEXT_LIMITS,
  ScanTextError,
  scanText,
} from './core.js'
export {
  RESULT_DOCUMENT_TYPE,
  createScanErrorResult,
  createScanResult,
  exitCodeForFindings,
  isGatingFinding,
} from './result.js'

export const DEFAULT_EXCLUDED_BASENAMES = Object.freeze([
  '.git',
  '.hg',
  '.next',
  '.svn',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'vendor',
])
const EXCLUDED_BASENAMES = new Set(DEFAULT_EXCLUDED_BASENAMES)
const UNSAFE_PATH_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u
const UTF8 = new TextDecoder('utf-8', { fatal: true })

export const DEFAULT_SCAN_LIMITS = Object.freeze({
  maxFiles: 10_000,
  maxFileBytes: 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
  maxEntries: 100_000,
  maxDepth: 64,
  maxPathBytes: 4096,
  maxLinesPerFile: DEFAULT_TEXT_LIMITS.maxLines,
  maxFindings: DEFAULT_TEXT_LIMITS.maxFindings,
})

export class ScanError extends Error {
  constructor(code, message, options) {
    super(message, options)
    this.name = 'ScanError'
    this.code = code
  }
}

function fail(code, message, cause) {
  throw new ScanError(code, message, cause === undefined ? undefined : { cause })
}

function normalizeLimits(overrides) {
  if (overrides === undefined) return DEFAULT_SCAN_LIMITS
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    fail('scan_limits_invalid', 'scan limits must be an object')
  }
  if (Object.keys(overrides).some((key) => !(key in DEFAULT_SCAN_LIMITS))) {
    fail('scan_limits_invalid', 'scan limits contain an unknown field')
  }
  const limits = { ...DEFAULT_SCAN_LIMITS, ...overrides }
  for (const [key, ceiling] of Object.entries(DEFAULT_SCAN_LIMITS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > ceiling) {
      fail('scan_limits_invalid', `${key} must be an integer from 1 to ${ceiling}`)
    }
  }
  return Object.freeze(limits)
}

function compareNames(left, right) {
  if (left.name < right.name) return -1
  if (left.name > right.name) return 1
  return 0
}

function normalizeRelativePath(value) {
  return value.split(sep).join('/')
}

function validatePath(path, limits) {
  if (
    typeof path !== 'string'
    || path.length === 0
    || UNSAFE_PATH_CHARACTERS.test(path)
    || Buffer.byteLength(path, 'utf8') > limits.maxPathBytes
  ) {
    fail('scan_path_unsafe', 'scan path is empty, unsafe, or exceeds the path-byte limit')
  }
}

function isWithin(root, candidate) {
  const fromRoot = relative(root, candidate)
  return fromRoot === '' || (
    fromRoot !== '..'
    && !fromRoot.startsWith(`..${sep}`)
    && !isAbsolute(fromRoot)
  )
}

function isSupportedFile(name) {
  return name === '.env' || Object.hasOwn(LANGUAGE_BY_EXTENSION, extname(name).toLowerCase())
}

async function safeLstat(path, unavailableCode = 'scan_read_failed') {
  try {
    return await lstat(path)
  } catch (error) {
    fail(unavailableCode, `cannot access scan path ${path}`, error)
  }
}

async function canonicalPath(path, canonicalRoot) {
  let canonical
  try {
    canonical = await realpath(path)
  } catch (error) {
    fail('scan_read_failed', `cannot resolve scan path ${path}`, error)
  }
  if (!isWithin(canonicalRoot, canonical)) {
    fail('scan_path_outside_root', `scan path resolves outside the requested root: ${path}`)
  }
  return canonical
}

async function collectEntries(path, state) {
  const entries = []
  let directory
  try {
    directory = await opendir(path)
    for await (const entry of directory) {
      state.entryCount += 1
      if (state.entryCount > state.limits.maxEntries) {
        fail('scan_entry_limit_exceeded', 'scan entry limit exceeded')
      }
      entries.push(entry)
    }
  } catch (error) {
    if (error instanceof ScanError) throw error
    fail('scan_directory_failed', `cannot read directory ${path}`, error)
  }
  entries.sort(compareNames)
  return entries
}

async function collectFiles(path, relativeRoot, depth, state) {
  if (depth > state.limits.maxDepth) {
    fail('scan_depth_limit_exceeded', 'scan directory depth limit exceeded')
  }
  const info = await safeLstat(path, 'scan_directory_failed')
  if (info.isSymbolicLink()) {
    fail('scan_path_symlink', `refusing symbolic link in scan root: ${path}`)
  }
  if (!info.isDirectory()) {
    fail('scan_path_changed', `scan directory changed while being observed: ${path}`)
  }
  await canonicalPath(path, state.canonicalRoot)

  for (const entry of await collectEntries(path, state)) {
    const absolute = join(path, entry.name)
    const display = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name
    validatePath(display, state.limits)
    const current = await safeLstat(absolute)
    if (entry.isSymbolicLink() || current.isSymbolicLink()) {
      fail('scan_path_symlink', `refusing symbolic link in scan root: ${display}`)
    }
    if (EXCLUDED_BASENAMES.has(entry.name)) {
      state.excludedPaths += 1
      continue
    }
    if (current.isDirectory()) {
      await collectFiles(absolute, display, depth + 1, state)
      continue
    }
    if (!current.isFile()) {
      state.nonRegularPaths += 1
      continue
    }
    if (!isSupportedFile(entry.name)) {
      state.unsupportedFiles += 1
      continue
    }

    state.files.push({
      absolute,
      canonical: await canonicalPath(absolute, state.canonicalRoot),
      display: normalizeRelativePath(display),
      identity: { dev: current.dev, ino: current.ino },
    })
    if (state.files.length > state.limits.maxFiles) {
      fail('scan_file_limit_exceeded', 'scan file-count limit exceeded')
    }
  }
}

async function boundedRead(candidate, state) {
  let handle
  try {
    const beforeCanonical = await canonicalPath(candidate.absolute, state.canonicalRoot)
    if (beforeCanonical !== candidate.canonical) {
      fail('scan_path_changed', `scan file changed while being observed: ${candidate.display}`)
    }
    const noFollow = constants.O_NOFOLLOW ?? 0
    handle = await open(candidate.absolute, constants.O_RDONLY | noFollow)
    const info = await handle.stat()
    if (
      !info.isFile()
      || info.dev !== candidate.identity.dev
      || info.ino !== candidate.identity.ino
    ) {
      fail('scan_path_changed', `scan file changed while being observed: ${candidate.display}`)
    }
    if (info.size > state.limits.maxFileBytes) {
      fail('scan_file_size_limit_exceeded', `scan file exceeds byte limit: ${candidate.display}`)
    }

    // Read at most maxFileBytes + 1 so concurrent growth cannot trigger an
    // unbounded allocation between stat and read.
    const buffer = Buffer.allocUnsafe(Math.min(info.size + 1, state.limits.maxFileBytes + 1))
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    if (offset > state.limits.maxFileBytes) {
      fail('scan_file_size_limit_exceeded', `scan file exceeds byte limit: ${candidate.display}`)
    }
    state.totalBytes += offset
    if (state.totalBytes > state.limits.maxTotalBytes) {
      fail('scan_total_size_limit_exceeded', 'scan total-byte limit exceeded')
    }
    let source
    try {
      source = UTF8.decode(buffer.subarray(0, offset))
    } catch (error) {
      fail('scan_invalid_utf8', `scan file is not valid UTF-8: ${candidate.display}`, error)
    }
    const after = await handle.stat()
    if (
      after.dev !== info.dev
      || after.ino !== info.ino
      || after.size !== info.size
      || after.mtimeMs !== info.mtimeMs
      || after.ctimeMs !== info.ctimeMs
    ) {
      fail('scan_path_changed', `scan file changed while being observed: ${candidate.display}`)
    }
    const afterCanonical = await canonicalPath(candidate.absolute, state.canonicalRoot)
    if (afterCanonical !== candidate.canonical) {
      fail('scan_path_changed', `scan file changed while being observed: ${candidate.display}`)
    }
    return source
  } catch (error) {
    if (error instanceof ScanError) throw error
    fail('scan_read_failed', `cannot read scan file ${candidate.display}`, error)
  } finally {
    await handle?.close().catch(() => {})
  }
}

function normalizeOptions(options) {
  if (options === undefined) return { limits: DEFAULT_SCAN_LIMITS }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    fail('scan_options_invalid', 'scan options must be an object')
  }
  if (Object.keys(options).some((key) => key !== 'limits')) {
    fail('scan_options_invalid', 'scan options contain an unknown field')
  }
  return { limits: normalizeLimits(options.limits) }
}

export async function scanDetailed(root, options) {
  if (typeof root !== 'string' || root.length === 0) {
    fail('scan_root_invalid', 'scan root must be a non-empty string')
  }
  const { limits } = normalizeOptions(options)
  validatePath(root, limits)

  let rootInfo
  try {
    rootInfo = await lstat(root)
  } catch (error) {
    fail('scan_root_missing', `cannot access scan root ${root}`, error)
  }
  if (rootInfo.isSymbolicLink()) {
    fail('scan_root_symlink', `refusing symbolic-link scan root: ${root}`)
  }
  if (!rootInfo.isFile() && !rootInfo.isDirectory()) {
    fail('scan_root_not_regular', `scan root is not a regular file or directory: ${root}`)
  }

  let canonicalRoot
  try {
    canonicalRoot = await realpath(root)
  } catch (error) {
    fail('scan_root_missing', `cannot resolve scan root ${root}`, error)
  }

  const state = {
    canonicalRoot: rootInfo.isFile() ? dirname(canonicalRoot) : canonicalRoot,
    limits,
    files: [],
    entryCount: 0,
    totalBytes: 0,
    excludedPaths: 0,
    nonRegularPaths: 0,
    unsupportedFiles: 0,
  }

  if (rootInfo.isFile()) {
    if (!isSupportedFile(basename(root))) {
      fail('scan_root_unsupported', `scan root has an unsupported file type: ${root}`)
    }
    state.files.push({
      absolute: root,
      canonical: canonicalRoot,
      display: normalizeRelativePath(root),
      identity: { dev: rootInfo.dev, ino: rootInfo.ino },
    })
  } else {
    await collectFiles(root, '', 0, state)
  }

  const findings = []
  for (const candidate of state.files) {
    if (!isWithin(state.canonicalRoot, candidate.canonical)) {
      fail('scan_path_outside_root', `scan path resolves outside the requested root: ${candidate.display}`)
    }
    const source = await boundedRead(candidate, state)
    let fileFindings
    try {
      fileFindings = scanText(source, {
        file: candidate.display,
        maxLines: state.limits.maxLinesPerFile,
        maxFindings: state.limits.maxFindings,
      })
    } catch (error) {
      if (error instanceof ScanTextError) fail(error.code, error.message, error)
      throw error
    }
    if (findings.length + fileFindings.length > state.limits.maxFindings) {
      fail('scan_finding_limit_exceeded', 'scan finding limit exceeded')
    }
    findings.push(...fileFindings)
  }
  findings.sort((left, right) => (
    left.file < right.file ? -1
      : left.file > right.file ? 1
        : left.line - right.line || (left.check < right.check ? -1 : left.check > right.check ? 1 : 0)
  ))

  return Object.freeze({
    findings: Object.freeze(findings),
    scope: Object.freeze({
      files_scanned: state.files.length,
      bytes_scanned: state.totalBytes,
      entries_observed: state.entryCount,
      excluded_paths: state.excludedPaths,
      non_regular_paths: state.nonRegularPaths,
      unsupported_files: state.unsupportedFiles,
      excluded_basenames: DEFAULT_EXCLUDED_BASENAMES,
      limits,
    }),
  })
}

export async function scan(root, options) {
  return (await scanDetailed(root, options)).findings
}
