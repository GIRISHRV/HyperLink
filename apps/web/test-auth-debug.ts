import { chromium } from '@playwright/test';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen to console messages
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Clear auth state
    await context.clearCookies();
    await page.goto("http://localhost:3000/");
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    
    // Go to auth page
    console.log("Navigating to /auth...");
    await page.goto("http://localhost:3000/auth", { waitUntil: "networkidle" });
    
    // Wait a bit
    console.log("Waiting 15 seconds...");
    await page.waitForTimeout(15000);
    
    // Take screenshot
    await page.screenshot({ path: 'auth-page-debug.png', fullPage: true });
    
    // Get page content
    console.log("Page URL:", page.url());
    console.log("Has #auth-email:", await page.locator('#auth-email').count());
    console.log("Has input[type=email]:", await page.locator('input[type=email]').count());
    console.log("Has .animate-pulse:", await page.locator('.animate-pulse').count());
    
    // Get all input elements
    const inputs = await page.locator('input').all();
    console.log("Total inputs:", inputs.length);
    for (const input of inputs) {
        const id = await input.getAttribute('id');
        const type = await input.getAttribute('type');
        console.log(`  Input: id=${id}, type=${type}`);
    }
    
    await browser.close();
})();
