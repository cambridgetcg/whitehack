import type {
  WhitehackCheckId,
  WhitehackConfidence,
  WhitehackDoctrine,
  WhitehackPrinciple,
} from './types.js'

export const UNDERSTANDING_DOCUMENT_TYPE: 'whitehack-understanding/v1'
export const UNDERSTANDING_CONTEXT_PROFILE: 'whitehack-agent-wallet-projection/v1'
export const UNDERSTANDING_SOURCE_PROTOCOL: 'agent-wallet/0.1'

export type UnderstandingRecordState = 'absent' | 'unverified' | 'verified' | 'invalid'
export type UnderstandingRelationState = 'match' | 'mismatch' | 'unknown'
export type UnderstandingBoundState = 'within-bounds' | 'outside-bounds' | 'unknown'
export type UnderstandingApprovalState =
  | 'not-required'
  | 'requirement-satisfied'
  | 'requirement-unsatisfied'
  | 'unknown'
export type UnderstandingExecutionState =
  | 'passed'
  | 'failed'
  | 'stale'
  | 'inconclusive'
  | 'not-run'
export type UnderstandingDescriptorMode =
  | 'self-custodied'
  | 'delegated-signer'
  | 'platform-custodied'
  | 'watch-only'
  | 'unknown'
export type UnderstandingExportability = 'non-exportable' | 'exportable' | 'unknown'
export type UnderstandingInferenceStatus = 'supported' | 'contradicted' | 'indeterminate'
export type UnderstandingFindingConfidence = Exclude<WhitehackConfidence, 'medium'>

export interface UnderstandingFindingInput {
  readonly file: string
  readonly line: number
  readonly check: WhitehackCheckId
  readonly confidence: UnderstandingFindingConfidence
  readonly doctrine: WhitehackDoctrine
  readonly principle: WhitehackPrinciple
}

export interface UnderstandingContext {
  readonly profile: 'whitehack-agent-wallet-projection/v1'
  readonly source_protocol: 'agent-wallet/0.1'
  readonly records: Readonly<{
    descriptor: UnderstandingRecordState
    capability: UnderstandingRecordState
    intent: UnderstandingRecordState
    simulation: UnderstandingRecordState
    continuity: UnderstandingRecordState
  }>
  readonly relations: Readonly<{
    'descriptor-capability': UnderstandingRelationState
    'capability-intent': UnderstandingRelationState
    delegate: UnderstandingRelationState
    chain: UnderstandingRelationState
    source: UnderstandingRelationState
    'intent-simulation': UnderstandingRelationState
    revocation: UnderstandingRelationState
  }>
  readonly policy: Readonly<{
    calls: UnderstandingBoundState
    spend: UnderstandingBoundState
    fee: UnderstandingBoundState
    expiry: UnderstandingBoundState
    use: UnderstandingBoundState
    approvals: UnderstandingApprovalState
  }>
  readonly simulation: Readonly<{
    execution: UnderstandingExecutionState
    effects: UnderstandingRelationState
    fee: UnderstandingBoundState
  }>
  readonly custody: Readonly<{
    'descriptor-mode': UnderstandingDescriptorMode
    'signer-exportability': UnderstandingExportability
  }>
}

export type UnderstandingInferenceId =
  | 'source-attention'
  | 'caller-declared-record-chain-consistency'
  | 'caller-declared-static-policy-consistency'
  | 'caller-declared-simulation-consistency'
  | 'caller-declared-continuity-consistency'
  | 'caller-declared-custody-description'
  | 'execution-readiness'

export interface UnderstandingInference<
  Id extends UnderstandingInferenceId = UnderstandingInferenceId,
  Status extends UnderstandingInferenceStatus = UnderstandingInferenceStatus,
> {
  readonly id: Id
  readonly status: Status
  readonly confidence: 'heuristic'
  readonly epistemic_basis: 'caller-assertion'
  readonly question: string
  readonly basis: readonly string[]
}

export interface UnderstandingUnknowns {
  readonly 'adapter-trust': string
  readonly 'approval-authenticity': string
  readonly consent: string
  readonly 'current-continuity': string
  readonly 'custody-truth': string
  readonly 'durable-usage-reservation': string
  readonly 'finding-provenance': string
  readonly 'live-chain-state': string
  readonly 'payload-semantics': string
  readonly 'projection-freshness': string
  readonly 'scanner-coverage': string
  readonly 'signing-broadcast-outcome': string
  readonly 'subject-binding': string
  readonly 'record-relations'?: string
  readonly 'record-verification'?: string
  readonly 'static-policy-context'?: string
}

export interface WhitehackUnderstanding {
  readonly document_type: 'whitehack-understanding/v1'
  readonly complete: true
  readonly redaction: Readonly<{
    profile: 'whitehack-finding-field-allowlist/v1'
    retained_finding_fields: readonly [
      'file',
      'line',
      'check',
      'confidence',
      'doctrine',
      'principle',
    ]
    other_finding_fields_removed: true
    caller_file_label_retained: true
    caller_file_label_sensitivity: 'unknown'
  }>
  readonly presented_evidence: Readonly<{
    finding_claims: readonly UnderstandingFindingInput[]
    context_assertions: UnderstandingContext
  }>
  readonly inferences: readonly [
    UnderstandingInference<'source-attention', 'supported' | 'indeterminate'>,
    UnderstandingInference<'caller-declared-record-chain-consistency'>,
    UnderstandingInference<'caller-declared-static-policy-consistency'>,
    UnderstandingInference<'caller-declared-simulation-consistency'>,
    UnderstandingInference<'caller-declared-continuity-consistency'>,
    UnderstandingInference<'caller-declared-custody-description', 'supported' | 'indeterminate'>,
    UnderstandingInference<'execution-readiness', 'indeterminate'>,
  ]
  readonly unknowns: Readonly<UnderstandingUnknowns>
  readonly boundaries: Readonly<{
    direct_capabilities: Readonly<{
      filesystem: false
      process: false
      network: false
      wallet: false
      clock: false
      key_store_access: false
      signing: false
      rpc: false
      simulation: false
      broadcast: false
      authorization: false
    }>
    input_inspection: Readonly<{
      ordinary_accessors_invoked: false
      caller_proxy_traps_may_run: true
      sandboxed: false
    }>
    wallet_subject_bound: false
  }>
}

export interface CreateUnderstandingOptions {
  readonly findings: readonly UnderstandingFindingInput[]
  readonly context: UnderstandingContext
}

export function createUnderstanding(options: CreateUnderstandingOptions): WhitehackUnderstanding
