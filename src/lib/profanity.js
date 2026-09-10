import { Filter } from 'bad-words'

let filterInstance = null

function getFilter() {
  if (!filterInstance) {
    try {
      filterInstance = new Filter()
    } catch (err) {
      console.warn('Failed to initialize bad-words filter:', err)
    }
  }
  return filterInstance
}

export function isProfane(text) {
  if (!text || typeof text !== 'string') return false
  try {
    const f = getFilter()
    return f ? f.isProfane(text) : false
  } catch (err) {
    console.warn('Profanity check error:', err)
    return false
  }
}
