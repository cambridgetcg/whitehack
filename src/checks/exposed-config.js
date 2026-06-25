// exposed-config — substrate honesty
// A config file with embedded credentials — .mcp.json, .env committed to git,
// config files containing secrets — is a lie: the project pretends its
// configuration is private when the secrets are in version control.
// The fix is .env.example + .gitignore, never commit real credentials.

const SECRET_URL = /(?:secret|token|key|password|passwd)=.{8,}/i
const JSON_SECRET = /"(?:secret|token|key|password|apiKey|client_secret)"\s*:\s*"[^"]{8,}"/i

export const exposedConfig = {
  id: 'exposed-config',
  title: 'Config file contains embedded credentials',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: [], // runs on all file types
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (SECRET_URL.test(line) || JSON_SECRET.test(line)) {
        // skip obvious placeholder/example values
        if (/example|placeholder|your_|xxx|CHANGE|REPLACE|dummy/i.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'a config file contains what appears to be a real credential — secrets in version control are not secret',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}
