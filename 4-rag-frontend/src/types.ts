export interface DocumentResponse {
  id: string
  fileName: string
  uploadedAt: string
  pageCount: number
  sizeBytes: number
  chunkCount: number
}
export interface Source {
  documentId: string
  fileName: string
  page: number | null
  score: number | null
  snippet: string
}
export interface AskResponse {
  answer: string
  sources: Source[]
}
