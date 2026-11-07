import { useEffect } from 'react'
import type { Source } from '../types'

export default function SourcesPanel({ data, onClose }: {
  data: { question: string; items: Source[] } | null
  onClose: () => void
}) {
  // Escape cierra el panel de fuentes.
  const open = data !== null
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey, { passive: true })
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!data) {
    return (
      <aside aria-labelledby="src-title" className="hidden min-h-0 border-l border-line bg-rail p-4 xl:block">
        <h2 id="src-title" className="text-base font-semibold">Fuentes</h2>
        <p className="mt-2 text-sm text-muted">Pulsa «Ver fuentes» en una respuesta para ver los fragmentos usados.</p>
      </aside>
    )
  }
  return (
    <aside
      aria-labelledby="src-title"
      className="fixed inset-x-3 bottom-3 z-10 max-h-[70dvh] overflow-y-auto rounded-2xl border border-line bg-rail p-4 shadow-2xl xl:static xl:max-h-none xl:rounded-none xl:border-0 xl:border-l xl:shadow-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="src-title" className="text-base font-semibold">Fuentes ({data.items.length})</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar fuentes" className="rounded-md px-2 text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand">✕</button>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted">{data.question}</p>
      <ul className="mt-3 space-y-3">
        {data.items.map((s, i) => (
          <li key={`${s.documentId}-${s.page}-${i}`} className="rounded-xl bg-bubble p-3 text-sm">
            <p className="font-medium break-words">{s.fileName}</p>
            <p className="text-xs text-muted tabular-nums">
              {s.page != null && <>pág. {s.page}</>}
              {s.score != null && <> · relevancia {(s.score * 100).toFixed(0)}%</>}
            </p>
            <p className="mt-2 line-clamp-6 text-muted">{s.snippet}</p>
          </li>
        ))}
      </ul>
    </aside>
  )
}
