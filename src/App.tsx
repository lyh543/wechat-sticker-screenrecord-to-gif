import { useState, useRef } from 'react'
import './App.css'
import { extractFramesFromVideo } from './videoToFrames'
import { renderGifFromFrames } from './framesToGif'
import { useLogger, LogViewer } from './Logger'
import { detectBackgroundColor } from './colorDetection'
import { replaceBackgroundInFrames } from './colorReplacement'
import { detectCropRegion, cropFrames } from './imageCrop'

function App() {
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [frames, setFrames] = useState<ImageData[]>([])
  const [cropTolerance, setCropTolerance] = useState(0.02) // 裁剪容差，默认 2%
  const [removeBackground, setRemoveBackground] = useState(true) // 是否去除背景，默认开启
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { logs, log, clearLogs } = useLogger()

  const resetState = () => {
    setConverting(false)
    setProgress(0)
    setFrames([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    log("\n\n")
    setConverting(true)
    setProgress(0)

    log('========== 开始转换 ==========')

    try {
      // 提取视频帧
      let processedFrames = await extractFramesFromVideo(file, log)
      setFrames(processedFrames)
      
      if (processedFrames.length == 0) {
        log('❌ 视频中没有可用的帧')
        log('========== 转换结束 ==========')
        resetState()
        return
      }

      // 识别中间帧的底色
      const middleIndex = Math.floor(processedFrames.length / 2)
      log(`使用第 ${middleIndex + 1} 帧（中间帧）进行底色识别`)
      const backgroundColor = detectBackgroundColor(processedFrames[middleIndex], log)
      
      // 检测并裁剪有效区域
      const cropRegion = detectCropRegion(processedFrames, cropTolerance, log)
      processedFrames = cropFrames(processedFrames, cropRegion, log)

      // 根据用户选择决定是否将底色替换为透明色
      if (removeBackground) {
        processedFrames = replaceBackgroundInFrames(processedFrames, backgroundColor, log)
      } else {
        log('跳过底色替换（用户选择保留背景）')
      }

      // 生成 GIF
      await renderGifFromFrames(processedFrames, file.name, setProgress, log)
      
      log('========== 转换完成 ==========')
      resetState()
    } catch (error) {
      console.error('转换失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      log(`❌ 转换失败: ${errorMessage}`)
      alert(`转换失败: ${errorMessage}`)
      resetState()
    }
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>视频转 GIF</h1>
      
      <div style={{ marginTop: '30px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={removeBackground}
            onChange={(e) => setRemoveBackground(e.target.checked)}
            disabled={converting}
          />
          <span>去除背景（将底色替换为透明）</span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span>裁剪容差:</span>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={cropTolerance * 100}
            onChange={(e) => setCropTolerance(parseFloat(e.target.value) / 100)}
            disabled={converting}
            style={{ width: '200px' }}
          />
          <span style={{ minWidth: '60px', fontWeight: 'bold' }}>{(cropTolerance * 100).toFixed(1)}%</span>
        </label>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '-5px' }}>
          容差越大，裁剪越激进（可能裁掉更多边缘）
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={converting}
          style={{ display: 'none' }}
          id="videoInput"
        />
        <label htmlFor="videoInput">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={converting}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              cursor: converting ? 'not-allowed' : 'pointer',
              backgroundColor: converting ? '#ccc' : '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '8px'
            }}
          >
            {converting ? `转换中... ${progress}%` : '选择视频文件'}
          </button>
        </label>
      </div>
      
      <LogViewer logs={logs} />
    </div>
  )
}

export default App
