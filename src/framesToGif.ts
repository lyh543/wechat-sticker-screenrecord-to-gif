import GIF from 'gif.js'

export const renderGifFromFrames = async (
  frames: ImageData[], 
  fileName: string,
  onProgress?: (progress: number) => void,
  onLog?: (message: string) => void
): Promise<void> => {
  const log = onLog || (() => {})
  
  if (frames.length === 0) {
    throw new Error('没有可用的帧')
  }

  log(`开始生成 GIF，帧数: ${frames.length}, 尺寸: ${frames[0].width}x${frames[0].height}`)

  const canvas = document.createElement('canvas')
  canvas.width = frames[0].width
  canvas.height = frames[0].height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('无法创建 canvas 上下文')
  }

  const gif = new GIF({
    workers: 2,
    quality: 10,
    workerScript: '/assets/gif.worker.js'
  })

  log('初始化 GIF 编码器 (workers: 2, quality: 10)')

  if (onProgress) {
    gif.on('progress', (p) => {
      onProgress(Math.floor(p * 100))
    })
  }

  gif.on('error', (err) => {
    throw new Error(`GIF 生成失败: ${err}`)
  })

  const frameRate = 10
  log(`添加帧到 GIF (帧率: ${frameRate} fps)`)
  
  frames.forEach((imageData, index) => {
    ctx.putImageData(imageData, 0, 0)
    gif.addFrame(canvas, { copy: true, delay: 1000 / frameRate })
    
    if ((index + 1) % 20 === 0 || index === frames.length - 1) {
      log(`已添加 ${index + 1}/${frames.length} 帧`)
    }
  })

  log('开始渲染 GIF...')

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob) => {
      log(`GIF 生成完成，大小: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)
      log(`开始下载: ${fileName.replace(/\.[^/.]+$/, '.gif')}`)
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.[^/.]+$/, '.gif')
      a.click()
      URL.revokeObjectURL(url)
      
      log('下载完成')
      resolve()
    })

    gif.on('error', (err) => {
      log(`GIF 渲染失败: ${err}`)
      reject(err)
    })
    
    gif.render()
  })
}
