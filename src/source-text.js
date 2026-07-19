// Tiny lexical helpers for text checks. These do not parse JavaScript or
// Python; they strip comments and optionally mask quoted example text while
// preserving character offsets. The file-level helper also carries block
// comments, Python triple-quoted strings, and JavaScript template strings
// across lines. Checks that need syntax/data flow stay heuristic or out of
// scope.

export function isCommentLine(line) {
  return /^\s*(?:\/\/|\/\*|\*|#)/.test(line)
}

function mask(count) {
  return ' '.repeat(count)
}

function syntaxFor(language) {
  if (!language) {
    return { blockComments: true, slashComments: true, hashComments: true, tripleQuotes: true, templates: true }
  }
  const slashLanguage = ['js', 'sol', 'rs', 'c', 'go', 'java', 'swift'].includes(language)
  const hashLanguage = ['py', 'yaml', 'env', 'wifi-config'].includes(language)
  return {
    blockComments: slashLanguage,
    slashComments: slashLanguage,
    hashComments: hashLanguage,
    tripleQuotes: language === 'py',
    templates: language === 'js',
  }
}

function lexLine(line, state, { maskStrings, language }) {
  const syntax = syntaxFor(language)
  let out = ''
  let quote = null
  let escaped = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (state.blockComment) {
      if (char === '*' && next === '/') {
        state.blockComment = false
        out += mask(2)
        i++
      } else {
        out += ' '
      }
      continue
    }

    if (state.multilineQuote) {
      const delimiter = state.multilineQuote
      if (line.startsWith(delimiter, i) && (i === 0 || line[i - 1] !== '\\')) {
        out += mask(delimiter.length)
        i += delimiter.length - 1
        state.multilineQuote = null
      } else {
        out += ' '
      }
      continue
    }

    if (quote) {
      if (escaped) {
        escaped = false
        out += maskStrings ? ' ' : char
        continue
      }
      if (char === '\\') {
        escaped = true
        out += maskStrings ? ' ' : char
        continue
      }
      if (char === quote) quote = null
      out += maskStrings ? ' ' : char
      continue
    }

    if (syntax.blockComments && char === '/' && next === '*') {
      state.blockComment = true
      out += mask(2)
      i++
      continue
    }
    if (syntax.slashComments && char === '/' && next === '/') {
      out += mask(line.length - i)
      break
    }
    if (syntax.hashComments && char === '#') {
      out += mask(line.length - i)
      break
    }
    const triple = line.slice(i, i + 3)
    if (syntax.tripleQuotes && (triple === "'''" || triple === '\"\"\"')) {
      state.multilineQuote = triple
      out += mask(3)
      i += 2
      continue
    }
    if (syntax.templates && char === '`') {
      state.multilineQuote = '`'
      out += ' '
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      out += maskStrings ? ' ' : char
      continue
    }
    out += char
  }
  return { text: out, state }
}

export function executableLine(line, { maskStrings = false, language } = {}) {
  return lexLine(
    line,
    { blockComment: false, multilineQuote: null },
    { maskStrings, language },
  ).text
}

export function executableLines(lines, { maskStrings = false, language } = {}) {
  const state = { blockComment: false, multilineQuote: null }
  return lines.map((line) => lexLine(line, state, { maskStrings, language }).text)
}
