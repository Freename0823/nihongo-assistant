import { useState, useEffect } from 'react'
import { search, updateFamiliarity, removeEntry, getStats } from './corpus'

const FAM = {
  new:    { label: '生疏', color: '#d32f2f' },
  unsure: { label: '熟悉', color: '#f57c00' },
  known:  { label: '掌握', color: '#388e3c' },
}
const NEXT = { new: 'unsure', unsure: 'known', known: 'new' }

export default function CorpusPage({ refresh }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [stats, setStats] = useState({ total: 0, new: 0, unsure: 0, known: 0 })

  useEffect(() => {
    setResults(search(query))
    setStats(getStats())
  }, [query, refresh])

  const cycleFam = (id, current) => {
    updateFamiliarity(id, NEXT[current])
    setResults(r => r.map(e => e.id === id ? { ...e, familiarity: NEXT[current] } : e))
    setStats(getStats())
  }

  const remove = (id) => {
    removeEntry(id)
    setResults(r => r.filter(e => e.id !== id))
    setStats(getStats())
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-title">语料库</div>
        <div className="page-header-sub">{stats.total} 条例句</div>
      </div>

      <div className="stats-row">
        <div className="stat-chip">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">全部</div>
        </div>
        <div className="stat-chip">
          <div className="stat-num" style={{ color: FAM.new.color }}>{stats.new}</div>
          <div className="stat-label">生疏</div>
        </div>
        <div className="stat-chip">
          <div className="stat-num" style={{ color: FAM.unsure.color }}>{stats.unsure}</div>
          <div className="stat-label">熟悉</div>
        </div>
        <div className="stat-chip">
          <div className="stat-num" style={{ color: FAM.known.color }}>{stats.known}</div>
          <div className="stat-label">掌握</div>
        </div>
      </div>

      <input
        className="search-input"
        style={{ marginBottom: 16 }}
        placeholder="搜索句子、语法点… 例：です　から　会社"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {results.length === 0 ? (
        <div className="corpus-empty">
          {query ? '没有找到相关例句' : '语料库是空的\n去课程页点「＋」或转录视频来积累语料'}
        </div>
      ) : results.map(e => {
        const fam = FAM[e.familiarity] || FAM.new
        return (
          <div className="corpus-card" key={e.id}>
            <div className="corpus-sentence">{e.sentence}</div>
            {e.translation && <div className="corpus-translation">{e.translation}</div>}
            <div className="corpus-meta">
              <div className="corpus-tags">
                {e.grammar_tags.map(t => <span className="corpus-tag" key={t}>{t}</span>)}
              </div>
              <div className="corpus-source">
                {e.source.label}{e.source.timestamp ? ` · ${e.source.timestamp}` : ''} · {e.source.date}
              </div>
            </div>
            <div className="corpus-actions">
              <button className="fam-btn" style={{ borderColor: fam.color, color: fam.color }}
                onClick={() => cycleFam(e.id, e.familiarity)}>
                {fam.label}
              </button>
              <button className="del-btn" onClick={() => remove(e.id)}>删除</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
