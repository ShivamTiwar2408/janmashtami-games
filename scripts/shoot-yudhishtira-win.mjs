/**
 * Plays Yudhishthira's Quest perfectly (answers come from questions.json) to
 * reach the win path, then shoots the closing film with the leaderboard over it.
 *   node scripts/shoot-yudhishtira-win.mjs
 * Needs a served build on :4173.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const OUT = 'recordings/yudhishtira';
mkdirSync(OUT, { recursive: true });

const questions = JSON.parse(
  readFileSync('src/games/yudhishtira-quest/questions.json', 'utf8')
);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
const beat = (ms) => page.waitForTimeout(ms);

await page.goto(BASE);
await page.getByRole('heading', { name: "Yudhishtira's Quest", exact: true }).click();
await page.waitForSelector('.gi-bar');
await beat(2500);
await page.screenshot({ path: `${OUT}/1-attract.png` });

await page.getByRole('button', { name: /Begin the Quest/ }).first().click();
const modal = page.getByRole('dialog').filter({ has: page.getByLabel('Your name') });
await modal.getByLabel('Your name').fill('Arjun');
await modal.getByLabel('Phone number').fill('9000000003');
await modal.getByRole('button', { name: /→/ }).click();

// Straight past the opening film.
await page.getByRole('button', { name: /Skip to Game/ }).click();
await page.waitForSelector('.question-box');

for (let i = 0; i < 6; i += 1) {
  const asked = (await page.locator('.question-box').textContent()).trim();
  const entry = questions.find((q) => q.question.trim() === asked);
  if (!entry) throw new Error(`question not found in questions.json: ${asked}`);
  const answer = entry.options[entry.correctAnswerIndex];

  await page.locator('.option-button', { hasText: answer }).first().click();
  await page.waitForSelector('.message-box');
  if (i === 0) await page.screenshot({ path: `${OUT}/2-answered.png` });
  // The game holds the explanation for 5s before moving on.
  await beat(5600);
}

// The board should already be up, with the closing film running behind it.
await page.waitForSelector('.gr-root-overlay', { timeout: 15000 });
await page.waitForSelector('.yud-result-film video');
await beat(2000);
await page.screenshot({ path: `${OUT}/3-film-with-board.png` });
// Once the film ends the panel takes its own festive backdrop back.
await page.waitForSelector('.gr-root:not(.gr-root-overlay)', { timeout: 30000 });
await beat(600);
await page.screenshot({ path: `${OUT}/4-after-film.png` });

const film = await page.evaluate(() => {
  const v = document.querySelector('.yud-result-film video');
  return v && { duration: v.duration, currentTime: v.currentTime, paused: v.paused, muted: v.muted };
});
console.log('film:', film);

await context.close();
await browser.close();
console.log('done');
