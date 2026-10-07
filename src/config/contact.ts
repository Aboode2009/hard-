/**
 * Contact details shown inside the app.
 *
 * `SUPPORT_EMAIL` is rendered on the Privacy Policy page (/privacy). It is kept
 * out of the locale JSON files on purpose: an email address is the same in
 * every language, so this is the single place to change it.
 *
 * Both constants are annotated `string` rather than left as literal types, so
 * the placeholder comparison in PrivacyPolicy.tsx keeps type-checking after you
 * edit the address below.
 */

/** The untouched default — used to detect that no real address is set yet. */
export const SUPPORT_EMAIL_PLACEHOLDER: string = "your-email@example.com";

/** TODO: replace with your real support address before publishing. */
export const SUPPORT_EMAIL: string = SUPPORT_EMAIL_PLACEHOLDER;
