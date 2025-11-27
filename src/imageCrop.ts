import type { Color } from './colorDetection'
import type { Logger } from './Logger'

export interface CropRegion {
  left: number
  top: number
  width: number
  height: number
}

const areColorsEqual = (data1: Uint8ClampedArray, index1: number, data2: Uint8ClampedArray, index2: number): boolean => {
  return data1[index1] === data2[index2] &&
         data1[index1 + 1] === data2[index2 + 1] &&
         data1[index1 + 2] === data2[index2 + 2] &&
         data1[index1 + 3] === data2[index2 + 3]
}

const isRowUniform = (frames: ImageData[], y: number, tolerance = 0.01): boolean => {
  if (frames.length === 0) return false
  
  const width = frames[0].width
  
  // 统计该行所有像素的颜色分布，找出主色调
  const colorMap = new Map<string, { color: Color; count: number }>()
  
  for (const frame of frames) {
    const data = frame.data
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const color: Color = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2],
        a: data[pixelIndex + 3]
      }
      const key = `${color.r},${color.g},${color.b},${color.a}`
      const entry = colorMap.get(key)
      if (entry) {
        entry.count++
      } else {
        colorMap.set(key, { color, count: 1 })
      }
    }
  }
  
  // 找到出现次数最多的颜色
  let maxCount = 0
  let dominantColor: Color = { r: 0, g: 0, b: 0, a: 255 }
  colorMap.forEach((entry) => {
    if (entry.count > maxCount) {
      maxCount = entry.count
      dominantColor = entry.color
    }
  })
  
  const totalPixels = width * frames.length
  const ratio = 1 - (maxCount / totalPixels)
  
  // 如果主色调占比足够高（其他颜色占比小于容差），认为是纯色
  return ratio <= tolerance
}

const isColumnUniform = (frames: ImageData[], x: number, tolerance = 0.01): boolean => {
  if (frames.length === 0) return false
  
  const width = frames[0].width
  const height = frames[0].height
  
  // 统计该列所有像素的颜色分布，找出主色调
  const colorMap = new Map<string, { color: Color; count: number }>()
  
  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx]
    const data = frame.data
    for (let y = 0; y < height; y++) {
      const pixelIndex = (y * width + x) * 4
      const color: Color = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2],
        a: data[pixelIndex + 3]
      }
      const key = `${color.r},${color.g},${color.b},${color.a}`
      const entry = colorMap.get(key)
      if (entry) {
        entry.count++
      } else {
        colorMap.set(key, { color, count: 1 })
      }
    }
  }
  
  // 找到出现次数最多的颜色
  let maxCount = 0
  let dominantColor: Color = { r: 0, g: 0, b: 0, a: 255 }
  colorMap.forEach((entry) => {
    if (entry.count > maxCount) {
      maxCount = entry.count
      dominantColor = entry.color
    }
  })
  
  const totalPixels = height * frames.length
  const ratio = 1 - (maxCount / totalPixels)
  
  // 如果主色调占比足够高（其他颜色占比小于容差），认为是纯色
  return ratio <= tolerance
}

export const detectCropRegion = async (
  frames: ImageData[],
  tolerance: number,
  logger: Logger
): Promise<CropRegion> => {
  if (frames.length === 0) {
    throw new Error('没有可用的帧')
  }
  
  const width = frames[0].width
  const height = frames[0].height
  
  logger.log('开始检测可裁剪区域...')
  logger.log(`原始尺寸: ${width}x${height}`)
  
  // 设置边框
  const borderLeft = 0
  const borderRight = 0
  const borderTop = Math.floor(height / 8)
  const borderBottom = Math.floor(height / 8)
  
  logger.log(`边框设置: 上=${borderTop}px, 下=${borderBottom}px, 左=${borderLeft}px, 右=${borderRight}px`)
  logger.log('边框区域也将被裁剪')
  logger.log(`容差设置: ${(tolerance * 100).toFixed(2)}% (tolerance=${tolerance})`)
  await logger.yield()
  
  // 从左往右找第一列不可裁剪的列（从边框之后开始）
  let left = borderLeft
  logger.debug(`开始从左往右扫描 (从列 ${borderLeft} 到列 ${width - borderRight - 1})...`)
  
  // 先输出前几列的颜色统计
  for (let x = 0; x < Math.min(3, width); x++) {
    const colorMap = new Map<string, number>()
    for (const frame of frames) {
      const data = frame.data
      for (let y = 0; y < height; y++) {
        const pixelIndex = (y * width + x) * 4
        const color = `rgba(${data[pixelIndex]}, ${data[pixelIndex + 1]}, ${data[pixelIndex + 2]}, ${data[pixelIndex + 3]})`
        colorMap.set(color, (colorMap.get(color) || 0) + 1)
      }
    }
    const totalPixels = height * frames.length
    const colorCount = colorMap.size
    const topColor = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1])[0]
    logger.debug(`  列 ${x} 颜色统计: 共 ${colorCount} 种颜色, 最多的是 ${topColor[0]} 出现 ${topColor[1]}/${totalPixels} 次`)
    await logger.yield()
  }
  
  for (let x = borderLeft; x < width - borderRight; x++) {
    const uniform = isColumnUniform(frames, x, tolerance)
    if (x < 3) {
      // 添加详细调试
      let samePixels = 0
      let totalPx = 0
      const firstFrame = frames[0]
      const firstPixelIndex = (0 * width + x) * 4
      const refR = firstFrame.data[firstPixelIndex]
      const refG = firstFrame.data[firstPixelIndex + 1]
      const refB = firstFrame.data[firstPixelIndex + 2]
      const refA = firstFrame.data[firstPixelIndex + 3]
      
      for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
        const frame = frames[frameIdx]
        const data = frame.data
        for (let y = 0; y < height; y++) {
          totalPx++
          const pixelIndex = (y * width + x) * 4
          if (data[pixelIndex] === refR &&
              data[pixelIndex + 1] === refG &&
              data[pixelIndex + 2] === refB &&
              data[pixelIndex + 3] === refA) {
            samePixels++
          }
        }
      }
      const diffPx = totalPx - samePixels
      const ratio = diffPx / totalPx
      logger.debug(`  列 ${x}: ${uniform ? '纯色' : '有内容'} (参考色: rgba(${refR},${refG},${refB},${refA}), 不同像素: ${diffPx}/${totalPx}, 比例: ${(ratio * 100).toFixed(4)}%, 容差: ${(tolerance * 100).toFixed(2)}%, 判定: ${ratio <= tolerance ? '✓通过' : '✗不通过'})`)
    }
    if (!uniform) {
      left = x
      logger.debug(`  找到左边界: 列 ${left}`)
      break
    }
    await logger.yield()
  }
  
  // 从右往左找第一列不可裁剪的列（到边框之前结束）
  let right = width - 1 - borderRight
  logger.debug(`开始从右往左扫描 (从列 ${width - 1 - borderRight} 到列 ${borderLeft})...`)
  for (let x = width - 1 - borderRight; x >= borderLeft; x--) {
    const uniform = isColumnUniform(frames, x, tolerance)
    if (!uniform) {
      right = x
      await logger.yield()
      // 额外调试：检查右边界附近的列
      logger.debug(`  检查右边界附近的列...`)
      for (let debugX = right - 2; debugX <= Math.min(right + 2, width - 1); debugX++) {
        const colorMap = new Map<string, number>()
        for (const frame of frames) {
          const data = frame.data
          for (let y = 0; y < height; y++) {
            const pixelIndex = (y * width + debugX) * 4
            const color = `rgba(${data[pixelIndex]}, ${data[pixelIndex + 1]}, ${data[pixelIndex + 2]}, ${data[pixelIndex + 3]})`
            colorMap.set(color, (colorMap.get(color) || 0) + 1)
          }
        }
        const totalPixels = height * frames.length
        const colorCount = colorMap.size
        const topColor = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1])[0]
        const topRatio = topColor[1] / totalPixels
        logger.debug(`    列 ${debugX}: ${colorCount} 种颜色, 主色调 ${topColor[0]} 占比 ${(topRatio * 100).toFixed(2)}%, 非主色调 ${((1-topRatio) * 100).toFixed(2)}%`)
      }
      
      break
    }
  }
  
  // 从上往下找第一行不可裁剪的行（从边框之后开始）
  let top = borderTop
  for (let y = borderTop; y < height - borderBottom; y++) {
    if (!isRowUniform(frames, y)) {
      top = y
      break
    }
  }
  
  // 从下往上找第一行不可裁剪的行（到边框之前结束）
  let bottom = height - 1 - borderBottom
  for (let y = height - 1 - borderBottom; y >= borderTop; y--) {
    if (!isRowUniform(frames, y)) {
      bottom = y
      break
    }
  }
  
  const cropRegion: CropRegion = {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1
  }
  
  logger.log(`检测到有效区域: left=${left}, top=${top}, width=${cropRegion.width}, height=${cropRegion.height}`)
  logger.log(`裁剪后尺寸: ${cropRegion.width}x${cropRegion.height}`)
  
  const savedPercentage = (100 - (cropRegion.width * cropRegion.height) / (width * height) * 100).toFixed(2)
  logger.log(`节省空间: ${savedPercentage}%`)
  
  return cropRegion
}

export const cropFrames = async (
  frames: ImageData[],
  cropRegion: CropRegion,
  logger: Logger
): Promise<ImageData[]> => {
  logger.log(`开始裁剪 ${frames.length} 帧...`)
  
  const croppedFrames: ImageData[] = []
  
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index]
    const croppedData = new Uint8ClampedArray(cropRegion.width * cropRegion.height * 4)
    
    for (let y = 0; y < cropRegion.height; y++) {
      for (let x = 0; x < cropRegion.width; x++) {
        const srcIndex = ((cropRegion.top + y) * frame.width + (cropRegion.left + x)) * 4
        const dstIndex = (y * cropRegion.width + x) * 4
        
        croppedData[dstIndex] = frame.data[srcIndex]
        croppedData[dstIndex + 1] = frame.data[srcIndex + 1]
        croppedData[dstIndex + 2] = frame.data[srcIndex + 2]
        croppedData[dstIndex + 3] = frame.data[srcIndex + 3]
      }
    }
    
    croppedFrames.push(new ImageData(croppedData, cropRegion.width, cropRegion.height))
    
    // 每处理 5 帧就让出控制权
    if (index % 5 === 0) {
      await logger.yield()
    }
  }
  
  logger.log(`裁剪完成`)
  
  return croppedFrames
}
