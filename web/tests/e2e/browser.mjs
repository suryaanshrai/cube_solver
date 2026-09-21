/**
 * Shared browser setup for the end-to-end scripts.
 *
 * Playwright resolves its own bundled Chromium by default. `CHROMIUM_PATH` is only needed
 * where a browser is provided out of band (CI images, this project's dev container);
 * leave it unset locally after `npx playwright install chromium`.
 *
 * SwiftShader is requested so the scripts run on machines with no GPU. It is slow, which
 * is why the assertions wait for state rather than for durations.
 *
 * The full Chromium build is asked for by name rather than Playwright's default headless
 * shell, which has no implementation of `--use-file-for-fake-video-capture`: on the shell
 * getUserMedia simply fails and the scan scripts see a camera-unavailable screen.
 */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const BASE = process.env.BASE ?? "http://localhost:5000";
export const OUT = process.env.OUT ?? path.resolve(HERE, "../../test-results");

export function outDir() {
  mkdirSync(OUT, { recursive: true });
  return OUT;
}

export function launch(extraArgs = []) {
  return chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : { channel: "chromium" }),
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-sandbox",
      ...extraArgs,
    ],
  });
}
