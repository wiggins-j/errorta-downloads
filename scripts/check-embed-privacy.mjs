#!/usr/bin/env node
/*
 * check-embed-privacy.mjs — enforce the landing-page video privacy invariant:
 *
 *   With the page loaded and untouched, the browser makes ZERO requests to any
 *   YouTube / Google host. The first such request must come only AFTER the
 *   user clicks a .yt-facade poster.
 *
 * Serves the repo root over loopback and drives it with Playwright:
 *   1. load the page, assert NO request matches the blocked-host pattern;
 *   2. click the facade; if a real video id is wired (not the placeholder),
 *      assert a request now appears.
 *
 * Playwright is optional. If it isn't installed this script SKIPS (exit 0) and
 * prints the manual steps. Run from the repo root: node scripts/check-embed-privacy.mjs
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(fileURLToPath(import.meta.url), "..", ".."));
const BLOCKED = /youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|gstatic\.com|googleapis\.com|google\.com|doubleclick/i;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

function serve() {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p === "/") p = "/index.html";
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[extname(file)] || "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log(
      "SKIP: playwright not installed. Manual check:\n" +
        "  1. Open the page; DevTools > Network; filter 'youtube|ytimg|google'.\n" +
        "  2. Do NOT click. The list must be EMPTY.\n" +
        "  3. Click the 'Watch a full run' poster. A youtube-nocookie request\n" +
        "     appears only now.\n" +
        "  (install: npm i -D playwright && npx playwright install chromium)"
    );
    process.exit(0);
  }

  const server = await serve();
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const hits = [];
  page.on("request", (r) => {
    if (BLOCKED.test(r.url())) hits.push(r.url());
  });

  let failed = false;
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    if (hits.length > 0) {
      failed = true;
      console.error("FAIL: YouTube/Google request(s) BEFORE any click:");
      hits.forEach((h) => console.error("  - " + h));
    } else {
      console.log("PASS: no YouTube/Google contact on load (" + url + ").");
    }

    const facade = page.locator(".yt-facade").first();
    if ((await facade.count()) > 0 && (await facade.isVisible())) {
      await facade.click();
      await page.waitForTimeout(750);
      if (hits.length > 0) {
        console.log("PASS: iframe/request appeared only after click.");
      } else {
        failed = true;
        console.error("FAIL: clicking the facade produced no embed request.");
      }
    } else {
      console.log(
        "NOTE: video flag off (facade hidden) — load invariant checked; click test skipped."
      );
    }
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(failed ? 1 : 0);
}

main();
