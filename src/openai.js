const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function transcribeAudio(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-1')
  formData.append('language', 'ja')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'segment')

  onProgress?.(30)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Whisper API error ${res.status}`)
  }

  onProgress?.(80)
  const data = await res.json()
  onProgress?.(100)
  return data.segments || []
}

export async function tagGrammar(sentences) {
  const prompt = `以下是日语句子，请为每个句子识别其中包含的N5/N4语法点（如：です、ます、て形、ない形、から、が、は 等），返回JSON数组，格式：
[{"sentence":"...","tags":["语法点1","语法点2"]}]

句子：
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

只返回JSON，不要其他内容。`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `GPT API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.choices[0].message.content.trim()
  try {
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(clean)
  } catch {
    return sentences.map(s => ({ sentence: s, tags: [] }))
  }
}
