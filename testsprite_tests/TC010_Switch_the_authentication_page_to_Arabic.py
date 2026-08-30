import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:8080")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the language selector (globe) button at the top-left to switch the interface language to Arabic.
        # button
        elem = page.locator('xpath=/html/body/div/div[2]/div/div/button')
        await elem.click(timeout=10000)
        
        # -> Select the 'العربية' option in the language menu to switch the interface to Arabic and trigger a full page reload.
        # العربية menu item
        elem = page.get_by_role('menuitem', name='العربية', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the page reloads in Arabic
        # Assert: The 'ابدأ الآن' button is displayed in Arabic.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div[4]/button[1]").nth(0)).to_have_text("\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646", timeout=15000), "The '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646' button is displayed in Arabic."
        # Assert: The 'عندي حساب بالفعل' button is displayed in Arabic.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div[4]/button[2]").nth(0)).to_have_text("\u0639\u0646\u062f\u064a \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644", timeout=15000), "The '\u0639\u0646\u062f\u064a \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644' button is displayed in Arabic."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    