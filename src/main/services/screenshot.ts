import { NativeImage, nativeImage } from 'electron'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export interface ScreenshotResult {
  filePath: string
  dataUrl: string
}

/** Save a NativeImage as PNG temp file. Returns path + dataUrl. */
export function saveScreenshot(image: NativeImage): ScreenshotResult {
  const png = image.toPNG()
  const tmpDir = join(tmpdir(), 'quickx-screenshots')
  mkdirSync(tmpDir, { recursive: true })
  const filePath = join(tmpDir, `shot-${randomUUID()}.png`)
  writeFileSync(filePath, png)
  return { filePath, dataUrl: `data:image/png;base64,${png.toString('base64')}` }
}

/** Delete temp screenshot file. */
export function cleanupScreenshot(filePath: string): void {
  try { unlinkSync(filePath) } catch { /* ignore */ }
}
