// Screenshot helper. Usage: node tools/shot.mjs <out.png> [query] [waitMs]
import { chromium } from 'playwright-core';
const [out, query = '', wait = '7000'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/?shot=1&' + query);
await page.waitForFunction(() => window.atlas, null, { timeout: 60000 });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
await browser.close();
