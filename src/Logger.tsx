import { useState, useCallback } from 'react'

export interface LogEntry {
  timestamp: string
  message: string
}

export interface Logger {
  log: (message: string) => void
  debug: (message: string) => void
  yield: () => Promise<void>
}

export const useLogger = (debugMode = false) => {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const log = useCallback((message: string) => {
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
    
    setLogs(prev => [...prev, { timestamp, message }])
  }, [])

  const debug = useCallback((message: string) => {
    if (!debugMode) return
    
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
    
    setLogs(prev => [...prev, { timestamp, message }])
  }, [debugMode])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const yieldToMain = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  }, [])

  const logger: Logger = {
    log,
    debug,
    yield: yieldToMain
  }

  return { logs, logger, clearLogs }
}

interface LogViewerProps {
  logs: LogEntry[]
}

export const LogViewer = ({ logs }: LogViewerProps) => {
  return (
    <div className="mt-5 w-full h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs text-left"
    >
      {logs.length === 0 ? (
        <div className="text-gray-400">暂无日志</div>
      ) : (
        logs.map((entry, index) => (
          <div key={index} className="mb-1 text-gray-800 break-words">
            <span className="text-gray-500">[{entry.timestamp}]</span>{' '}
            <span className="break-words">{entry.message}</span>
          </div>
        ))
      )}
    </div>
  )
}
