import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PIC_DIR = path.join(__dirname, 'Pic')
const PROJECTS_JSON = path.join(__dirname, 'public', 'data', 'projects.json')

// 安全文件名生成
function safeFilename(originalName) {
  const ext = path.extname(originalName) || '.png'
  const base = path.basename(originalName, ext)
    .replace(/[^a-z0-9\u4e00-\u9fa5_\-]/gi, '_')
    .slice(0, 80)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${base}-${stamp}${ext}`
}

// multipart 解析（Vite 内部使用 connect 中间件，需要简单的二进制解析）
function parseMultipartBuffer(bodyBuffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`)
  const endBuf = Buffer.from(`--${boundary}--`)

  // 找到所有 boundary 的位置
  const positions = []
  let idx = 0
  while ((idx = bodyBuffer.indexOf(boundaryBuf, idx)) !== -1) {
    positions.push(idx)
    idx += boundaryBuf.length
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i] + boundaryBuf.length
    const end = positions[i + 1] !== undefined ? positions[i + 1] : bodyBuffer.length
    const part = bodyBuffer.slice(start, end)

    // 解析头部与 body（以 \r\n\r\n 分隔）
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'))
    if (headerEnd === -1) continue
    const headerText = part.slice(0, headerEnd).toString('utf8')
    const fileStart = headerEnd + 4
    // 去掉末尾 \r\n
    let fileEnd = part.length
    if (part[fileEnd - 2] === 0x0d && part[fileEnd - 1] === 0x0a) fileEnd -= 2

    const nameMatch = headerText.match(/name="([^"]+)"/)
    const fileNameMatch = headerText.match(/filename="([^"]*)"/)
    const typeMatch = headerText.match(/Content-Type: ([^\r\n]+)/)
    if (!nameMatch) continue
    if (fileNameMatch && fileNameMatch[1]) {
      return {
        field: nameMatch[1],
        filename: fileNameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : 'image/png',
        data: part.slice(fileStart, fileEnd),
      }
    }
  }
  return null
}

// Vite 插件：
//  1) configureServer 阶段挂接 /api/upload 中间件（写入到 Pic/）
//  2) configureServer 阶段挂载 /Pic/** 访问路由（使本地开发能直接访问 Pic 目录下的图片）
//  3) closeBundle 阶段构建完成后，把 Pic 目录整体复制到 dist/Pic
function uploadAndPicPlugin() {
  return {
    name: 'pic-upload-and-serve',
    configureServer(server) {
      if (!fs.existsSync(PIC_DIR)) {
        fs.mkdirSync(PIC_DIR, { recursive: true })
      }

      // 1) 处理 POST /api/upload
      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: '仅支持 POST' }))
          return
        }

        const chunks = []
        let total = 0
        const MAX = 20 * 1024 * 1024

        req.on('data', (chunk) => {
          total += chunk.length
          if (total > MAX) {
            res.statusCode = 413
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: '文件过大（> 20MB）' }))
            req.destroy()
            return
          }
          chunks.push(chunk)
        })

        req.on('end', () => {
          try {
            const contentType = req.headers['content-type'] || ''
            const boundaryMatch = contentType.match(/boundary=([^;]+)/)
            if (!boundaryMatch) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, error: '缺少 multipart boundary' }))
              return
            }
            const body = Buffer.concat(chunks)
            const fileInfo = parseMultipartBuffer(body, boundaryMatch[1].trim())

            if (!fileInfo || !fileInfo.data || fileInfo.data.length === 0) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, error: '未找到上传的文件' }))
              return
            }

            const fileName = safeFilename(fileInfo.filename || 'upload.png')
            const filePath = path.join(PIC_DIR, fileName)
            fs.writeFileSync(filePath, fileInfo.data)

            const urlPath = `./Pic/${fileName}`
            console.log(`[pic-upload] 已保存: ${filePath}  (${(fileInfo.data.length / 1024).toFixed(1)} KB)`)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true, url: urlPath, filename: fileName }))
          } catch (err) {
            console.error('[pic-upload] 保存失败:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
          }
        })

        req.on('error', (err) => {
          console.error('[pic-upload] 请求错误:', err)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
        })
      })

      // 2-1) GET/POST /api/projects：读取/保存 projects.json
      server.middlewares.use('/api/projects', (req, res) => {
        try {
          if (req.method === 'GET') {
            if (!fs.existsSync(PROJECTS_JSON)) {
              res.statusCode = 404
              res.end(JSON.stringify({ ok: false, error: 'projects.json 不存在' }))
              return
            }
            const data = fs.readFileSync(PROJECTS_JSON, 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(data)
            return
          }
          if (req.method === 'POST') {
            const chunks = []
            req.on('data', (c) => chunks.push(c))
            req.on('end', () => {
              try {
                const body = Buffer.concat(chunks).toString('utf8')
                const parsed = JSON.parse(body)
                if (!parsed.projects || !Array.isArray(parsed.projects)) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ ok: false, error: '缺少 projects 数组' }))
                  return
                }
                const dir = path.dirname(PROJECTS_JSON)
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
                fs.writeFileSync(PROJECTS_JSON, JSON.stringify(parsed, null, 2), 'utf8')
                console.log(`[pic-upload] projects.json 已保存，共 ${parsed.projects.length} 个项目`)
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true, count: parsed.projects.length }))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
              }
            })
            return
          }
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: '仅支持 GET / POST' }))
        } catch (err) {
          console.error('[pic-upload] /api/projects 错误:', err)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
        }
      })

      // 2) 开发时让 /Pic/** 直接返回 Pic 目录文件（因为 Pic 不在 public/ 中）
      server.middlewares.use('/Pic/', (req, res, next) => {
        try {
          const urlPath = (req.url || '').split('?')[0]
          const fileName = path.basename(urlPath)
          if (!fileName) return next()
          const filePath = path.join(PIC_DIR, fileName)
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(fileName).toLowerCase()
            const mime = {
              '.svg': 'image/svg+xml',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
              '.bmp': 'image/bmp',
            }[ext] || 'application/octet-stream'
            res.statusCode = 200
            res.setHeader('Content-Type', mime)
            fs.createReadStream(filePath).pipe(res)
            return
          }
          return next()
        } catch (err) {
          return next()
        }
      })
    },

    // 3) 构建完成后把 Pic 目录复制到 dist/Pic
    closeBundle() {
      try {
        const distDir = path.join(__dirname, 'dist')
        if (!fs.existsSync(distDir)) return
        const distPic = path.join(distDir, 'Pic')
        if (!fs.existsSync(PIC_DIR)) return
        if (!fs.existsSync(distPic)) fs.mkdirSync(distPic, { recursive: true })
        let copied = 0
        for (const f of fs.readdirSync(PIC_DIR)) {
          const src = path.join(PIC_DIR, f)
          if (!fs.statSync(src).isFile()) continue
          fs.copyFileSync(src, path.join(distPic, f))
          copied++
        }
        console.log(`[pic-upload] 构建完成，已复制 ${copied} 张图片到 dist/Pic/`)
      } catch (err) {
        console.error('[pic-upload] 复制 Pic 到 dist 失败:', err)
      }
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react(), uploadAndPicPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
