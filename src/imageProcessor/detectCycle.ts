import { FRAME_RATE } from '../constants';
import type { Logger } from '../Logger';
import type { ImageProcessor } from './types';

interface DetectCycleOptions {
  hashDiffThreshold?: number;
  consecutiveMatch?: number;
  minCycleTime?: number;
  logger: Logger;
}

interface CycleBoundary {
  startFrame: number;
  endFrame: number;
  startMs: number;
  endMs: number;
  cycleTime: number;
  cycleFrameCount: number;
}

/**
 * 基于 ImageData 数组的循环边界检测（轻量版，无依赖）
 * @param {Array<ImageData>} imageDataList - 已抽好的帧数据数组（每一项是 ImageData 对象）
 * @param {number} frameRate - 视频帧率（用于计算时间相关参数）
 * @param {Object} options - 配置项（默认适配多数场景）
 * @returns {Array} 循环边界数组，含循环起点/终点（帧索引+时间）、循环时长
 */
function detectCycle(
  imageDataList: ImageData[],
  options: DetectCycleOptions
): CycleBoundary[] {
  // 默认配置（可根据帧质量、循环规律微调）
  const config = {
    hashDiffThreshold: 2,    // 哈希差异阈值（≤2视为高度相似）
    consecutiveMatch: 3,     // 连续匹配帧数（≥3帧相似才认定循环）
    minCycleTime: 500,       // 最小循环时长（ms，避免短帧抖动误判）
    ...options,
  };

  const { hashDiffThreshold, consecutiveMatch, minCycleTime, logger } = config;
  const frameCount = imageDataList.length;
  const frameHashes: string[] = [];    // 存储每帧的dHash（轻量特征）
  const frameTimes: number[] = [];     // 存储每帧的时间戳（ms）
  const cycleBoundaries: CycleBoundary[] = [];// 最终循环边界结果

  logger.log(`开始检测循环边界，总帧数: ${frameCount}, 帧率: ${FRAME_RATE}fps`);
  logger.debug(`配置参数 - hashDiffThreshold: ${hashDiffThreshold}, consecutiveMatch: ${consecutiveMatch}, minCycleTime: ${minCycleTime}ms`);

  // 1. 预处理：计算所有帧的dHash和时间戳（核心轻量计算）
  logger.log('开始计算帧哈希...');
  for (let i = 0; i < frameCount; i++) {
    const imageData = imageDataList[i];
    // 计算当前帧的dHash（10ms内完成单帧，比像素对比快10倍+）
    const hash = calculateDHashFromImageData(imageData);
    frameHashes.push(hash);
    // 计算当前帧的时间戳（基于帧率）
    frameTimes.push((i / FRAME_RATE) * 1000);
  }
  logger.log(`帧哈希计算完成，共 ${frameHashes.length} 帧`);

  // 2. 计算dHash（差异哈希，适配ImageData，无Canvas依赖）
  function calculateDHashFromImageData(imageData: ImageData): string {
    const thumbWidth = 9;  // dHash标准尺寸：9x8（生成64位哈希）
    const thumbHeight = 8;
    const { data: pixels, width: imgWidth } = imageData;

    let hash = '';
    // 遍历缩略图的每个像素（无需绘制Canvas，直接计算灰度差异）
    for (let y = 0; y < thumbHeight; y++) {
      // 按比例取原图行（适配任意分辨率帧）
      const originalY = Math.floor((y / thumbHeight) * imageData.height);
      const rowStart = originalY * imgWidth * 4; // RGBA格式，每像素4个值

      for (let x = 0; x < thumbWidth - 1; x++) {
        // 按比例取原图列
        const originalX1 = Math.floor((x / thumbWidth) * imgWidth);
        const originalX2 = Math.floor(((x + 1) / thumbWidth) * imgWidth);

        // 计算两个像素的灰度值（RGB平均值）
        const gray1 = (pixels[rowStart + originalX1 * 4] + pixels[rowStart + originalX1 * 4 + 1] + pixels[rowStart + originalX1 * 4 + 2]) / 3;
        const gray2 = (pixels[rowStart + originalX2 * 4] + pixels[rowStart + originalX2 * 4 + 1] + pixels[rowStart + originalX2 * 4 + 2]) / 3;

        // 对比灰度，生成哈希位（1=当前<右侧，0=相反）
        hash += gray1 < gray2 ? '1' : '0';
      }
    }
    return hash;
  }

  // 3. 对比哈希，筛选循环边界（核心匹配逻辑）
  function findCycleBoundaries(): void {
    logger.log('开始查找循环边界...');
    // 遍历每帧，作为潜在循环起点
    for (let i = 0; i < frameCount - consecutiveMatch; i++) {
      // 跳过已认定为循环区间内的帧（避免重复检测）
      if (cycleBoundaries.some(b => i >= b.startFrame && i <= b.endFrame)) continue;

      // 潜在匹配起点：至少间隔“最小循环时长对应的帧数”（避免短重复误判）
      const minMatchOffset = Math.max(consecutiveMatch, Math.ceil((minCycleTime / 1000) * FRAME_RATE));
      // 遍历后续可能的匹配终点起点
      for (let j = i + minMatchOffset; j < frameCount - consecutiveMatch; j++) {
        let matchCount = 0;

        // 检查连续N帧是否都满足相似度要求
        for (let k = 0; k < consecutiveMatch; k++) {
          const diff = calculateHashDiff(frameHashes[i + k], frameHashes[j + k]);
          if (diff <= hashDiffThreshold) {
            matchCount++;
          } else {
            break; // 连续匹配中断，退出循环
          }
        }

        // 满足“连续N帧相似”，认定为有效循环边界
        if (matchCount >= consecutiveMatch) {
          const startFrame = i;
          const endFrame = j - 1; // 循环终点 = 下一轮起点 - 1
          const cycleTime = frameTimes[j] - frameTimes[i]; // 循环时长（ms）

          logger.debug(`候选循环边界: 帧${startFrame}-${endFrame}, 时长${cycleTime.toFixed(0)}ms`);

          // 二次验证：循环区间内无明显跳变（排除偶然相似）
          if (verifyCycleValidity(startFrame, j, cycleTime)) {
            logger.log(`✓ 检测到有效循环: 帧${startFrame}-${endFrame} (${(frameTimes[i]/1000).toFixed(2)}s-${(frameTimes[endFrame]/1000).toFixed(2)}s), 循环时长${(cycleTime/1000).toFixed(2)}s`);
            cycleBoundaries.push({
              startFrame,          // 循环起点（帧索引）
              endFrame,            // 循环终点（帧索引）
              startMs: frameTimes[i],       // 循环起点时间（ms）
              endMs: frameTimes[endFrame],  // 循环终点时间（ms）
              cycleTime,           // 循环时长（ms）
              cycleFrameCount: j - i,       // 循环包含的帧数
            });

            // 跳过当前循环区间，避免重复检测
            i = j + consecutiveMatch;
            break;
          }
        }
      }
    }
  }

  // 4. 验证循环有效性（减少误判）
  function verifyCycleValidity(startIdx: number, matchIdx: number, cycleTime: number): boolean {
    // 1. 排除过短循环（小于最小循环时长）
    if (cycleTime < minCycleTime) {
      logger.debug(`✗ 循环过短被拒绝: ${cycleTime.toFixed(0)}ms < ${minCycleTime}ms`);
      return false;
    }

    // 2. 验证循环区间内帧的连续性（哈希差异无突变）
    const cycleFrameCount = matchIdx - startIdx;
    for (let k = 0; k < cycleFrameCount - 1; k++) {
      const diff = calculateHashDiff(frameHashes[startIdx + k], frameHashes[startIdx + k + 1]);
      if (diff > hashDiffThreshold * 2) { // 允许2倍阈值波动（兼容轻微帧噪声）
        logger.debug(`✗ 循环内帧跳变被拒绝: 帧${startIdx + k}-${startIdx + k + 1} 差异${diff} > ${hashDiffThreshold * 2}`);
        return false;
      }
    }

    return true;
  }

  // 5. 计算两个哈希的差异（汉明距离，快速对比）
  function calculateHashDiff(hash1: string, hash2: string): number {
    let diff = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) diff++;
      if (diff > hashDiffThreshold) break; // 超过阈值，提前退出（优化性能）
    }
    return diff;
  }

  // 执行核心检测流程
  findCycleBoundaries();

  logger.log(`循环检测完成，共找到 ${cycleBoundaries.length} 个循环边界`);

  return cycleBoundaries;
}

export { detectCycle };
export type { DetectCycleOptions, CycleBoundary };

export const cycleDetectProcessor: ImageProcessor = async (imageDataList, config) => {
  const { logger } = config

  const cycleBoundaries = detectCycle(imageDataList, { logger })
  config.cycleBoundaries = cycleBoundaries

  if (cycleBoundaries.length > 0) {
    const firstCycle = cycleBoundaries[0]
    logger.log(`将使用第一个循环片段: 帧${firstCycle.startFrame}-${firstCycle.endFrame}`)
    return imageDataList.slice(firstCycle.startFrame, firstCycle.endFrame + 1)
  }

  logger.log('未检测到循环，使用全部帧')
  return imageDataList
}

// ------------------- 用法示例 -------------------
// 假设你已获取：
// 1. imageDataList：抽好的ImageData数组（比如从视频/Canvas中提取）
// 2. frameRate：视频帧率（比如30fps）

// 示例调用（直接传入已有数据）
// const imageDataList = [imageData1, imageData2, ...]; // 你的帧数据数组
// const frameRate = 30; // 你的视频帧率
// const cycleBoundaries = detectCycle(imageDataList, {
//   hashDiffThreshold: 2,    // 可根据帧噪声微调（噪声大就设3）
//   consecutiveMatch: 3,     // 循环越规律，可设越小（如2）
//   minCycleTime: 500        // 最小循环时长（避免1秒内的短重复）
// });

// 输出结果
// console.log('检测到的循环边界：', cycleBoundaries);
// if (cycleBoundaries.length) {
//   const firstCycle = cycleBoundaries[0];
//   console.log(`循环起点：第${firstCycle.startFrame}帧（${(firstCycle.startMs/1000).toFixed(1)}秒）`);
//   console.log(`循环终点：第${firstCycle.endFrame}帧（${(firstCycle.endMs/1000).toFixed(1)}秒）`);
//   console.log(`循环时长：${(firstCycle.cycleTime/1000).toFixed(1)}秒`);
// } else {
//   console.log('未检测到循环边界');
// }