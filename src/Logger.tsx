import { useState, useCallback } from 'react'

export interface LogEntry {
  timestamp: string
  message: string
}

export const useLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const log = useCallback((message: string) => {
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
    
    setLogs(prev => [...prev, { timestamp, message }])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return { logs, log, clearLogs }
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
