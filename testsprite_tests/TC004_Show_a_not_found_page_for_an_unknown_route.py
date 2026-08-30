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
        
        # -> Navigate to the non-existent route "/this-route-does-not-exist" and then verify the app shows a not-found experience (or a recovery redirect) and provides recovery navigation.
        await page.goto("http://localhost:8080/this-route-does-not-exist")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify a not found page is displayed
        # Assert: The page displays '404' indicating a not-found response.
        await expect(page.locator("xpath=/html/body/div[1]").nth(0)).to_contain_text("404", timeout=15000), "The page displays '404' indicating a not-found response."
        # Assert: The page shows 'Oops! Page not found' indicating the not-found experience.
        await expect(page.locator("xpath=/html/body/div[1]").nth(0)).to_contain_text("Oops! Page not found", timeout=15000), "The page shows 'Oops! Page not found' indicating the not-found experience."
        
        # --> Verify recovery navigation is available
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div/a").nth(0).scroll_into_view_if_needed()
        # Assert: The 'Return to Home' recovery link is visible.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div/a").nth(0)).to_be_visible(timeout=15000), "The 'Return to Home' recovery link is visible."
        # Assert: The recovery link is labeled exactly 'Return to Home'.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div/a").nth(0)).to_have_text("Return to Home", timeout=15000), "The recovery link is labeled exactly 'Return to Home'."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    