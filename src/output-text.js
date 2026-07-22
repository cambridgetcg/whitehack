const UNSAFE_TERMINAL_CODE_POINT = /[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/gu
const UNSAFE_JSON_CODE_POINT = /[\u007f-\u009f\u2028-\u202e\u2066-\u2069]/gu

function unicodeEscape(character) {
  return `\\u${character.codePointAt(0).toString(16).padStart(4, '0')}`
}

export function escapeTerminal(value) {
  return String(value).replace(UNSAFE_TERMINAL_CODE_POINT, unicodeEscape)
}

// JSON.stringify already escapes C0 controls. Escape C1 controls, Unicode line
// separators, and bidi controls in the transport too, while preserving the
// exact value a JSON parser reconstructs.
export function stringifyJsonSafe(value) {
  return JSON.stringify(value).replace(UNSAFE_JSON_CODE_POINT, unicodeEscape)
}
