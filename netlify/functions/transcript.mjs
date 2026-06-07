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

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const { url } = await req.json()
    const videoId = extractVideoId(url)

    if (!videoId) {
      return Response.json({ error: '无法识别 YouTube 链接' }, { status: 400 })
    }

    // Try Japanese first, then any language
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
      return Response.json({ error: 'no_transcript', videoId }, { status: 404 })
    }

    const result = segments.map(s => ({
      text: s.text.replace(/\n/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
      start: s.offset / 1000,
      duration: s.duration / 1000,
    })).filter(s => s.text.length > 0)

    return Response.json({ videoId, lang, segments: result }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (e) {
    return Response.json({ error: e.message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
}

export const config = { path: '/api/transcript' }
