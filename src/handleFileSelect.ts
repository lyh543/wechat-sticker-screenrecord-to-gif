import type { ChangeEvent } from 'react'
import type { ProcessorConfig } from './imageProcessor/types'
import { extractFramesFromVideo } from './imageProcessor/videoToFrames'
import { renderGifFromFrames } from './imageProcessor/framesToGif'
import { backgroundColorProcessor } from './imageProcessor/colorDetection'
import { replaceBackgroundInFrames } from './imageProcessor/colorReplacement'
import { cropProcessor } from './imageProcessor/imageCrop'
import { cycleDetectProcessor } from './imageProcessor/detectCycle'
import type { Logger } from './Logger'

export interface HandleFileSelectDependencies {
  logger: Logger
  setConverting: (value: boolean) => void
  setProgress: (value: number) => void
  frameRate: number
  removeBackground: boolean
  cropTolerance: number
  debugMode: boolean
  resetState: () => void
}

export const createHandleFileSelect = ({
  logger,
  setConverting,
  setProgress,
  frameRate,
  removeBackground,
  cropTolerance,
  debugMode,
  resetState,
}: HandleFileSelectDependencies) => {
  return async (e: ChangeEvent<HTMLInputElement>) => {
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
          borderLeftRatio: 0,
          borderRightRatio: 0,
          borderTopRatio: 0.055,
          borderBottomRatio: 0.055,
        fileName: file.name,
        onProgress: setProgress,
        debugMode,
      }

      // 检测循环边界并截取循环段
      processedFrames = await cycleDetectProcessor(processedFrames, config)

      // 底色识别
      processedFrames = await backgroundColorProcessor(processedFrames, config)
      
      // 检测并裁剪有效区域
      processedFrames = await cropProcessor(processedFrames, config)

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
}
