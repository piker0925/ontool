import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { cwd: process.cwd() });
  await new Promise(res => setTimeout(res, 2500));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const outputPath = path.resolve('../.scratch/screenshot-fun.png');
    await page.screenshot({ path: outputPath });
    console.log(`Screenshot saved to: ${outputPath}`);
  } finally {
    await browser.close();
    preview.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
