import { useState, useRef } from 'react'
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

export default function TranscribePage({ onSaved }) {
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [segments, setSegments] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.(mp3|mp4|wav|m4a|webm|mov)$/i)) {
      setError('请上传音频或视频文件（mp3、mp4、wav、m4a、mov）')
      return
    }
    if (f.size > 25 * 1024 * 1024) {
      setError('文件大小不能超过 25MB（Whisper API 限制）')
      return
    }
    setError('')
    setFile(f)
    setSegments([])
    setSelected(new Set())
    setStatus('idle')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    handleFile(e.dataTransfer.files[0])
  }

  const transcribe = async () => {
    if (!file) return
    setStatus('transcribing')
    setProgress(10)
    setError('')
    try {
      const segs = await transcribeAudio(file, setProgress)
      const cleaned = segs.map(s => ({ ...s, text: s.text.trim() })).filter(s => s.text.length > 0)
      setSegments(cleaned)
      setSelected(new Set(cleaned.map((_, i) => i)))
      setStatus('reviewing')
    } catch (e) {
      setError(e.message)
      setStatus('idle')
    }
  }

  const toggle = (i) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(selected.size === segments.length ? new Set() : new Set(segments.map((_, i) => i)))
  }

  const saveSelected = async () => {
    const chosen = [...selected].map(i => segments[i])
    if (chosen.length === 0) return
    setStatus('tagging')
    let tagged
    try {
      tagged = await tagGrammar(chosen.map(s => s.text))
    } catch {
      tagged = chosen.map(s => ({ sentence: s.text, tags: [] }))
    }
    const entries = chosen.map((seg, i) => ({
      sentence: seg.text,
      translation: '',
      grammar_tags: tagged[i]?.tags || [],
      source: {
        type: 'video',
        label: file.name.replace(/\.[^.]+$/, ''),
        timestamp: `${formatTime(seg.start)}–${formatTime(seg.end)}`,
      },
    }))
    const count = addEntries(entries)
    setStatus('done')
    showToast(`已保存 ${count} 条新语料`)
    onSaved?.()
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const reset = () => {
    setFile(null); setSegments([]); setSelected(new Set())
    setStatus('idle'); setProgress(0); setError('')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-title">转录</div>
        <div className="page-header-sub">上传音视频，AI 提取语料</div>
      </div>

      {!file && (
        <div
          className={`upload-zone${drag ? ' drag' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
        >
          <div className="upload-icon">🎵</div>
          <div className="upload-label">点击或拖入音频 / 视频文件</div>
          <div className="upload-hint">mp3 · mp4 · wav · m4a · mov · 最大 25MB</div>
          <input ref={inputRef} type="file" accept=".mp3,.mp4,.wav,.m4a,.webm,.mov"
            style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
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
            <button className="file-remove" onClick={reset}>✕</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={transcribe}>开始转录</button>
          </div>
        </>
      )}

      {(status === 'transcribing' || status === 'tagging') && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.82em', color: 'var(--text-mid)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>{status === 'transcribing' ? '正在转录…' : 'AI 分析语法标签…'}</span>
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
            <div className="review-count">共 {segments.length} 句 · 已选 {selected.size} 句</div>
            <button className="btn btn-sm" onClick={toggleAll}>
              {selected.size === segments.length ? '取消全选' : '全选'}
            </button>
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
              <button className="btn" onClick={reset}>重新上传</button>
              <button className="btn btn-primary" onClick={saveSelected} disabled={selected.size === 0}>
                保存 ({selected.size})
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="btn-row">
              <button className="btn btn-primary" onClick={reset}>再转录一个</button>
            </div>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
