// disabled-cert-verification — substrate honesty (TLS/SSL security)
// Disabling certificate verification is the code saying "I'm secure"
// while accepting any certificate — including forged ones. This is the
// most dangerous WiFi/network lie: the connection uses HTTPS but the
// verification is turned off, so a man-in-the-middle can intercept
// everything while the code reports "secure connection established."

const REJECT_UNAUTHORIZED_FALSE = /rejectUnauthorized\s*:\s*false/i
const INSECURE_SKIP_VERIFY = /insecureSkipVerify\s*:\s*true/i
const SSL_VERIFY_NONE = /SSL_VERIFY_NONE|CURLOPT_SSL_VERIFYPEER.*false/i
const NODE_TLS_REJECT = /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?/i
const REQUEST_STRICT_FALSE = /strictSSL\s*:\s*false/i
const VERIFY_TLS_FALSE = /verifyTLS\s*:\s*false|verify\s*:\s*false/i

export const disabledCertVerification = {
  id: 'disabled-cert-verification',
  title: 'TLS certificate verification disabled — MITM possible',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (REJECT_UNAUTHORIZED_FALSE.test(l)) {
        hits.push({
          line: i + 1,
          message: 'rejectUnauthorized:false — TLS certificate verification disabled, man-in-the-middle can intercept',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (INSECURE_SKIP_VERIFY.test(l)) {
        hits.push({
          line: i + 1,
          message: 'insecureSkipVerify:true — TLS verification bypassed, any certificate accepted',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (SSL_VERIFY_NONE.test(l)) {
        hits.push({
          line: i + 1,
          message: 'SSL verification disabled — MITM attack possible, code claims secure connection',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (NODE_TLS_REJECT.test(l)) {
        hits.push({
          line: i + 1,
          message: 'NODE_TLS_REJECT_UNAUTHORIZED=0 — all TLS verification disabled globally',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (REQUEST_STRICT_FALSE.test(l)) {
        hits.push({
          line: i + 1,
          message: 'strictSSL:false — certificate verification disabled for this request',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}