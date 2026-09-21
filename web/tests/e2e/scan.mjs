/* Drive the scan flow with real video frames through Chromium's fake capture device.
   This exercises getUserMedia, the frame sampler, the cube detector, the stability
   tracker and the confirm step as one path — the part of the app that cannot be unit
   tested. Two of the assertions are regressions: a flat field used to capture as a cube
   face, and "Start over" used to do nothing at all. */

import { BASE, OUT, outDir, launch } from "./browser.mjs";
import path from "node:path";
import { existsSync } from "node:fs";
import { renderFace, renderFlat, SOLVED_YELLOW_FACE } from "./make-y4m.mjs";

outDir();

const CLIP = process.env.CLIP ?? path.resolve(OUT, "face-yellow.y4m");
if (!existsSync(CLIP)) renderFace(SOLVED_YELLOW_FACE, CLIP);

const WALL = path.resolve(OUT, "flat-wall.y4m");
if (!existsSync(WALL)) renderFlat([214, 212, 208], WALL);

const problems = [];

async function open(clip) {
  const browser = await launch([
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-video-capture=${clip}`,
  ]);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["camera"],
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  await page.goto(`${BASE}/solve`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.waitForSelector(".scan--live", { timeout: 15000 });
  return { browser, page };
}

const faceNumber = (page) =>
  page.textContent(".scan__coach-head .chrome").then((t) => (t ?? "").trim());

/* ── a flat field is not a cube ──────────────────────────────────────────── */
{
  const { browser, page } = await open(WALL);
  await page.screenshot({ path: `${OUT}/scan-0-wall.png` });

  /* The colour of this wall is close enough to a white sticker that the old centre-only
     check accepted it. Nothing about it is cube-shaped, and that has to be enough. */
  await page.waitForTimeout(6000);
  const verdict = (await page.textContent(".scan__verdict"))?.trim();
  if (!/cube face|line the cube/i.test(verdict ?? "")) {
    problems.push(`a flat wall did not read as "no cube": ${verdict}`);
  }
  if (!/face 01/i.test(await faceNumber(page))) {
    problems.push("a flat wall was captured as a cube face");
  }
  if (await page.locator(".scan--frozen").count()) {
    problems.push("a flat wall reached the confirm screen");
  }
  await browser.close();
}

/* ── the real path ───────────────────────────────────────────────────────── */
const { browser, page } = await open(CLIP);
await page.screenshot({ path: `${OUT}/scan-2-live.png` });

/* The clip is a yellow-centred face, which is exactly what step 1 asks for: it must
   settle, lock and hand over to the confirm screen on its own. */
await page
  .waitForSelector(".scan--frozen", { timeout: 15000 })
  .catch(() => problems.push("step 1 never auto-captured a matching face"));

const swatches = await page.locator(".scan__read .sticker").count();
if (swatches !== 9) problems.push(`confirm screen showed ${swatches} swatches, not 9`);
await page.screenshot({ path: `${OUT}/scan-3-confirm.png` });

await page.getByRole("button", { name: /looks right/i }).click();
await page
  .waitForFunction(
    () => /face 02/i.test(document.querySelector(".scan__coach-head .chrome")?.textContent ?? ""),
    null,
    { timeout: 8000, polling: 150 },
  )
  .catch(() => problems.push("confirming face 1 did not advance to face 2"));

/* Step 2 asks for green while the clip still shows yellow: it must say so by name and
   must not capture anything. */
await page
  .waitForFunction(
    () => /expected green/i.test(document.querySelector(".scan__verdict")?.textContent ?? ""),
    null,
    { timeout: 8000, polling: 150 },
  )
  .catch(() => problems.push("wrong face presented but it was never named"));

const verdict = (await page.textContent(".scan__verdict"))?.trim();
if (!/seeing yellow/i.test(verdict ?? "")) {
  problems.push(`the verdict did not name what it was seeing: ${verdict}`);
}

/* Back returns to the previous face and drops what it had captured there. */
await page.getByRole("button", { name: "Back", exact: true }).click();
await page.waitForTimeout(300);
if (!/face 01/i.test(await faceNumber(page))) {
  problems.push(`Back did not return to face 1: ${await faceNumber(page)}`);
}

/* And the reported bug: Start over, pressed while the scan screen is already showing. */
await page.waitForSelector(".scan--frozen", { timeout: 15000 });
await page.getByRole("button", { name: /looks right/i }).click();
await page.waitForFunction(
  () => /face 02/i.test(document.querySelector(".scan__coach-head .chrome")?.textContent ?? ""),
  null,
  { timeout: 8000, polling: 150 },
);
await page.getByRole("button", { name: "Start over" }).click();
await page.waitForTimeout(600);
if (!/face 01/i.test(await faceNumber(page))) {
  problems.push(`Start over did not reset the scan: ${await faceNumber(page)}`);
}

const videoLive = await page.evaluate(() => {
  const v = document.querySelector(".scan__video");
  return v ? { w: v.videoWidth, h: v.videoHeight, playing: !v.paused } : null;
});
if (!videoLive?.w) problems.push(`no video dimensions: ${JSON.stringify(videoLive)}`);

console.log(`verdict: ${verdict}\nvideo: ${JSON.stringify(videoLive)}`);

/* The manual fallback must be reachable from here without a reload. */
await page.getByRole("button", { name: "Enter by hand" }).click();
await page.waitForSelector(".review", { timeout: 8000 });
await page.screenshot({ path: `${OUT}/scan-4-manual.png` });

await browser.close();
console.log(problems.length ? "FAILURES:\n" + problems.join("\n") : "scan path passed");
process.exit(problems.length ? 1 : 0);
