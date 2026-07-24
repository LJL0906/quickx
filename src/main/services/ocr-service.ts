import https from 'https'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import sharp from 'sharp'

const MAX_WIDTH = 1600
const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token'
const OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'

// ── Access token cache ───────────────────────────────
interface TokenCache {
  token: string
  expiresAt: number
  apiKey: string // key used to obtain this token
}
let tokenCache: TokenCache | null = null

function getCachePath(): string {
  return join(app.getPath('userData'), 'baidu-ocr-token.json')
}

function loadCachedToken(): TokenCache | null {
  try {
    if (existsSync(getCachePath())) {
      const raw = readFileSync(getCachePath(), 'utf-8')
      return JSON.parse(raw) as TokenCache
    }
  } catch {}
  return null
}

function saveCachedToken(t: TokenCache): void {
  try { writeFileSync(getCachePath(), JSON.stringify(t), 'utf-8') } catch {}
}

// ── Get access token ─────────────────────────────────
function httpsPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000,
    }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('超时')) })
    req.write(body)
    req.end()
  })
}

async function getAccessToken(apiKey: string, secretKey: string): Promise<string> {
  // Check memory cache
  if (tokenCache && tokenCache.apiKey === apiKey && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token
  }
  // Check disk cache
  const cached = loadCachedToken()
  if (cached && cached.apiKey === apiKey && cached.expiresAt > Date.now()) {
    tokenCache = cached
    return cached.token
  }

  // Request new token
  console.log('[QuickX] Requesting Baidu OCR access_token...')
  const body = `grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`
  const raw = await httpsPost(TOKEN_URL, body)
  const json = JSON.parse(raw)

  if (json.error) {
    throw new Error(`百度 OCR 鉴权失败: ${json.error_description || json.error}`)
  }

  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 3600) * 1000, // expire 1h early
    apiKey,
  }
  saveCachedToken(tokenCache)
  console.log('[QuickX] Baidu OCR token obtained')
  return tokenCache.token
}

// ── Preprocess image ─────────────────────────────────
async function preprocessImage(filePath: string): Promise<Buffer> {
  const img = sharp(filePath)
  const meta = await img.metadata()
  let pipeline = img
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize(MAX_WIDTH, undefined, { fit: 'inside' })
  }
  return pipeline.png().toBuffer()
}

// ── OCR ──────────────────────────────────────────────
export async function ocrImage(filePath: string): Promise<string> {
  if (!filePath || !existsSync(filePath)) throw new Error('截图文件不存在')

  // Lazy-load settings (avoid circular dependency)
  const { getSetting } = require('./settings-dao')

  const apiKey = getSetting('ocrApiKey') as string
  const secretKey = getSetting('ocrSecretKey') as string
  if (!apiKey || !secretKey) throw new Error('请先在设置中配置百度 OCR API Key 和 Secret Key')

  const t0 = Date.now()

  // Get token
  const token = await getAccessToken(apiKey, secretKey)

  // Preprocess
  const buf = await preprocessImage(filePath)
  console.log(`[QuickX] OCR preprocess: ${Date.now() - t0}ms`)

  // Call OCR API
  const t1 = Date.now()
  const imageBase64 = buf.toString('base64')
  const body = `access_token=${encodeURIComponent(token)}&image=${encodeURIComponent(imageBase64)}`
  const raw = await httpsPost(OCR_URL, body)
  const json = JSON.parse(raw)

  if (json.error_code) {
    throw new Error(`百度 OCR 错误 [${json.error_code}]: ${json.error_msg}`)
  }

  const text = (json.words_result as Array<{ words: string }>)
    ?.map((w) => w.words)
    .join('\n')
    || ''

  console.log(`[QuickX] OCR API call: ${Date.now() - t1}ms`)
  console.log(`[QuickX] OCR total: ${Date.now() - t0}ms`)
  return text || '未识别到文字'
}

// ── No warm-up needed ────────────────────────────────
export async function warmUpWorker(): Promise<void> {}
export async function disposeWorker(): Promise<void> {}
