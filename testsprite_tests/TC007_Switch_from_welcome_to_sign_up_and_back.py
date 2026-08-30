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
        
        # -> Click the 'GET STARTED' button on the welcome screen to open the sign-up view.
        # GET STARTED button
        elem = page.get_by_role('button', name='GET STARTED', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Back' button to return to the welcome screen and verify the welcome view is shown.
        # Back button
        elem = page.get_by_role('button', name='Back', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the welcome screen is displayed again
        # Assert: The HARD CHALLENGE wordmark is visible on the welcome screen.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div").nth(0)).to_contain_text("HARD CHALLENGE", timeout=15000), "The HARD CHALLENGE wordmark is visible on the welcome screen."
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div[4]/button[1]").nth(0).scroll_into_view_if_needed()
        # Assert: The GET STARTED button is visible on the welcome screen.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div[4]/button[1]").nth(0)).to_be_visible(timeout=15000), "The GET STARTED button is visible on the welcome screen."
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div[4]/button[2]").nth(0).scroll_into_view_if_needed()
        # Assert: The I ALREADY HAVE AN ACCOUNT button is visible on the welcome screen.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div[4]/button[2]").nth(0)).to_be_visible(timeout=15000), "The I ALREADY HAVE AN ACCOUNT button is visible on the welcome screen."
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
    