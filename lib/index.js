/**
 * dsh-session-title-key-phrase
 *
 * Names each DSH session after a key phrase extracted from its first human
 * question. Registers a `sessionTitle` provider — the supported extension
 * point — with `automatic: 'first-prompt'`, so the title service itself
 * drives it: it runs on the first eligible human message, exactly like the
 * built-in `first-prompt-llm` provider, and needs no `session/event` listener.
 *
 * The profile's `session-title-llm` occupies the single provider slot, so it
 * must be disabled (profile `cordis.patch.yml`:
 *   - id: session-title-llm
 *     disabled: true
 * ) and the web app restarted (bundle layers load only at boot) for this
 * provider to register.
 */

/** Filler lead-ins stripped (repeatedly) from the front of the first sentence. */
const LEAD_FILLERS = [
  '你好', '您好', 'hi', 'hello', 'hey',
  '我们', '我', '你', '您',
  '麻烦你', '麻烦您', '麻烦', '帮忙', '帮我一下', '帮我看看', '帮我看下', '帮我', '帮我看',
  '能不能', '可不可以', '可以帮我', '可以让我', '可以', '能帮我', '能让我', '能帮',
  '我想', '我想要', '我要', '想让', '想要', '想',
  '请问', '问一下', '问下', '让',
  '你看下', '你看一下', '看下', '看一下', '看看', '帮我查下', '帮我查一下', '查下', '查一下',
  '试试', '检查下', '检查一下',
  '帮我做个', '帮我写个', '帮我改下', '帮我修下',
]

const LEAD_RE = new RegExp('^(?:' + LEAD_FILLERS.join('|') + ')[，,:：、\\s]*', 'i')

/** Trailing particles stripped (repeatedly) from the end of the key phrase. */
const TRAIL_FILLERS = ['吗', '嘛', '呢', '么', '吧', '呀', '啊', '？', '?', '了', '？。', '吗？']

const TRAIL_RE = new RegExp(
  '[，,:：、\\s]*(?:' + TRAIL_FILLERS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$',
  'i',
)

/** Maximum accepted title size in UTF-8 bytes (service cap is 80). */
const MAX_TITLE_BYTES = 60

function cleanText(raw) {
  let text = String(raw || '')
  text = text.replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
  text = text.replace(/^\s*(\/\S+)\s*/, '') // leading slash command
  text = text.replace(/^\s*>.*$/gm, ' ') // quoted lines
  text = text.replace(/[#*_`>\[\]]/g, '') // markdown noise
  return text
}

function extractKeyPhrase(text) {
  const cleaned = cleanText(text).replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const sentences = cleaned
    .split(/[。！？!?；;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  let sentence = sentences.length ? sentences[0] : cleaned
  let prev = null
  while (prev !== sentence) {
    prev = sentence
    sentence = sentence.replace(LEAD_RE, '').trim()
  }
  // Repeatedly strip trailing question/particle fillers (fresh loop state).
  prev = null
  while (prev !== sentence) {
    prev = sentence
    sentence = sentence.replace(TRAIL_RE, '').trim()
  }
  if (!sentence) sentence = cleaned
  return sentence
}

function clampUtf8(str, maxBytes) {
  let out = ''
  let bytes = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i)
    const size = code > 65535 ? 4 : code > 2047 ? 3 : code > 127 ? 2 : 1
    if (bytes + size > maxBytes) break
    out += str[i]
    bytes += size
    if (size === 4) i++
  }
  return out
}

export const name = 'session-title-key-phrase'

export const inject = ['sessionTitle']

export function apply(ctx) {
  try {
    ctx.sessionTitle.register({
      id: 'session-title-key-phrase',
      automatic: 'first-prompt',
      async generate({ messages }) {
        // The service passes the collected eligible human messages (in log
        // order); `first-prompt` wraps them so only the first one is seen.
        const first = messages && messages[0]
        if (!first) throw new Error('key-phrase title provider requires one human message')
        const phrase = extractKeyPhrase(first.text)
        let title = clampUtf8(phrase, MAX_TITLE_BYTES)
        if (!title) throw new Error('key-phrase title provider returned an empty title')
        if (title.length < phrase.length) title += '…'
        return { title, messageSeqs: [first.seq] }
      },
    })
  } catch (error) {
    // The provider slot is likely still occupied by the profile's
    // `session-title-llm`. Disable it in the profile cordis.patch.yml and
    // restart; degrade to no-op rather than failing the boot.
    console.error(`[session-title-key-phrase] could not register provider: ${String(error)}`)
  }
}

export default { name, inject, apply }
