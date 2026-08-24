/**
 * dsh-session-title-key-phrase
 *
 * Names each DSH session after a key phrase extracted from its first human
 * question. Listens for the first human `user/message` in every session and
 * commits the extracted phrase through `ctx.sessionTitle.rename()`, which
 * pins the title (source `user`), supersedes any in-flight automatic title
 * generation, and still yields to a later explicit manual rename.
 */

/** Filler lead-ins stripped (repeatedly) from the front of the first sentence. */
const LEAD_FILLERS = [
  '你好', '您好', 'hi', 'hello', 'hey',
  '请', '麻烦', '麻烦你', '麻烦您', '帮忙', '帮我', '帮我一下', '帮我看看', '帮我看下',
  '我想', '我要', '请问', '问一下', '问下',
  '你看下', '你看一下', '看下', '看一下', '看看', '帮我查下', '帮我查一下', '查下', '查一下',
  '能不能', '可不可以', '可否', '试试', '检查下', '检查一下',
  '帮我做个', '帮我写个', '帮我改下', '帮我修下',
]

const LEAD_RE = new RegExp('^(?:' + LEAD_FILLERS.join('|') + ')[，,:：、\\s]*', 'i')

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

/** Read only leaf fields: did any earlier human message exist in the log? */
function hasEarlierHumanMessage(session, beforeSeq) {
  const events = session.events
  if (!events || typeof events.some !== 'function') return false
  return events.some((e) => (
    e && e.type === 'user/message' && e.seq < beforeSeq
    && e.data && e.data.source && e.data.source.kind === 'user'
  ))
}

function messageText(data) {
  const blocks = (data && data.content) || []
  let text = ''
  for (const block of blocks) {
    if (block && block.type === 'text') text += block.text + '\n'
  }
  return text
}

export const name = 'session-title-key-phrase'

export const inject = ['sessionTitle']

export function apply(ctx) {
  ctx.on('session/event', (session, event) => {
    try {
      if (!event || event.type !== 'user/message') return
      const data = event.data
      if (!data || !data.source || data.source.kind !== 'user') return
      if (hasEarlierHumanMessage(session, event.seq)) return
      // Respect an explicit manual rename.
      const current = ctx.sessionTitle.get(session)
      if (current && current.source && current.source.kind === 'user') return
      const phrase = extractKeyPhrase(messageText(data))
      if (!phrase) return
      let title = clampUtf8(phrase, MAX_TITLE_BYTES)
      if (!title) return
      if (title.length < phrase.length) title += '…'
      ctx.sessionTitle.rename(session, title)
    } catch {
      // A title failure must never disturb the session.
    }
  })
}

export default { name, inject, apply }
