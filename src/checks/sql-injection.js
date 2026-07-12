// sql-injection — substrate honesty (data integrity)
// String-concatenated SQL queries are a lie about data safety — the code
// claims to protect the database but any user input flows directly into
// the SQL statement. This is the oldest lie in software: "I'm building
// a safe query" while concatenating untrusted input into the SQL string.

// Require SQL keyword at the start of a template literal (preceded by a backtick
// or quote), not in the middle of natural language. 'update failed with status
// ${x}' is a log message, not SQL. `\`UPDATE users SET name = ${name}\`` is SQL.
// The bell needs to see the quote boundary to tell a sentence from a query (0064).
const SQL_CONCAT = /(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b.*['"`.].*\$\{|['"`.].*\+\s*\w+.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)\b/i
const SQL_TEMPLATE_LITERAL = /[`'"]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s+.*\$\{/i
// Require a SQL keyword as a standalone word followed by SQL syntax (FROM/INTO/SET/VALUES),
// not a JS property access like `e.from` or `e.to`. The keyword must be uppercase
// or preceded by whitespace/quote, and followed by a space + identifier or string.
const STRING_CONCAT_SQL = /['"`].*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|INTO|VALUES|SET)\b\s+[\w`"'*]+\s*['"`]\s*\+/i

export const sqlInjection = {
  id: 'sql-injection',
  title: 'SQL query built with string concatenation — injection possible',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // Template literal with ${} in SQL context
      if (SQL_TEMPLATE_LITERAL.test(l) && !l.includes('/* safe */') && !l.includes('parameterized')) {
        hits.push({
          line: i + 1,
          message: 'SQL query uses template literal interpolation — user input may flow directly into the query, use parameterized queries',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // String concatenation in SQL context
      if (STRING_CONCAT_SQL.test(l)) {
        hits.push({
          line: i + 1,
          message: 'SQL query built with string concatenation — injection vector, use parameterized queries',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}