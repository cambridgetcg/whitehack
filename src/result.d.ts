import type {
  WhitehackFindingInput,
  WhitehackScanCompleteResult,
  WhitehackScanErrorResult,
  WhitehackScanScope,
} from './types.js'

export type {
  RedactedText,
  WhitehackFindingInput,
  WhitehackFindingSummary,
  WhitehackScanCompleteResult,
  WhitehackScanErrorResult,
  WhitehackScannerIdentity,
  WhitehackScanResult,
  WhitehackScanScope,
  WhitehackSerializedFinding,
} from './types.js'

export const RESULT_DOCUMENT_TYPE: 'whitehack-scan/v1'

export function isGatingFinding(
  finding: Readonly<{ confidence?: unknown }> | null | undefined,
): boolean

export function exitCodeForFindings(
  findings: readonly Readonly<{ confidence?: unknown }>[],
): 0 | 1

export interface CreateScanResultOptions<Redacted extends boolean = false> {
  readonly version: string
  readonly checkCount: number
  readonly target: string
  readonly findings: readonly WhitehackFindingInput[]
  readonly scope: WhitehackScanScope
  readonly redacted?: Redacted
}

export function createScanResult(
  options: CreateScanResultOptions<false>,
): WhitehackScanCompleteResult<false>
export function createScanResult(
  options: CreateScanResultOptions<true>,
): WhitehackScanCompleteResult<true>
export function createScanResult(
  options: CreateScanResultOptions<boolean>,
): WhitehackScanCompleteResult<boolean>

export interface CreateScanErrorResultOptions<Redacted extends boolean = false> {
  readonly version: string
  readonly checkCount: number
  readonly target: string
  readonly code: string
  readonly redacted?: Redacted
}

export function createScanErrorResult(
  options: CreateScanErrorResultOptions<false>,
): WhitehackScanErrorResult<false>
export function createScanErrorResult(
  options: CreateScanErrorResultOptions<true>,
): WhitehackScanErrorResult<true>
export function createScanErrorResult(
  options: CreateScanErrorResultOptions<boolean>,
): WhitehackScanErrorResult<boolean>
