// Several screenshots in one browser. Usage: node tools/shots.mjs <outDir> name=query[@waitMs] ...
import { chromium } from 'playwright-core';
const [dir, ...jobs] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
for (const j of jobs) {
  const [name, rest] = [j.slice(0, j.indexOf('=')), j.slice(j.indexOf('=') + 1)], [query, wait = '6500'] = rest.split('@');
  await page.goto('http://localhost:5173/?shot=1&' + query);
  await page.waitForFunction(() => window.atlas, null, { timeout: 90000 });
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: `${dir}/${name}.png` });
}
await browser.close();
