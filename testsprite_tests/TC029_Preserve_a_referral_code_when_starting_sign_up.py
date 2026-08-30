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
        
        # -> Navigate to the auth page with the referral code in URL (/auth?ref=CODE) and wait for the splash animation to finish so the page settles.
        await page.goto("http://localhost:8080/auth?ref=CODE")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the welcome screen is skipped
        # Assert: The sign-up card is visible, confirming the welcome screen was skipped.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div").nth(0)).to_contain_text("Create your account", timeout=15000), "The sign-up card is visible, confirming the welcome screen was skipped."
        
        # --> Verify the sign-up form is displayed
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div").nth(0).scroll_into_view_if_needed()
        # Assert: The sign-up heading (Create your account) is visible.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div").nth(0)).to_be_visible(timeout=15000), "The sign-up heading (Create your account) is visible."
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div/div/div[1]/div[2]/form/div[1]/div[1]/div/div[1]/input").nth(0).scroll_into_view_if_needed()
        # Assert: The email address input field is visible.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div/div/div[1]/div[2]/form/div[1]/div[1]/div/div[1]/input").nth(0)).to_be_visible(timeout=15000), "The email address input field is visible."
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div/div/div[1]/div[2]/form/div[1]/div[2]/div/div[1]/div[2]/input").nth(0).scroll_into_view_if_needed()
        # Assert: The password input field is visible.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div/div/div[1]/div[2]/form/div[1]/div[2]/div/div[1]/div[2]/input").nth(0)).to_be_visible(timeout=15000), "The password input field is visible."
        await page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div/button").nth(0).scroll_into_view_if_needed()
        # Assert: The Continue button on the sign-up form is visible.
        await expect(page.locator("xpath=/html/body/div[1]/div[2]/div/div[2]/div/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div/button").nth(0)).to_be_visible(timeout=15000), "The Continue button on the sign-up form is visible."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    