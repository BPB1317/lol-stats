// Captures des drafts de DA en 1440 px et 390 px → design/drafts/ (gitignoré).
// Usage : npm run dev (dans un autre terminal), puis  node scripts/draft-shots.mjs [a,b,c,d] [url]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const drafts = (process.argv[2] ?? 'a,b,c,d').split(',')
const base = process.argv[3] ?? 'http://localhost:5173/lol-stats/'
const screens = ['bilan', 'modeles', 'pari', 'tokens']
const widths = [{ w: 1440, h: 900 }, { w: 390, h: 844 }]
mkdirSync('design/drafts', { recursive: true })

const browser = await chromium.launch()
for (const d of drafts) {
  for (const s of screens) {
    for (const { w, h } of widths) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 })
      await page.goto(`${base}#/drafts?d=${d}&s=${s}&clean=1`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(400)
      // Fenêtre aussi haute que la page : les éléments fixes (barre d'onglets, bouton +) restent en bas
      const full = await page.evaluate(() => document.documentElement.scrollHeight)
      await page.setViewportSize({ width: w, height: Math.max(h, full) })
      await page.waitForTimeout(300)
      const file = `design/drafts/${d}-${s}-${w}.png`
      await page.screenshot({ path: file })
      console.log(file)
      await page.close()
    }
  }
}
await browser.close()
