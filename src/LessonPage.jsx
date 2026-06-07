import { useState } from 'react'
import { addEntries } from './corpus'

const R = ({ k, r }) => <ruby>{k}<rt>{r}</rt></ruby>

function SaveBtn({ sentence, translation, grammar_tags, source }) {
  const [saved, setSaved] = useState(false)
  const save = () => {
    if (saved) return
    addEntries([{ sentence, translation, grammar_tags, source }])
    setSaved(true)
  }
  return (
    <button className={`save-btn${saved ? ' saved' : ''}`} onClick={save} title={saved ? '已存入语料库' : '存入语料库'}>
      {saved ? '✦' : '＋'}
    </button>
  )
}

const vocab = [
  { id: 1, ja: <><R k="私" r="わたし"/></>, pos: '代词', zh: '我', ex: <><R k="私" r="わたし"/>はバイバです。</>, exText: '私はバイバです。', exZh: '我是巴依巴。' },
  { id: 2, ja: <>〜さん</>, pos: '接尾词', zh: '……先生／女士', ex: <><R k="田中" r="たなか"/>さんはどこですか。</>, exText: '田中さんはどこですか。', exZh: '田中先生在哪里？' },
  { id: 3, ja: <>あなた</>, pos: '代词', zh: '你', ex: <>あなたは<R k="学生" r="がくせい"/>ですか。</>, exText: 'あなたは学生ですか。', exZh: '你是学生吗？' },
  { id: 4, ja: <><R k="彼" r="かれ"/></>, pos: '代词', zh: '他', ex: <><R k="彼" r="かれ"/>は<R k="先生" r="せんせい"/>です。</>, exText: '彼は先生です。', exZh: '他是老师。' },
  { id: 5, ja: <><R k="彼女" r="かのじょ"/></>, pos: '代词', zh: '她', ex: <><R k="彼女" r="かのじょ"/>は<R k="中国人" r="ちゅうごくじん"/>です。</>, exText: '彼女は中国人です。', exZh: '她是中国人。' },
  { id: 6, ja: <>お<R k="名前" r="なまえ"/></>, pos: '名词', zh: '名字（敬称）', ex: <>お<R k="名前" r="なまえ"/>は<R k="何" r="なん"/>ですか。</>, exText: 'お名前は何ですか。', exZh: '您叫什么名字？' },
  { id: 7, ja: <>はい</>, pos: '感叹词', zh: '是的（正式）', ex: <>はい、そうです。</>, exText: 'はい、そうです。', exZh: '是的，没错。' },
  { id: 8, ja: <>ええ</>, pos: '感叹词', zh: '是的（较随意）', ex: <>ええ、そうです。</>, exText: 'ええ、そうです。', exZh: '是的。' },
  { id: 9, ja: <>いいえ</>, pos: '感叹词', zh: '不是', ex: <>いいえ、ちがいます。</>, exText: 'いいえ、ちがいます。', exZh: '不，不是。' },
  { id: 10, ja: <>そうです</>, pos: '表达式', zh: '是的，没错', ex: <>はい、そうです。</>, exText: 'はい、そうです。', exZh: '是的，没错。' },
  { id: 11, ja: <>ちがいます</>, pos: '动词', zh: '不对，不是', ex: <>いいえ、ちがいます。</>, exText: 'いいえ、ちがいます。', exZh: '不，不是。' },
]

const drillsA = [
  { prompt: '我是学生。', answer: '私は学生です。' },
  { prompt: '你是田中先生吗？', answer: 'あなたは田中さんですか。' },
  { prompt: '不对，我不是田中。', answer: 'いいえ、ちがいます。' },
  { prompt: '是的，没错。', answer: 'はい、そうです。' },
  { prompt: '她是中国人。', answer: '彼女は中国人です。' },
]
const drillsB = [
  { prompt: '私は会社員です。', answer: '我是公司职员。' },
  { prompt: 'あなたは留学生ですか。', answer: '你是留学生吗？' },
  { prompt: 'いいえ、ちがいます。', answer: '不，不是。' },
  { prompt: '彼女は先生ではありません。', answer: '她不是老师。' },
  { prompt: 'お名前は何ですか。', answer: '您叫什么名字？' },
]
const exercises = [
  { num: '01', prompt: '用「私は〜です」介绍自己', placeholder: '私は______です。______人です。' },
  { num: '02', prompt: '用「〜さんは〜ですか」向对方提问', placeholder: '______さんは______ですか。' },
  { num: '03', prompt: '用「いいえ、ちがいます」否定', placeholder: 'いいえ、ちがいます。______です。' },
  { num: '04', prompt: '用「ね」表示认同', placeholder: '______ですね。' },
  { num: '05', prompt: '用「彼／彼女は〜です」介绍第三人', placeholder: '彼女は______です。' },
]
const translations = [
  { num: '01', prompt: '我是中国人。' },
  { num: '02', prompt: '你是学生吗？' },
  { num: '03', prompt: '不，我不是学生，我是公司职员。' },
  { num: '04', prompt: '她是田中老师吗？是的，没错。' },
  { num: '05', prompt: '您叫什么名字？' },
]

const SRC = { chapter: 1, lesson: 1, label: 'Ch1 课1' }

function VocabSection() {
  return (
    <div className="l-section">
      <div className="l-section-title">词汇</div>
      <div className="l-vocab-grid">
        {vocab.map(v => (
          <div className="l-vocab-card" key={v.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="l-vocab-ja">{v.ja}</div>
              <div className="l-vocab-pos">{v.pos}</div>
            </div>
            <div className="l-vocab-zh">{v.zh}</div>
            <div className="l-vocab-ex">
              <span>{v.ex}</span>
              <SaveBtn sentence={v.exText} translation={v.exZh} grammar_tags={['です']} source={{ ...SRC, type: 'vocab' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GrammarSection() {
  const grammars = [
    {
      num: 'GRAMMAR 01', title: <><R k="名詞" r="めいし"/>は<R k="名詞" r="めいし"/>です／ではありません</>,
      structure: '结构：主题は ＋ 名词 ＋ です（肯定）／ではありません（否定）',
      examples: [
        { s: '私は学生です。', zh: '我是学生。', tags: ['です', 'は'] },
        { s: '私は学生ではありません。', zh: '我不是学生。', tags: ['ではありません', 'は'] },
        { s: '彼は日本人です。', zh: '他是日本人。', tags: ['です', 'は'] },
      ]
    },
    {
      num: 'GRAMMAR 02', title: <><R k="名詞" r="めいし"/>は<R k="名詞" r="めいし"/>ですか</>,
      structure: '结构：主题は ＋ 名词 ＋ ですか（疑问）',
      examples: [
        { s: 'あなたは田中さんですか。', zh: '你是田中先生吗？', tags: ['ですか', 'は'] },
        { s: '彼女は中国人ですか。', zh: '她是中国人吗？', tags: ['ですか', 'は'] },
      ]
    },
    {
      num: 'GRAMMAR 03', title: <>は（<R k="提示助詞" r="ていじじょし"/>）</>,
      structure: '作用：标记句子主题，说到……／……的话',
      examples: [
        { s: '私は中国人です。', zh: '我是中国人。', tags: ['は', 'です'] },
      ]
    },
    {
      num: 'GRAMMAR 04', title: <>ね／よ（<R k="終助詞" r="しゅうじょし"/>）</>,
      structure: 'ね：寻求认同「……吧？」　よ：告知强调「……哦！」',
      examples: [
        { s: '田中さんですね。', zh: '你是田中先生吧？', tags: ['ね', 'です'] },
        { s: 'これは私のですよ。', zh: '这是我的哦！', tags: ['よ', 'です'] },
      ]
    },
  ]
  return (
    <div className="l-section">
      <div className="l-section-title">语法</div>
      {grammars.map(g => (
        <div className="l-grammar-block" key={g.num}>
          <div className="l-grammar-num">{g.num}</div>
          <div className="l-grammar-title">{g.title}</div>
          <div className="l-grammar-structure">{g.structure}</div>
          <div className="l-grammar-examples">
            {g.examples.map(({ s, zh, tags }) => (
              <div className="l-grammar-ex" key={s}>
                <div>{s}<span className="l-zh">{zh}</span></div>
                <SaveBtn sentence={s} translation={zh} grammar_tags={tags} source={{ ...SRC, type: 'grammar' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DrillSection() {
  const [mode, setMode] = useState('A')
  const [inputs, setInputs] = useState({})
  const [checked, setChecked] = useState({})
  const drills = mode === 'A' ? drillsA : drillsB
  const check = (i) => setChecked(c => ({ ...c, [i]: true }))
  const status = (i) => {
    if (!checked[i]) return ''
    return (inputs[i] || '').trim() === drills[i].answer.trim() ? 'correct' : 'wrong'
  }
  return (
    <div className="l-section">
      <div className="l-section-title">背诵练习</div>
      <div className="l-drill-tabs">
        {[['A', '见中文写日语'], ['B', '见日语写中文'], ['C', '听写']].map(([m, label]) => (
          <button key={m} className={`l-drill-tab${mode === m ? ' active' : ''}`}
            onClick={() => { setMode(m); setInputs({}); setChecked({}) }}>
            {m}. {label}
          </button>
        ))}
      </div>
      {mode === 'C' ? (
        <div className="l-placeholder">听力功能即将上线</div>
      ) : drills.map((d, i) => (
        <div className="l-drill-item" key={i}>
          <div className="l-drill-prompt">{d.prompt}</div>
          <input className={`l-input${status(i) ? ' ' + status(i) : ''}`}
            value={inputs[i] || ''}
            onChange={e => setInputs(v => ({ ...v, [i]: e.target.value }))}
            placeholder="在此输入答案…" />
          {checked[i] && <div className="l-drill-answer">答案：{d.answer}</div>}
          <div className="l-btn-row"><button className="btn btn-sm" onClick={() => check(i)}>确认</button></div>
        </div>
      ))}
    </div>
  )
}

function ExerciseSection() {
  const [inputs, setInputs] = useState({})
  return (
    <div className="l-section">
      <div className="l-section-title">造句</div>
      {exercises.map((ex, i) => (
        <div className="l-exercise-item" key={i}>
          <div className="l-ex-num">EXERCISE {ex.num}</div>
          <div className="l-ex-prompt">{ex.prompt}</div>
          <input className="l-input" value={inputs[i] || ''}
            onChange={e => setInputs(v => ({ ...v, [i]: e.target.value }))}
            placeholder={ex.placeholder} />
        </div>
      ))}
    </div>
  )
}

function TranslationSection() {
  const [inputs, setInputs] = useState({})
  return (
    <div className="l-section">
      <div className="l-section-title">翻译（中→日）</div>
      {translations.map((t, i) => (
        <div className="l-exercise-item" key={i}>
          <div className="l-ex-num">TRANSLATION {t.num}</div>
          <div className="l-ex-prompt">{t.prompt}</div>
          <input className="l-input" value={inputs[i] || ''}
            onChange={e => setInputs(v => ({ ...v, [i]: e.target.value }))}
            placeholder="用日语翻译…" />
        </div>
      ))}
    </div>
  )
}

function ReadingSection() {
  const [answers, setAnswers] = useState({})
  return (
    <div className="l-section">
      <div className="l-section-title">阅读理解</div>
      <div className="l-dialogue">
        {[
          ['A', <>はじめまして。<R k="私" r="わたし"/>はリンです。<R k="中国人" r="ちゅうごくじん"/>です。よろしくおねがいします。</>],
          ['B', <>はじめまして。<R k="田中" r="たなか"/>です。<R k="日本人" r="にほんじん"/>です。よろしくおねがいします。</>],
          ['A', <><R k="田中" r="たなか"/>さんは<R k="学生" r="がくせい"/>ですか。</>],
          ['B', <>いいえ、ちがいます。<R k="会社員" r="かいしゃいん"/>です。</>],
        ].map(([spk, text], i) => (
          <div className="l-dialogue-line" key={i}>
            <span className="l-spk">{spk}</span>
            <span className="l-dialogue-text">{text}</span>
          </div>
        ))}
      </div>
      {['リンさんはどこの人ですか。', '田中さんは学生ですか。', '田中さんは何ですか。'].map((q, i) => (
        <div className="l-exercise-item" key={i}>
          <div className="l-ex-prompt" style={{ fontFamily: "'Noto Serif JP', serif", lineHeight: 2 }}>{q}</div>
          <input className="l-input" value={answers[i] || ''}
            onChange={e => setAnswers(v => ({ ...v, [i]: e.target.value }))}
            placeholder="用日语回答…" />
        </div>
      ))}
    </div>
  )
}

function SpeakingSection() {
  return (
    <div className="l-section">
      <div className="l-section-title">口说</div>
      <div className="l-speaking-card">
        <div className="l-speaking-label">跟读</div>
        <div className="l-speaking-text">
          はじめまして。<br/>
          <R k="私" r="わたし"/>はリンです。<R k="中国人" r="ちゅうごくじん"/>です。<br/>
          よろしくおねがいします。<br/><br/>
          <R k="田中" r="たなか"/>さんは<R k="学生" r="がくせい"/>ですか。<br/>
          いいえ、ちがいます。<R k="会社員" r="かいしゃいん"/>です。
        </div>
      </div>
      <div className="l-speaking-card">
        <div className="l-speaking-label">角色扮演</div>
        <div className="l-roleplay">
          场景：第一次见面，互相自我介绍。<br/>
          要求：说出名字、国籍、职业，确认对方信息。<br/><br/>
          はじめまして。<R k="私" r="わたし"/>は______です。<br/>
          ______は______ですか。<br/>
          はい、そうです。／いいえ、ちがいます。
        </div>
      </div>
    </div>
  )
}

const SECTIONS = ['词汇', '语法', '背诵', '造句', '翻译', '阅读', '口说']

export default function LessonPage() {
  const [sec, setSec] = useState(0)
  const mod = sec < 3 ? 0 : 1

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="l-header">
        <div className="l-chapter">Chapter 1 · 自己紹介</div>
        <div className="l-title">〜です</div>
        <div className="l-subtitle">是……</div>
      </div>

      <div className="l-progress">
        {SECTIONS.map((_, i) => (
          <div key={i} className={`l-step${i === sec ? ' active' : i < sec ? ' done' : ''}`}
            onClick={() => setSec(i)} />
        ))}
      </div>

      <div className="l-mod-tabs">
        <button className={`l-mod-tab${mod === 0 ? ' active' : ''}`} onClick={() => setSec(0)}>模块一 · 输入</button>
        <button className={`l-mod-tab${mod === 1 ? ' active' : ''}`} onClick={() => setSec(3)}>模块二 · 输出</button>
      </div>

      {sec === 0 && <VocabSection />}
      {sec === 1 && <GrammarSection />}
      {sec === 2 && <DrillSection />}
      {sec === 3 && <ExerciseSection />}
      {sec === 4 && <TranslationSection />}
      {sec === 5 && <ReadingSection />}
      {sec === 6 && <SpeakingSection />}

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px 20px' }}>
        {sec > 0 && <button className="btn" onClick={() => setSec(s => s - 1)}>← 上一节</button>}
        {sec < SECTIONS.length - 1 && (
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setSec(s => s + 1)}>下一节 →</button>
        )}
      </div>
    </div>
  )
}
