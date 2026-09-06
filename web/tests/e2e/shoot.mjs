/* Render the site, capture it at every breakpoint, and collect anything the browser
   complains about. Motion-heavy pages fail silently — a thrown error in one observer
   callback kills that chapter and leaves everything else working — so errors are
   collected explicitly rather than inferred from the screenshots. */

import { BASE, OUT, outDir, launch } from "./browser.mjs";

outDir();


const SIZES = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
  { name: "2560", width: 2560, height: 1440 },
];

const browser = await launch();

const problems = [];

for (const size of SIZES) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`[${size.name}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") problems.push(`[${size.name}] console: ${m.text()}`); });
  page.on("requestfailed", (r) => problems.push(`[${size.name}] failed: ${r.url()} — ${r.failure()?.errorText}`));

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/landing-${size.name}-hero.png` });

  // Horizontal overflow is the single most common silent responsive failure.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`[${size.name}] horizontal overflow: ${overflow}px`);

  if (size.name === "1440" || size.name === "375") {
    const total = await page.evaluate(() => document.body.scrollHeight);
    const step = Math.floor(total / 5);
    for (let i = 1; i <= 5; i += 1) {
      await page.evaluate((y) => window.scrollTo(0, y), step * i);
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `${OUT}/landing-${size.name}-ch${i}.png` });
    }
  }

  await page.goto(`${BASE}/solve`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/solve-${size.name}.png` });

  await context.close();
}

await browser.close();
console.log(problems.length ? problems.join("\n") : "no console errors, no failed requests, no overflow");
