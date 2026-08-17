// Generate /public/og-image.png (1200x630) from the HTML template using Playwright
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const fileUrl = "file://" + path.resolve(__dirname, "og-image.html");
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const out = path.resolve(__dirname, "../../public/og-image.png");
  await page.screenshot({ path: out, type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  console.log("OG image written to:", out);
})();
