// Walk test. Usage: node tools/walk.mjs <outPrefix> <query> <x,z|-> <yaw> <seconds> [shots]
import { chromium } from 'playwright-core';
const [out, query, at, yaw, secs, shots = '3'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/?shot=1&' + query);
await page.waitForFunction(() => window.atlas?.walk, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await page.evaluate(([at, yaw]) => { const a = window.atlas; if (at !== '-') { const [x, z] = at.split(',').map(Number); a.camera.position.x = x; a.camera.position.z = z; } a.walk.yaw = yaw; a.keys.add('w'); a.keys.add('shift'); }, [at, +yaw]);
for (let i = 1; i <= +shots; i++) {
  await page.waitForTimeout((+secs * 1000) / +shots);
  console.log(i, await page.evaluate(() => { const a = window.atlas, p = a.camera.position; return `${a.walk.poi.id} x${p.x.toFixed(0)} y${p.y.toFixed(1)} z${p.z.toFixed(0)}`; }));
  await page.screenshot({ path: `${out}${i}.png` });
}
await browser.close();
