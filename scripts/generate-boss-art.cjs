/**
 * Generates src/components/rpg/bosses/Boss*.tsx from the SVGs in src/assets/.
 *
 * Run with:  node scripts/generate-boss-art.cjs
 *
 * Edit the .svg files, never the generated .tsx. The four artworks share the
 * same element ids, so the animation controller in BossCreature.tsx works on
 * all of them unchanged.
 */
const fs = require('fs');
const path = require('path');

/** Element id -> the key on the `groups` prop that animates it. */
const MOTION_IDS = {
  bsGroundShadow: 'shadow',
  bsTail: 'tail',
  bsWings: 'wings',
  bsWingLeft: 'wingLeft',
  bsWingRight: 'wingRight',
  bsBody: 'body',
  bsHead: 'head',
  bsEyes: 'eyes',
  bsGlowLeft: 'glowLeft',
  bsGlowRight: 'glowRight',
  bsPupilLeft: 'pupilLeft',
  bsPupilRight: 'pupilRight',
  bsMouth: 'mouth',
};

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** JSX wants camelCase attributes (stroke-width -> strokeWidth). */
function toJsx(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s([a-zA-Z-]+)=/g, (m, name) =>
      name.includes('-') ? ` ${kebabToCamel(name)}=` : m,
    );
}

function wrapGroups(s) {
  for (const [id, key] of Object.entries(MOTION_IDS)) {
    // NOTE: no .test() guard here — a /g regex mutates lastIndex, which made
    // the following .replace() start mid-string and silently skip matches.
    // String.raw: in a plain template literal `\s` collapses to `s`, which
    // silently produced the regex `<g(s+)id=...` and matched nothing.
    s = s.replace(
      new RegExp(String.raw`<g(\s+)id="${id}"`, 'g'),
      `<motion.g$1id="${id}" {...(groups.${key} ?? {})}`,
    );
    s = s.replace(
      new RegExp(String.raw`<(ellipse|path)(\s+)id="${id}"`, 'g'),
      `<motion.$1$2id="${id}" {...(groups.${key} ?? {})}`,
    );
  }
  return s;
}

/** Rewrites each </g> to </motion.g> when it closes one we converted. */
function closeMotionGroups(s) {
  const out = [];
  const stack = [];
  const tokenRe = /<(\/?)(motion\.g|g)\b[^>]*?(\/?)>/g;
  let last = 0;
  let m;
  while ((m = tokenRe.exec(s)) !== null) {
    out.push(s.slice(last, m.index));
    const [full, closing, name, selfClose] = m;
    if (!closing) {
      if (!selfClose) stack.push(name);
      out.push(full);
    } else {
      out.push(stack.pop() === 'motion.g' ? '</motion.g>' : '</g>');
    }
    last = m.index + full.length;
  }
  out.push(s.slice(last));
  return out.join('');
}

const NAMES = {
  'boss-dragon': 'BossDragon',
  'boss-demon': 'BossDemon',
  'boss-phantom': 'BossPhantom',
  'boss-monster': 'BossMonster',
};

for (const [file, comp] of Object.entries(NAMES)) {
  const raw = fs.readFileSync(path.join('src/assets', file + '.svg'), 'utf8');
  let s = closeMotionGroups(wrapGroups(toJsx(raw)));

  const open = s.indexOf('>', s.indexOf('<svg')) + 1;
  const inner = s.slice(open, s.lastIndexOf('</svg>')).trim();

  const body = inner
    .split('\n')
    .map((l) => (l.trim() ? '    ' + l : l))
    .join('\n');

  fs.writeFileSync(
    path.join('src/components/rpg/bosses', comp + '.tsx'),
    `import { motion } from "framer-motion";
import type { BossArtProps } from "./types";

/**
 * ${comp} artwork.
 *
 * GENERATED from src/assets/${file}.svg by scripts/generate-boss-art.cjs.
 * Edit the SVG and re-run the script rather than editing this file.
 *
 * Named groups are \`motion.g\` elements so the shared controller in
 * BossCreature.tsx can animate body, head, tail, wings, eyes and shadow
 * independently. All four bosses expose the same group names.
 */
export const ${comp} = ({ groups = {} }: BossArtProps) => (
  <>
${body}
  </>
);
`,
    'utf8',
  );
  console.log(comp + '.tsx');
}
