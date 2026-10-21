const puppeteer = require('C:/Users/T_T/Documents/my project/tools/deploy/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.toString()}`));

  console.log('Navigating to live URL...');
  await page.goto('https://taipei-larp-3d.veryhoya.workers.dev/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait 3s for 3D world to render
  await new Promise(r => setTimeout(r, 3000));

  // Extract WebGL metrics
  const metrics = await page.evaluate(() => {
    if (window.renderer && window.renderer.info) {
      return {
        calls: window.renderer.info.render.calls,
        triangles: window.renderer.info.render.triangles,
        points: window.renderer.info.render.points,
        lines: window.renderer.info.render.lines,
        geometries: window.renderer.info.memory.geometries,
        textures: window.renderer.info.memory.textures
      };
    }
    return null;
  });
  console.log('WebGL Renderer metrics:', JSON.stringify(metrics, null, 2));

  // Capture outdoor street shot
  const outPath1 = path.join(__dirname, 'docs', 'live_street_v3.png');
  await page.screenshot({ path: outPath1 });
  console.log('Saved outdoor:', outPath1);

  // Copy to brain artifact directory so it can be viewed
  const artifactDir = 'C:\\Users\\T_T\\.gemini\\antigravity\\brain\\8f46527a-86ff-48cc-b5c0-c96233634e2a';
  fs.copyFileSync(outPath1, path.join(artifactDir, 'live_street_v3.png'));

  // Now trigger entering indoor room mode
  console.log('Entering Flagship LARP parlor room...');
  await page.evaluate(() => {
    if (typeof window.enterStore === 'function' && window.STORES) {
      window.enterStore(window.STORES[0]);
    }
  });

  // Wait 2.5s for smooth camera transition to complete
  await new Promise(r => setTimeout(r, 2500));

  const outPath2 = path.join(__dirname, 'docs', 'live_indoor_room.png');
  await page.screenshot({ path: outPath2 });
  console.log('Saved indoor:', outPath2);
  fs.copyFileSync(outPath2, path.join(artifactDir, 'live_indoor_room.png'));

  await browser.close();
  console.log('Done! Captured both scenes successfully.');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
