// Record the cat animation as an MP4 video using Playwright
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = path.resolve(__dirname, 'cat-animation.html');
  const outputPath = path.resolve(__dirname, '../../public/cat-animation.mp4');

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: path.resolve(__dirname),
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();

  console.log('Loading animation page...');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });

  // Wait for one full loop (10s) + small buffer
  console.log('Recording 12 seconds of animation...');
  await page.waitForTimeout(12000);

  // Save video
  const video = await page.video();
  await video.saveAs(outputPath);
  console.log('Saved video to:', outputPath);

  await context.close();
  await browser.close();

  const stats = fs.statSync(outputPath);
  console.log('Video size:', (stats.size / 1024).toFixed(2), 'KB');
})();
