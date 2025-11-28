import type { Logger } from '../Logger'

export type ProcessorLogger = Logger

export interface Color {
  r: number
  g: number
  b: number
  a: number
}

/**
 * 所有图像处理器共享的配置对象。
 * Processor 可以直接修改 config，将中间结果写入其中供后续 processor 使用。
 */
export interface ProcessorConfig {
  /** 日志接口，贯穿整个处理流水线。 */
  logger: ProcessorLogger

  /** 原始视频的帧率（fps）。 */
  frameRate?: number

  /** 是否在后续步骤中移除背景。 */
  removeBackground?: boolean

  /** 自动识别出的背景色。 */
  backgroundColor?: Color

  /** 背景采样使用的帧索引，缺省为中间帧。 */
  backgroundSampleIndex?: number

  /** 裁剪容差（0-1），用于裁剪处理器。 */
  cropTolerance?: number

  /** 自动检测到的裁剪区域。 */
  cropRegion?: unknown

  /** 循环检测得到的边界信息。 */
  cycleBoundaries?: unknown

  /** 输出文件名（通常来自原视频文件名）。 */
  fileName?: string

  /** 进度回调函数，一般由渲染 GIF 的处理器使用。 */
  onProgress?: (progress: number) => void
}

export interface ImageProcessor {
  (imageDataList: ImageData[], config: ProcessorConfig): Promise<ImageData[]>
}
