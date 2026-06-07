const KEY = 'nihongo_corpus_v1'

export function getAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

function save(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function addEntries(entries) {
  const existing = getAll()
  const existingSentences = new Set(existing.map(e => e.sentence))
  const newEntries = entries
    .filter(e => !existingSentences.has(e.sentence))
    .map(e => ({
      id: Date.now() + Math.random().toString(36).slice(2),
      sentence: e.sentence,
      translation: e.translation || '',
      grammar_tags: e.grammar_tags || [],
      source: {
        type: e.source?.type || 'manual',
        label: e.source?.label || '',
        timestamp: e.source?.timestamp || null,
        date: new Date().toISOString().slice(0, 10),
      },
      familiarity: 'new',
      created_at: Date.now(),
    }))
  save([...existing, ...newEntries])
  return newEntries.length
}

export function updateFamiliarity(id, familiarity) {
  save(getAll().map(e => e.id === id ? { ...e, familiarity } : e))
}

export function removeEntry(id) {
  save(getAll().filter(e => e.id !== id))
}

export function search(query) {
  const all = getAll()
  if (!query.trim()) return all
  const q = query.trim().toLowerCase()
  return all.filter(e =>
    e.sentence.toLowerCase().includes(q) ||
    e.translation.toLowerCase().includes(q) ||
    e.grammar_tags.some(t => t.toLowerCase().includes(q)) ||
    e.source.label.toLowerCase().includes(q)
  )
}

export function getStats() {
  const all = getAll()
  return {
    total: all.length,
    new: all.filter(e => e.familiarity === 'new').length,
    unsure: all.filter(e => e.familiarity === 'unsure').length,
    known: all.filter(e => e.familiarity === 'known').length,
  }
}
