/**
 * Generates the iOS app icon and launch image from the square logo.
 *
 *   node scripts/generate-ios-assets.cjs <path-to-logo-1024.(png|jpg)>
 *
 * Writes into ios/App/App/Assets.xcassets/:
 *   AppIcon.appiconset/AppIcon-512@2x.png   1024×1024, no alpha (App Store
 *                                           rejects icons with transparency)
 *   Splash.imageset/splash-2732x2732*.png   the launch screen: the pink "21"
 *                                           lifted off its backdrop and set on
 *                                           the launch animation's ground, so
 *                                           no darker square shows around it
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const GROUND = { r: 7, g: 6, b: 8 }; // #070608, the launch animation's ground
const LOGO_PINK = { r: 255, g: 77, b: 138 }; // #FF4D8A
const SPLASH = 2732;
const SPLASH_LOGO = 520; // about the size the native Android splash shows it

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("\nUsage: node scripts/generate-ios-assets.cjs <path-to-logo-1024.png|jpg>\n");
  process.exit(1);
}
const ASSETS = path.join("ios", "App", "App", "Assets.xcassets");

(async () => {
  // App icon: flattened onto its own dark backdrop, RGB only.
  await sharp(src)
    .resize(1024, 1024)
    .flatten({ background: "#0f0d0e" })
    .removeAlpha()
    .png()
    .toFile(path.join(ASSETS, "AppIcon.appiconset", "AppIcon-512@2x.png"));

  // Splash logo: alpha from how far each pixel is from black, colour = brand
  // pink. Keeps the anti-aliased edges and drops the backdrop entirely.
  const { data, info } = await sharp(src)
    .resize(SPLASH_LOGO, SPLASH_LOGO)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i];
    const a = Math.max(0, Math.min(255, Math.round(((r - 24) / (255 - 24)) * 255)));
    rgba[j] = LOGO_PINK.r;
    rgba[j + 1] = LOGO_PINK.g;
    rgba[j + 2] = LOGO_PINK.b;
    rgba[j + 3] = a;
  }
  const logo = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const splash = await sharp({ create: { width: SPLASH, height: SPLASH, channels: 3, background: GROUND } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    fs.writeFileSync(path.join(ASSETS, "Splash.imageset", name), splash);
  }
  console.log("iOS icon + launch image written");
})();
