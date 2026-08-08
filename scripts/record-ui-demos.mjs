/**
 * Record 4 distinct, sales-ready Planetarium demos (real UI, Playwright).
 * Each sequence is intentionally different so the README does not look duplicated.
 */
import { chromium } from '../frontend/node_modules/playwright/index.mjs'
import { mkdirSync, copyFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const BASE = 'http://127.0.0.1:5173'
const TMP = '/tmp/ontos-ui-rec'
const OUT = '/workspace/Ontos-Planetarium/media'
mkdirSync(TMP, { recursive: true })
mkdirSync(join(OUT, 'gifs'), { recursive: true })
mkdirSync(join(OUT, 'videos'), { recursive: true })
mkdirSync('/opt/cursor/artifacts/screenshots', { recursive: true })

async function record(name, fn) {
  for (const f of readdirSync(TMP)) if (f.endsWith('.webm')) rmSync(join(TMP, f), { force: true })
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--window-size=1600,900'],
  })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
  })
  const page = await context.newPage()
  await fn(page)
  // Still frame for QA
  await page.screenshot({ path: `/opt/cursor/artifacts/screenshots/demo-${name}.png` })
  const vid = page.video()
  await context.close()
  await browser.close()
  const src = await vid.path()
  const webm = join(TMP, `${name}.webm`)
  copyFileSync(src, webm)
  const mp4 = join(OUT, 'videos', `${name}.mp4`)
  execSync(
    `ffmpeg -y -i ${JSON.stringify(webm)} -an -c:v libx264 -pix_fmt yuv420p -r 30 ${JSON.stringify(mp4)}`,
    { stdio: 'inherit' },
  )
  const gif = join(OUT, 'gifs', `${name}.gif`)
  execSync(
    `ffmpeg -y -i ${JSON.stringify(mp4)} -t 10 -vf "fps=14,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=140:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 ${JSON.stringify(gif)}`,
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
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(2200)
}

async function typeAsk(page, text) {
  const input = page.locator('.ask-bar input')
  await input.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await input.fill('')
  for (const ch of text) {
    await input.type(ch, { delay: 45 })
  }
  await page.waitForTimeout(200)
  await page.locator('.ask-bar button[type="submit"]').click()
  await page.waitForTimeout(1800)
}

async function dragConstellation(page, steps = 24) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) return
  const cx = box.x + box.width * 0.52
  const cy = box.y + box.height * 0.48
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 0; i < steps; i++) {
    await page.mouse.move(cx + Math.sin(i / 3) * 80, cy + Math.cos(i / 4) * 40)
    await page.waitForTimeout(40)
  }
  await page.mouse.up()
}

async function clickCanvas(page, fx = 0.55, fy = 0.48) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) return
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
  await page.waitForTimeout(900)
}

// ─── 1. Login / identity ───────────────────────────────────────────
await record('01-login-cosmic', async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  // Highlight providers by hovering pills
  const pills = page.locator('.provider-pill')
  const n = await pills.count()
  for (let i = 0; i < n; i++) {
    await pills.nth(i).hover()
    await page.waitForTimeout(350)
  }
  await page.fill('#user', 'admin')
  await page.waitForTimeout(400)
  await page.fill('#pass', 'ChangeMeNow!')
  await page.waitForTimeout(700)
  await page.click('button.btn-primary')
  await page.waitForSelector('text=Living Network Planetarium', { timeout: 20000 })
  await page.waitForSelector('canvas')
  await page.waitForTimeout(3200)
})

// ─── 2. Full constellation + inspector ─────────────────────────────
await record('02-galaxy-orbit', async (page) => {
  await login(page)
  // Ensure full constellation
  await page.getByRole('button', { name: 'Clear Filters' }).click()
  await page.waitForTimeout(1500)
  await dragConstellation(page, 28)
  await page.waitForTimeout(600)
  // Zoom in
  await page.locator('.zoom-controls button[title="Zoom in"]').click()
  await page.waitForTimeout(400)
  await page.locator('.zoom-controls button[title="Zoom in"]').click()
  await page.waitForTimeout(700)
  // Click around hub / neighbors so inspector stays visible
  await clickCanvas(page, 0.5, 0.45)
  await page.waitForTimeout(1200)
  await clickCanvas(page, 0.62, 0.4)
  await page.waitForTimeout(1500)
})

// ─── 3. English ask → remoting surfaces (sparse graph) ─────────────
await record('03-ask-listeners', async (page) => {
  await login(page)
  await typeAsk(page, 'who is listening')
  await page.waitForTimeout(1200)
  // Then drill into SSH — tiny graph
  await page.getByRole('button', { name: 'SSH', exact: false }).first().click()
  await page.waitForTimeout(2200)
  // Then RDP remoting
  await page.getByRole('button', { name: 'RDP', exact: false }).first().click()
  await page.waitForTimeout(2500)
  await dragConstellation(page, 12)
  await page.waitForTimeout(800)
})

// ─── 4. TLS certs → Blast radius theater ───────────────────────────
await record('04-cert-radar', async (page) => {
  await login(page)
  await page.getByRole('button', { name: /TLS/i }).first().click()
  await page.waitForTimeout(2500)
  await dragConstellation(page, 10)
  await page.waitForTimeout(800)
  // Switch to blast radius — star around gateway
  await page.getByRole('button', { name: 'BLAST RADIUS', exact: true }).click()
  await page.waitForTimeout(2000)
  const blast = page.locator('.action-row').getByRole('button', { name: 'Blast Radius', exact: true })
  if (await blast.count()) {
    await blast.click()
    await page.waitForTimeout(2200)
  }
  await page.locator('.zoom-controls button[title="Recenter"]').click()
  await page.waitForTimeout(1200)
})

// Remove old 5th gif from README usage; keep file but overwrite with hosts lens as optional archive
await record('05-blast-radius', async (page) => {
  await login(page)
  await typeAsk(page, 'hosts')
  await page.waitForTimeout(1500)
  // Toggle layers for visual change
  const eyes = page.locator('.layer-row .eye')
  if ((await eyes.count()) >= 3) {
    await eyes.nth(1).click() // hide services
    await page.waitForTimeout(900)
    await eyes.nth(2).click() // hide listeners
    await page.waitForTimeout(1200)
    await eyes.nth(1).click()
    await page.waitForTimeout(800)
  }
  await page.getByRole('button', { name: 'Clear Filters' }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'BLAST RADIUS', exact: true }).click()
  await page.waitForTimeout(2200)
})

writeFileSync(
  join(OUT, 'gifs', 'README-DEMOS.txt'),
  `01-login-cosmic — identity providers + enter planetarium
02-galaxy-orbit — full constellation pan/zoom + inspector
03-ask-listeners — English ask + SSH/RDP remoting lenses (sparse)
04-cert-radar — TLS/certs lens then blast radius star
`,
)

console.log('done')
