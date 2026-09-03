/**
 * Stills of the Arrange game only, for iterating on its look.
 *   node scripts/shoot-arrange.mjs
 * Needs a served build on :4173 (see record-attract-screens.mjs).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const OUT = 'recordings/arrange';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const beat = (ms) => page.waitForTimeout(ms);

await page.goto(BASE);
await page.getByRole('heading', { name: 'Krishna Lila Puzzle', exact: true }).click();
await page.waitForSelector('.gi-bar');
await beat(2600);
await page.screenshot({ path: `${OUT}/1-attract.png` });
// A few frames through one swap cycle, to check no slot is ever left empty.
for (const [n, wait] of [['a', 900], ['b', 900], ['c', 900], ['d', 900], ['e', 900]]) {
  await beat(wait);
  await page.screenshot({ path: `${OUT}/1b-swap-${n}.png` });
}

await page.getByRole('button', { name: /Start Playing/ }).first().click();
const modal = page.getByRole('dialog').filter({ has: page.getByLabel('Your name') });
await modal.getByLabel('Your name').fill('Radha');
await modal.getByLabel('Phone number').fill('9876543210');
await modal.getByRole('button', { name: /→/ }).click();

await page.waitForSelector('.muuri-grid');
await beat(2500);
await page.screenshot({ path: `${OUT}/2-playing.png` });

// Yudhishthira's attract screen: its own opening film, playing silently.
await page.goto(BASE);
await page.getByRole('heading', { name: "Yudhishtira's Quest", exact: true }).click();
await page.waitForSelector('.gi-bar');
await beat(4000);
await page.screenshot({ path: `${OUT}/4-yudhishtira-attract.png` });

await browser.close();
console.log('done');
