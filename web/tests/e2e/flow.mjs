/* The end-to-end assertion this whole project rests on: a real scrambled cube goes in,
   the server's solution comes back, every move is stepped through in the 3D player, and
   the state on screen ends solved. Anything wrong in the permutations, the animation
   bookkeeping or the counter shows up here as a mismatch. */

import { BASE, OUT, outDir, launch } from "./browser.mjs";

outDir();
import { readFileSync } from "node:fs";


const fixtures = JSON.parse(readFileSync(new URL("../../src/cube/fixtures.json", import.meta.url)));
const scramble = fixtures.find((f) => f.kind === "scramble");

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });

/* ── review screen, reached by deep link ─────────────────────────────────── */
await page.goto(`${BASE}/solve?cube=${scramble.facelets}`, { waitUntil: "networkidle" });
await page.waitForSelector(".review", { timeout: 10000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/flow-1-review.png` });

const verdict = await page.textContent(".review__verdict .notice");
if (!/can exist/.test(verdict ?? "")) problems.push(`review rejected a valid cube: ${verdict}`);

/* Correcting a sticker has to move the tally and the verdict, not just the pixel. */
const firstSticker = page.locator(".sticker:not(.sticker--centre)").first();
const wasColour = await firstSticker.getAttribute("style");
await firstSticker.click();
// Pick a swatch the sticker is definitely not already showing.
for (let i = 0; i < 6; i += 1) {
  await page.locator(".palette__swatch").nth(i).click();
  if ((await firstSticker.getAttribute("style")) !== wasColour) break;
}
const afterEdit = await page.textContent(".review__verdict .notice");
if (/can exist/.test(afterEdit ?? "")) problems.push("editing a sticker to an invalid cube was still accepted");
await page.screenshot({ path: `${OUT}/flow-2-review-edited.png` });

/* ── solve screen ────────────────────────────────────────────────────────── */
await page.goto(`${BASE}/solve?cube=${scramble.facelets}`, { waitUntil: "networkidle" });
await page.waitForSelector(".review");
await page.getByRole("button", { name: "Solve this cube" }).click();
await page.waitForSelector(".solve", { timeout: 20000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/flow-3-solve.png` });

const total = Number((await page.textContent(".solve__corner--tr"))?.split("/")[1]?.trim());
if (total !== scramble.solution.length) {
  problems.push(`move count ${total} != solver's ${scramble.solution.length}`);
}

/* Step the whole solution with the keyboard, exactly as a user would. */
await page.locator("body").click({ position: { x: 300, y: 500 } });
for (let i = 0; i < total; i += 1) {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(560);
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/flow-4-solved.png` });

const ended = await page.textContent(".solve__says");
if (!/Solved/i.test(ended ?? "")) problems.push(`after ${total} moves the player says: ${ended}`);

/* The model's own state, read back out of the React tree's source of truth. */
const finalState = await page.evaluate(() => window.__cubeState ?? null);
if (finalState && !/^U{9}R{9}F{9}D{9}L{9}B{9}$/.test(finalState)) {
  problems.push(`final facelets are not solved: ${finalState}`);
}

/* Going back must undo, not just decrement. The counter commits when the turn lands,
   so wait for the value rather than for a duration. */
await page.keyboard.press("ArrowLeft");
const back = String(total - 1).padStart(2, "0");
await page
  .waitForFunction(
    (want) => document.querySelector(".solve__corner--tr")?.textContent?.trim().startsWith(want),
    back,
    { timeout: 8000, polling: 120 },
  )
  .catch(async () => {
    problems.push(`stepping back left the counter at ${await page.textContent(".solve__corner--tr")}`);
  });

/* Keyboard help and the first/last jumps. */
await page.keyboard.press("?");
await page.waitForTimeout(400);
if (!(await page.locator(".shortcuts").isVisible())) problems.push("? did not open the shortcut list");
await page.screenshot({ path: `${OUT}/flow-5-shortcuts.png` });
await page.keyboard.press("Escape");
await page.keyboard.press("ArrowUp");
await page
  .waitForFunction(
    () => document.querySelector(".solve__corner--tr")?.textContent?.trim().startsWith("00"),
    null,
    { timeout: 8000, polling: 120 },
  )
  .catch(async () => {
    problems.push(`ArrowUp did not jump to the first move: ${await page.textContent(".solve__corner--tr")}`);
  });

await browser.close();
console.log(problems.length ? "FAILURES:\n" + problems.join("\n") : `flow passed — ${total} moves stepped to solved`);
process.exit(problems.length ? 1 : 0);
