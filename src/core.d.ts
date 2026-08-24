import type {
  WhitehackCheck,
  WhitehackCheckManifestEntry,
  WhitehackFinding,
  WhitehackFindingInput,
  WhitehackLanguage,
  WhitehackLanguageAlias,
  WhitehackTextLimits,
} from './types.js'

export type {
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
} from './types.js'

export const LANGUAGE_BY_EXTENSION: Readonly<{
  '.js': 'js'
  '.jsx': 'js'
  '.ts': 'js'
  '.tsx': 'js'
  '.mjs': 'js'
  '.cjs': 'js'
  '.sol': 'sol'
  '.json': 'json'
  '.yaml': 'yaml'
  '.yml': 'yaml'
  '.py': 'py'
  '.rs': 'rs'
  '.c': 'c'
  '.h': 'c'
  '.go': 'go'
  '.java': 'java'
  '.swift': 'swift'
  '.env': 'env'
  '.conf': 'wifi-config'
  '.cfg': 'wifi-config'
  '.toml': 'yaml'
}>
export const DEFAULT_TEXT_LIMITS: Readonly<{
  maxLines: 10_000
  maxFindings: 10_000
}>

export class ScanTextError extends Error {
  readonly code: string
  constructor(code: string, message: string)
}

export const CHECKS: readonly WhitehackCheck[]
export const CHECK_MANIFEST: readonly WhitehackCheckManifestEntry[]

export interface ScanTextOptions extends Partial<WhitehackTextLimits> {
  readonly file?: string
  readonly lang?: WhitehackLanguageAlias
}

export function scanText(
  source: string,
  options?: ScanTextOptions,
): readonly WhitehackFinding[]
