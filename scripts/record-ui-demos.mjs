import { chromium } from '../frontend/node_modules/playwright/index.mjs'
import { mkdirSync, copyFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const BASE = 'http://127.0.0.1:5173'
const TMP = '/tmp/ontos-ui-rec'
const OUT = '/workspace/Ontos-Planetarium/media'
mkdirSync(TMP, { recursive: true })
mkdirSync(join(OUT, 'gifs'), { recursive: true })
mkdirSync(join(OUT, 'videos'), { recursive: true })

async function record(name, fn) {
  for (const f of readdirSync(TMP)) if (f.endsWith('.webm')) rmSync(join(TMP, f), { force: true })
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--window-size=1600,900', '--use-gl=angle', '--enable-webgl'],
  })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
  })
  const page = await context.newPage()
  await fn(page)
  const vid = page.video()
  await context.close()
  await browser.close()
  const src = await vid.path()
  const webm = join(TMP, `${name}.webm`)
  copyFileSync(src, webm)
  const mp4 = join(OUT, 'videos', `${name}.mp4`)
  execSync(`ffmpeg -y -i ${JSON.stringify(webm)} -an -c:v libx264 -pix_fmt yuv420p -r 30 ${JSON.stringify(mp4)}`, {
    stdio: 'inherit',
  })
  const gif = join(OUT, 'gifs', `${name}.gif`)
  execSync(
    `ffmpeg -y -i ${JSON.stringify(mp4)} -t 10 -vf "fps=16,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 ${JSON.stringify(gif)}`,
    { stdio: 'inherit' },
  )
  console.log('saved', gif)
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.fill('#user', 'admin')
  await page.fill('#pass', 'ChangeMeNow!')
  await page.click('button.btn-primary')
  await page.waitForSelector('text=Living Network Planetarium', { timeout: 20000 })
  await page.waitForTimeout(2500)
}

await record('01-login-cosmic', async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.fill('#user', 'admin')
  await page.waitForTimeout(400)
  await page.fill('#pass', 'ChangeMeNow!')
  await page.waitForTimeout(600)
  await page.click('button.btn-primary')
  await page.waitForSelector('text=Living Network Planetarium', { timeout: 20000 })
  await page.waitForTimeout(3500)
})

await record('02-galaxy-orbit', async (page) => {
  await login(page)
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (box) {
    const cx = box.x + box.width * 0.55
    const cy = box.y + box.height * 0.5
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(cx + i * 9, cy + Math.sin(i / 4) * 25)
      await page.waitForTimeout(35)
    }
    await page.mouse.up()
  }
  await page.waitForTimeout(2000)
})

await record('03-ask-listeners', async (page) => {
  await login(page)
  await page.getByRole('button', { name: /SSH/i }).first().click()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /RDP/i }).first().click()
  await page.waitForTimeout(2500)
})

await record('04-cert-radar', async (page) => {
  await login(page)
  await page.getByRole('button', { name: /TLS/i }).first().click()
  await page.waitForTimeout(3500)
})

await record('05-blast-radius', async (page) => {
  await login(page)
  await page.getByRole('button', { name: 'BLAST RADIUS', exact: true }).click()
  await page.waitForTimeout(2000)
  await page.locator('.action-row').getByRole('button', { name: 'Blast Radius', exact: true }).click()
  await page.waitForTimeout(3000)
})

console.log('done')
