# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** ard-like-main (Hard Challenge)
- **Version:** 0.0.0
- **Date:** 2026-07-14
- **Prepared by:** TestSprite AI Team (completed by Claude Code)
- **Test Scope:** Public (signed-out) flows only — no test account was available, so the 24 authenticated test cases from the full 40-case plan were deliberately excluded from this run.

---

## 2️⃣ Requirement Validation Summary

### Requirement R1 — Authentication & Access Control
Signed-out visitors must be redirected to `/auth`; sign-in must be reachable from the welcome screen.

#### Test TC001 Redirect signed-out visitors away from protected pages
- **Test Code:** [TC001_Redirect_signed_out_visitors_away_from_protected_pages.py](./TC001_Redirect_signed_out_visitors_away_from_protected_pages.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/d6af7fbf-1f02-4957-b13d-944e28c75492
- **Status:** ✅ Passed
- **Analysis / Findings:** Visiting protected routes while signed out correctly lands on `/auth`. The imperative guard in `Index.tsx` (clerkAuth session subscription) works as designed.

#### Test TC002 Sign in from the auth welcome screen
- **Test Code:** [TC002_Sign_in_from_the_auth_welcome_screen.py](./TC002_Sign_in_from_the_auth_welcome_screen.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/7bfe154b-a9dd-4438-a659-2be11ed852fb
- **Status:** ⚠️ Blocked (no credentials)
- **Analysis / Findings:** The sign-in form itself rendered and validated correctly: submitting unknown credentials produced Clerk's proper "Couldn't find your account." error. The test could not proceed further because no valid test account exists. Not an application defect — provide a test account (or disable Clerk bot protection temporarily) to unblock full authenticated coverage.

---

### Requirement R2 — Welcome Screen & View Switching
`/auth` shows the welcome view; GET STARTED → sign-up, I ALREADY HAVE AN ACCOUNT → sign-in, back button returns to welcome.

#### Test TC003 Open the welcome screen
- **Test Code:** [TC003_Open_the_welcome_screen.py](./TC003_Open_the_welcome_screen.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/8e522cff-99be-47f5-84f6-ebc4f4acc017
- **Status:** ✅ Passed
- **Analysis / Findings:** Brand header, hero area, headline and both CTAs render after the splash animation.

#### Test TC006 Switch between welcome and auth forms
- **Test Code:** [TC006_Switch_between_welcome_and_auth_forms.py](./TC006_Switch_between_welcome_and_auth_forms.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/740c6526-1ec8-4ab5-b6f5-f76eefb1a301
- **Status:** ✅ Passed
- **Analysis / Findings:** URL-driven view switching (`?mode=signin` / `?mode=signup`) works in both directions.

#### Test TC007 Switch from welcome to sign-up and back
- **Test Code:** [TC007_Switch_from_welcome_to_sign_up_and_back.py](./TC007_Switch_from_welcome_to_sign_up_and_back.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/dcc38f2b-a278-4b62-8031-783e0e5edd9b
- **Status:** ✅ Passed
- **Analysis / Findings:** The round back button returns from the sign-up form to the welcome view; browser history behaves correctly (push navigation).

---

### Requirement R3 — Localization (Arabic RTL / English LTR)
Language switcher must translate all texts and flip document direction.

#### Test TC008 Change auth language and keep the selected direction
- **Test Code:** [TC008_Change_auth_language_and_keep_the_selected_direction.py](./TC008_Change_auth_language_and_keep_the_selected_direction.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/170dd70c-ada2-4b46-9b83-ca6d464c6e33
- **Status:** ✅ Passed
- **Analysis / Findings:** Language selection persists across the full page reload and the direction stays consistent.

#### Test TC010 Switch the authentication page to Arabic
- **Test Code:** [TC010_Switch_the_authentication_page_to_Arabic.py](./TC010_Switch_the_authentication_page_to_Arabic.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/8200a106-bb44-4145-98e9-4b90fca87e3a
- **Status:** ✅ Passed
- **Analysis / Findings:** Arabic mode renders RTL with translated copy ("ابدأ الآن" / "عندي حساب بالفعل") while the HARD CHALLENGE wordmark stays LTR.

#### Test TC011 Switch the authentication page to English
- **Test Code:** [TC011_Switch_the_authentication_page_to_English.py](./TC011_Switch_the_authentication_page_to_English.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/2438a8fd-019e-47e7-ba34-d4e4a3e028d7
- **Status:** ⚠️ Blocked (tooling limitation)
- **Analysis / Findings:** The UI visibly switched to English with correct LTR layout ("GET STARTED" visible, globe at top-left). The test harness could not read the `dir` attribute from the DOM to assert programmatically — a limitation of the test tooling in this session, not an app bug. Local Playwright verification during development confirmed `dir="ltr"` is set.

---

### Requirement R4 — Referral Deep Links
`/auth?ref=CODE` must skip the welcome view, open sign-up directly, and preserve the code for post-signup consumption.

#### Test TC014 Open the sign-up form from a referral entry point
- **Test Code:** [TC014_Open_the_sign_up_form_from_a_referral_entry_point.py](./TC014_Open_the_sign_up_form_from_a_referral_entry_point.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/37891934-aa1b-442a-adba-1d3f24f45e4a
- **Status:** ❌ Failed (false positive — expectation mismatch)
- **Analysis / Findings:** The test expected the referral token to appear somewhere in the sign-up form DOM (visible text or hidden input). By design the app instead stores the code in `localStorage.pendingReferralCode`, where `ProfileBootstrap` consumes it right after account creation — it is never rendered into the form. The observed behavior (URL kept `?ref=TESTREF`, sign-up form opened directly) matches the intended design, and TC029 below confirms the code is actually preserved. No code change required; the test's assertion should target localStorage instead of the DOM.

#### Test TC029 Preserve a referral code when starting sign-up
- **Test Code:** [TC029_Preserve_a_referral_code_when_starting_sign_up.py](./TC029_Preserve_a_referral_code_when_starting_sign_up.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/04e32ee2-7e9a-4ade-90ed-8a2f3eb139a7
- **Status:** ✅ Passed
- **Analysis / Findings:** The referral code is correctly persisted (localStorage `pendingReferralCode`) and the welcome view is skipped straight to sign-up.

---

### Requirement R5 — Error Pages (404)
Unknown routes must show a Not Found page with a way back.

#### Test TC004 Show a not found page for an unknown route
- **Test Code:** [TC004_Show_a_not_found_page_for_an_unknown_route.py](./TC004_Show_a_not_found_page_for_an_unknown_route.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/132e80a8-3db1-4133-bfb8-2195b3a5bc3a
- **Status:** ✅ Passed
- **Analysis / Findings:** Unknown URLs render the 404 page.

#### Test TC015 Recover from a not found page
- **Test Code:** [TC015_Recover_from_a_not_found_page.py](./TC015_Recover_from_a_not_found_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/525f1e2f-ddcb-4dcc-9e06-3971c1fb0655
- **Status:** ✅ Passed
- **Analysis / Findings:** Navigation away from the 404 page works.

#### Test TC021 Show a 404 page for an unknown route
- **Test Code:** [TC021_Show_a_404_page_for_an_unknown_route.py](./TC021_Show_a_404_page_for_an_unknown_route.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/32de8f90-b757-47ec-a978-ae5da549f2e0
- **Status:** ✅ Passed
- **Analysis / Findings:** Duplicate coverage of TC004; consistent result.

---

### Requirement R6 — PWA Install Page
`/install` must show platform-appropriate installation instructions and allow going back.

#### Test TC034 View PWA install instructions
- **Test Code:** [TC034_View_PWA_install_instructions.py](./TC034_View_PWA_install_instructions.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/5d5ec01d-b015-4724-95c9-ba9fbfa1ef5f
- **Status:** ✅ Passed
- **Analysis / Findings:** Install instructions render.

#### Test TC038 Recover from the install page
- **Test Code:** [TC038_Recover_from_the_install_page.py](./TC038_Recover_from_the_install_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/f1f4b90f-65a0-40a3-8247-e6491cd872f9
- **Status:** ✅ Passed
- **Analysis / Findings:** Back navigation from `/install` works.

#### Test TC040 View the install instructions page
- **Test Code:** [TC040_View_the_install_instructions_page.py](./TC040_View_the_install_instructions_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/537d36e4-5f1c-4aaa-859e-152821391ce8/a0b96e5c-7b06-4609-a674-0333f3016ce5
- **Status:** ✅ Passed
- **Analysis / Findings:** Duplicate coverage of TC034; consistent result.

---

## 3️⃣ Coverage & Matching Metrics

- **16 of 40** planned tests executed (public flows only — the 24 authenticated cases were excluded because no test account was available).
- **13 of 16 (81.25%) passed**; 1 failed (false positive); 2 blocked (1 missing credentials, 1 tooling limitation).

| Requirement                              | Total Tests | ✅ Passed | ⚠️ Blocked | ❌ Failed |
|------------------------------------------|-------------|-----------|------------|-----------|
| R1 Authentication & access control       | 2           | 1         | 1          | 0         |
| R2 Welcome screen & view switching       | 3           | 3         | 0          | 0         |
| R3 Localization (ar RTL / en LTR)        | 3           | 2         | 1          | 0         |
| R4 Referral deep links                   | 2           | 1         | 0          | 1         |
| R5 Error pages (404)                     | 3           | 3         | 0          | 0         |
| R6 PWA install page                      | 3           | 3         | 0          | 0         |
| **Total**                                | **16**      | **13**    | **2**      | **1**     |

---

## 4️⃣ Key Gaps / Risks

1. **No authenticated coverage (biggest gap).** 24 of 40 planned tests (home/tasks, paths, calendar, points, rewards, achievements, stores, leaderboards, profile, settings, backups, NASS, story mode, admin) were not executed because there is no test account and Clerk's Cloudflare Turnstile CAPTCHA blocks automated sign-up. **To unblock:** create a test user in the Clerk dashboard (Users → Create user) or temporarily disable bot protection, then re-run the remaining test IDs.
2. **TC014 is an expectation mismatch, not a bug.** Referral codes are intentionally persisted in localStorage (`pendingReferralCode`) rather than rendered into the sign-up form; TC029 confirms the mechanism works.
3. **TC011 blocked by tooling only** — the harness couldn't read the `dir` attribute; visual evidence and local Playwright checks confirm correct LTR behavior.
4. **Splash animation (~3s on every load)** slows both users and tests; consider showing it only on first launch per session.
5. **Desktop-browser limitations** — Capacitor-only features (local notifications, haptics) cannot be validated in this environment and need on-device testing.
