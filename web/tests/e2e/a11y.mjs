/* The implementation gate.
   Award-looking sites routinely strip focus rings and strand content at opacity 0 under
   prefers-reduced-motion. Both are invisible in a normal screenshot, so they get their
   own pass. */

import { BASE, OUT, outDir, launch } from "./browser.mjs";

outDir();
import { readFileSync } from "node:fs";

const fixtures = JSON.parse(readFileSync(new URL("../../src/cube/fixtures.json", import.meta.url)));
const scramble = fixtures.find((f) => f.kind === "scramble");

const browser = await launch();
const problems = [];

/* ── 1. reduced motion: every reveal must reach its end state ────────────── */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll(".reveal")]
      .filter((n) => {
        const s = getComputedStyle(n);
        return Number(s.opacity) < 0.99 || s.clipPath.includes("100%");
      })
      .map((n) => n.className));
  if (hidden.length) problems.push(`reduced motion left ${hidden.length} elements hidden: ${hidden[0]}`);
  await page.screenshot({ path: `${OUT}/a11y-reduced-motion.png`, fullPage: false });
  await ctx.close();
}

/* ── 2. no JavaScript: the frozen page is still the finished page ────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const noscript = await page.locator("noscript").count();
  if (!noscript) problems.push("no <noscript> explanation for a scriptless visit");
  await ctx.close();
}

/* ── 3. every interactive control shows a focus ring when tabbed to ──────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const url of [`${BASE}/`, `${BASE}/solve?cube=${scramble.facelets}`]) {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          label: (el.getAttribute("aria-label") || el.textContent || "").slice(0, 40).trim(),
          outline: s.outlineStyle === "none" || s.outlineWidth === "0px" ? null : s.outlineColor,
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      });
      if (!focused) continue;
      if (!focused.outline) {
        problems.push(`no focus ring on ${focused.tag} "${focused.label}" at ${url}`);
      }
      // 24px is the WCAG 2.2 minimum; anything a thumb has to hit wants more.
      if (focused.h > 0 && focused.h < 24 && focused.w < 24) {
        problems.push(`hit target ${focused.w}×${focused.h} on ${focused.tag} "${focused.label}"`);
      }
    }
  }
  await page.screenshot({ path: `${OUT}/a11y-focus.png` });
  await ctx.close();
}

/* ── 4. images of text, semantics, and the language attribute ────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const doc = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    h1s: document.querySelectorAll("h1").length,
    divButtons: [...document.querySelectorAll("div[onclick]")].length,
  }));
  if (!doc.lang) problems.push("no lang attribute");
  if (!doc.description) problems.push("no meta description");
  if (doc.h1s !== 1) problems.push(`${doc.h1s} <h1> elements`);
  if (doc.divButtons) problems.push(`${doc.divButtons} clickable divs`);
  await ctx.close();
}

await browser.close();
console.log(problems.length ? "FAILURES:\n" + problems.join("\n") : "implementation gate passed");
process.exit(problems.length ? 1 : 0);
