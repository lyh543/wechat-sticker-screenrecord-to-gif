import { useState, useRef } from 'react'
import GIF from 'gif.js'
import './App.css'

function App() {
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    setConverting(true)
    setProgress(0)

    let videoUrl = ''

    try {
      const video = document.createElement('video')
      videoUrl = URL.createObjectURL(file)
      video.src = videoUrl
      await video.load()
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = () => reject(new Error('视频加载失败'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('无法创建 canvas 上下文')
      }

      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: '/gif.worker.js'
      })

      gif.on('progress', (p) => {
        setProgress(Math.floor(p * 100))
      })

      gif.on('error', (err) => {
        throw new Error(`GIF 生成失败: ${err}`)
      })

      const frameRate = 10
      const duration = video.duration
      const frameCount = Math.floor(duration * frameRate)

      for (let i = 0; i < frameCount; i++) {
        video.currentTime = i / frameRate
        await new Promise((resolve, reject) => {
          video.onseeked = resolve
          video.onerror = () => reject(new Error('视频帧读取失败'))
        })
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        gif.addFrame(canvas, { copy: true, delay: 1000 / frameRate })
      }

      gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name.replace(/\.[^/.]+$/, '.gif')
        a.click()
        URL.revokeObjectURL(url)
        URL.revokeObjectURL(videoUrl)
        resetState()
      })

      gif.render()
    } catch (error) {
      console.error('转换失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert(`转换失败: ${errorMessage}`)
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      resetState()
    }
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>视频转 GIF</h1>
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
    </div>
  )
}

export default App
