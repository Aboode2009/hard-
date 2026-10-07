// Generates the built-in profile avatars in src/assets/avatars/.
//   node scripts/generate-avatars.cjs            → writes the eight SVGs
//   node scripts/generate-avatars.cjs sheet.png  → also renders a preview sheet (needs sharp)
// Semi-realistic busts: skin tones, hair styles and a beard. viewBox 0 0 200 200,
// transparent background — the app paints the circle colour (src/lib/avatars.ts).
// Adding an avatar: add it to VARIANTS here, to AVATARS in src/lib/avatars.ts,
// and to the profiles_avatar_id_check constraint.

const SKINS = {
  light: { hi: "#FCE0CB", base: "#F4C6A4", lo: "#E3A781", sh: "#C98563", lip: "#C9705B", lipLo: "#A9574A", blush: "#F28C7C" },
  wheat: { hi: "#EFC6A2", base: "#DFA982", lo: "#C88A62", sh: "#A66A46", lip: "#B4604C", lipLo: "#8F4A3B", blush: "#E07C66" },
  brown: { hi: "#C9936C", base: "#AE7651", lo: "#915F3D", sh: "#6E4329", lip: "#8C4A3A", lipLo: "#6B342A", blush: "#B5604A" },
};
const HAIR = { base: "#17171C", mid: "#2A2A33", hi: "#62626F" };
const CLOTH = { hi: "#3F3F49", base: "#2B2B32", lo: "#141418" };
const HOOD = { top: "#FF6A2C", bottom: "#D9441A", inner: "#A33210", rim: "#FF9A6A" };

const defs = (p, k, scarf) => `
<defs>
  <radialGradient id="${p}face" cx="47%" cy="38%" r="64%"><stop offset="0" stop-color="${k.hi}"/><stop offset=".6" stop-color="${k.base}"/><stop offset="1" stop-color="${k.lo}"/></radialGradient>
  <linearGradient id="${p}neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.sh}"/><stop offset=".5" stop-color="${k.lo}"/><stop offset="1" stop-color="${k.base}"/></linearGradient>
  <linearGradient id="${p}ear" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${k.lo}"/><stop offset="1" stop-color="${k.base}"/></linearGradient>
  <linearGradient id="${p}cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CLOTH.hi}"/><stop offset=".45" stop-color="${CLOTH.base}"/><stop offset="1" stop-color="${CLOTH.lo}"/></linearGradient>
  <linearGradient id="${p}hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scarf ? scarf.top : HOOD.top}"/><stop offset="1" stop-color="${scarf ? scarf.bottom : HOOD.bottom}"/></linearGradient>
  <linearGradient id="${p}collar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${HOOD.top}"/><stop offset="1" stop-color="${HOOD.bottom}"/></linearGradient>
  <linearGradient id="${p}hair" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${HAIR.mid}"/><stop offset="1" stop-color="${HAIR.base}"/></linearGradient>
  <radialGradient id="${p}iris" cx="45%" cy="38%" r="62%"><stop offset="0" stop-color="#93653F"/><stop offset=".6" stop-color="#5A3A22"/><stop offset="1" stop-color="#2B1A0E"/></radialGradient>
  <radialGradient id="${p}blush" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${k.blush}" stop-opacity=".5"/><stop offset="1" stop-color="${k.blush}" stop-opacity="0"/></radialGradient>
  <filter id="${p}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <clipPath id="${p}eyeL"><path d="${almond(EYE.l)}"/></clipPath>
  <clipPath id="${p}eyeR"><path d="${almond(EYE.r)}"/></clipPath>
  <clipPath id="${p}headClip"><path d="${HEAD}"/></clipPath>
</defs>`;

const HEAD = "M65 94 C65 65 80 50 100 50 C120 50 135 65 135 94 C135 107 133 118 128 126 C122 135 112 142 100 142 C88 142 78 135 72 126 C67 118 65 107 65 94 Z";
const EYE = { l: 83.5, r: 116.5, y: 99, w: 11.5, h: 6.4 };
const almond = (cx) => `M${cx - EYE.w} ${EYE.y} C${cx - 7} ${EYE.y - EYE.h - 1.6} ${cx + 7} ${EYE.y - EYE.h - 1.6} ${cx + EYE.w} ${EYE.y} C${cx + 7} ${EYE.y + EYE.h} ${cx - 7} ${EYE.y + EYE.h} ${cx - EYE.w} ${EYE.y} Z`;
const lid = (cx) => `M${cx - EYE.w - 0.6} ${EYE.y + 0.4} C${cx - 7} ${EYE.y - EYE.h - 2} ${cx + 7} ${EYE.y - EYE.h - 2} ${cx + EYE.w + 0.6} ${EYE.y + 0.2}`;

const body = (p) => `
  <path d="M14 214 C16 172 44 152 100 150 C156 152 184 172 186 214 Z" fill="url(#${p}cloth)"/>
  <path d="M46 182 C52 194 54 204 54 214 M154 182 C148 194 146 204 146 214" stroke="${CLOTH.lo}" stroke-width="2" fill="none" opacity=".7"/>
  <path d="M30 182 C38 172 50 166 62 163 M170 182 C162 172 150 166 138 163" stroke="${CLOTH.hi}" stroke-width="2.2" fill="none" opacity=".7" stroke-linecap="round"/>`;
const hoodBack = (p) => `
  <path d="M54 160 C60 144 78 136 100 136 C122 136 140 144 146 160 C136 176 118 182 100 182 C82 182 64 176 54 160 Z" fill="url(#${p}collar)"/>
  <path d="M72 156 C80 149 90 146 100 146 C110 146 120 149 128 156 C120 163 110 166 100 166 C90 166 80 163 72 156 Z" fill="${HOOD.inner}"/>`;
const neck = (p) => `
  <path d="M86 124 L114 124 L116 162 C110 168 90 168 84 162 Z" fill="url(#${p}neck)"/>
  <ellipse cx="100" cy="140" rx="17" ry="7" fill="#000" opacity=".22" filter="url(#${p}soft)"/>`;
const collar = (p) => `
  <path d="M68 158 C78 167 89 170 100 170 C111 170 122 167 132 158 C126 172 113 178 100 178 C87 178 74 172 68 158 Z" fill="url(#${p}collar)"/>
  <path d="M62 162 C72 173 85 178 100 178" stroke="${HOOD.rim}" stroke-width="2" fill="none" opacity=".75" stroke-linecap="round"/>
  <path d="M92 174 C91 183 92 190 91 198 M108 174 C109 183 108 190 109 198" stroke="#F4F4F4" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <rect x="88.6" y="196" width="4.8" height="8" rx="1.6" fill="#B9B9C2"/><rect x="106.6" y="196" width="4.8" height="8" rx="1.6" fill="#B9B9C2"/>`;
const ears = (p, k) => `
  <path d="M66 96 C58 92 55 100 57 107 C59 114 64 117 69 114 Z" fill="url(#${p}ear)"/>
  <path d="M65 100 C61 99 60 104 62 108 C63 111 66 111 67 109" stroke="${k.sh}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M134 96 C142 92 145 100 143 107 C141 114 136 117 131 114 Z" fill="${k.base}"/>
  <path d="M135 100 C139 99 140 104 138 108 C137 111 134 111 133 109" stroke="${k.sh}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
const head = (p, k) => `
  <path d="${HEAD}" fill="url(#${p}face)"/>
  <g clip-path="url(#${p}headClip)">
    <path d="M70 118 C76 132 88 140 100 140 C112 140 124 132 130 118 L132 150 L68 150 Z" fill="${k.sh}" opacity=".3"/>
    <ellipse cx="80" cy="108" rx="7" ry="4" fill="#fff" opacity=".14" filter="url(#${p}soft)"/>
    <ellipse cx="120" cy="108" rx="7" ry="4" fill="#fff" opacity=".1" filter="url(#${p}soft)"/>
  </g>`;
// soft shadow the hair casts on the forehead
const hairShadow = (p, d) => `<g clip-path="url(#${p}headClip)"><path d="${d}" fill="#000" opacity=".2" filter="url(#${p}soft)" transform="translate(0 3)"/></g>`;

const oneEye = (p, k, cx, side, lashes) => `
  <path d="${almond(cx)}" fill="#FBFAF8"/>
  <g clip-path="url(#${p}eye${side})">
    <circle cx="${cx + 0.4}" cy="${EYE.y - 0.4}" r="6.1" fill="url(#${p}iris)"/>
    <circle cx="${cx + 0.4}" cy="${EYE.y - 0.4}" r="6.1" fill="none" stroke="#24150E" stroke-width=".8" opacity=".6"/>
    <circle cx="${cx + 0.4}" cy="${EYE.y - 0.4}" r="2.9" fill="#0E0B09"/>
    <circle cx="${cx + 2.6}" cy="${EYE.y - 2.6}" r="1.8" fill="#fff"/>
    <circle cx="${cx - 1.6}" cy="${EYE.y + 2}" r=".9" fill="#fff" opacity=".7"/>
    <path d="M${cx - 13} ${EYE.y - 5} C${cx - 6} ${EYE.y - 9} ${cx + 6} ${EYE.y - 9} ${cx + 13} ${EYE.y - 5} L${cx + 13} ${EYE.y - 2.4} C${cx + 6} ${EYE.y - 5.6} ${cx - 6} ${EYE.y - 5.6} ${cx - 13} ${EYE.y - 2.4} Z" fill="${k.sh}" opacity=".3"/>
  </g>
  <path d="M${cx - 9.5} ${EYE.y - 8} C${cx - 4} ${EYE.y - 11.6} ${cx + 4} ${EYE.y - 11.6} ${cx + 9.5} ${EYE.y - 8.4}" stroke="${k.sh}" stroke-width="1.1" fill="none" opacity=".5" stroke-linecap="round"/>
  <path d="${lid(cx)}" stroke="#1F120B" stroke-width="${lashes ? 2.8 : 2.1}" fill="none" stroke-linecap="round"/>
  <path d="M${cx - 8} ${EYE.y + 5.4} C${cx - 3} ${EYE.y + 7.4} ${cx + 3} ${EYE.y + 7.4} ${cx + 8} ${EYE.y + 5.4}" stroke="${k.sh}" stroke-width="1" fill="none" opacity=".55" stroke-linecap="round"/>`;
const eyes = (p, k, lashes) => `${oneEye(p, k, EYE.l, "L", lashes)}${oneEye(p, k, EYE.r, "R", lashes)}
  ${lashes ? `<path d="M${EYE.l - EYE.w} ${EYE.y - 0.4} l-3.8 -2.8 M${EYE.r + EYE.w} ${EYE.y - 0.4} l3.8 -2.8" stroke="#1F120B" stroke-width="2" stroke-linecap="round"/>` : ""}`;
const brows = (thin, thick) => `<g transform="translate(0 -2.2)">${thin ? `
  <path d="M73 90 C78 86.2 87 85.6 94 87.6 C88 87.4 79 88.4 73.4 91.6 Z" fill="${HAIR.base}"/>
  <path d="M127 90 C122 86.2 113 85.6 106 87.6 C112 87.4 121 88.4 126.6 91.6 Z" fill="${HAIR.base}"/>` : `
  <path d="M72.5 89.5 C78 ${thick ? 84 : 85} 87 ${thick ? 83.4 : 84.4} 94.5 ${thick ? 86.4 : 87} C88 ${thick ? 88.4 : 87.8} 79 ${thick ? 89.6 : 89} 73 ${thick ? 93.4 : 92.6} Z" fill="${HAIR.base}"/>
  <path d="M127.5 89.5 C122 ${thick ? 84 : 85} 113 ${thick ? 83.4 : 84.4} 105.5 ${thick ? 86.4 : 87} C112 ${thick ? 88.4 : 87.8} 121 ${thick ? 89.6 : 89} 127 ${thick ? 93.4 : 92.6} Z" fill="${HAIR.base}"/>`}</g>`;
const nose = (k) => `
  <path d="M100.5 100 C99.4 105 97.8 109.5 96.8 112" stroke="${k.sh}" stroke-width="1.5" fill="none" opacity=".55" stroke-linecap="round"/>
  <path d="M95.5 113.4 C97.5 115.6 102.5 115.6 104.5 113.4" stroke="${k.sh}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  <ellipse cx="97.6" cy="113.6" rx="1.5" ry=".9" fill="${k.sh}" opacity=".85"/><ellipse cx="102.4" cy="113.6" rx="1.5" ry=".9" fill="${k.sh}" opacity=".85"/>
  <path d="M101.2 102 C101 106 100.8 108 101 110" stroke="#fff" stroke-width="1.4" opacity=".32" fill="none" stroke-linecap="round"/>
  <ellipse cx="100.6" cy="111.2" rx="1.6" ry="1.1" fill="#fff" opacity=".28"/>`;
const mouth = (k, full) => `
  <path d="M89 121.8 C94.6 124.2 105.4 124.2 111 121.8 C108.6 128.6 91.4 128.6 89 121.8 Z" fill="#6F271F"/>
  <path d="M90.6 122.5 C95.6 124.6 104.4 124.6 109.4 122.5 L109 123.8 C104.2 125.6 95.8 125.6 91 123.8 Z" fill="#FFFFFF"/>
  <path d="M94 126.4 C97.6 127.6 102.4 127.6 106 126.4 C104 128 96 128 94 126.4 Z" fill="#D9706A" opacity=".8"/>
  <path d="M87.2 121.2 C93.6 120 97.6 120.6 100 121.4 C102.4 120.6 106.4 120 112.8 121.2 C106 122.8 94 122.8 87.2 121.2 Z" fill="${k.lipLo}" opacity="${full ? 1 : .7}"/>
  <path d="M91 128.2 C96 131.6 104 131.6 109 128.2 C104 130 96 130 91 128.2 Z" fill="${k.lip}" opacity="${full ? 1 : .55}"/>
  <path d="M86.6 120.4 C87.6 121.4 87.8 122.2 87.4 123.2 M113.4 120.4 C112.4 121.4 112.2 122.2 112.6 123.2" stroke="${k.sh}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>`;
const blush = (p) => `<ellipse cx="78" cy="114" rx="9" ry="6" fill="url(#${p}blush)"/><ellipse cx="122" cy="114" rx="9" ry="6" fill="url(#${p}blush)"/>`;
const face = (p, k, o) => `${brows(o.thinBrows, o.thickBrows)}${eyes(p, k, o.lashes)}${nose(k)}${blush(p)}${o.beard ? beard(p) : ""}${mouth(k, o.fullLips)}${o.beard ? mustache() : ""}`;

// ── hair styles ─────────────────────────────────────────────────────────
const SPIKY_MASS = "M66 94 C62 79 63 64 70 54 C78 43 89 38 102 38 C117 38 130 45 136 58 C140 68 139 81 135 94 L132.6 95 C132 87 130 80 127 76 C118 80 104 80 92 76 C84 74 77 76 72.4 83 C70.4 87 69.4 91 69 95 Z";
const spiky = (p) => `
  ${hairShadow(p, SPIKY_MASS)}
  <path d="${SPIKY_MASS}" fill="url(#${p}hair)"/>
  <path d="M66.6 93 L69.2 93 L69.6 101 L67.4 101 Z M133.4 93 L130.8 93 L130.4 101 L132.6 101 Z" fill="${HAIR.base}"/>
  <path d="M74 55 C73 48 73 43 76 37 C80 42 86 45 91 47 Z M89 45 C89 38 92 32 97 27 C100 33 104 38 108 42 Z M107 43 C111 36 117 32 124 31 C122 37 121 41 119 46 Z" fill="${HAIR.mid}"/>
  <path d="M121 49 C127 45 132 43 138 43 C136 49 133 53 130 57 Z" fill="${HAIR.base}"/>
  <g transform="translate(0 -6)"><path d="M96 77 C90 83 84 88 77 91 C80 85 82 80 84 75 Z M114 79 C108 85 101 89 94 90 C98 85 101 81 102 77 Z M126 76 C123 82 119 86 114 88 C116 84 117 80 117 77 Z" fill="${HAIR.base}"/></g>
  <path d="M71 62 C77 54 86 49 96 48 M92 42 C98 38 106 37 112 39 M110 47 C118 46 126 50 131 56" stroke="${HAIR.hi}" stroke-width="1.6" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M80 68 C88 63 98 61 108 62 M114 64 C121 64 126 68 129 72" stroke="${HAIR.hi}" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/>
  <path d="M112 38 l7 -5" stroke="${HOOD.top}" stroke-width="4" stroke-linecap="round"/>`;

const CURLY_MASS = "M65.5 94 C63 78 64 62 72 52 C80 43 90 39 100 39 C111 39 121 43 128 52 C136 62 137 78 134.5 94 C133 86 131 80 128 75 C118 70.5 82 70.5 72 75 C69 80 67 86 65.5 94 Z";
const curly = (p, k) => {
  // a dense cap of tight curls on top, faded sides
  let curls = "";
  const rows = [[44, 82, 118, 7], [50, 74, 126, 9], [57, 70, 130, 10], [64, 69, 131, 10], [70, 70, 130, 10]];
  rows.forEach(([y, x0, x1, n], r) => {
    for (let i = 0; i < n; i++) {
      const j = Math.sin(i * 12.9898 + r * 78.233) * 43758.5453; const f = j - Math.floor(j);
      const x = x0 + ((x1 - x0) * i) / (n - 1) + (r % 2 ? 2 : 0) + (f - 0.5) * 2.4;
      const yy = y + (f - 0.5) * 2; const rr = 3.4 + f * 1.6;
      curls += `<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="${rr.toFixed(1)}" fill="${f > 0.5 ? HAIR.mid : HAIR.base}"/><path d="M${(x - 2.4).toFixed(1)} ${(yy - 0.6).toFixed(1)} a2.6 2.6 0 0 1 4.6 -1" stroke="${HAIR.hi}" stroke-width="1" fill="none" opacity=".55" stroke-linecap="round"/>`;
    }
  });
  return `
  ${hairShadow(p, CURLY_MASS)}
  <path d="${CURLY_MASS}" fill="url(#${p}hair)"/>
  ${curls}
  <path d="M66 94 C66 86 68 80 71.5 75.5 L73 96 Z M134 94 C134 86 132 80 128.5 75.5 L127 96 Z" fill="${HAIR.base}" opacity=".55"/>
  <path d="M68 100 L72 100 L72.6 106 L68.8 106 Z M132 100 L128 100 L127.4 106 L131.2 106 Z" fill="${HAIR.base}" opacity=".45"/>`;
};

const NEAT_MASS = "M66.4 90 C63 76 65 60 74 50 C82 41 92 37 103 37 C118 37 130 44 135 56 C139 66 138 78 134 90 L132.2 91 C131.6 84 129.6 79 126 75.5 C116 73.6 104 69.6 95 62.5 C90 69.6 82 75.6 73 79.6 C70.8 83.6 69.6 87 69.2 91 Z";
const neat = (p) => `
  ${hairShadow(p, NEAT_MASS)}
  <path d="${NEAT_MASS}" fill="url(#${p}hair)"/>
  <path d="M95 63 C99 56 106 50 114 47" stroke="${HAIR.base}" stroke-width="1.6" fill="none" opacity=".9" stroke-linecap="round"/>
  <path d="M76 60 C82 52 90 48 98 47 M104 56 C113 54 122 57 128 64 M108 64 C116 64 124 68 129 74" stroke="${HAIR.hi}" stroke-width="1.5" fill="none" opacity=".55" stroke-linecap="round"/>
  <path d="M66.8 89 L69.4 89.6 L69.8 100 L67.6 100 Z M133.2 89 L130.6 89.6 L130.2 100 L132.4 100 Z" fill="${HAIR.base}" opacity=".85"/>
  <path d="M84 44 C92 39 104 38 114 41 C122 43 128 48 131 54" stroke="${HAIR.hi}" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>`;

const beard = (p) => `
  <path d="M66.5 100 C67 116 73 131 83 138.5 C89 143 94.5 145.5 100 145.5 C105.5 145.5 111 143 117 138.5 C127 131 133 116 133.5 100 C131 110 127 117 121 120.5 C115 116.8 108 116 100 116.4 C92 116 85 116.8 79 120.5 C73 117 69 110 66.5 100 Z" fill="${HAIR.mid}"/>
  <path d="M72 116 l2 4 M78 126 l2 3.4 M86 134 l1.4 3.4 M100 140 v3.6 M114 134 l-1.4 3.4 M122 126 l-2 3.4 M128 116 l-2 4 M92 138 l.8 3.4 M108 138 l-.8 3.4" stroke="${HAIR.hi}" stroke-width="1.1" opacity=".5" stroke-linecap="round"/>
  <path d="M90 130 C94 134 106 134 110 130 C106 136 94 136 90 130 Z" fill="${HAIR.base}"/>`;
const mustache = () => `
  <path d="M87.6 120.4 C92.6 116.2 97 116.6 100 118 C103 116.6 107.4 116.2 112.4 120.4 C108 120 104 119.6 100 120.6 C96 119.6 92 120 87.6 120.4 Z" fill="${HAIR.mid}"/>`;

const longHairBack = (p) => `<path d="M58 100 C54 66 74 46 100 46 C126 46 146 66 142 100 C143 126 146 150 150 170 C130 178 70 178 50 170 C54 150 57 126 58 100 Z" fill="url(#${p}hair)"/>`;
const longHairFront = (p) => `
  <path d="M60 104 C56 130 54 150 48 172 C56 176 64 176 70 172 C70 152 70 128 72 108 Z M140 104 C144 130 146 150 152 172 C144 176 136 176 130 172 C130 152 130 128 128 108 Z" fill="url(#${p}hair)"/>
  <path d="M60 120 C58 140 56 156 52 168 M140 120 C142 140 144 156 148 168" stroke="${HAIR.hi}" stroke-width="1.4" fill="none" opacity=".45" stroke-linecap="round"/>`;
const FRINGE = "M62 104 C58 74 72 45 100 44 C127 44 143 66 139 100 C135 86 129 76 119 70 C112 76 98 80 86 80 C80 80 74 84 70 92 C67 96 64 100 62 104 Z";
const fringe = (p) => `
  ${hairShadow(p, FRINGE)}
  <path d="${FRINGE}" fill="url(#${p}hair)"/>
  <path d="M112 58 C104 62 96 70 88 78" stroke="${HAIR.base}" stroke-width="1.6" fill="none" opacity=".8" stroke-linecap="round"/>
  <path d="M72 76 C80 66 92 60 104 58 M118 62 C126 66 132 74 135 84" stroke="${HAIR.hi}" stroke-width="1.5" fill="none" opacity=".5" stroke-linecap="round"/>`;

const scarfBack = (p, s) => `
  <path d="M44 106 C42 66 68 42 100 42 C132 42 158 66 156 106 C155 134 152 152 160 172 C140 182 120 184 100 184 C80 184 60 182 40 172 C48 152 45 134 44 106 Z" fill="url(#${p}hood)"/>
  <path d="M52 150 C64 170 84 178 100 178 C116 178 136 170 148 150 M48 120 C50 140 56 156 66 166 M152 120 C150 140 144 156 134 166" stroke="${s.fold}" stroke-width="2.2" fill="none" opacity=".5" stroke-linecap="round"/>
  <path d="M58 70 C66 56 82 48 100 47 M142 70 C134 56 118 48 100 47" stroke="${s.rim}" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M62 98 C62 68 78 54 100 54 C122 54 138 68 138 98 C138 128 122 146 100 146 C78 146 62 128 62 98 Z" fill="${s.fold}" opacity=".6"/>`;
const scarfBand = (p, s) => `
  ${hairShadow(p, "M66 86 C70 66 84 55 100 55 C116 55 130 66 134 86 C126 74 114 69 100 69 C86 69 74 74 66 86 Z")}
  <path d="M66 86 C70 66 84 55 100 55 C116 55 130 66 134 86 C126 74 114 69 100 69 C86 69 74 74 66 86 Z" fill="${s.band}"/>`;
const SCARVES = {
  orange: { top: "#FF6A2C", bottom: "#D9441A", fold: "#A33210", rim: "#FF9A6A", band: "#17171C" },
  navy: { top: "#3A4A6B", bottom: "#24304A", fold: "#141B2B", rim: "#6E80A6", band: "#161C2C" },
  rose: { top: "#C9768A", bottom: "#A4566B", fold: "#7A3A4C", rim: "#E8A3B3", band: "#17171C" },
};

// ── a full avatar from options ──────────────────────────────────────────
function avatar(p, o) {
  const k = SKINS[o.skin];
  if (o.scarf) {
    const s = SCARVES[o.scarf];
    return `${defs(p, k, s)}${body(p)}${scarfBack(p, s)}${head(p, k)}${scarfBand(p, s)}${face(p, k, { ...o, thinBrows: true, lashes: true, fullLips: true })}`;
  }
  const girl = o.hair === "long";
  return `${defs(p, k)}${girl ? longHairBack(p) : ""}${body(p)}${hoodBack(p)}${neck(p)}${collar(p)}${girl ? longHairFront(p) : ""}${ears(p, k)}${head(p, k)}
    ${o.hair === "spiky" ? spiky(p) : o.hair === "curly" ? curly(p, k) : o.hair === "neat" ? neat(p) : fringe(p)}
    ${face(p, k, { ...o, thinBrows: girl, lashes: girl, fullLips: girl })}`;
}

const VARIANTS = {
  "boy-1": { skin: "light", hair: "spiky" },
  "boy-2": { skin: "wheat", hair: "neat" },
  "boy-3": { skin: "brown", hair: "curly" },
  "boy-4": { skin: "wheat", hair: "neat", beard: true, thickBrows: true },
  "girl-1": { skin: "light", hair: "long" },
  "girl-2": { skin: "wheat", scarf: "orange" },
  "girl-3": { skin: "brown", hair: "long" },
  "girl-4": { skin: "light", scarf: "navy" },
};
module.exports = { avatar, VARIANTS };

if (require.main === module) {
  const fs = require("fs");
  const path = require("path");
  const out = path.join(__dirname, "..", "src", "assets", "avatars");
  fs.mkdirSync(out, { recursive: true });
  for (const id of Object.keys(VARIANTS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#fff" opacity=".13"/>${avatar(id.replace("-", ""), VARIANTS[id])}</svg>`.replace(/\n\s*/g, "\n");
    fs.writeFileSync(path.join(out, `${id}.svg`), svg);
  }
  console.log(`wrote ${Object.keys(VARIANTS).length} avatars to ${out}`);
  if (process.argv[2]) {
    const sharp = require("sharp");
    const bgs = ["#1CB0F6", "#FFC800", "#58CC02", "#CE82FF"];
    const ids = Object.keys(VARIANTS);
    const disc = (id, i, size) => `<svg viewBox="0 0 200 200" width="${size}" height="${size}"><defs><clipPath id="c${i}${size}"><circle cx="100" cy="100" r="100"/></clipPath></defs><g clip-path="url(#c${i}${size})"><circle cx="100" cy="100" r="100" fill="${bgs[i % 4]}"/><circle cx="100" cy="100" r="80" fill="#fff" opacity=".13"/>${avatar("a" + i + "s" + size, VARIANTS[id])}</g></svg>`;
    const parts = ids.map((id, i) => `<g transform="translate(${10 + (i % 4) * 390},${10 + Math.floor(i / 4) * 390})">${disc(id, i, 370)}</g>`);
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1570" height="790"><rect width="1570" height="790" fill="#F7F7F7"/>${parts.join("")}</svg>`)).png().toFile(process.argv[2]).then(() => console.log("sheet:", process.argv[2]));
  }
}
