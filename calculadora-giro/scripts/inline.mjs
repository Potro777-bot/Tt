// Genera dist/calculadora-giro.html: un solo archivo con CSS y JS incrustados,
// para publicarlo o abrirlo sin servidor.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.argv[2] || 'dist')
let html = readFileSync(resolve(dist, 'index.html'), 'utf8')

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, href) => {
  return `<style>${readFileSync(resolve(dist, href), 'utf8')}</style>`
})
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(resolve(dist, src), 'utf8').replace(/<\/script/g, '<\\/script')
  return `<script type="module">${js}</script>`
})

if (/assets\//.test(html)) throw new Error('Quedaron referencias a assets/ sin incrustar')
writeFileSync(resolve(dist, 'calculadora-giro.html'), html)
console.log('dist/calculadora-giro.html', (html.length / 1024).toFixed(0), 'KB')
