import type { ProcessorConfig } from './imageProcessor/types'
import { extractFramesFromVideo } from './imageProcessor/videoToFrames'
import { renderGifFromFrames } from './imageProcessor/framesToGif'
import { backgroundColorProcessor } from './imageProcessor/colorDetection'
import { replaceBackgroundInFrames } from './imageProcessor/colorReplacement'
import { cropProcessor } from './imageProcessor/imageCrop'
import { cycleDetectProcessor } from './imageProcessor/detectCycle'
import { frameRateDetectProcessor } from './imageProcessor/frameRateDetect'

export interface HandleFileSelectDependencies {
  setConverting: (value: boolean) => void
  setProgress: (value: number) => void
  resetState: () => void
}

export const processFile = async (
  config: ProcessorConfig,
  deps: HandleFileSelectDependencies,
) => {
  const { setConverting, setProgress, resetState } = deps
  const { logger, removeBackground } = config

  logger.log("\n\n")
  setConverting(true)
  setProgress(0)

  logger.log('========== 开始转换 =========＝')

  try {
    // 提取视频帧
    let processedFrames = await extractFramesFromVideo(config)
    
    if (processedFrames.length == 0) {
      logger.log('❌ 视频中没有可用的帧')
      logger.log('========== 转换结束 =========＝')
      resetState()
      return
    }


    // 检测循环边界并截取循环段
    processedFrames = await cycleDetectProcessor(processedFrames, config)

    // 尝试识别表情包实际帧率
    processedFrames = await frameRateDetectProcessor(processedFrames, config)

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
    await renderGifFromFrames(processedFrames, config)
    
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
