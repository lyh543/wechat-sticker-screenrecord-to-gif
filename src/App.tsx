import { useState, useRef } from 'react'
import './App.css'
import { extractFramesFromVideo } from './imageProcessor/videoToFrames'
import { renderGifFromFrames } from './imageProcessor/framesToGif'
import { useLogger, LogViewer } from './Logger'
import type { ProcessorConfig } from './imageProcessor/types'
import { backgroundColorProcessor } from './imageProcessor/colorDetection'
import { replaceBackgroundInFrames } from './imageProcessor/colorReplacement'
import { cropProcessor } from './imageProcessor/imageCrop'
import { cycleDetectProcessor } from './imageProcessor/detectCycle'

function App() {
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cropTolerance, setCropTolerance] = useState(0.02) // 裁剪容差，默认 2%
  const [removeBackground, setRemoveBackground] = useState(false) // 是否去除背景，默认关闭
  const [debugMode, setDebugMode] = useState(false) // 调试模式，默认关闭
  const [frameRate, setFrameRate] = useState(15) // 帧率，默认 15 fps
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { logs, logger } = useLogger(debugMode)

  const resetState = () => {
    setConverting(false)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    logger.log("\n\n")
    setConverting(true)
    setProgress(0)

    logger.log('========== 开始转换 =========＝')

    try {
      // 提取视频帧
      let processedFrames = await extractFramesFromVideo(file, frameRate, logger)
      
      if (processedFrames.length == 0) {
        logger.log('❌ 视频中没有可用的帧')
        logger.log('========== 转换结束 =========＝')
        resetState()
        return
      }

      const config: ProcessorConfig = {
        logger,
        frameRate,
        removeBackground,
        cropTolerance,
        fileName: file.name,
        onProgress: setProgress,
      }

      // 底色识别
      processedFrames = await backgroundColorProcessor(processedFrames, config)
      
      // 检测并裁剪有效区域
      processedFrames = await cropProcessor(processedFrames, config)

      // 检测循环边界并截取循环段
      processedFrames = await cycleDetectProcessor(processedFrames, config)

      // 根据用户选择决定是否将底色替换为透明色
      if (removeBackground) {
        processedFrames = await replaceBackgroundInFrames(processedFrames, config)
      } else {
        logger.log('跳过底色替换（用户选择保留背景）')
      }

      // 生成 GIF
      await renderGifFromFrames(processedFrames, file.name, frameRate, setProgress, logger)
      
      logger.log('========== 转换完成 =========＝')
      resetState()
    } catch (error) {
      console.error('转换失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      logger.log(`❌ 转换失败: ${errorMessage}`)
      alert(`转换失败: ${errorMessage}`)
      resetState()
    }
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>微信表情包录屏转 GIF</h1>
      
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
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            disabled={converting}
          />
          <span>调试模式（显示详细日志）</span>
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
        
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span>帧率:</span>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={frameRate}
            onChange={(e) => setFrameRate(parseInt(e.target.value))}
            disabled={converting}
            style={{ width: '200px' }}
          />
          <span style={{ minWidth: '60px', fontWeight: 'bold' }}>{frameRate} fps</span>
        </label>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '-5px' }}>
          帧率越高，动画越流畅，但文件越大、生成越慢。推荐 10-15fps
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

