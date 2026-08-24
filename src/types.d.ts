export type WhitehackLanguage =
  | 'js'
  | 'sol'
  | 'json'
  | 'yaml'
  | 'py'
  | 'rs'
  | 'c'
  | 'go'
  | 'java'
  | 'swift'
  | 'env'
  | 'wifi-config'

export type WhitehackLanguageAlias =
  | WhitehackLanguage
  | 'cjs'
  | 'conf'
  | 'cfg'
  | 'dotenv'
  | 'golang'
  | 'h'
  | 'javascript'
  | 'jsx'
  | 'mjs'
  | 'node'
  | 'python'
  | 'rust'
  | 'solidity'
  | 'toml'
  | 'ts'
  | 'tsx'
  | 'typescript'
  | 'wifi'
  | 'yml'

export type WhitehackConfidence = 'high' | 'medium-high' | 'medium' | 'heuristic'
export type WhitehackDoctrine = 'substrate-honesty' | 'transparency' | 'trust-protocol'
export type WhitehackPrinciple = 1 | 2 | 3 | 4 | 5 | 6
export type WhitehackCheckId =
  | 'silent-failure'
  | 'cache-as-live'
  | 'decision-without-why'
  | 'stale-oracle'
  | 'unchecked-transfer'
  | 'spot-price-as-fair'
  | 'silent-revert'
  | 'float-money'
  | 'hardcoded-secret'
  | 'exposed-config'
  | 'unsafe-eval'
  | 'performed-ignorance'
  | 'trust-by-authority'
  | 'api-status-lie'
  | 'api-missing-versioning'
  | 'api-error-without-shape'
  | 'api-missing-rate-limit'
  | 'api-bare-fetch'
  | 'wifi-protocol-flaws'
  | 'bluetooth-protocol-flaws'
  | 'bluetooth-protocol'
  | 'insecure-protocol'
  | 'disabled-cert-verification'
  | 'weak-crypto'
  | 'cors-wildcard'
  | 'cookie-insecure'
  | 'sql-injection'
  | 'protocol-surface'
  | 'dns-plaintext'
  | 'password-auth'
  | 'bluetooth-paired-stranger'
  | 'wpa2-krack'
  | 'weak-wifi-encryption'
  | 'wifi-deauth-accept'
  | 'wifi-evil-twin'
  | 'wifi-pmk-exposure'
  | 'wifi-krack-vulnerable'
  | 'wifi-protocol'
  | 'static-aead-nonce'
  | 'signature-fail-open'
  | 'webhook-reencoded-body'
  | 'signed-webhook-without-replay-guard'
  | 'wallet-key-egress'
  | 'wallet-direct-request-signing'
  | 'wallet-capability-unbounded'
  | 'wallet-broadcast-auto-retry'
  | 'unlimited-token-approval'

export interface WhitehackFinding {
  readonly file: string
  readonly line: number
  readonly check: WhitehackCheckId
  readonly title: string
  readonly confidence: WhitehackConfidence
  readonly doctrine: WhitehackDoctrine
  readonly principle: WhitehackPrinciple
  readonly message: string
  readonly snippet: string
}

/** Closed field shape accepted by scan-result serialization before semantic profile checks. */
export interface WhitehackFindingInput {
  readonly file: string
  readonly line: number
  readonly check: string
  readonly title: string
  readonly confidence: WhitehackConfidence
  readonly doctrine: string
  readonly principle: WhitehackPrinciple
  readonly message: string
  readonly snippet: string
}

export interface WhitehackFindingHit {
  readonly line: number
  readonly message: string
  readonly snippet: string
  readonly confidence?: WhitehackConfidence
}

export interface WhitehackCheckContext {
  readonly file: string
  readonly lang: WhitehackLanguage
}

export interface WhitehackCheck {
  readonly id: WhitehackCheckId
  readonly title: string
  readonly confidence: WhitehackConfidence
  readonly doctrine: WhitehackDoctrine
  readonly principle: WhitehackPrinciple
  readonly langs?: readonly WhitehackLanguage[]
  readonly redactSnippet?: boolean
  readonly detect: (
    source: string,
    lines: readonly string[],
    context: WhitehackCheckContext,
  ) => readonly WhitehackFindingHit[]
}

export interface WhitehackCheckManifestEntry {
  readonly id: WhitehackCheckId
  readonly title: string
  readonly confidence: WhitehackConfidence
  readonly doctrine: WhitehackDoctrine
  readonly principle: WhitehackPrinciple
  readonly languages: readonly WhitehackLanguage[]
  readonly redacts_source: boolean
}

export interface WhitehackTextLimits {
  readonly maxLines: number
  readonly maxFindings: number
}

export interface WhitehackScanLimits {
  readonly maxFiles: number
  readonly maxFileBytes: number
  readonly maxTotalBytes: number
  readonly maxEntries: number
  readonly maxDepth: number
  readonly maxPathBytes: number
  readonly maxLinesPerFile: number
  readonly maxFindings: number
}

export interface WhitehackScanScope {
  readonly files_scanned: number
  readonly bytes_scanned: number
  readonly entries_observed: number
  readonly excluded_paths: number
  readonly non_regular_paths: number
  readonly unsupported_files: number
  readonly excluded_basenames: readonly string[]
  readonly limits: WhitehackScanLimits
}

export interface WhitehackScanDetailedResult {
  readonly findings: readonly WhitehackFinding[]
  readonly scope: WhitehackScanScope
}

export interface WhitehackScannerIdentity {
  readonly name: 'whitehack'
  readonly version: string
  readonly check_count: number
}

export interface WhitehackFindingSummary {
  readonly finding_count: number
  readonly gating_finding_count: number
  readonly by_confidence: Readonly<Record<WhitehackConfidence, number>>
}

export type RedactedText<Redacted extends boolean> = Redacted extends true
  ? null
  : Redacted extends false
    ? string
    : string | null

export interface WhitehackSerializedFinding<Redacted extends boolean = boolean> {
  readonly file: string
  readonly line: number
  readonly check: string
  readonly title: RedactedText<Redacted>
  readonly confidence: WhitehackConfidence
  readonly doctrine: string
  readonly principle: WhitehackPrinciple
  readonly message: RedactedText<Redacted>
  readonly snippet: RedactedText<Redacted>
}

export interface WhitehackScanCompleteResult<Redacted extends boolean = boolean> {
  readonly document_type: 'whitehack-scan/v1'
  readonly status: 'complete'
  readonly complete: true
  readonly scanner: WhitehackScannerIdentity
  readonly target: string
  readonly redacted: Redacted
  readonly scope: WhitehackScanScope
  readonly summary: WhitehackFindingSummary
  readonly findings: readonly WhitehackSerializedFinding<Redacted>[]
  readonly error: null
}

export interface WhitehackScanErrorResult<Redacted extends boolean = boolean> {
  readonly document_type: 'whitehack-scan/v1'
  readonly status: 'error'
  readonly complete: false
  readonly scanner: WhitehackScannerIdentity
  readonly target: string
  readonly redacted: Redacted
  readonly scope: null
  readonly summary: WhitehackFindingSummary
  readonly findings: readonly []
  readonly error: Readonly<{ code: string }>
}

export type WhitehackScanResult<Redacted extends boolean = boolean> =
  | WhitehackScanCompleteResult<Redacted>
  | WhitehackScanErrorResult<Redacted>
