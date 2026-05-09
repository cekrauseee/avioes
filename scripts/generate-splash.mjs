import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')
const outDir = join(publicDir, 'splash')

mkdirSync(outDir, { recursive: true })

const BG_LIGHT = '#f6f1e7'
const BG_DARK = '#15191b'

const devices = [
  { w: 750, h: 1334, tag: '750x1334' },
  { w: 1170, h: 2532, tag: '1170x2532' },
  { w: 1179, h: 2556, tag: '1179x2556' },
  { w: 1284, h: 2778, tag: '1284x2778' },
  { w: 1290, h: 2796, tag: '1290x2796' },
  { w: 1640, h: 2360, tag: '1640x2360' },
  { w: 1668, h: 2388, tag: '1668x2388' },
  { w: 2048, h: 2732, tag: '2048x2732' }
]

async function generate(theme) {
  const bg = theme === 'light' ? BG_LIGHT : BG_DARK
  const src = join(publicDir, `splash-${theme}.png`)
  const srcMeta = await sharp(src).metadata()
  const srcW = srcMeta.width
  const srcH = srcMeta.height

  for (const { w, h, tag } of devices) {
    const scale = Math.min((w * 0.55) / srcW, (h * 0.55) / srcH)
    const resizedW = Math.round(srcW * scale)
    const resizedH = Math.round(srcH * scale)

    const resized = await sharp(src).resize(resizedW, resizedH, { fit: 'inside' }).toBuffer()

    const left = Math.round((w - resizedW) / 2)
    const top = Math.round((h - resizedH) / 2)

    await sharp({
      create: { width: w, height: h, channels: 4, background: bg }
    })
      .composite([{ input: resized, left, top }])
      .png()
      .toFile(join(outDir, `splash-${theme}-${tag}.png`))

    console.log(`${theme} ${tag}`)
  }
}

await generate('light')
await generate('dark')
console.log('done')
