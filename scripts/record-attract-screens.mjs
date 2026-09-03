/**
 * Records a walkthrough of the shared attract screen (GameIntro) across games.
 *
 *   node scripts/record-attract-screens.mjs
 *
 * Serve a production build first (the script only drives the browser):
 *   npm run build && python3 -m http.server 4173 --directory build
 *
 * Output: recordings/walkthrough/*.webm + recordings/walkthrough/shots/*.png
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const OUT = 'recordings/walkthrough'; // own subdir: the script clears it on each run
const SIZE = { width: 1920, height: 1080 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/shots`, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SIZE,
  deviceScaleFactor: 2, // crisp text and canvas in the stills
  recordVideo: { dir: OUT, size: SIZE },
  reducedMotion: 'no-preference',
});
const page = await context.newPage();

let shotNo = 0;
const shot = async (name) => {
  shotNo += 1;
  await page.screenshot({ path: `${OUT}/shots/${String(shotNo).padStart(2, '0')}-${name}.png` });
};
const beat = (ms) => page.waitForTimeout(ms);

const enterDetails = async (name, phone) => {
  const modal = page.getByRole('dialog').filter({ has: page.getByLabel('Your name') });
  await modal.getByLabel('Your name').fill(name);
  await beat(400);
  await modal.getByLabel('Phone number').fill(phone);
  await beat(600);
  await shot('details-popup');
  await modal.getByRole('button', { name: /→/ }).click();
};

/* Navigated from the home page rather than by URL: BrowserRouter deep links
   404 on a plain static server. */
const openGame = async (cardTitle) => {
  await page.goto(BASE);
  await page.getByRole('heading', { name: cardTitle, exact: true }).click();
  await page.waitForSelector('.gi-bar', { state: 'visible' });
};

// ---------------------------------------------------------------- home
await page.goto(BASE);
await beat(1200);
await shot('home');

// ------------------------------------------- Krishna's Wheel (live wheel)
await openGame("Krishna's Divine Wheel");
await beat(3500); // let the wheel turn by itself — this is the screensaver
await shot('wheel-attract');
// Prodding the wheel itself is enough to be asked for details. Clicked by
// coordinate: the attract layer sits over the canvas and is what takes the tap.
const wheel = await page.locator('.wheel-canvas').boundingBox();
await page.mouse.click(wheel.x + wheel.width / 2, wheel.y + wheel.height / 2);
await beat(800);
await enterDetails('Radha', '9876543210');
await beat(700);
await shot('wheel-playing');
await page.getByRole('button', { name: /Spin the Wheel/ }).click();
await beat(11000); // the spin runs 10s
await shot('wheel-verse');

// ------------------------------------------- Dahi Handi (3D showreel behind)
await openGame('Dahi Handi 3D');
await beat(4000);
await shot('dahi-handi-attract');

// ------------------------------------------- Math Monsoon (our own showreel)
await openGame('Math Monsoon');
await beat(4200); // long enough for the hint to cycle
await shot('math-monsoon-attract');
await page.getByRole('button', { name: /Start Game/ }).first().click();
await beat(900);
await shot('math-monsoon-popup');
await enterDetails('Gopal', '9000000001');
await beat(3000);
await shot('math-monsoon-playing');

// ------------------------------------------- Arrange (face-down tiles)
await openGame('Krishna Lila Puzzle');
await beat(4200); // backs only — no pastime and no hint of the order
await shot('arrange-attract');
await page.getByRole('button', { name: /Start Playing/ }).first().click();
await beat(700);
await enterDetails('Meera', '9000000002');
await page.waitForSelector('.muuri-grid');
await beat(2600);
await shot('arrange-playing');

// ------------------------------------------- Yudhishthira (its own film)
await openGame("Yudhishtira's Quest");
await beat(6000);
await shot('yudhishtira-attract');

// ------------------------------------------- Match the Wisdom
await openGame('Match the Wisdom');
await beat(4200);
await shot('match-wisdom-attract');

// ------------------------------------------- Memory Matrix
await openGame('Memory Matrix');
await beat(3200);
await shot('memory-matrix-attract');

await context.close(); // flushes the video
await browser.close();
console.log(`done — ${OUT}/`);
