import * as root from '@agenttool/whitehack-scan'
import * as core from '@agenttool/whitehack-scan/core'
import * as capsuleApi from '@agenttool/whitehack-scan/evidence-capsule'
import capsuleSchema from '@agenttool/whitehack-scan/evidence-capsule-schema.json' with { type: 'json' }
import {
  EVIDENCE_CAPSULE_SUPPORTED_SCANNER_VERSIONS,
  addressEvidenceCapsule,
  createEvidenceCapsule,
  encodeEvidenceCapsule,
  parseEvidenceCapsuleBytes,
  type EvidenceCapsule,
} from '@agenttool/whitehack-scan/evidence-capsule'
import mathSchema from '@agenttool/whitehack-scan/math-evidence-schema.json' with { type: 'json' }
import * as mathApi from '@agenttool/whitehack-scan/math-evidence'
import {
  MATH_EVIDENCE_AXES,
  addressMathEvidence,
  createMathEvidence,
  encodeMathEvidence,
  parseMathEvidenceBytes,
  type MathEvidenceAxesInput,
} from '@agenttool/whitehack-scan/math-evidence'
import packageJson from '@agenttool/whitehack-scan/package.json' with { type: 'json' }
import * as reportApi from '@agenttool/whitehack-scan/report'
import { VERSION, report } from '@agenttool/whitehack-scan/report'
import {
  createScanErrorResult,
  createScanResult,
  type WhitehackScanScope,
} from '@agenttool/whitehack-scan/result'
import * as resultApi from '@agenttool/whitehack-scan/result'
import scanSchema from '@agenttool/whitehack-scan/schema.json' with { type: 'json' }
import {
  UNDERSTANDING_CONTEXT_PROFILE,
  UNDERSTANDING_SOURCE_PROTOCOL,
  createUnderstanding,
  type UnderstandingContext,
  type UnderstandingFindingInput,
} from '@agenttool/whitehack-scan/understanding'
import understandingSchema from '@agenttool/whitehack-scan/understanding-schema.json' with { type: 'json' }
import * as understandingApi from '@agenttool/whitehack-scan/understanding'

type IsAny<Value> = 0 extends (1 & Value) ? true : false
type AssertFalse<Value extends false> = Value
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false
type AssertTrue<Value extends true> = Value
type _RootIsTyped = AssertFalse<IsAny<typeof root>>
type _CoreIsTyped = AssertFalse<IsAny<typeof core>>
type _RootValuesExact = AssertTrue<Equal<keyof typeof root,
  | 'CHECK_MANIFEST'
  | 'CHECKS'
  | 'DEFAULT_EXCLUDED_BASENAMES'
  | 'DEFAULT_SCAN_LIMITS'
  | 'DEFAULT_TEXT_LIMITS'
  | 'RESULT_DOCUMENT_TYPE'
  | 'ScanError'
  | 'ScanTextError'
  | 'createScanErrorResult'
  | 'createScanResult'
  | 'exitCodeForFindings'
  | 'isGatingFinding'
  | 'scan'
  | 'scanDetailed'
  | 'scanText'
>>
type _CoreValuesExact = AssertTrue<Equal<keyof typeof core,
  | 'CHECK_MANIFEST'
  | 'CHECKS'
  | 'DEFAULT_TEXT_LIMITS'
  | 'LANGUAGE_BY_EXTENSION'
  | 'ScanTextError'
  | 'scanText'
>>
type _CapsuleValuesExact = AssertTrue<Equal<keyof typeof capsuleApi,
  | 'EVIDENCE_CAPSULE_ADDRESS_ALGORITHM'
  | 'EVIDENCE_CAPSULE_DISCLOSURE_PROFILE'
  | 'EVIDENCE_CAPSULE_DOCUMENT_TYPE'
  | 'EVIDENCE_CAPSULE_MEDIA_TYPE'
  | 'EVIDENCE_CAPSULE_SCANNER_VERSION'
  | 'EVIDENCE_CAPSULE_SUPPORTED_SCANNER_VERSIONS'
  | 'MAX_EVIDENCE_CAPSULE_BYTES'
  | 'addressEvidenceCapsule'
  | 'canonicalizeEvidenceCapsule'
  | 'createEvidenceCapsule'
  | 'encodeEvidenceCapsule'
  | 'parseEvidenceCapsuleBytes'
>>
type _MathValuesExact = AssertTrue<Equal<keyof typeof mathApi,
  | 'MATH_EVIDENCE_ADDRESS_ALGORITHM'
  | 'MATH_EVIDENCE_AXES'
  | 'MATH_EVIDENCE_DOCUMENT_TYPE'
  | 'MATH_EVIDENCE_MEDIA_TYPE'
  | 'MAX_MATH_EVIDENCE_BYTES'
  | 'addressMathEvidence'
  | 'canonicalizeMathEvidence'
  | 'createMathEvidence'
  | 'encodeMathEvidence'
  | 'parseMathEvidenceBytes'
>>
type _ReportValuesExact = AssertTrue<Equal<keyof typeof reportApi, 'VERSION' | 'report'>>
type _ResultValuesExact = AssertTrue<Equal<keyof typeof resultApi,
  | 'RESULT_DOCUMENT_TYPE'
  | 'createScanErrorResult'
  | 'createScanResult'
  | 'exitCodeForFindings'
  | 'isGatingFinding'
>>
type _UnderstandingValuesExact = AssertTrue<Equal<keyof typeof understandingApi,
  | 'UNDERSTANDING_CONTEXT_PROFILE'
  | 'UNDERSTANDING_DOCUMENT_TYPE'
  | 'UNDERSTANDING_SOURCE_PROTOCOL'
  | 'createUnderstanding'
>>

const findings = core.scanText('eval(userInput)\n', { file: 'input.ts', lang: 'ts' })
const gating: boolean = root.isGatingFinding(findings[0])
const exit: 0 | 1 = root.exitCodeForFindings(findings)
const scanned: Promise<readonly root.WhitehackFinding[]> = root.scan('.')
const detailed: Promise<root.WhitehackScanDetailedResult> = root.scanDetailed('.', {
  limits: { maxFiles: 1 },
})

const scope: WhitehackScanScope = {
  files_scanned: 1,
  bytes_scanned: 16,
  entries_observed: 1,
  excluded_paths: 0,
  non_regular_paths: 0,
  unsupported_files: 0,
  excluded_basenames: ['node_modules'],
  limits: {
    maxFiles: 1,
    maxFileBytes: 1024,
    maxTotalBytes: 1024,
    maxEntries: 2,
    maxDepth: 1,
    maxPathBytes: 128,
    maxLinesPerFile: 10,
    maxFindings: 10,
  },
}
const complete = createScanResult({
  version: '0.10.0',
  checkCount: core.CHECK_MANIFEST.length,
  target: '.',
  findings,
  scope,
})
const unredactedTitle: string = complete.findings[0]!.title
const redacted = createScanResult({
  version: '0.10.0',
  checkCount: core.CHECK_MANIFEST.length,
  target: '.',
  findings,
  scope,
  redacted: true,
})
const redactedTitle: null = redacted.findings[0]!.title
const failed = createScanErrorResult({
  version: '0.10.0',
  checkCount: core.CHECK_MANIFEST.length,
  target: '.',
  code: 'scan_read_failed',
  redacted: true,
})
const failedScope: null = failed.scope

const capsule: EvidenceCapsule = createEvidenceCapsule(complete)
const capsuleBytes: Uint8Array = encodeEvidenceCapsule(capsule)
const parsedCapsule: EvidenceCapsule = parseEvidenceCapsuleBytes(capsuleBytes)
const capsuleAddress: `sha256:${string}` = addressEvidenceCapsule(parsedCapsule)
const supportedVersions: readonly ['0.9.0', '0.10.0-dev.0', '0.10.0'] =
  EVIDENCE_CAPSULE_SUPPORTED_SCANNER_VERSIONS

const emptyAxis = {
  disposition: 'unknown',
  claim: null,
  support: [],
  refute: [],
  quantities: [],
  note: null,
} as const
const mathAxes = {
  observation: {
    disposition: 'assessed',
    claim: 'Caller-supplied observation.',
    support: [{ id: 'urn:evidence:1', digest: null }],
    refute: [],
    quantities: [{
      name: 'ratio',
      value: { kind: 'rational', numerator: '1', denominator: '2' },
      unit: 'ratio',
      scale: { base_unit: 'ratio', numerator: '1', denominator: '1' },
    }],
    note: null,
  },
  hypothesis: emptyAxis,
  reproduction: emptyAxis,
  impact: emptyAxis,
  provenance: emptyAxis,
  authorization: {
    disposition: 'refused',
    claim: null,
    support: [],
    refute: [],
    quantities: [],
    note: null,
  },
} as const satisfies MathEvidenceAxesInput
const mathEvidence = createMathEvidence({ capsule, axes: mathAxes })
const mathBytes: Uint8Array = encodeMathEvidence(mathEvidence)
const parsedMath = parseMathEvidenceBytes(mathBytes)
const mathAddress: `sha256:${string}` = addressMathEvidence(parsedMath)
const axesTuple: readonly [
  'observation', 'hypothesis', 'reproduction', 'impact', 'provenance', 'authorization',
] = MATH_EVIDENCE_AXES
if (parsedMath.axes.authorization.disposition === 'refused') {
  const noAuthorizationClaim: null = parsedMath.axes.authorization.claim
  const noAuthorizationEvidence: readonly [] = parsedMath.axes.authorization.support
  void noAuthorizationClaim
  void noAuthorizationEvidence
}

const context: UnderstandingContext = {
  profile: UNDERSTANDING_CONTEXT_PROFILE,
  source_protocol: UNDERSTANDING_SOURCE_PROTOCOL,
  records: {
    descriptor: 'absent', capability: 'absent', intent: 'absent',
    simulation: 'absent', continuity: 'absent',
  },
  relations: {
    'descriptor-capability': 'unknown', 'capability-intent': 'unknown',
    delegate: 'unknown', chain: 'unknown', source: 'unknown',
    'intent-simulation': 'unknown', revocation: 'unknown',
  },
  policy: {
    calls: 'unknown', spend: 'unknown', fee: 'unknown', expiry: 'unknown',
    use: 'unknown', approvals: 'unknown',
  },
  simulation: { execution: 'not-run', effects: 'unknown', fee: 'unknown' },
  custody: { 'descriptor-mode': 'unknown', 'signer-exportability': 'unknown' },
}
const understandingFindings: readonly UnderstandingFindingInput[] = [{
  file: 'input.ts',
  line: 1,
  check: 'unsafe-eval',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
}]
const understanding = createUnderstanding({ findings: understandingFindings, context })
const understandingType: 'whitehack-understanding/v1' = understanding.document_type
const reportVersion: `v${string}` = VERSION
const reportExit: 0 | 1 = report(findings, '.')

void [
  gating,
  exit,
  scanned,
  detailed,
  unredactedTitle,
  redactedTitle,
  failedScope,
  capsuleAddress,
  supportedVersions,
  mathAddress,
  axesTuple,
  understandingType,
  reportVersion,
  reportExit,
  capsuleSchema,
  mathSchema,
  scanSchema,
  understandingSchema,
  packageJson,
]
