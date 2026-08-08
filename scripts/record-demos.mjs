/**
 * Fast full-viewport demo recorder for Ontos Planetarium.
 * Produces 5 ~10s WebM/MP4 clips at 1600x900 (full app UI, no tiny window).
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync, readdirSync, copyFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const BASE = process.env.ONTOS_URL || 'http://127.0.0.1:5173'
const OUT = '/workspace/Ontos-Planetarium/media/videos'
const TMP = '/tmp/ontos-pw-record'
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

async function freshContext() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--disable-dev-shm-usage',
      '--window-size=1600,900',
      '--window-position=0,0',
      '--use-gl=angle',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
  })
  const page = await context.newPage()
  return { browser, context, page }
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  // clear any prior session
  await page.evaluate(() => {
    localStorage.removeItem('ontos_access_token')
    localStorage.removeItem('ontos_refresh_token')
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Enter Planetarium')
  await page.fill('#user', 'admin')
  await page.fill('#pass', 'ChangeMeNow!')
  await page.click('button.btn-primary')
  await page.waitForSelector('text=ONTOS PLANETARIUM', { timeout: 15000 })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(1200) // allow zoomToFit
}

async function hold(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function saveVideo(page, context, browser, name) {
  const vid = page.video()
  await context.close()
  await browser.close()
  const src = await vid.path()
  const destWebm = join(TMP, `${name}.webm`)
  copyFileSync(src, destWebm)
  // Convert to mp4
  const destMp4 = join(OUT, `${name}.mp4`)
  execSync(
    `ffmpeg -y -i ${JSON.stringify(destWebm)} -an -c:v libx264 -pix_fmt yuv420p -r 30 ${JSON.stringify(destMp4)}`,
    { stdio: 'inherit' },
  )
  console.log('saved', destMp4)
}

async function record(name, script) {
  // clean tmp videos between runs
  for (const f of readdirSync(TMP)) {
    if (f.endsWith('.webm')) {
      try {
        execSync(`rm -f ${JSON.stringify(join(TMP, f))}`)
      } catch {}
    }
  }
  const { browser, context, page } = await freshContext()
  try {
    await script(page)
  } finally {
    await saveVideo(page, context, browser, name)
  }
}

async function dragOrbit(page) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) return
  const cx = box.x + box.width * 0.55
  const cy = box.y + box.height * 0.5
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 0; i < 28; i++) {
    await page.mouse.move(cx + i * 10, cy + Math.sin(i / 4) * 30)
    await hold(40)
  }
  await page.mouse.up()
}

async function main() {
  // 1 login
  await record('01-login-cosmic', async (page) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Enter Planetarium')
    await hold(1500)
    await page.fill('#user', 'admin')
    await hold(400)
    await page.fill('#pass', 'ChangeMeNow!')
    await hold(600)
    await page.click('button.btn-primary')
    await page.waitForSelector('canvas', { timeout: 15000 })
    await hold(2500)
  })

  // 2 galaxy orbit
  await record('02-galaxy-orbit', async (page) => {
    await login(page)
    await dragOrbit(page)
    await hold(400)
    // click near center of canvas for a node
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.48)
    }
    await hold(2500)
  })

  // 3 ask listeners
  await record('03-ask-listeners', async (page) => {
    await login(page)
    await page.getByRole('button', { name: 'who is listening', exact: true }).first().click()
    await hold(2500)
    await page.getByRole('button', { name: 'remote access', exact: true }).click()
    await hold(3000)
  })

  // 4 certs
  await record('04-cert-radar', async (page) => {
    await login(page)
    await page.getByRole('button', { name: 'expiring certs', exact: true }).click()
    await hold(2000)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      // try a few click points for a cert node
      for (const [fx, fy] of [
        [0.55, 0.45],
        [0.62, 0.4],
        [0.48, 0.55],
        [0.58, 0.58],
      ]) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
        await hold(400)
        const has = await page.locator('.inspector-row .v').count()
        if (has > 2) break
      }
    }
    await hold(3000)
  })

  // 5 blast
  await record('05-blast-radius', async (page) => {
    await login(page)
    await page.getByRole('button', { name: 'who is listening', exact: true }).first().click()
    await hold(1200)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      for (const [fx, fy] of [
        [0.5, 0.48],
        [0.45, 0.5],
        [0.55, 0.45],
        [0.52, 0.55],
      ]) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
        await hold(350)
        const blast = page.getByRole('button', { name: 'Blast radius' })
        if (await blast.count()) {
          await blast.click()
          break
        }
      }
    }
    await hold(3500)
  })

  console.log('All recordings complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
