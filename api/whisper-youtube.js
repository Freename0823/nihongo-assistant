import ytdl from '@distube/ytdl-core'
import FormData from 'form-data'
import fetch from 'node-fetch'

export const config = { maxDuration: 60 }

function extractVideoId(input) {
  const m = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : (input.match(/^[a-zA-Z0-9_-]{11}$/) ? input : null)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { url } = req.body
    const videoId = extractVideoId(url)
    if (!videoId) return res.status(400).json({ error: '无法识别 YouTube 链接' })

    const apiKey = process.env.VITE_OPENAI_API_KEY
    if (!apiKey) return res.status(500).json({ error: '未配置 OpenAI API Key' })

    // 下载最低质量音频（减小文件体积）
    const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      filter: 'audioonly',
      quality: 'lowestaudio',
    })

    const chunks = []
    await new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    const audioBuffer = Buffer.concat(chunks)

    if (audioBuffer.length > 24 * 1024 * 1024) {
      return res.status(400).json({ error: '音频超过 24MB，请用较短的视频' })
    }

    // 发给 Whisper
    const form = new FormData()
    form.append('file', audioBuffer, { filename: 'audio.mp4', contentType: 'audio/mp4' })
    form.append('model', 'whisper-1')
    form.append('response_format', 'verbose_json')
    form.append('language', 'ja')
    form.append('timestamp_granularities[]', 'segment')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, ...form.getHeaders() },
      body: form,
    })

    const data = await whisperRes.json()

    if (data.error) return res.status(500).json({ error: data.error.message })

    const segments = (data.segments || []).map(s => ({
      text: s.text.trim(),
      start: s.start,
      duration: s.end - s.start,
    })).filter(s => s.text.length > 0)

    return res.status(200).json({ segments, source: 'whisper' })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
