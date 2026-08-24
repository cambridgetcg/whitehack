import type {
  WhitehackConfidence,
  WhitehackCheckId,
  WhitehackDoctrine,
  WhitehackPrinciple,
  WhitehackScanCompleteResult,
} from './types.js'

export const EVIDENCE_CAPSULE_DOCUMENT_TYPE: 'whitehack-evidence-capsule/v1'
export const EVIDENCE_CAPSULE_DISCLOSURE_PROFILE: 'whitehack-public-minimal/v1'
export const EVIDENCE_CAPSULE_MEDIA_TYPE: 'application/vnd.whitehack.evidence-capsule.v1+json'
export const EVIDENCE_CAPSULE_ADDRESS_ALGORITHM: 'sha256'
export const EVIDENCE_CAPSULE_SCANNER_VERSION: '0.10.0'
export const EVIDENCE_CAPSULE_SUPPORTED_SCANNER_VERSIONS: readonly [
  '0.9.0',
  '0.10.0-dev.0',
  '0.10.0',
]
export const MAX_EVIDENCE_CAPSULE_BYTES: 65_536

export interface EvidenceCapsuleFindingGroup {
  readonly check: WhitehackCheckId
  readonly confidence: WhitehackConfidence
  readonly doctrine: WhitehackDoctrine
  readonly principle: WhitehackPrinciple
  readonly count: number
}

export interface EvidenceCapsule {
  readonly document_type: 'whitehack-evidence-capsule/v1'
  readonly complete: true
  readonly disclosure: Readonly<{
    profile: 'whitehack-public-minimal/v1'
    scan_metadata_retained: readonly ['scanner']
    finding_group_fields: readonly ['check', 'confidence', 'doctrine', 'principle', 'count']
    target_retained: false
    locations_retained: false
    source_text_retained: false
    scope_retained: false
    caller_text_retained: false
  }>
  readonly scanner: Readonly<{
    name: 'whitehack'
    version: '0.9.0' | '0.10.0-dev.0' | '0.10.0'
    check_count: 47
  }>
  readonly finding_groups: readonly EvidenceCapsuleFindingGroup[]
  readonly epistemic: Readonly<{
    basis: 'scanner-output-claim'
    finding_semantics: 'review-prompt-not-vulnerability-verdict'
    empty_semantics: 'no-bundled-match-not-security-proof'
    provenance: 'unverified'
    coverage: 'bounded-heuristic'
    content_address: 'canonical-bytes-identity-not-authenticity'
    complete_semantics: 'capsule-transformation-complete'
  }>
  readonly boundaries: Readonly<{
    capability_subject: 'evidence-capsule-transform'
    direct_capabilities: Readonly<{
      filesystem: false
      process: false
      network: false
      storage: false
      wallet: false
      clock: false
      key_store_access: false
      signing: false
      encryption: false
      authorization: false
    }>
    input_inspection: Readonly<{
      ordinary_accessors_invoked: false
      caller_proxy_traps_may_run: true
      sandboxed: false
    }>
    publication_authority: 'external'
    storage_receipt_included: false
  }>
}

export function createEvidenceCapsule(
  scanResult: WhitehackScanCompleteResult<boolean>,
): EvidenceCapsule
export function canonicalizeEvidenceCapsule(capsule: EvidenceCapsule): string
export function encodeEvidenceCapsule(capsule: EvidenceCapsule): Uint8Array
export function parseEvidenceCapsuleBytes(bytes: Uint8Array): EvidenceCapsule
export function addressEvidenceCapsule(capsule: EvidenceCapsule): `sha256:${string}`
