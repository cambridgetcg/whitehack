// unsafe-eval — substrate honesty
// eval(), new Function(), innerHTML with interpolation, and dangerouslySetInnerHTML
// are lies: the code pretends to control its own execution when it actually
// delegates control to whatever string it receives. The fix is to parse,
// template, or sanitize — never to execute raw input.

const EVAL = /\beval\s*\(/
const NEW_FUNCTION = /new\s+Function\s*\(/
const INNER_HTML = /\.innerHTML\s*=\s*[^<\s]/  
const DANGEROUS_SET = /dangerouslySetInnerHTML/

export const unsafeEval = {
  id: 'unsafe-eval',
  title: 'Unsafe code execution — eval, Function, or unsanitized HTML injection',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (EVAL.test(line) && !/\/\/.+eval/.test(line)) {
        hits.push({
          line: i + 1,
          message: 'eval() executes arbitrary strings as code — the code does not control its own execution',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (NEW_FUNCTION.test(line)) {
        hits.push({
          line: i + 1,
          message: 'new Function() compiles a string at runtime — same risk as eval',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (DANGEROUS_SET.test(line)) {
        // The canonical Next.js JSON-LD idiom feeds JSON.stringify(obj) into a
        // <Script type="application/ld+json"> tag. JSON.stringify on a trusted
        // object produces safe output (no HTML parsing context) — this is the
        // documented structured-data pattern, not an XSS vector. Skip it so the
        // scanner does not cry wolf on safe idioms.
        const isJsonLdSafe = /__html\s*:\s*JSON\.stringify\s*\(/.test(line)
        if (!isJsonLdSafe) {
          hits.push({
            line: i + 1,
            message: 'dangerouslySetInnerHTML bypasses React XSS protection — ensure the input is sanitized',
            snippet: line.trim().slice(0, 120),
          })
        }
      }
    }
    return hits
  },
}
