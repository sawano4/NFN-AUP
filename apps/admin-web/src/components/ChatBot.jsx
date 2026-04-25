import { useState, useRef, useEffect } from 'react'
import { sendChat } from '../api'

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Renders **bold**, *italic*, `code`, and line breaks from the model's reply.
function MdText({ text }) {
  // Split on code spans, bold, italic
  const parts = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) })
    if (m[2]) parts.push({ t: 'bold',   v: m[2] })
    else if (m[3]) parts.push({ t: 'em', v: m[3] })
    else if (m[4]) parts.push({ t: 'code', v: m[4] })
    last = re.lastIndex
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) })

  return (
    <>
      {parts.map((p, i) => {
        if (p.t === 'bold') return <strong key={i}>{p.v}</strong>
        if (p.t === 'em')   return <em key={i}>{p.v}</em>
        if (p.t === 'code') return <code key={i} className="bg-gray-100 text-gray-800 rounded px-0.5 font-mono text-xs">{p.v}</code>
        // plain text: preserve newlines
        return p.v.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
        ))
      })}
    </>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        {isUser ? content : <MdText text={content} />}
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function Typing() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '120ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '240ms' }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [history, setHistory] = useState([])   // [{role, content}]
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setError('')
    const newHistory = [...history, { role: 'user', content: msg }]
    setHistory(newHistory)
    setLoading(true)
    try {
      const data = await sendChat(msg, history)
      setHistory(h => [...h, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setError('Impossible de contacter l\'assistant. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clearChat = () => { setHistory([]); setError('') }

  const unreadDot = !open && history.length === 0

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer l\'assistant' : 'Ouvrir l\'assistant KPI'}
        className={`fixed bottom-5 right-5 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center text-white text-xl transition-all duration-200 ${
          open ? 'bg-gray-500 rotate-45' : 'bg-brand-600 hover:bg-brand-700'
        }`}
        style={{ width: 52, height: 52 }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
          style={{ maxHeight: '70vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <div className="text-sm font-semibold leading-tight">Assistant NFN</div>
                <div className="text-xs opacity-75">Analyses KPI en temps réel</div>
              </div>
            </div>
            <button
              onClick={clearChat}
              title="Effacer la conversation"
              className="text-xs opacity-60 hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-brand-700"
            >
              Effacer
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" style={{ minHeight: 200 }}>
            {history.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-32 text-center text-gray-400 text-xs gap-2">
                <span className="text-3xl">🐑</span>
                <span>Posez-moi une question sur les KPIs,<br />les alertes, les lots ou les sources.</span>
              </div>
            )}
            {history.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {loading && <Typing />}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-1">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts (only when empty) */}
          {history.length === 0 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {[
                'Combien de lots actifs ?',
                'Quelles alertes sont critiques ?',
                'État de la pipeline laine ?',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 0) }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full px-2.5 py-1 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Votre question…"
              rows={1}
              className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 leading-snug max-h-24 overflow-y-auto"
              style={{ fieldSizing: 'content' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-base disabled:opacity-40 hover:bg-brand-700 transition-colors"
              aria-label="Envoyer"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
