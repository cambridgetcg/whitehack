// Planted dishonest financial code so whitehack has real off-chain positives.
// Do NOT "fix" these — they are the fixtures the self-test scans against.

// float-money: the order total is parsed and summed in binary floats — cents
// drift, and the "exact" total isn't.
export function orderTotal(items) {
  let total = 0
  for (const item of items) {
    total = total + parseFloat(item.price) * item.qty
  }
  return total
}

// float-money: a processing fee computed with float arithmetic.
export function processingFee(amount) {
  return amount * 0.029 + 0.3
}

// float-money: interest accrued in floats.
export function accrue(principal, rate) {
  return principal + principal * 0.05 * rate
}
