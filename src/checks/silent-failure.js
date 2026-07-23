// silent-failure — substrate honesty
// A read that fails must degrade VISIBLY. A catch that returns a falsy default,
// or a `?? 0` / `|| []` over a read, turns "I could not read this" into a
// confident, wrong value ("0 in stock", "$0 balance") that something downstream
// trusts. The fix is to surface the failure (throw / log / a typed error / a
// visible "—"), not to swallow it.

import { executableLines } from '../source-text.js'

const FALSY = /\breturn\s+(0n?(?![\w$.])|\[\]|\{\}|null|false)\s*(;|}|$)/
const EMPTY_STRING_RETURN = /^return\s+(''|"")\s*(;|\/\/|}|$)/
const SAFE_DEFAULT = /(\?\?|\|\|)\s*(0n?(?![\w$.])|\[\]|''|"")/
const GUARD = /\b(throw|console\.|logger?\.|report\(|rethrow|process\.exit|process\.stderr|process\.stdout|captureException|Sentry|warn\(|error\(|logFor\w*\(|logError\(|logBridgeSkip\(|logEvent\(|logWarn\(|logInfo\(|logDebug\(|onDebug\(|onDone\(|onWarn\(|setError\(|onError\(|fail\()/
const READ = /(await\s|fetch\(|\.get\(|\.query\(|readFile|\.count\(|\.find\(|\.load\(|\.read\()/
const MAP_GET_ZERO = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\.\s*get\s*\([^\n]*?\)\s*\?\?\s*0n?(?![\w$.])/g
const NUMERIC_OPERATOR_BEFORE = /(?:\+|-|\*|\/|%|<=?|>=?)\s*\(*\s*$/
const NUMERIC_OPERATOR_AFTER = /^\s*\)*\s*(?:\+|-|\*|\/|%|<=?|>=?)/
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasFalsyReturn(code, source) {
  if (FALSY.test(code)) return true
  for (const token of code.matchAll(/\breturn\b/g)) {
    if (EMPTY_STRING_RETURN.test(source.slice(token.index))) return true
  }
  return false
}

function hasSafeDefault(source, code) {
  if (SAFE_DEFAULT.test(code)) return true
  for (const operator of code.matchAll(/(\?\?|\|\|)/g)) {
    const afterOperator = source.slice(operator.index + operator[0].length)
    if (/^\s*(''|"")/.test(afterOperator)) return true
  }
  return false
}

function isExactMapConstruction(expression) {
  return /^new\s+Map(?:\s*<[^<>]*>)?\s*\((?:[^()]|\([^()]*\))*\)\s*$/.test(expression)
}

function directCallName(expression) {
  const call = expression.match(/^([A-Za-z_$][\w$]*)\s*\(/)
  if (!call) return null
  let depth = 0
  for (let i = expression.indexOf('('); i < expression.length; i++) {
    if (expression[i] === '(') depth++
    if (expression[i] === ')') {
      depth--
      if (depth === 0) {
        return expression.slice(i + 1).trim() === '' ? call[1] : null
      }
    }
  }
  return null
}

function mapFactories(lines) {
  const factories = new Set()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const declaration = line.match(
      /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*:\s*(?:Readonly)?Map\b/,
    )
    if (!declaration) continue

    let depth = 0
    let started = false
    let complete = false
    const body = []
    for (let j = i; j < Math.min(lines.length, i + 50); j++) {
      const segment = lines[j]
      for (const character of segment) {
        if (character === '{') {
          depth++
          started = true
        } else if (character === '}') {
          depth--
        }
      }
      body.push(segment)
      if (started && depth <= 0) {
        complete = true
        break
      }
    }
    if (!complete) continue

    const text = body.join('\n')
    const localMaps = [...text.matchAll(
      /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*([^;\n]+)/g,
    )]
      .filter((match) => isExactMapConstruction(match[2].trim()))
      .map((match) => match[1])
      .filter((name) => {
        const escaped = escapeRegExp(name)
        const bindings = text.match(new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\b`, 'g')) ?? []
        const laterAssignment = new RegExp(`(?:^|[;{}\\n])\\s*${escaped}\\s*=`, 'm')
        const replacedGet = new RegExp(`\\b${escaped}\\s*\\.\\s*get\\s*=`)
        return bindings.length === 1
          && !laterAssignment.test(text)
          && !replacedGet.test(text)
      })
    const returned = [...text.matchAll(/\breturn\s+([^;\n}]+)/g)]
      .map((match) => match[1].trim())
    if (returned.length > 0 && returned.every((expression) => (
      isExactMapConstruction(expression)
      || localMaps.includes(expression)
    ))) {
      factories.add(declaration[1])
    }
  }
  return factories
}

function depthAt(lines, lineIndex, column) {
  let depth = 0
  for (let i = 0; i <= lineIndex; i++) {
    const end = i === lineIndex ? column : lines[i].length
    for (const character of lines[i].slice(0, end)) {
      if (character === '{') depth++
      if (character === '}') depth--
    }
  }
  return depth
}

function bindingRemainsVisible(
  declarationLine,
  declarationEnd,
  useLine,
  useColumn,
  lines,
  receiver,
) {
  const segments = []
  for (let i = declarationLine; i <= useLine; i++) {
    const start = i === declarationLine ? declarationEnd : 0
    const end = i === useLine ? useColumn : lines[i].length
    segments.push(lines[i].slice(start, end))
  }
  const between = segments.join('\n')
  // Entering a nested function introduces parameter bindings which this
  // bounded text check cannot resolve reliably, especially across lines.
  if (/\bfunction\b/.test(between)) return false
  const currentStatement = between.slice(between.lastIndexOf(';') + 1)
  if (/=>/.test(currentStatement)) return false
  if (new RegExp(`\\b${escapeRegExp(receiver)}\\s*\\.\\s*get\\s*=`).test(between)) {
    return false
  }

  const bindingDepth = depthAt(lines, declarationLine, declarationEnd)
  let depth = bindingDepth
  for (const character of between) {
    if (character === '{') depth++
    if (character === '}') {
      depth--
      if (depth < bindingDepth) return false
    }
  }
  return true
}

function isProvenMapBinding(receiver, lineIndex, useColumn, lines, factories) {
  if (!IDENTIFIER.test(receiver)) return false
  const escaped = escapeRegExp(receiver)
  const declaration = new RegExp(`\\b(const|let|var)\\s+${escaped}\\b([^;\\n]*)`, 'g')

  for (let i = lineIndex; i >= 0; i--) {
    const bindings = [...lines[i].matchAll(declaration)]
      .filter((match) => i !== lineIndex || match.index < useColumn)
    const binding = bindings.at(-1)
    if (binding) {
      if (binding[1] !== 'const') return false
      const assignment = binding[2].match(/^\s*(?::\s*[^=;]+)?=\s*(.+)$/)
      if (!assignment) return false
      const initializer = assignment[1].trim()
      const declarationEnd = binding.index + binding[0].length
      if (!bindingRemainsVisible(
        i,
        declarationEnd,
        lineIndex,
        useColumn,
        lines,
        receiver,
      )) {
        return false
      }
      if (isExactMapConstruction(initializer)) return true
      const call = directCallName(initializer)
      return call !== null && factories.has(call)
    }
  }
  return false
}

function isBenignMapArithmeticDefault(line, lineIndex, lines, factories) {
  // Awaited Map-like facades may still be remote reads. Keep them visible even
  // when a local type annotation happens to call the receiver `Map`.
  if (/\bawait\b/.test(line)) return false

  const matches = [...line.matchAll(MAP_GET_ZERO)]
  if (matches.length === 0) return false
  const spans = []
  for (const match of matches) {
    const start = match.index
    const end = start + match[0].length
    const numericUse = (
      NUMERIC_OPERATOR_BEFORE.test(line.slice(0, start))
      || NUMERIC_OPERATOR_AFTER.test(line.slice(end))
    )
    if (!numericUse || !isProvenMapBinding(
      match[1],
      lineIndex,
      match.index,
      lines,
      factories,
    )) {
      return false
    }
    spans.push([start, end])
  }

  // Do not let one proven Map lookup hide another defaulted read on the same
  // line. Every fallback which made the historical rule fire must belong to a
  // proven local Map arithmetic expression.
  for (const fallback of line.matchAll(new RegExp(SAFE_DEFAULT.source, 'g'))) {
    if (!spans.some(([start, end]) => fallback.index >= start && fallback.index < end)) {
      return false
    }
  }
  return true
}

export const silentFailure = {
  id: 'silent-failure',
  title: 'Read fails silently to a falsy default',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2, // Clear Standard #2 — visible failure
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    const structuralLines = executableLines(lines, { maskStrings: true, language: 'js' })
    const factories = mapFactories(structuralLines)

    // (1) catch blocks that return a falsy value without logging or rethrowing.
    for (let i = 0; i < lines.length; i++) {
      const codePart = structuralLines[i]
      const idx = codePart.indexOf('catch')
      if (idx === -1 || !/\bcatch\b/.test(codePart)) continue
      let depth = 0
      let started = false
      const body = []
      for (let j = i; j < Math.min(lines.length, i + 30); j++) {
        const seg = j === i ? structuralLines[j].slice(idx) : structuralLines[j]
        for (const ch of seg) {
          if (ch === '{') {
            depth++
            started = true
          } else if (ch === '}') {
            depth--
          }
        }
        body.push({ n: j + 1, l: lines[j], code: structuralLines[j] })
        if (started && depth <= 0) break
      }
      const text = body.map((b) => b.code).join('\n')
      if (GUARD.test(text)) continue
      const falsy = body.find((b) => hasFalsyReturn(b.code, b.l))
      if (falsy) {
        hits.push({
          line: falsy.n,
          message: 'catch returns a falsy default and neither logs nor rethrows — a failure becomes a confident wrong value',
          snippet: falsy.l.trim(),
        })
      }
    }

    // (2) a read coerced to a falsy default on the same line.
    for (let i = 0; i < lines.length; i++) {
      if (
        hasSafeDefault(lines[i], structuralLines[i])
        && READ.test(structuralLines[i])
        && !isBenignMapArithmeticDefault(structuralLines[i], i, structuralLines, factories)
      ) {
        hits.push({
          line: i + 1,
          message: 'a read is coerced to a falsy default — "zero" and "could not read" become indistinguishable',
          snippet: lines[i].trim(),
        })
      }
    }

    return hits
  },
}
