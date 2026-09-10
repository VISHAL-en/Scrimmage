export function formatActionError(err, defaultMsg = 'Action failed') {
  if (!err) return defaultMsg
  const msg = typeof err === 'string' ? err : err.message || ''
  const lower = msg.toLowerCase()
  if (
    lower.includes('banned') ||
    lower.includes('restrict') ||
    lower.includes('is_banned') ||
    lower.includes('account suspended') ||
    lower.includes('not authorized')
  ) {
    return 'Your account has been restricted.'
  }
  return msg || defaultMsg
}
