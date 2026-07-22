const { build } = require('esbuild')
const path = require('path')

const srcDir = path.join(__dirname, '..', 'src')
const outDir = path.join(__dirname, '..', 'dist', 'main')

async function main() {
  // Build main process entry
  await build({
    entryPoints: [path.join(srcDir, 'main', 'index.ts')],
    outfile: path.join(outDir, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    minify: false,
    sourcemap: true,
  })

  // Build preload scripts (flat into dist/main/)
  await build({
    entryPoints: [
      path.join(srcDir, 'preload', 'search-bar.ts'),
      path.join(srcDir, 'preload', 'main-window.ts'),
    ],
    outdir: outDir,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    minify: false,
    sourcemap: true,
  })

  console.log('[esbuild] main + preload built')

  // Copy sql.js WASM file
  const fs = require('fs')
  const wasmSrc = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const wasmDst = path.join(outDir, 'sql-wasm.wasm')
  fs.copyFileSync(wasmSrc, wasmDst)
  console.log('[esbuild] sql-wasm.wasm copied')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
