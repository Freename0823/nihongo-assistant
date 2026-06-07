import { useState } from 'react'
import LessonPage from './LessonPage'
import TranscribePage from './TranscribePage'
import CorpusPage from './CorpusPage'
import PlayerPage from './PlayerPage'
import './index.css'

const TABS = [
  { id: 'lesson',     label: '课程',  icon: '📖' },
  { id: 'player',     label: '精听',  icon: '▶️' },
  { id: 'transcribe', label: '转录',  icon: '🎵' },
  { id: 'corpus',     label: '语料库', icon: '🗂' },
]

export default function App() {
  const [tab, setTab] = useState('lesson')
  const [corpusRefresh, setCorpusRefresh] = useState(0)

  const handleSaved = () => {
    setCorpusRefresh(r => r + 1)
    setTab('corpus')
  }

  return (
    <div className="app">
      {tab === 'lesson'     && <LessonPage />}
      {tab === 'player'     && <PlayerPage />}
      {tab === 'transcribe' && <TranscribePage onSaved={handleSaved} />}
      {tab === 'corpus'     && <CorpusPage refresh={corpusRefresh} />}

      <nav className="tabbar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tabbar-item${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tabbar-icon">{t.icon}</span>
            <span className="tabbar-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
