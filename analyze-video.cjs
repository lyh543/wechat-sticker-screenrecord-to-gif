#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { spawn } = require('child_process');

const videoPath = process.argv[2] || './src/assets/eg2.mp4';
const frameRate = 10;
const tempDir = './temp_frames';

// 创建临时目录
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

console.log(`分析视频文件: ${videoPath}`);

// 使用 ffmpeg 提取帧
async function extractFrames() {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=${frameRate}`,
      '-f', 'image2',
      path.join(tempDir, 'frame_%04d.png')
    ]);

    ffmpeg.stderr.on('data', (data) => {
      // ffmpeg 输出到 stderr
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

// 分析帧
async function analyzeFrames() {
  const files = fs.readdirSync(tempDir)
    .filter(f => f.startsWith('frame_') && f.endsWith('.png'))
    .sort();

  console.log(`提取了 ${files.length} 帧`);

  if (files.length === 0) {
    console.error('没有提取到帧');
    return;
  }

  // 加载所有帧
  const frames = [];
  for (const file of files) {
    const img = await loadImage(path.join(tempDir, file));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    frames.push(imageData);
  }

  const width = frames[0].width;
  const height = frames[0].height;

  console.log(`\n视频尺寸: ${width}x${height}`);

  // 检测左右边界
  console.log('\n检测左边界:');
  for (let x = 0; x < Math.min(50, width); x++) {
    const uniform = isColumnUniform(frames, x);
    console.log(`  列 ${x}: ${uniform ? '纯色 ✓' : '有内容 ✗'}`);
    if (!uniform) {
      console.log(`  → 左边界应该是: ${x}`);
      break;
    }
  }

  console.log('\n检测右边界:');
  for (let x = width - 1; x >= Math.max(width - 50, 0); x--) {
    const uniform = isColumnUniform(frames, x);
    console.log(`  列 ${x}: ${uniform ? '纯色 ✓' : '有内容 ✗'}`);
    if (!uniform) {
      console.log(`  → 右边界应该是: ${x}`);
      break;
    }
  }

  // 分析左边第一列的颜色
  console.log('\n左边第一列颜色分布:');
  analyzeColumnColors(frames, 0);

  console.log('\n左边第二列颜色分布:');
  analyzeColumnColors(frames, 1);

  console.log('\n右边最后一列颜色分布:');
  analyzeColumnColors(frames, width - 1);
}

function isColumnUniform(frames, x) {
  if (frames.length === 0) return false;

  const width = frames[0].width;
  const height = frames[0].height;
  const firstFrame = frames[0];

  // 获取第一帧第一行该列的像素颜色作为参考
  const firstPixelIndex = (0 * width + x) * 4;
  const refR = firstFrame.data[firstPixelIndex];
  const refG = firstFrame.data[firstPixelIndex + 1];
  const refB = firstFrame.data[firstPixelIndex + 2];
  const refA = firstFrame.data[firstPixelIndex + 3];

  // 检查所有帧的该列是否都是相同颜色
  for (const frame of frames) {
    const data = frame.data;
    for (let y = 0; y < height; y++) {
      const pixelIndex = (y * width + x) * 4;
      if (data[pixelIndex] !== refR ||
          data[pixelIndex + 1] !== refG ||
          data[pixelIndex + 2] !== refB ||
          data[pixelIndex + 3] !== refA) {
        return false;
      }
    }
  }

  return true;
}

function analyzeColumnColors(frames, x) {
  const colorMap = new Map();
  const width = frames[0].width;
  const height = frames[0].height;

  for (const frame of frames) {
    const data = frame.data;
    for (let y = 0; y < height; y++) {
      const pixelIndex = (y * width + x) * 4;
      const color = `rgba(${data[pixelIndex]}, ${data[pixelIndex + 1]}, ${data[pixelIndex + 2]}, ${data[pixelIndex + 3]})`;
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
    }
  }

  const sorted = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sorted.forEach(([color, count], i) => {
    console.log(`  ${i + 1}. ${color}: ${count} 次`);
  });

  if (colorMap.size === 1) {
    console.log(`  ✓ 该列只有一种颜色`);
  } else {
    console.log(`  ✗ 该列有 ${colorMap.size} 种不同颜色`);
  }
}

// 清理临时文件
function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// 主函数
async function main() {
  try {
    console.log('正在提取视频帧...');
    await extractFrames();
    console.log('提取完成，开始分析...\n');
    await analyzeFrames();
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    console.log('\n清理临时文件...');
    cleanup();
    console.log('完成!');
  }
}

main();
