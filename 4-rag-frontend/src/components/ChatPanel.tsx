import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ask } from '../api'
import type { Source } from '../types'

interface Turn {
  id: number
  question: string
  answer?: string
  sources?: Source[]
  error?: string
  askedAt: Date
}

const MAX = 2000
const fmtTime = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-sm text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
    >
      {state === 'copied' ? '✓ Copiado' : state === 'failed' ? 'No se pudo copiar' : 'Copiar'}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Respuesta copiada al portapapeles' : ''}
      </span>
    </button>
  )
}

export default function ChatPanel({ onShowSources }: {
  onShowSources: (d: { question: string; items: Source[] }) => void
}) {
  const fieldId = useId()
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const nextId = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [turns])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || busy) return
    const id = nextId.current++
    setTurns((t) => [...t, { id, question: q, askedAt: new Date() }])
    setQuestion('')
    setBusy(true)
    try {
      const r = await ask(q)
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: r.answer, sources: r.sources } : x)))
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error al consultar'
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error } : x)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="chat-title" className="flex min-h-0 min-w-0 flex-col">
      <header className="flex items-baseline gap-3 border-b border-line px-5 py-4">
        <h1 id="chat-title" className="text-base font-semibold text-balance">Asistente RAG Legal</h1>
        <span className="truncate text-xs text-muted">Spring AI · Ollama · pgvector</span>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4" aria-live="polite">
        {turns.length === 0 && (
          <p className="text-muted">Sube un PDF y pregunta sobre su contenido. Las respuestas usan solo el contexto recuperado.</p>
        )}
        {turns.map((t) => (
          <article key={t.id} className="space-y-3">
            <div className="ml-auto w-fit max-w-[85%] rounded-xl bg-brand px-3 py-2 text-brand-fg">
              <p className="break-words">{t.question}</p>
              <time dateTime={t.askedAt.toISOString()} className="block text-right text-[11px] opacity-70 tabular-nums">
                {fmtTime.format(t.askedAt)}
              </time>
            </div>
            {t.error ? (
              <p role="alert" className="max-w-[85%] rounded-xl bg-bubble px-3 py-2 text-err">{t.error}</p>
            ) : t.answer === undefined ? (
              <p className="w-fit rounded-xl bg-bubble px-3 py-2 text-muted">Pensando…</p>
            ) : (
              <div className="max-w-[85%] rounded-xl bg-bubble px-3 py-2">
                <p className="whitespace-pre-wrap break-words">{t.answer}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <CopyButton text={t.answer} />
                  {t.sources && t.sources.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onShowSources({ question: t.question, items: t.sources! })}
                      className="text-sm text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      Ver fuentes ({t.sources.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <label htmlFor={fieldId} className="sr-only">Pregunta</label>
        <input
          id={fieldId}
          name="question"
          type="text"
          autoComplete="off"
          maxLength={MAX}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Escribe tu pregunta…"
          className="min-w-0 flex-1 rounded-xl border border-line bg-rail px-3 py-2.5 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-brand"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-xl bg-brand px-4 py-2.5 font-medium text-brand-fg disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {busy ? 'Consultando…' : 'Preguntar'}
        </button>
      </form>
    </section>
  )
}
