import { useId, useState, type ChangeEvent } from 'react'
import { uploadDocument } from '../api'
import type { DocumentResponse } from '../types'

const MAX_BYTES = 20 * 1024 * 1024
const fmtKb = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

export default function UploadPanel({ documents, onUploaded }: {
  documents: DocumentResponse[]
  onUploaded: (d: DocumentResponse) => void
}) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return
    // Validación en el cliente: evita subir al backend lo que de todos modos rechazaría.
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('El archivo debe ser un PDF')
      input.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('El PDF supera el máximo de 20 MB')
      input.value = ''
      return
    }
    setBusy(true)
    setError(null)
    try {
      onUploaded(await uploadDocument(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setBusy(false)
      input.value = ''
    }
  }

  return (
    <aside aria-labelledby="docs-title" className="flex max-h-44 min-h-0 flex-col border-b border-line bg-rail md:max-h-none md:border-r md:border-b-0">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 id="docs-title" className="text-base font-semibold">Documentos</h2>
        <label
          htmlFor={inputId}
          className="grid size-8 cursor-pointer place-items-center rounded-lg border border-brand/60 text-lg text-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand has-[:disabled]:opacity-50"
        >
          <span aria-hidden="true">+</span>
          <span className="sr-only">Subir PDF (máx. 20 MB)</span>
          <input id={inputId} type="file" accept="application/pdf,.pdf" disabled={busy} onChange={handleChange} className="sr-only" />
        </label>
      </div>
      <p role="status" aria-live="polite" className="px-4 text-sm text-muted empty:hidden">
        {busy ? 'Indexando documento…' : ''}
      </p>
      {error && <p role="alert" className="px-4 pb-2 text-sm text-err">{error}</p>}
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {documents.length === 0 && !busy && (
          <li className="px-2 text-sm text-muted">Aún no hay documentos. Usa + para subir un PDF.</li>
        )}
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-bubble">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/20 text-xs font-bold text-brand">PDF</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium" title={d.fileName}>{d.fileName}</span>
              <span className="block truncate text-xs text-muted tabular-nums">
                {d.pageCount} págs · {d.chunkCount} frag. · {fmtKb.format(d.sizeBytes / 1024)} KB
              </span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
