/** Render the editable social-card.svg into the PNG used by social previews. */
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(await readFile(new URL('../site/assets/social-card.svg',import.meta.url),'utf8'));
 await page.addStyleTag({content:'html,body{margin:0;width:1200px;height:630px;overflow:hidden}'});
 await page.screenshot({path:new URL('../site/assets/social-card.png',import.meta.url).pathname});
} finally { await browser.close(); }
