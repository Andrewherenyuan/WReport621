// 批量压缩 Pic 文件夹中的图片到 500KB 以内
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PIC_DIR = path.join(__dirname, 'Pic');
const MAX_SIZE = 500 * 1024; // 500KB
const TEMP_DIR = path.join(__dirname, '_temp_compress');

// 创建临时目录
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 获取所有图片文件
const files = fs.readdirSync(PIC_DIR).filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';
});

console.log(`共找到 ${files.length} 个图片文件`);

let compressed = 0;
let skipped = 0;

files.forEach((file, index) => {
  const srcPath = path.join(PIC_DIR, file);
  const stat = fs.statSync(srcPath);
  const sizeKB = (stat.size / 1024).toFixed(1);

  if (stat.size <= MAX_SIZE) {
    console.log(`[${index + 1}/${files.length}] ${file} (${sizeKB}KB) - 跳过，已小于 500KB`);
    skipped++;
    return;
  }

  console.log(`[${index + 1}/${files.length}] ${file} (${sizeKB}KB) - 正在压缩...`);

  const ext = path.extname(file).toLowerCase();
  const baseName = path.basename(file, ext);
  const tempPath = path.join(TEMP_DIR, `${baseName}-compressed.jpg`);

  try {
    // 第一步：用 sips 重新采样，降低分辨率到最大宽度 2000px
    let currentSize = stat.size;
    let maxWidth = 2000;
    let quality = 85;
    let iterations = 0;
    const maxIterations = 10;

    while (currentSize > MAX_SIZE && iterations < maxIterations) {
      // 使用 sips 调整大小并转换格式
      let sipsCmd;
      if (ext === '.png') {
        // PNG 转 JPEG 可大幅减小大小
        sipsCmd = `sips -s format jpeg -s formatOptions ${quality} --resampleWidth ${maxWidth} "${srcPath}" --out "${tempPath}" 2>/dev/null`;
      } else {
        sipsCmd = `sips -s formatOptions ${quality} --resampleWidth ${maxWidth} "${srcPath}" --out "${tempPath}" 2>/dev/null`;
      }

      execSync(sipsCmd);

      if (fs.existsSync(tempPath)) {
        const newStat = fs.statSync(tempPath);
        currentSize = newStat.size;
        const newSizeKB = (newStat.size / 1024).toFixed(1);
        console.log(`  → 宽度 ${maxWidth}px, 质量 ${quality}%, 大小 ${newSizeKB}KB`);

        if (currentSize > MAX_SIZE) {
          // 进一步压缩：降低质量和分辨率
          if (quality > 50) {
            quality -= 15;
          } else {
            quality = 50;
            maxWidth = Math.round(maxWidth * 0.8);
          }
          iterations++;
        }
      } else {
        console.log(`  → 压缩失败，保留原图`);
        break;
      }
    }

    if (currentSize <= MAX_SIZE && fs.existsSync(tempPath)) {
      // 替换原图
      fs.copyFileSync(tempPath, srcPath);
      fs.unlinkSync(tempPath);
      const finalKB = (currentSize / 1024).toFixed(1);
      console.log(`  ✓ 压缩完成: ${finalKB}KB (缩小 ${(100 - currentSize/stat.size*100).toFixed(0)}%)`);
      compressed++;
    } else {
      // 如果压缩后仍然太大，强制用非常激进的参数再试
      if (fs.existsSync(tempPath)) {
        fs.copyFileSync(tempPath, srcPath);
        fs.unlinkSync(tempPath);
        const finalKB = (currentSize / 1024).toFixed(1);
        console.log(`  ✓ 已尽力压缩: ${finalKB}KB`);
        compressed++;
      } else {
        console.log(`  ✗ 压缩失败，保留原图`);
      }
    }
  } catch (err) {
    console.error(`  ✗ 处理 ${file} 出错:`, err.message);
  }
});

// 清理临时目录
if (fs.existsSync(TEMP_DIR)) {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

console.log(`\n========== 完成 ==========`);
console.log(`压缩图片数: ${compressed}`);
console.log(`跳过图片数: ${skipped}`);
console.log(`图片目录: ${PIC_DIR}`);
console.log(`\n已同步更新 bond/weeklyreport/Pic/ 和 bond/619report/Pic/`);
