import {  colorToString } from './colorDetection'
import type { Color } from './colorDetection'

export const replaceColorWithTransparent = (
  imageData: ImageData,
  targetColor: Color,
  onLog?: (message: string) => void
): ImageData => {
  const log = onLog || (() => {})
  
  const width = imageData.width
  const height = imageData.height
  const data = new Uint8ClampedArray(imageData.data)
  
  let replacedCount = 0
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    
    // 检查颜色是否匹配
    if (r === targetColor.r && g === targetColor.g && b === targetColor.b && a === targetColor.a) {
      data[i] = data[i + 1] = data[i + 2] = 0 // 方便压缩空间
      data[i + 3] = 0 // 设置透明度为 0
      replacedCount++
    }
  }
  
  const totalPixels = (data.length / 4)
  const percentage = ((replacedCount / totalPixels) * 100).toFixed(2)
  
  log(`替换像素: ${replacedCount}/${totalPixels} (${percentage}%)`)
  
  return new ImageData(data, width, height)
}

export const replaceBackgroundInFrames = (
  frames: ImageData[],
  backgroundColor: Color,
  onLog?: (message: string) => void
): ImageData[] => {
  const log = onLog || (() => {})
  
  log(`开始将底色 ${colorToString(backgroundColor)} 替换为透明色...`)
  
  const processedFrames: ImageData[] = []
  
  frames.forEach((frame, index) => {
    const processed = replaceColorWithTransparent(frame, backgroundColor, (msg) => {
      // 只在特定帧输出日志，避免日志过多
      if ((index + 1) % 10 === 0 || index === 0 || index === frames.length - 1) {
        log(`帧 ${index + 1}: ${msg}`)
      }
    })
    processedFrames.push(processed)
  })
  
  log(`底色替换完成，共处理 ${frames.length} 帧`)
  
  return processedFrames
}
