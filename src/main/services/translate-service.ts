import https from 'https'
import crypto from 'crypto'

// ── Types ────────────────────────────────────────────
export interface BaiduConfig {
  appId: string
  secretKey: string
}

export interface TranslateResult {
  from: string
  to: string
  src: string
  dst: string
}

// ── Baidu Translate API ─────────────────────────────
const BAIDU_API = 'https://fanyi-api.baidu.com/api/trans/vip/translate'

function md5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex')
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}

export async function translateText(
  q: string,
  from: string,
  to: string,
  config: BaiduConfig
): Promise<TranslateResult[]> {
  const salt = Date.now().toString()
  const sign = md5(config.appId + q + salt + config.secretKey)

  const params = new URLSearchParams({
    q,
    from,
    to,
    appid: config.appId,
    salt,
    sign,
  })

  const url = `${BAIDU_API}?${params.toString()}`
  const raw = await httpsGet(url)
  const json = JSON.parse(raw)

  if (json.error_code) {
    throw new Error(`百度翻译错误 [${json.error_code}]: ${json.error_msg}`)
  }

  return json.trans_result as TranslateResult[]
}

// ── Language detection helper ────────────────────────
// Simple heuristic before hitting the API
export function guessLang(text: string): string {
  // If text contains CJK characters, assume Chinese → English
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) {
    return 'zh'
  }
  // If mostly ASCII, assume English → Chinese
  if (/^[\x00-\x7f\s]+$/.test(text)) {
    return 'en'
  }
  return 'auto'
}
