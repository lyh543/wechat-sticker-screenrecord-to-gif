import { useState, useRef, useCallback, type ChangeEvent } from 'react'
import { useLocalStorage } from 'react-use'
import { useLogger, LogViewer } from './Logger'
import { processFile } from './processFile'
import type { ProcessorConfig } from './imageProcessor/types'

function App() {
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cropTolerance = 0.02, ] = useLocalStorage<number>('wechat-sticker-gif-cropTolerance') // 裁剪容差，默认 2%
  const [removeBackground = false, setRemoveBackground] = useLocalStorage<boolean>('wechat-sticker-gif-removeBackground') // 是否去除背景，默认关闭
  const [debugMode = false, setDebugMode] = useLocalStorage<boolean>('wechat-sticker-gif-debugMode') // 调试模式，默认关闭
  const [frameRate = 5, setFrameRate] = useLocalStorage<number>('wechat-sticker-gif-frameRate') // 帧率，默认 15 fps
  const [targetSizeSlider = 6, setTargetSizeSlider] = useLocalStorage<number>('wechat-sticker-gif-targetSizeSlider') // 目标尺寸滑块值，默认 6 对应 300px
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { logs, logger, clearLogs } = useLogger(debugMode)

  // 计算实际的 targetSize 值：slider 1-16 对应 50-800，slider 17 对应不压缩（0）
  const targetSize = targetSizeSlider <= 16 ? targetSizeSlider * 50 : 0
  
  const resetState = useCallback(() => {
    setConverting(false)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const config: ProcessorConfig = {
        logger,
        frameRate,
        removeBackground,
        cropTolerance,
        borderLeftRatio: 0,
        borderRightRatio: 0,
        borderTopRatio: 0.055,
        borderBottomRatio: 0.055,
        fileName: file.name,
        onProgress: setProgress,
        debugMode,
        file,
        targetSize,
      }

      processFile(config, {
        setConverting,
        setProgress,
        resetState,
      })
    },
    [
      logger,
      frameRate,
      removeBackground,
      cropTolerance,
      debugMode,
      targetSize,
      setProgress,
      setConverting,
      resetState,
    ],
  )


  return (
    <div className="max-w-5xl mx-auto p-10 text-center">
      <h1 className="text-5xl font-semibold">微信表情包录屏转 GIF</h1>
      
      <div className="mt-8 mb-5 flex flex-col gap-4 items-center">
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
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            disabled={converting}
          />
          <span>调试模式（显示详细日志）</span>
        </label>
        
        {/* 不常用，注释掉 */}
        {/* <label className="flex items-center justify-center gap-2">
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
          <span className="min-w-[60px] font-bold">{(cropTolerance * 100).toFixed(1)}%</span>
        </label>
        <div className="text-xs text-gray-500 -mt-1">
          容差越大，裁剪越激进（可能裁掉更多边缘）
        </div> */}
        
        <label className="flex items-center justify-center gap-2">
          <span>帧率:</span>
          <input
            type="range"
            min="5"
            max="60"
            step="1"
            value={frameRate}
            onChange={(e) => setFrameRate(parseInt(e.target.value))}
            disabled={converting}
            style={{ width: '200px' }}
          />
          <span className="min-w-[60px] font-bold">{frameRate} fps</span>
        </label>
        <div className="text-xs text-gray-500 -mt-1">
          帧率越高，动画越流畅，但文件越大、生成越慢。推荐 10-15fps
        </div>
        
        <label className="flex items-center justify-center gap-2">
          <span>目标尺寸:</span>
          <input
            type="range"
            min="1"
            max="17"
            step="1"
            value={targetSizeSlider}
            onChange={(e) => setTargetSizeSlider(parseInt(e.target.value))}
            disabled={converting}
            style={{ width: '200px' }}
          />
          <span className="min-w-[80px] font-bold">{targetSize === 0 ? '不压缩' : `${targetSize}px`}</span>
        </label>
        <div className="text-xs text-gray-500 -mt-1">
          图片会按比例缩放，使宽高的较大值不超过此尺寸。推荐 200-400px
        </div>
      </div>
      
      <div className="mt-10">
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
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={clearLogs}
          disabled={logs.length === 0 || converting}
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            cursor: logs.length === 0 || converting ? 'not-allowed' : 'pointer',
            backgroundColor: logs.length === 0 || converting ? '#ddd' : '#f5a623',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            opacity: logs.length === 0 || converting ? 0.7 : 1,
          }}
        >
          清除日志
        </button>
      </div>

      <LogViewer logs={logs} />

      <div className="mt-8 text-sm text-gray-500 flex justify-center">
        <a
          href="https://github.com/lyh543/wechat-sticker-screenrecord-to-gif"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          在 GitHub 查看源码
        </a>
      </div>
    </div>
  )
}

export default App

