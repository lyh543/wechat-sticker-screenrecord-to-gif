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
    <div style={{
      marginTop: '20px',
      padding: '16px',
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      width: '100%',
      height: '400px',
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: '12px',
      textAlign: 'left',
      boxSizing: 'border-box'
    }}>
      {logs.length === 0 ? (
        <div style={{ color: '#999' }}>暂无日志</div>
      ) : (
        logs.map((entry, index) => (
          <div key={index} style={{ marginBottom: '4px', color: '#333' }}>
            <span style={{ color: '#666' }}>[{entry.timestamp}]</span>{' '}
            <span>{entry.message}</span>
          </div>
        ))
      )}
    </div>
  )
}
