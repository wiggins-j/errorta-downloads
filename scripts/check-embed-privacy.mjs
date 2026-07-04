#!/usr/bin/env node
/*
 * check-embed-privacy.mjs — enforce the landing-page video privacy invariant:
 *
 *   With the page loaded and untouched, the browser makes ZERO requests to any
 *   YouTube / Google host. The first such request must come only AFTER the
 *   user clicks a .yt-facade poster.
 *
 * Serves the repo root over loopback and drives it with Playwright twice:
 *   1. load the committed flag-off page and assert the facade stays hidden;
 *   2. load a test-only flag-on response, assert no blocked request on load,
 *      click the facade, then assert the first blocked request appears.
 *
 * Playwright is optional. If it isn't installed this script SKIPS (exit 0) and
 * prints the manual steps. Run from the repo root: node scripts/check-embed-privacy.mjs
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BLOCKED = /youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|gstatic\.com|googleapis\.com|google\.com|doubleclick/i;
const TEST_VIDEO_ID = "dQw4w9WgXcQ";
const VIDEO_FLAG = 'var VIDEO_ID = "";';

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
      const requestUrl = new URL(req.url, "http://x");
      let p = decodeURIComponent(requestUrl.pathname);
      if (p === "/") p = "/index.html";
      const file = resolve(ROOT, `.${p}`);
      if (file !== ROOT && !file.startsWith(`${ROOT}${sep}`)) {
        res.writeHead(403).end();
        return;
      }
      let body = await readFile(file);
      if (file === resolve(ROOT, "index.html") && requestUrl.searchParams.has("video-test")) {
        const html = body.toString("utf8");
        if (!html.includes(VIDEO_FLAG)) {
          throw new Error("VIDEO_ID feature flag marker not found");
        }
        body = html.replace(VIDEO_FLAG, `var VIDEO_ID = "${TEST_VIDEO_ID}";`);
      }
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
  let failed = false;
  try {
    const offPage = await browser.newPage();
    const offHits = [];
    offPage.on("request", (r) => {
      if (BLOCKED.test(r.url())) offHits.push(r.url());
    });
    await offPage.goto(url, { waitUntil: "networkidle" });
    await offPage.waitForTimeout(500);

    if (offHits.length > 0) {
      failed = true;
      console.error("FAIL: flag-off page contacted YouTube/Google:");
      offHits.forEach((h) => console.error("  - " + h));
    }
    const offFacade = offPage.locator(".yt-facade");
    const offFacadeCount = await offFacade.count();
    if (offFacadeCount !== 1 || (await offFacade.isVisible())) {
      failed = true;
      console.error("FAIL: flag-off facade is missing or visible.");
    } else if (offHits.length === 0) {
      console.log("PASS: flag-off facade hidden with no YouTube/Google contact.");
    }
    await offPage.close();

    const onPage = await browser.newPage();
    const onHits = [];
    onPage.on("request", (r) => {
      if (BLOCKED.test(r.url())) onHits.push(r.url());
    });
    await onPage.goto(`${url}?video-test=1`, { waitUntil: "networkidle" });
    await onPage.waitForTimeout(500);

    if (onHits.length > 0) {
      failed = true;
      console.error("FAIL: flag-on page contacted YouTube/Google before click:");
      onHits.forEach((h) => console.error("  - " + h));
    }
    const onFacade = onPage.locator(".yt-facade");
    const onFacadeCount = await onFacade.count();
    if (onFacadeCount !== 1 || !(await onFacade.isVisible())) {
      failed = true;
      console.error("FAIL: test-enabled facade is missing or hidden.");
    } else {
      await onFacade.click();
      await onPage.waitForTimeout(750);
      if (onHits.some((hit) => hit.includes(`/embed/${TEST_VIDEO_ID}`))) {
        console.log("PASS: embed request appeared only after click.");
      } else {
        failed = true;
        console.error("FAIL: clicking the facade produced no expected embed request.");
      }
    }
    await onPage.close();
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(failed ? 1 : 0);
}

main();
