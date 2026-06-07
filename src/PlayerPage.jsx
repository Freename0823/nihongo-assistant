import { useState, useEffect, useRef, useCallback } from 'react'
import { addEntries } from './corpus'

function extractVideoId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function PlayerPage() {
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [segments, setSegments] = useState([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [looping, setLooping] = useState(false)
  const [loopIdx, setLoopIdx] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error | no_transcript
  const [errorMsg, setErrorMsg] = useState('')
  const [savedSet, setSavedSet] = useState(new Set())
  const [toast, setToast] = useState('')

  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const subtitleRefs = useRef([])
  const intervalRef = useRef(null)
  const loopRef = useRef({ looping: false, loopIdx: -1, segments: [] })

  // Keep loop ref in sync
  useEffect(() => {
    loopRef.current = { looping, loopIdx, segments }
  }, [looping, loopIdx, segments])

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) return
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  }, [])

  const startSyncInterval = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p || typeof p.getCurrentTime !== 'function') return
      const t = p.getCurrentTime()
      const { looping, loopIdx, segments } = loopRef.current

      // Loop single sentence
      if (looping && loopIdx >= 0 && segments[loopIdx]) {
        const seg = segments[loopIdx]
        if (t >= seg.start + seg.duration - 0.1) {
          p.seekTo(seg.start, true)
          return
        }
      }

      // Find active subtitle
      let idx = -1
      for (let i = segments.length - 1; i >= 0; i--) {
        if (t >= segments[i].start) { idx = i; break }
      }
      setActiveIdx(idx)

      // Auto scroll
      if (idx >= 0 && subtitleRefs.current[idx]) {
        subtitleRefs.current[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, 200)
  }, [])

  const initPlayer = useCallback((vid) => {
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
    }

    const onReady = (e) => {
      e.target.setPlaybackRate(speed)
      startSyncInterval()
    }

    const onStateChange = (e) => {
      // YT.PlayerState.ENDED = 0
      if (e.data === 0 && loopRef.current.looping && loopRef.current.loopIdx >= 0) {
        const seg = loopRef.current.segments[loopRef.current.loopIdx]
        if (seg) e.target.seekTo(seg.start, true)
      }
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: vid,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady, onStateChange },
    })
  }, [speed, startSyncInterval])

  const loadVideo = async () => {
    const vid = extractVideoId(url.trim())
    if (!vid) { setErrorMsg('请输入有效的 YouTube 链接'); setStatus('error'); return }

    setStatus('loading')
    setSegments([])
    setActiveIdx(-1)
    setLooping(false)
    setLoopIdx(-1)
    setVideoId(vid)

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()

      if (data.error === 'no_transcript') {
        setStatus('no_transcript')
      } else if (data.error) {
        setErrorMsg(data.error)
        setStatus('error')
      } else {
        setSegments(data.segments)
        setStatus('ready')
      }
    } catch (e) {
      setErrorMsg('网络错误，请稍后重试')
      setStatus('error')
    }

    // Init player after API is ready
    const tryInit = () => {
      if (window.YT && window.YT.Player) {
        initPlayer(vid)
      } else {
        window.onYouTubeIframeAPIReady = () => initPlayer(vid)
      }
    }
    tryInit()
  }

  const seekTo = (start) => {
    playerRef.current?.seekTo(start, true)
    playerRef.current?.playVideo()
  }

  const toggleLoop = (idx) => {
    if (looping && loopIdx === idx) {
      setLooping(false)
      setLoopIdx(-1)
    } else {
      setLooping(true)
      setLoopIdx(idx)
      seekTo(segments[idx].start)
    }
  }

  const changeSpeed = (s) => {
    setSpeed(s)
    playerRef.current?.setPlaybackRate(s)
  }

  const saveToCorpus = (seg, idx) => {
    addEntries([{
      sentence: seg.text,
      translation: '',
      grammar_tags: [],
      source: { type: 'youtube', label: `YouTube · ${videoId}`, timestamp: formatTime(seg.start) },
    }])
    setSavedSet(prev => new Set([...prev, idx]))
    showToast('已存入语料库')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-title">精听</div>
        <div className="page-header-sub">YouTube 视频 + 字幕同步</div>
      </div>

      {/* URL input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="search-input"
          style={{ marginBottom: 0, flex: 1 }}
          placeholder="粘贴 YouTube 链接…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadVideo()}
        />
        <button className="btn btn-primary" onClick={loadVideo} disabled={status === 'loading'}>
          {status === 'loading' ? '…' : '加载'}
        </button>
      </div>

      {status === 'error' && <div className="error-box">{errorMsg}</div>}

      {/* Player */}
      {videoId && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          </div>

          {/* Speed controls */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginRight: 2 }}>速度</span>
            {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
              <button key={s}
                className={`btn btn-sm${speed === s ? ' btn-primary' : ''}`}
                style={{ padding: '5px 10px', minWidth: 'auto' }}
                onClick={() => changeSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No transcript */}
      {status === 'no_transcript' && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: 16, marginBottom: 12, fontSize: '0.84em', color: '#5d4037', lineHeight: 1.7 }}>
          这个视频没有字幕。<br/>
          你可以下载视频音频，上传到「转录」tab 用 Whisper 转录。
        </div>
      )}

      {/* Subtitles */}
      {segments.length > 0 && (
        <>
          <div className="section-label">字幕 · {segments.length} 句</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.map((seg, i) => (
              <div
                key={i}
                ref={el => subtitleRefs.current[i] = el}
                style={{
                  background: activeIdx === i ? 'var(--red-light)' : 'var(--bg-card)',
                  border: `1.5px solid ${activeIdx === i ? 'var(--red-border)' : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {/* Time + text */}
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => seekTo(seg.start)}>
                    <div style={{ fontSize: '0.62em', color: 'var(--red)', fontWeight: 600, marginBottom: 3 }}>
                      {formatTime(seg.start)}
                    </div>
                    <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '0.95em', lineHeight: 1.9, color: 'var(--text)' }}>
                      {seg.text}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      style={{
                        background: looping && loopIdx === i ? 'var(--red)' : 'var(--bg-soft)',
                        border: 'none', borderRadius: 6, width: 28, height: 28,
                        color: looping && loopIdx === i ? '#fff' : 'var(--text-dim)',
                        cursor: 'pointer', fontSize: '0.9em', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onClick={() => toggleLoop(i)}
                      title="单句循环"
                    >
                      ↺
                    </button>
                    <button
                      className={`save-btn${savedSet.has(i) ? ' saved' : ''}`}
                      onClick={() => saveToCorpus(seg, i)}
                      title="存入语料库"
                    >
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

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
