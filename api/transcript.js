import { YoutubeTranscript } from 'youtube-transcript'

function extractVideoId(input) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url } = req.body
    const videoId = extractVideoId(url)

    if (!videoId) {
      return res.status(400).json({ error: '无法识别 YouTube 链接' })
    }

    let segments = null
    let lang = 'ja'

    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' })
    } catch {
      try {
        segments = await YoutubeTranscript.fetchTranscript(videoId)
        lang = 'auto'
      } catch {
        segments = null
      }
    }

    if (!segments || segments.length === 0) {
      return res.status(404).json({ error: 'no_transcript', videoId })
    }

    const result = segments.map(s => ({
      text: s.text.replace(/\n/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
      start: s.offset / 1000,
      duration: s.duration / 1000,
    })).filter(s => s.text.length > 0)

    return res.status(200).json({ videoId, lang, segments: result })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
