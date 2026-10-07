/**
 * Generates every Android launcher icon from one square source image.
 *
 *   node scripts/generate-app-icons.cjs <path-to-logo.png>
 *
 * Produces, under android/app/src/main/res/:
 *   mipmap-<dpi>/ic_launcher.png          legacy square icon
 *   mipmap-<dpi>/ic_launcher_round.png    legacy round icon
 *   mipmap-<dpi>/ic_launcher_foreground.png  adaptive foreground
 *   values/ic_launcher_background.xml     adaptive background colour
 *
 * Also refreshes the PWA icons in public/.
 *
 * ── Why the foreground is padded ──────────────────────────────────────────
 * Android crops an adaptive icon to whatever shape the launcher wants and only
 * guarantees the middle 66% of the canvas is visible ("the safe zone"). A logo
 * drawn edge to edge therefore loses its outer ring on round launchers. The
 * source art is scaled to ~62% of the canvas and centred so nothing is cut.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/** Adaptive-icon background, matching the logo's own backdrop. */
const BACKGROUND = '#0E0F13';

/** Launcher icon sizes per density (legacy icons are 48dp). */
const LEGACY = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

/** Adaptive foreground is 108dp; only the middle 72dp (66%) is guaranteed. */
const FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

/** Fraction of the foreground canvas the artwork occupies. */
const SAFE_FRACTION = 0.62;

const RES = path.join('android', 'app', 'src', 'main', 'res');

const src = process.argv[2];
if (!src) {
  console.error('\nUsage: node scripts/generate-app-icons.cjs <path-to-logo.png>\n');
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error('\nNo such file: ' + src + '\n');
  process.exit(1);
}

const hexToRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
  alpha: 1,
});

/** Artwork inset for the legacy icons — keeps the logo's own ring clear of
 *  the round mask instead of letting the launcher slice through it. */
const LEGACY_FRACTION = 0.78;

/**
 * Lifts the logo off its baked-in black background.
 *
 * The source is a JPEG, so the mark sits on opaque near-black. An adaptive
 * icon's foreground must be transparent everywhere except the artwork — leave
 * the black in and every launcher that applies a shape mask cuts a visible
 * square out of it. Alpha is derived from luminance with a soft ramp so the
 * edges stay anti-aliased rather than going jagged.
 */
async function cutoutLogo(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const LOW = 38;   // fully transparent at or below this luminance
  const HIGH = 85;  // fully opaque at or above

  for (let i = 0; i < data.length; i += info.channels) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    let a;
    if (lum <= LOW) a = 0;
    else if (lum >= HIGH) a = 255;
    else a = Math.round((255 * (lum - LOW)) / (HIGH - LOW));
    data[i + info.channels - 1] = a;
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}

async function main() {
  const meta = await sharp(src).metadata();
  console.log('source: %s  (%dx%d)', src, meta.width, meta.height);
  if (meta.width !== meta.height) {
    console.warn('  ! not square — it will be letterboxed onto a square canvas');
  }

  const bg = hexToRgb(BACKGROUND);
  const cutout = await cutoutLogo(src);

  // ── Legacy icons: the full logo, square and round ──────────────────────
  for (const [dir, size] of Object.entries(LEGACY)) {
    const out = path.join(RES, dir);
    fs.mkdirSync(out, { recursive: true });

    const art = Math.round(size * LEGACY_FRACTION);
    const logo = await sharp(cutout)
      .resize(art, art, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const square = await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(out, 'ic_launcher.png'), square);

    // Round variant: same art masked to a circle, on the same background so
    // the corners are not transparent on launchers that do not mask.
    const circle = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
    );
    const round = await sharp(square)
      .composite([{ input: circle, blend: 'dest-in' }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(out, 'ic_launcher_round.png'), round);
  }
  console.log('  wrote ic_launcher.png + ic_launcher_round.png for 5 densities');

  // ── Adaptive foreground: artwork inset into the safe zone ──────────────
  for (const [dir, size] of Object.entries(FOREGROUND)) {
    const out = path.join(RES, dir);
    fs.mkdirSync(out, { recursive: true });

    const art = Math.round(size * SAFE_FRACTION);
    const logo = await sharp(cutout)
      .resize(art, art, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Transparent canvas: the background layer supplies the colour.
    const fg = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(out, 'ic_launcher_foreground.png'), fg);
  }
  console.log('  wrote ic_launcher_foreground.png for 5 densities (inset to %d%%)', SAFE_FRACTION * 100);

  // ── Adaptive background colour ─────────────────────────────────────────
  fs.mkdirSync(path.join(RES, 'values'), { recursive: true });
  fs.writeFileSync(
    path.join(RES, 'values', 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<resources>\n' +
      `    <color name="ic_launcher_background">${BACKGROUND}</color>\n` +
      '</resources>\n',
  );

  // The anydpi-v26 descriptors must point at the PNG foreground, not the old
  // vector drawable that shipped with the Capacitor template.
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const dir = path.join(RES, 'mipmap-anydpi-v26');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, name + '.xml'),
      '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
        '    <background android:drawable="@color/ic_launcher_background"/>\n' +
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n' +
        '    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n' +
        '</adaptive-icon>\n',
    );
  }
  console.log('  wrote adaptive-icon descriptors + background colour');

  // ── PWA / web icons ────────────────────────────────────────────────────
  for (const size of [192, 512]) {
    const inner = await sharp(cutout)
      .resize(Math.round(size * LEGACY_FRACTION), Math.round(size * LEGACY_FRACTION), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();
    const buf = await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: inner, gravity: 'center' }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join('public', `pwa-${size}x${size}.png`), buf);
  }
  const fav = await sharp(cutout)
    .resize(64, 64, { fit: 'contain', background: bg })
    .flatten({ background: bg })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join('public', 'favicon.png'), fav);
  console.log('  wrote public/pwa-192x192.png, pwa-512x512.png, favicon.png');

  console.log('\nDone. Next: npx cap sync android');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
