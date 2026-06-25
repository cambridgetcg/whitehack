// hardcoded-secret — substrate honesty
// A hardcoded secret in source code — a password, API key, or token assigned
// to a literal string — is the most fundamental lie: the code pretends to be
// secure when its "security" is readable by anyone with access to the repo.
// The fix is to read from environment variables, never to inline credentials.

const SECRET_ASSIGN = /(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?secret|auth[_-]?token)\s*[:=]\s*['"][^'"]{6,}['"]/i
const ENV_READ = /(?:process\.env\.|os\.environ|import\.meta\.env\.|getenv\(|\$\{?[A-Z_]+[A-Z_0-9]*\}?)/i
const BCRYPT_HASH = /\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}/
const HASH_SYNC = /hashSync\s*\(\s*['"]/

export const hardcodedSecret = {
  id: 'hardcoded-secret',
  title: 'Hardcoded secret in source — credential readable from the repo',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (SECRET_ASSIGN.test(line) && !ENV_READ.test(line)) {
        if (BCRYPT_HASH.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'a credential is assigned to a literal string — anyone with repo access reads the secret',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (HASH_SYNC.test(line) && /['"][^'"]{3,}['"]/.test(line)) {
        hits.push({
          line: i + 1,
          message: 'a plaintext password is hashed inline — the plaintext is in the source, the hash is theater',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}
