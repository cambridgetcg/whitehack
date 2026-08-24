import type {
  WhitehackFinding,
  WhitehackScanDetailedResult,
  WhitehackScanLimits,
} from './types.js'

export {
  CHECK_MANIFEST,
  CHECKS,
  DEFAULT_TEXT_LIMITS,
  ScanTextError,
  scanText,
} from './core.js'
export type {
  ScanTextOptions,
  WhitehackCheck,
  WhitehackCheckId,
  WhitehackCheckContext,
  WhitehackCheckManifestEntry,
  WhitehackConfidence,
  WhitehackDoctrine,
  WhitehackFinding,
  WhitehackFindingInput,
  WhitehackFindingHit,
  WhitehackLanguage,
  WhitehackLanguageAlias,
  WhitehackPrinciple,
  WhitehackTextLimits,
} from './core.js'
export {
  RESULT_DOCUMENT_TYPE,
  createScanErrorResult,
  createScanResult,
  exitCodeForFindings,
  isGatingFinding,
} from './result.js'
export type {
  CreateScanErrorResultOptions,
  CreateScanResultOptions,
} from './result.js'
export type {
  WhitehackFindingSummary,
  WhitehackScanCompleteResult,
  WhitehackScanDetailedResult,
  WhitehackScanErrorResult,
  WhitehackScanLimits,
  WhitehackScannerIdentity,
  WhitehackScanResult,
  WhitehackScanScope,
  WhitehackSerializedFinding,
} from './types.js'

export const DEFAULT_EXCLUDED_BASENAMES: readonly [
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
]

export const DEFAULT_SCAN_LIMITS: Readonly<{
  maxFiles: 10_000
  maxFileBytes: 1_048_576
  maxTotalBytes: 67_108_864
  maxEntries: 100_000
  maxDepth: 64
  maxPathBytes: 4_096
  maxLinesPerFile: 10_000
  maxFindings: 10_000
}>

export class ScanError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: ErrorOptions)
}

export interface ScanOptions {
  readonly limits?: Partial<WhitehackScanLimits>
}

export function scanDetailed(
  root: string,
  options?: ScanOptions,
): Promise<WhitehackScanDetailedResult>

export function scan(root: string, options?: ScanOptions): Promise<readonly WhitehackFinding[]>
