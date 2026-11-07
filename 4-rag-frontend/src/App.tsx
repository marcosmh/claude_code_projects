import { useCallback, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import ChatPanel from './components/ChatPanel'
import SourcesPanel from './components/SourcesPanel'
import UploadPanel from './components/UploadPanel'
import type { DocumentResponse, Source } from './types'

export default function App() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [sources, setSources] = useState<{ question: string; items: Source[] } | null>(null)
  const { theme, toggle } = useTheme()
  const closeSources = useCallback(() => setSources(null), [])
  const addDocument = useCallback((d: DocumentResponse) => setDocuments((p) => [d, ...p]), [])
  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl items-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="grid h-[calc(100dvh-1.5rem)] grid-rows-[auto_minmax(0,1fr)] md:grid-rows-none w-full overflow-hidden rounded-2xl bg-surface shadow-2xl shadow-black/50 ring-1 ring-line sm:h-[min(46rem,calc(100dvh-3rem))] md:grid-cols-[17rem_1fr] xl:grid-cols-[17rem_1fr_19rem]">
        <UploadPanel documents={documents} onUploaded={addDocument} />
        <ChatPanel onShowSources={setSources} theme={theme} onToggleTheme={toggle} />
        <SourcesPanel data={sources} onClose={closeSources} />
      </div>
    </div>
  )
}
