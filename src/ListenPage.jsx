import { useState, useEffect, useRef, useCallback } from 'react'
import { transcribeAudio, tagGrammar } from './openai'
import { addEntries } from './corpus'

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function extractVideoId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// ── YouTube Player ──────────────────────────────────────────
function YouTubePlayer({ item, onBack, onSaveToCorpus, onWhisper }) {
  const [segments, setSegments] = useState([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [looping, setLooping] = useState(false)
  const [loopIdx, setLoopIdx] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [status, setStatus] = useState('loading')
  const [savedSet, setSavedSet] = useState(new Set())
  const [toast, setToast] = useState('')
  const [whisperLoading, setWhisperLoading] = useState(false)
  const [whisperError, setWhisperError] = useState('')

  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const subtitleRefs = useRef([])
  const intervalRef = useRef(null)
  const loopRef = useRef({ looping: false, loopIdx: -1, segments: [] })

  useEffect(() => { loopRef.current = { looping, loopIdx, segments } }, [looping, loopIdx, segments])

  const startSyncInterval = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p || typeof p.getCurrentTime !== 'function') return
      const t = p.getCurrentTime()
      const { looping, loopIdx, segments } = loopRef.current
      if (looping && loopIdx >= 0 && segments[loopIdx]) {
        const seg = segments[loopIdx]
        if (t >= seg.start + seg.duration - 0.1) { p.seekTo(seg.start, true); return }
      }
      let idx = -1
      for (let i = segments.length - 1; i >= 0; i--) {
        if (t >= segments[i].start) { idx = i; break }
      }
      setActiveIdx(idx)
      if (idx >= 0 && subtitleRefs.current[idx]) {
        subtitleRefs.current[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, 200)
  }, [])

  const initPlayer = useCallback((vid) => {
    if (playerRef.current) { try { playerRef.current.destroy() } catch {} playerRef.current = null }
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: vid,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => { e.target.setPlaybackRate(speed); startSyncInterval() },
        onStateChange: (e) => {
          if (e.data === 0 && loopRef.current.looping && loopRef.current.loopIdx >= 0) {
            const seg = loopRef.current.segments[loopRef.current.loopIdx]
            if (seg) e.target.seekTo(seg.start, true)
          }
        },
      },
    })
  }, [speed, startSyncInterval])

  useEffect(() => {
    const loadTranscript = async () => {
      try {
        const res = await fetch('/api/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url }),
        })
        const data = await res.json()
        if (data.error === 'no_transcript') setStatus('no_transcript')
        else if (data.error) setStatus('error')
        else { setSegments(data.segments); setStatus('ready') }
      } catch { setStatus('error') }
    }
    loadTranscript()
    const tryInit = () => {
      if (window.YT && window.YT.Player) initPlayer(item.videoId)
      else window.onYouTubeIframeAPIReady = () => initPlayer(item.videoId)
    }
    if (!window.YT) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
      window.onYouTubeIframeAPIReady = () => initPlayer(item.videoId)
    } else tryInit()
    return () => clearInterval(intervalRef.current)
  }, [item, initPlayer])

  const seekTo = (start) => { playerRef.current?.seekTo(start, true); playerRef.current?.playVideo() }
  const toggleLoop = (idx) => {
    if (looping && loopIdx === idx) { setLooping(false); setLoopIdx(-1) }
    else { setLooping(true); setLoopIdx(idx); seekTo(segments[idx].start) }
  }
  const changeSpeed = (s) => { setSpeed(s); playerRef.current?.setPlaybackRate(s) }
  const saveToCorpus = (seg, idx) => {
    addEntries([{ sentence: seg.text, translation: '', grammar_tags: [], source: { type: 'youtube', label: item.title, timestamp: formatTime(seg.start) } }])
    setSavedSet(prev => new Set([...prev, idx]))
    setToast('已存入语料库'); setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', color: 'var(--text-dim)', padding: '4px 6px' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88em', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        </div>
      </div>

      {/* Player */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginRight: 2 }}>速度</span>
          {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
            <button key={s} className={`btn btn-sm${speed === s ? ' btn-primary' : ''}`}
              style={{ padding: '5px 10px', minWidth: 'auto' }} onClick={() => changeSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>

      {(status === 'no_transcript' || status === 'error') && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#5d4037', marginBottom: 6 }}>
            📭 该视频没有上传字幕
          </div>
          <div style={{ fontSize: '0.78em', color: '#795548', lineHeight: 1.7, marginBottom: 12 }}>
            将用 Whisper AI 自动转录，点击后稍等约 30 秒。
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '0.85em' }}
            disabled={whisperLoading}
            onClick={async () => {
              setWhisperLoading(true)
              setWhisperError('')
              try {
                const res = await fetch('/api/whisper-youtube', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: item.url }),
                })
                const data = await res.json()
                if (data.error) { setWhisperError(data.error); setWhisperLoading(false); return }
                setSegments(data.segments)
                setStatus('ready')
                setToast('✅ 转录完成！'); setTimeout(() => setToast(''), 2500)
              } catch (e) { setWhisperError(e.message) }
              setWhisperLoading(false)
            }}
          >
            {whisperLoading ? '⏳ 转录中，请稍等…' : '🎙 一键 Whisper 转录'}
          </button>
          {whisperError && <div className="error-box" style={{ marginTop: 10 }}>{whisperError}</div>}
        </div>
      )}

      {segments.length > 0 && (
        <>
          <div className="section-label">字幕 · {segments.length} 句</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.map((seg, i) => (
              <div key={i} ref={el => subtitleRefs.current[i] = el} style={{
                background: activeIdx === i ? 'var(--red-light)' : 'var(--bg-card)',
                border: `1.5px solid ${activeIdx === i ? 'var(--red-border)' : 'var(--border)'}`,
                borderRadius: 10, padding: '10px 12px', boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => seekTo(seg.start)}>
                    <div style={{ fontSize: '0.62em', color: 'var(--red)', fontWeight: 600, marginBottom: 3 }}>{formatTime(seg.start)}</div>
                    <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '0.95em', lineHeight: 1.9, color: 'var(--text)' }}>{seg.text}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button style={{ background: looping && loopIdx === i ? 'var(--red)' : 'var(--bg-soft)', border: 'none', borderRadius: 6, width: 28, height: 28, color: looping && loopIdx === i ? '#fff' : 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => toggleLoop(i)} title="单句循环">↺</button>
                    <button className={`save-btn${savedSet.has(i) ? ' saved' : ''}`} onClick={() => saveToCorpus(seg, i)} title="存入语料库">
                      {savedSet.has(i) ? '✦' : '＋'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ── Local Transcribe ─────────────────────────────────────────
function LocalTranscribe({ onBack, onSaved }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [segments, setSegments] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.(mp3|mp4|wav|m4a|webm|mov)$/i)) { setError('请上传 mp3/mp4/wav/m4a/mov 文件'); return }
    if (f.size > 25 * 1024 * 1024) { setError('文件不能超过 25MB'); return }
    setError(''); setFile(f); setSegments([]); setSelected(new Set()); setStatus('idle')
  }

  const transcribe = async () => {
    setStatus('transcribing'); setProgress(10); setError('')
    try {
      const segs = await transcribeAudio(file, setProgress)
      const cleaned = segs.map(s => ({ ...s, text: s.text.trim() })).filter(s => s.text.length > 0)
      setSegments(cleaned); setSelected(new Set(cleaned.map((_, i) => i))); setStatus('reviewing')
    } catch (e) { setError(e.message); setStatus('idle') }
  }

  const toggle = (i) => setSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const toggleAll = () => setSelected(selected.size === segments.length ? new Set() : new Set(segments.map((_, i) => i)))

  const saveSelected = async () => {
    const chosen = [...selected].map(i => segments[i])
    if (!chosen.length) return
    setStatus('tagging')
    let tagged
    try { tagged = await tagGrammar(chosen.map(s => s.text)) }
    catch { tagged = chosen.map(s => ({ sentence: s.text, tags: [] })) }
    addEntries(chosen.map((seg, i) => ({
      sentence: seg.text, translation: '', grammar_tags: tagged[i]?.tags || [],
      source: { type: 'video', label: file.name.replace(/\.[^.]+$/, ''), timestamp: `${formatTime(seg.start)}–${formatTime(seg.end)}` },
    })))
    setStatus('done')
    setToast('已保存到语料库'); setTimeout(() => setToast(''), 2500)
    onSaved?.()
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', color: 'var(--text-dim)', padding: '4px 6px' }}>←</button>
        <div style={{ fontSize: '0.95em', fontWeight: 600, color: 'var(--text)' }}>本地转录</div>
      </div>

      {!file && (
        <div className="upload-zone" onClick={() => inputRef.current.click()}>
          <div className="upload-icon">🎵</div>
          <div className="upload-label">点击或拖入音频 / 视频文件</div>
          <div className="upload-hint">mp3 · mp4 · wav · m4a · mov · 最大 25MB</div>
          <input ref={inputRef} type="file" accept=".mp3,.mp4,.wav,.m4a,.webm,.mov" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {file && status === 'idle' && (
        <>
          <div className="file-preview">
            <div className="file-icon">🎬</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatSize(file.size)}</div>
            </div>
            <button className="file-remove" onClick={() => { setFile(null); setStatus('idle') }}>✕</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={transcribe}>开始转录</button>
          </div>
        </>
      )}

      {(status === 'transcribing' || status === 'tagging') && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.82em', color: 'var(--text-mid)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>{status === 'transcribing' ? '正在转录…' : 'AI 分析语法…'}</span>
            {status === 'transcribing' && <span>{progress}%</span>}
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: status === 'tagging' ? '65%' : `${progress}%` }} />
          </div>
        </div>
      )}

      {(status === 'reviewing' || status === 'done') && (
        <>
          <div className="review-header">
            <div className="review-count">共 {segments.length} 句 · 已选 {selected.size}</div>
            <button className="btn btn-sm" onClick={toggleAll}>{selected.size === segments.length ? '取消全选' : '全选'}</button>
          </div>
          <div className="sentence-list">
            {segments.map((seg, i) => (
              <div key={i} className={`sentence-item${selected.has(i) ? ' selected' : ''}`} onClick={() => toggle(i)}>
                <div className="sentence-check">{selected.has(i) ? '✓' : ''}</div>
                <div className="sentence-body">
                  <div className="sentence-text">{seg.text}</div>
                  <div className="sentence-time">{formatTime(seg.start)} – {formatTime(seg.end)}</div>
                </div>
              </div>
            ))}
          </div>
          {status === 'reviewing' && (
            <div className="btn-row">
              <button className="btn" onClick={() => { setFile(null); setStatus('idle'); setSegments([]) }}>重新上传</button>
              <button className="btn btn-primary" onClick={saveSelected} disabled={selected.size === 0}>保存 ({selected.size})</button>
            </div>
          )}
          {status === 'done' && (
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => { setFile(null); setStatus('idle'); setSegments([]) }}>再转录一个</button>
            </div>
          )}
        </>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ── Main ListenPage ───────────────────────────────────────────
const STORAGE_KEY = 'nihongo_listen_items_v1'

function loadItems() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function ListenPage({ onSaved }) {
  const [items, setItems] = useState(loadItems)
  const [view, setView] = useState('list') // list | youtube | local
  const [activeItem, setActiveItem] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [showUrlModal, setShowUrlModal] = useState(false)

  const openYouTube = (item) => { setActiveItem(item); setView('youtube') }

  const addYouTubeItem = () => {
    const vid = extractVideoId(urlInput.trim())
    if (!vid) { setUrlError('请输入有效的 YouTube 链接'); return }
    const newItem = {
      id: Date.now(),
      type: 'youtube',
      videoId: vid,
      url: urlInput.trim(),
      title: `YouTube · ${vid}`,
      thumb: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
      addedAt: new Date().toLocaleDateString('zh-CN'),
    }
    const updated = [newItem, ...items]
    setItems(updated); saveItems(updated)
    setUrlInput(''); setUrlError(''); setShowUrlModal(false)
    openYouTube(newItem)
  }

  const removeItem = (id) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated); saveItems(updated)
  }

  if (view === 'youtube' && activeItem) {
    return <YouTubePlayer item={activeItem} onBack={() => setView('list')} onWhisper={() => setView('local')} />
  }
  if (view === 'local') {
    return <LocalTranscribe onBack={() => setView('list')} onSaved={onSaved} />
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '1.3em', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>精听</div>
          <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: 2 }}>沉浸式语言学习</div>
        </div>
        <button
          onClick={() => setShowMenu(true)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', fontSize: '1.3em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(198,40,40,0.35)' }}
        >＋</button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2.2em', marginBottom: 12 }}>🎧</div>
          <div style={{ fontSize: '0.9em', color: 'var(--text-mid)', lineHeight: 1.8 }}>
            点击右上角 <strong>＋</strong> 添加<br />YouTube 视频或本地音频
          </div>
        </div>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id}
              style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', cursor: 'pointer' }}
              onClick={() => item.type === 'youtube' ? openYouTube(item) : setView('local')}
            >
              {item.thumb && (
                <div style={{ width: 90, flexShrink: 0, overflow: 'hidden' }}>
                  <img src={item.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              {!item.thumb && (
                <div style={{ width: 70, flexShrink: 0, background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6em' }}>🎵</div>
              )}
              <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
                <div style={{ fontSize: '0.84em', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</div>
                <div style={{ fontSize: '0.65em', color: 'var(--text-dim)' }}>{item.addedAt}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '10px 12px', fontSize: '0.85em', alignSelf: 'flex-start' }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* + Menu overlay */}
      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowMenu(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div
            style={{ position: 'absolute', bottom: 80, left: 16, right: 16, background: 'var(--bg-card)', borderRadius: 16, padding: '8px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '10px 18px 6px', fontSize: '0.7em', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em' }}>导入媒体</div>
            <button
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => { setShowMenu(false); setShowUrlModal(true) }}
            >
              <span style={{ fontSize: '1.4em' }}>▶️</span>
              <div>
                <div style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--text)' }}>YouTube 网址</div>
                <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: 2 }}>在应用中播放，无需下载</div>
              </div>
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />
            <button
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => { setShowMenu(false); setView('local') }}
            >
              <span style={{ fontSize: '1.4em' }}>📁</span>
              <div>
                <div style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--text)' }}>本地媒体</div>
                <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: 2 }}>上传音频/视频，AI 转录</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* URL input modal */}
      {showUrlModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowUrlModal(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div
            style={{ position: 'relative', width: '100%', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '0.95em', fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>输入 YouTube 链接</div>
            <input
              className="search-input"
              style={{ marginBottom: 8 }}
              placeholder="https://youtu.be/..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addYouTubeItem()}
              autoFocus
            />
            {urlError && <div className="error-box" style={{ marginBottom: 10 }}>{urlError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setShowUrlModal(false)}>取消</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={addYouTubeItem}>加载</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
