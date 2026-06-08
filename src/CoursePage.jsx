import { useState } from 'react'
import LessonPage from './LessonPage'

const CHAPTERS = [
  {
    id: 1,
    title: '自己紹介',
    titleZh: '自我介绍',
    lessons: [
      { id: 1, title: '〜です', titleZh: '是……', done: false },
    ],
  },
  // 之后可以继续添加章节
]

export default function CoursePage() {
  const [view, setView] = useState('map') // map | lesson
  const [activeLesson, setActiveLesson] = useState(null)
  const [expanded, setExpanded] = useState(new Set([1])) // 默认展开第一章

  const toggleChapter = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (view === 'lesson') {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => setView('map')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', color: 'var(--text-dim)', padding: '4px 6px' }}
          >←</button>
          <div style={{ fontSize: '0.88em', color: 'var(--text-dim)' }}>
            Chapter {activeLesson?.chapterId} · {activeLesson?.title}
          </div>
        </div>
        <LessonPage />
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '1.3em', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>课程</div>
        <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: 2 }}>N5 · 系统学习日语</div>
      </div>

      {/* Chapter list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CHAPTERS.map((chapter, ci) => {
          const isOpen = expanded.has(chapter.id)
          const doneCount = chapter.lessons.filter(l => l.done).length
          const total = chapter.lessons.length

          return (
            <div key={chapter.id} style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {/* Chapter header */}
              <button
                onClick={() => toggleChapter(chapter.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72em', fontWeight: 700, color: 'var(--red)' }}>Ch.{chapter.id}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92em', fontWeight: 600, color: 'var(--text)' }}>{chapter.title}</div>
                  <div style={{ fontSize: '0.68em', color: 'var(--text-dim)', marginTop: 2 }}>{chapter.titleZh} · {doneCount}/{total} 课</div>
                </div>
                {/* Progress bar */}
                <div style={{ width: 40, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65em', color: 'var(--text-dim)', marginBottom: 3 }}>{Math.round(doneCount / total * 100)}%</div>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${doneCount / total * 100}%`, background: 'var(--red)', borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Lesson list */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {chapter.lessons.map((lesson, li) => (
                    <button
                      key={lesson.id}
                      onClick={() => { setActiveLesson({ ...lesson, chapterId: chapter.id }); setView('lesson') }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: li < chapter.lessons.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      {/* Status dot */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: lesson.done ? 'var(--red)' : 'var(--bg-soft)',
                        border: `2px solid ${lesson.done ? 'var(--red)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75em', color: lesson.done ? '#fff' : 'var(--text-dim)',
                      }}>
                        {lesson.done ? '✓' : li + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88em', fontWeight: 600, color: 'var(--text)', fontFamily: "'Noto Serif JP', serif" }}>{lesson.title}</div>
                        <div style={{ fontSize: '0.68em', color: 'var(--text-dim)', marginTop: 2 }}>{lesson.titleZh}</div>
                      </div>
                      <span style={{ fontSize: '0.75em', color: 'var(--text-dim)' }}>›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Coming soon */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px', boxShadow: 'var(--shadow-sm)', opacity: 0.5, textAlign: 'center' }}>
          <div style={{ fontSize: '0.78em', color: 'var(--text-dim)' }}>更多章节即将上线…</div>
        </div>
      </div>
    </div>
  )
}
