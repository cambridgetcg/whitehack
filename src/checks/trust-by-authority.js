// trust-by-authority — trust protocol
// Inspired by Psyche: the decentralized training network that enables
// collaboration between UNTRUSTED parties by verifying results, not by
// trusting any single participant. Trust emerges from the protocol, not
// from authority. When code trusts a source purely because of who or what
// it is — a service, an admin config, a "trusted" endpoint — without
// verifying the claim, it is doing the opposite of what Psyche's protocol
// achieves.
//
// This check detects code that defers to a source without cross-checking:
//   • accepting a response without verifying its integrity (no checksum,
//     signature, or status check on the result)
//   • trusting a config/env value without validation (raw process.env
//     piped directly into security-critical paths)
//   • deferring to a "trusted" service/host without cross-referencing
//     (hardcoded TRUSTED_HOST, skipping verification because source is
//     "internal")
//   • accepting unsigned/unverified data from a network source
//
// The honest approach: verify the claim independently. Check the response
// status, validate the schema, cross-reference the source. Trust through
// protocol, not through authority.

// ── trust-by-label: code uses "trusted" as a substitute for verification ──
const TRUST_LABEL =
  /(?:TRUSTED_HOSTS?|TRUSTED_SOURCES?|TRUSTED_ORIGINS?|trustedHosts|trustedSources|isTrusted)\s*[=:]/i

const SKIP_VERIFY_BY_AUTHORITY =
  /(?:because|since|if|when|assume|assuming)\s+(?:it'?s|this\s+is|the\s+source\s+is|host\s+is)\s+(?:trusted|internal|known|verified|safe|authorized)/i

// ── raw env/config into security-critical paths without validation ──
const RAW_ENV_TO_SECRET = /(?:SECRET|KEY|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|AUTH)\s*(?:=|:)\s*(?:process\.env\.|os\.environ|getenv|config\.get|env\.get)\b/i

const RAW_ENV_TO_ENDPOINT = /(?:URL|HOST|ENDPOINT|ORIGIN|REDIRECT|CALLBACK|WEBHOOK)\s*(?:=|:)\s*(?:process\.env\.|os\.environ|getenv|config\.get|env\.get)\b/i

const VALIDATION_NEARBY = /\b(validate|verify|check|sanitize|parse|schema|assert|require|isValid|matches|allowedOrigins|whitelist|allowlist|blocklist|denylist|checksum|signature|hmac|sha256|integrity|authenticity)\b/i

// ── response accepted without status/integrity check ──
const FETCH_NO_CHECK =
  /(?:const|let|var)\s+\w+\s*=\s*(?:await\s+)?(?:fetch|axios|request|http\.get|https\.get|got|superagent|urllib)\s*\(/i

const STATUS_CHECK =
  /\.(ok|status|statusText|statusCode|success)\b|\.json\s*\(\s*\)|res\.ok|response\.ok|checkStatus|assertStatus|expectStatus/i

// ── accepting unsigned data from network ──
const UNSIGNED_NETWORK_DATA =
  /(?:parse|JSON\.parse|decode|unpack)\s*\(\s*(?:await\s+)?(?:res|response|body|data|payload|buf|chunk)\b/i

const SIGNATURE_CHECK = /\b(verify|signature|hmac|sha256|ed25519|secp256k1|jwt\.verify|crypto\.verify|nacl\.sign|sodium\.sign|ed25519\.verify)\b/i

export const trustByAuthority = {
  id: 'trust-by-authority',
  title: 'Source trusted by authority rather than verified — no cross-check',
  confidence: 'heuristic',
  doctrine: 'trust-protocol',
  principle: 3, // Trust = cross-checked truth
  langs: ['js'],
  detect(content, lines) {
    const hits = []

    // (1) "trusted" label used as a substitute for verification.
    for (let i = 0; i < lines.length; i++) {
      if (TRUST_LABEL.test(lines[i])) {
        // Check if there's any actual verification nearby (within ~10 lines)
        const lo = Math.max(0, i - 3)
        const hi = Math.min(lines.length, i + 12)
        let hasVerification = false
        for (let j = lo; j < hi; j++) {
          if (VALIDATION_NEARBY.test(lines[j]) && j !== i) hasVerification = true
        }
        if (!hasVerification) {
          hits.push({
            line: i + 1,
            message:
              'source labeled "trusted" without any verification nearby — authority is used as a substitute for cross-checking (Psyche inverts this: trust from protocol, not from label)',
            snippet: lines[i].trim(),
          })
        }
      }

      if (SKIP_VERIFY_BY_AUTHORITY.test(lines[i])) {
        hits.push({
          line: i + 1,
          message:
            'verification skipped because the source is assumed trusted/known/internal — trust by assumption, not by protocol',
          snippet: lines[i].trim(),
        })
      }
    }

    // (2) raw env/config into security-critical values without validation.
    for (let i = 0; i < lines.length; i++) {
      if (RAW_ENV_TO_SECRET.test(lines[i]) || RAW_ENV_TO_ENDPOINT.test(lines[i])) {
        // Check if validation exists in the next ~5 lines
        const hi = Math.min(lines.length, i + 6)
        let hasValidation = false
        for (let j = i + 1; j < hi; j++) {
          if (VALIDATION_NEARBY.test(lines[j])) hasValidation = true
        }
        if (!hasValidation) {
          hits.push({
            line: i + 1,
            message:
              'raw env/config value piped into a security-critical field without validation — the source is trusted by authority (it came from env) rather than verified by protocol',
            snippet: lines[i].trim(),
          })
        }
      }
    }

    // (3) fetch/response accepted without status or integrity check.
    //     We flag the assignment site if no status check appears within
    //     the next ~10 lines.
    for (let i = 0; i < lines.length; i++) {
      if (!FETCH_NO_CHECK.test(lines[i])) continue
      const hi = Math.min(lines.length, i + 12)
      let hasCheck = false
      for (let j = i; j < hi; j++) {
        if (STATUS_CHECK.test(lines[j])) hasCheck = true
      }
      if (!hasCheck) {
        hits.push({
          line: i + 1,
          message:
            'network response accepted without checking status/ok — the response is trusted because it came from a call, not because its integrity was verified',
          snippet: lines[i].trim(),
        })
      }
    }

    // (4) unsigned network data parsed without signature verification.
    //     Flagged only when the file does NOT contain any signature
    //     verification at all — the data is trusted wholesale.
    if (!SIGNATURE_CHECK.test(content)) {
      for (let i = 0; i < lines.length; i++) {
        if (UNSIGNED_NETWORK_DATA.test(lines[i])) {
          hits.push({
            line: i + 1,
            message:
              'network data parsed without signature/integrity verification anywhere in this file — trust by authority (the source sent it) instead of trust by protocol (verify the claim)',
            snippet: lines[i].trim(),
          })
        }
      }
    }

    return hits
  },
}
