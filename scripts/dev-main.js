const { build, context } = require('esbuild')
const { spawn } = require('child_process')
const path = require('path')

const srcDir = path.join(__dirname, '..', 'src')
const outDir = path.join(__dirname, '..', 'dist', 'main')

async function buildMain(shouldWatch) {
  const opts = {
    entryPoints: [path.join(srcDir, 'main', 'index.ts')],
    outfile: path.join(outDir, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  }

  if (shouldWatch) {
    return context(opts)
  } else {
    await build(opts)
    return null
  }
}

async function buildPreload(shouldWatch) {
  const opts = {
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
    sourcemap: true,
  }

  if (shouldWatch) {
    return context(opts)
  } else {
    await build(opts)
    return null
  }
}

async function dev() {
  const watch = process.argv.includes('--watch')

  const mainCtx = await buildMain(watch)
  const preloadCtx = await buildPreload(watch)

  if (watch && mainCtx) {
    await mainCtx.watch()
  }
  if (watch && preloadCtx) {
    await preloadCtx.watch()
  }

  console.log('[esbuild] main + preload built')

  // Copy sql.js WASM file
  const fs = require('fs')
  const wasmSrc = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const wasmDst = path.join(outDir, 'sql-wasm.wasm')
  fs.copyFileSync(wasmSrc, wasmDst)
  console.log('[esbuild] sql-wasm.wasm copied')

  if (watch && mainCtx) {
    mainCtx.rebuild = mainCtx.rebuild?.bind(mainCtx)
  }

  const electron = spawn(
    require('electron'),
    [path.join(__dirname, '..')],
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
    }
  )

  electron.on('close', () => {
    mainCtx?.dispose?.()
    preloadCtx?.dispose?.()
    process.exit()
  })
}

dev().catch((err) => {
  console.error(err)
  process.exit(1)
})
