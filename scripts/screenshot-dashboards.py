#!/usr/bin/env python3
"""
Screenshot the 3 dashboard mockup HTML files using Playwright.
Saves to /home/z/my-project/public/dashboard-{1,2,3}.png at 1344x768.
"""
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

MOCKUP_DIR = Path("/home/z/my-project/scripts/dashboard-mockups")
OUTPUT_DIR = Path("/home/z/my-project/public")

PAGES = [
    ("dashboard.html", "dashboard-1.png"),
    ("lead-management.html", "dashboard-2.png"),
    ("reports.html", "dashboard-3.png"),
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={"width": 1344, "height": 768},
            device_scale_factor=2,  # 2x for crisp screenshots
        )

        for html_name, png_name in PAGES:
            html_path = MOCKUP_DIR / html_name
            png_path = OUTPUT_DIR / png_name
            file_url = f"file://{html_path}"

            print(f"  Rendering {html_name} → {png_name}")
            page = await context.new_page()
            await page.goto(file_url, wait_until="networkidle")
            # Give it a moment for fonts/layout to settle
            await page.wait_for_timeout(500)
            await page.screenshot(
                path=str(png_path),
                full_page=False,  # just viewport
                type="png",
            )
            await page.close()
            size_kb = png_path.stat().st_size // 1024
            print(f"    ✓ Saved {png_path} ({size_kb} KB)")

        await browser.close()
        print("\nAll 3 screenshots generated successfully.")

if __name__ == "__main__":
    asyncio.run(main())
