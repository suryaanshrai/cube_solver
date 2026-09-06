/* Drive the scan flow with real video frames through Chromium's fake capture device.
   This exercises getUserMedia, the frame sampler, the stability tracker and the live
   centre check as one path — the part of the app that cannot be unit tested. */

import { BASE, OUT, outDir, launch } from "./browser.mjs";
import path from "node:path";
import { existsSync } from "node:fs";
import { renderFace, SOLVED_YELLOW_FACE } from "./make-y4m.mjs";

outDir();

const CLIP = process.env.CLIP ?? path.resolve(OUT, "face-yellow.y4m");
if (!existsSync(CLIP)) renderFace(SOLVED_YELLOW_FACE, CLIP);

const browser = await launch([
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-video-capture=${CLIP}`,
]);

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["camera"],
});
const page = await context.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });

await page.goto(`${BASE}/solve`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/scan-1-gate.png` });

await page.getByRole("button", { name: "Enable camera" }).click();
await page.waitForSelector(".scan--live", { timeout: 15000 });
await page.screenshot({ path: `${OUT}/scan-2-live.png` });

/* The clip is a yellow-centred face, which is exactly what step 1 asks for: it must
   settle, lock and advance on its own. */
await page
  .waitForFunction(
    () => /face 02/i.test(document.querySelector(".scan__coach-head .chrome")?.textContent ?? ""),
    null,
    { timeout: 15000, polling: 150 },
  )
  .catch(() =>
    problems.push(
      `step 1 never auto-captured a matching face — verdict: ${document ?? ""}`,
    ),
  );

const step = (await page.textContent(".scan__coach-head .chrome"))?.trim();
if (!/face 02/i.test(step ?? "")) problems.push(`still on: ${step}`);

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
await page.screenshot({ path: `${OUT}/scan-2-live.png` });

const videoLive = await page.evaluate(() => {
  const v = document.querySelector(".scan__video");
  return v ? { w: v.videoWidth, h: v.videoHeight, playing: !v.paused } : null;
});
if (!videoLive?.w) problems.push(`no video dimensions: ${JSON.stringify(videoLive)}`);

console.log(`step: ${step?.trim()}\nverdict: ${verdict?.trim()}\nvideo: ${JSON.stringify(videoLive)}`);

/* The manual fallback must be reachable from here without a reload. */
await page.getByRole("button", { name: "Enter by hand" }).click();
await page.waitForSelector(".review", { timeout: 8000 });
await page.screenshot({ path: `${OUT}/scan-3-manual.png` });

await browser.close();
console.log(problems.length ? "FAILURES:\n" + problems.join("\n") : "scan path passed");
process.exit(problems.length ? 1 : 0);
