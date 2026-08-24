import type {
  EvidenceCapsule,
  EvidenceCapsuleFindingGroup,
} from './evidence-capsule.js'

export const MATH_EVIDENCE_DOCUMENT_TYPE: 'whitehack-math-evidence/v1'
export const MATH_EVIDENCE_MEDIA_TYPE: 'application/vnd.whitehack.math-evidence.v1+json'
export const MATH_EVIDENCE_ADDRESS_ALGORITHM: 'sha256'
export const MAX_MATH_EVIDENCE_BYTES: 262_144
export const MATH_EVIDENCE_AXES: readonly [
  'observation',
  'hypothesis',
  'reproduction',
  'impact',
  'provenance',
  'authorization',
]

export type MathEvidenceAxisName = typeof MATH_EVIDENCE_AXES[number]
export type MathEvidenceDisposition = 'assessed' | 'unknown' | 'refused'
export type MathEvidenceState = 'support-only' | 'refute-only' | 'both' | 'neither'

export interface MathEvidenceReference {
  readonly id: string
  readonly digest: `sha256:${string}` | null
}

export interface MathEvidenceInteger {
  readonly kind: 'integer'
  readonly integer: string
}

export interface MathEvidenceRational {
  readonly kind: 'rational'
  readonly numerator: string
  readonly denominator: string
}

export type MathEvidenceExactValue = MathEvidenceInteger | MathEvidenceRational

export interface MathEvidenceScale {
  readonly base_unit: string
  readonly numerator: string
  readonly denominator: string
}

export interface MathEvidenceQuantity {
  readonly name: string
  readonly value: MathEvidenceExactValue
  readonly unit: string
  readonly scale: MathEvidenceScale
}

interface MathEvidenceAxisInputBase {
  readonly support: readonly MathEvidenceReference[]
  readonly refute: readonly MathEvidenceReference[]
  readonly quantities: readonly MathEvidenceQuantity[]
}

export interface MathEvidenceAssessedAxisInput extends MathEvidenceAxisInputBase {
  readonly disposition: 'assessed'
  readonly claim: string
  readonly note: null
}

export interface MathEvidenceUnknownAxisInput extends MathEvidenceAxisInputBase {
  readonly disposition: 'unknown'
  readonly claim: null
  readonly support: readonly []
  readonly refute: readonly []
  readonly quantities: readonly []
  readonly note: string | null
}

export interface MathEvidenceRefusedAxisInput extends MathEvidenceAxisInputBase {
  readonly disposition: 'refused'
  readonly claim: null
  readonly support: readonly []
  readonly refute: readonly []
  readonly quantities: readonly []
  readonly note: string | null
}

export type MathEvidenceAxisInput =
  | MathEvidenceAssessedAxisInput
  | MathEvidenceUnknownAxisInput
  | MathEvidenceRefusedAxisInput

interface MathEvidenceAssessedAxisOutputBase {
  readonly support: readonly MathEvidenceReference[]
  readonly refute: readonly MathEvidenceReference[]
  readonly quantities: readonly MathEvidenceQuantity[]
}

export interface MathEvidenceAssessedAxis extends MathEvidenceAssessedAxisOutputBase {
  readonly disposition: 'assessed'
  readonly claim: string
  readonly evidence_state: MathEvidenceState
  readonly note: null
}

export interface MathEvidenceUnknownAxis {
  readonly disposition: 'unknown'
  readonly claim: null
  readonly evidence_state: 'neither'
  readonly support: readonly []
  readonly refute: readonly []
  readonly quantities: readonly []
  readonly note: string | null
}

export interface MathEvidenceRefusedAxis {
  readonly disposition: 'refused'
  readonly claim: null
  readonly evidence_state: 'neither'
  readonly support: readonly []
  readonly refute: readonly []
  readonly quantities: readonly []
  readonly note: string | null
}

export type MathEvidenceAxis =
  | MathEvidenceAssessedAxis
  | MathEvidenceUnknownAxis
  | MathEvidenceRefusedAxis

export type MathEvidenceAxesInput = Readonly<Record<
  MathEvidenceAxisName,
  MathEvidenceAxisInput
>>

export type MathEvidenceAxes = Readonly<Record<MathEvidenceAxisName, MathEvidenceAxis>>

export interface MathEvidenceSignal {
  readonly check: EvidenceCapsuleFindingGroup['check']
  readonly confidence: EvidenceCapsuleFindingGroup['confidence']
  readonly doctrine: EvidenceCapsuleFindingGroup['doctrine']
  readonly principle: EvidenceCapsuleFindingGroup['principle']
  readonly value: Readonly<{ kind: 'integer'; integer: string }>
  readonly unit: 'finding'
  readonly scale: Readonly<{
    base_unit: 'finding'
    numerator: '1'
    denominator: '1'
  }>
}

export interface MathEvidence {
  readonly document_type: 'whitehack-math-evidence/v1'
  readonly complete: true
  readonly disclosure: Readonly<{
    profile: 'whitehack-math-evidence-caller-text/v1'
    source_capsule_profile: 'whitehack-public-minimal/v1'
    source_capsule_profile_applies_to_math_document: false
    caller_text_retained: true
    reference_ids_retained: true
    quantity_labels_retained: true
    safe_for_publication: 'unknown'
  }>
  readonly source: Readonly<{
    capsule_media_type: 'application/vnd.whitehack.evidence-capsule.v1+json'
    capsule_encoding: 'base64'
    capsule_bytes: string
    capsule_address: `sha256:${string}`
  }>
  readonly signal_basis: Readonly<{
    coordinate_fields: readonly ['check', 'confidence', 'doctrine', 'principle']
    value_kind: 'exact-integer-count'
    unit: 'finding'
    scale: Readonly<{
      base_unit: 'finding'
      numerator: '1'
      denominator: '1'
    }>
  }>
  readonly signal_vector: readonly MathEvidenceSignal[]
  readonly axes: MathEvidenceAxes
  readonly epistemic: Readonly<{
    basis: 'exact-evidence-capsule-plus-bounded-caller-assertions'
    axis_relation: 'separate-non-scalar-no-implicit-order'
    axis_scope: 'whole-document-not-implicitly-bound-to-any-signal-coordinate'
    authorization_axis: 'caller-assertion-without-bound-subject-action-or-scope-cannot-establish-authorization'
    evidence_logic: 'four-valued-support-and-refute'
    evidence_state_semantics: 'polarity-list-topology-not-truth-confidence-or-weight'
    finding_signal: 'sparse-exact-counts-not-risk-score'
    finding_semantics: 'review-prompt-not-vulnerability-verdict'
    empty_semantics: 'no-bundled-match-not-security-proof'
    coverage: 'bounded-heuristic'
    quantity_semantics: 'exact-integer-or-reduced-rational-strings'
    scale_semantics: 'base-value-equals-value-times-numerator-divided-by-denominator'
    unit_semantics: 'opaque-caller-label-no-registry-or-normalization'
    unknown_semantics: 'unassessed-not-zero'
    refusal_semantics: 'withheld-not-negative-evidence'
    provenance: 'caller-asserted-unverified'
    confidence_semantics: 'scanner-label-not-probability-or-severity'
    content_address: 'byte-identity-not-authenticity-confidentiality-or-authorization'
    linkability: 'address-may-equality-link-and-support-offline-guessing'
    complete_semantics: 'math-evidence-transformation-complete'
  }>
  readonly boundaries: Readonly<{
    capability_subject: 'math-evidence-transform'
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
    inferences_performed: Readonly<{
      emotion: false
      personhood: false
      consciousness: false
      consent: false
      permission: false
      rights: false
      standing: false
      authorization: false
      confidence_to_probability: false
      confidence_to_severity: false
    }>
    authorization_effect: 'none'
    consent_effect: 'none'
    permission_effect: 'none'
    rights_effect: 'none'
    standing_effect: 'none'
    downstream_weight_effect: 'none-training-reward-ranking-or-fitness'
    publication_authority: 'external'
  }>
}

export interface CreateMathEvidenceOptions {
  readonly capsule: EvidenceCapsule
  readonly axes: MathEvidenceAxesInput
}

export function createMathEvidence(options: CreateMathEvidenceOptions): MathEvidence
export function canonicalizeMathEvidence(mathEvidence: MathEvidence): string
export function encodeMathEvidence(mathEvidence: MathEvidence): Uint8Array
export function parseMathEvidenceBytes(bytes: Uint8Array): MathEvidence
export function addressMathEvidence(mathEvidence: MathEvidence): `sha256:${string}`
