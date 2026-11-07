import type { AskResponse, DocumentResponse } from './types'

const BASE = import.meta.env.VITE_API_BASE ?? ''

interface ProblemDetail {
  title?: string
  detail?: string
  errors?: string[]
}

async function parse<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T
  let msg = `Error ${res.status}`
  try {
    const p = (await res.json()) as ProblemDetail
    msg = [p.title, p.detail, ...(p.errors ?? [])].filter(Boolean).join(': ') || msg
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  throw new Error(msg)
}

export async function uploadDocument(file: File, signal?: AbortSignal): Promise<DocumentResponse> {
  const body = new FormData()
  body.append('file', file)
  return parse(await fetch(`${BASE}/api/documents/upload`, { method: 'POST', body, signal }))
}

export async function ask(question: string, signal?: AbortSignal): Promise<AskResponse> {
  return parse(
    await fetch(`${BASE}/api/rag/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    }),
  )
}
