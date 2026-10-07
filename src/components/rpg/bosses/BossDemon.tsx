import { motion } from "framer-motion";
import type { BossArtProps } from "./types";

/**
 * BossDemon artwork.
 *
 * GENERATED from src/assets/boss-demon.svg by scripts/generate-boss-art.cjs.
 * Edit the SVG and re-run the script rather than editing this file.
 *
 * Named groups are `motion.g` elements so the shared controller in
 * BossCreature.tsx can animate body, head, tail, wings, eyes and shadow
 * independently. All four bosses expose the same group names.
 */
export const BossDemon = ({ groups = {} }: BossArtProps) => (
  <>
    <defs>
        <linearGradient id="dmSkin" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#8E1B12"/><stop offset="55%" stopColor="#5A0D0A"/><stop offset="100%" stopColor="#2B0404"/>
        </linearGradient>
        <linearGradient id="dmHead" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#A32117"/><stop offset="60%" stopColor="#66100C"/><stop offset="100%" stopColor="#330605"/>
        </linearGradient>
        <linearGradient id="dmHorn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A2A22"/><stop offset="100%" stopColor="#120A07"/>
        </linearGradient>
        <radialGradient id="dmEyeGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFC400" stopOpacity="0.95"/><stop offset="60%" stopColor="#FF8A00" stopOpacity="0.3"/><stop offset="100%" stopColor="#FF8A00" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="dmShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.55"/><stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <motion.ellipse id="bsGroundShadow" {...(groups.shadow ?? {})} cx="200" cy="392" rx="112" ry="20" fill="url(#dmShadow)"/>

      <motion.g id="bsTail" {...(groups.tail ?? {})}>
        <path d="M262 322 C 312 336, 352 312, 352 272 C 352 244, 330 228, 312 236 C 296 243, 296 262, 308 269"
              fill="none" stroke="#4A0A08" strokeWidth="22" strokeLinecap="round"/>
        <path d="M308 269 l 24 -14 l -10 16 l 20 0 Z" fill="url(#dmHorn)"/>
      </motion.g>

      <motion.g id="bsWings" {...(groups.wings ?? {})}>
        <motion.g id="bsWingLeft" {...(groups.wingLeft ?? {})}>
          <path d="M140 232 C 92 190, 48 190, 40 222 C 32 254, 62 292, 116 286 C 134 284, 143 270, 140 254 Z" fill="#3A0706"/>
          <path d="M138 240 C 106 216, 74 212, 54 224 M138 260 C 104 256, 78 264, 62 278" fill="none" stroke="#7A1210" strokeWidth="3" opacity="0.65"/>
        </motion.g>
        <motion.g id="bsWingRight" {...(groups.wingRight ?? {})}>
          <path d="M260 232 C 308 190, 352 190, 360 222 C 368 254, 338 292, 284 286 C 266 284, 257 270, 260 254 Z" fill="#3A0706"/>
          <path d="M262 240 C 294 216, 326 212, 346 224 M262 260 C 296 256, 322 264, 338 278" fill="none" stroke="#7A1210" strokeWidth="3" opacity="0.65"/>
        </motion.g>
      </motion.g>

      <motion.g id="bsBody" {...(groups.body ?? {})}>
        <path d="M200 210 C 154 210, 128 252, 132 302 C 136 348, 164 376, 200 376 C 236 376, 264 348, 268 302 C 272 252, 246 210, 200 210 Z" fill="url(#dmSkin)"/>
        <path d="M172 258 C 186 276, 214 276, 228 258 M168 292 C 184 312, 216 312, 232 292" fill="none" stroke="#2B0404" strokeWidth="7" strokeLinecap="round" opacity="0.8"/>
        <path d="M200 246 L 224 292 L 200 336 L 176 292 Z" fill="#B02A1C" opacity="0.5"/>
        <path d="M142 280 C 116 296, 114 324, 132 336 C 146 345, 162 334, 160 318" fill="none" stroke="#5A0D0A" strokeWidth="24" strokeLinecap="round"/>
        <path d="M258 280 C 284 296, 286 324, 268 336 C 254 345, 238 334, 240 318" fill="none" stroke="#5A0D0A" strokeWidth="24" strokeLinecap="round"/>
        <path d="M124 338 l -12 10 M132 346 l -8 14 M144 350 l -2 16" stroke="#2A1D16" strokeWidth="5" strokeLinecap="round"/>
        <path d="M276 338 l 12 10 M268 346 l 8 14 M256 350 l 2 16" stroke="#2A1D16" strokeWidth="5" strokeLinecap="round"/>
        <path d="M160 372 l -10 -12 M174 376 l -2 -14 M188 372 l 8 -12" stroke="#2A1D16" strokeWidth="6" strokeLinecap="round"/>
        <path d="M240 372 l 10 -12 M226 376 l 2 -14 M212 372 l -8 -12" stroke="#2A1D16" strokeWidth="6" strokeLinecap="round"/>
      </motion.g>

      <motion.g id="bsHead" {...(groups.head ?? {})}>
        <path id="bsHornLeft"  d="M152 92 C 132 56, 106 32, 72 18 C 90 54, 104 74, 128 114 Z" fill="url(#dmHorn)"/>
        <path id="bsHornRight" d="M248 92 C 268 56, 294 32, 328 18 C 310 54, 296 74, 272 114 Z" fill="url(#dmHorn)"/>
        <path d="M124 84 C 108 66, 92 60, 78 64 C 94 76, 104 88, 116 104 Z" fill="url(#dmHorn)" opacity="0.75"/>
        <path d="M276 84 C 292 66, 308 60, 322 64 C 306 76, 296 88, 284 104 Z" fill="url(#dmHorn)" opacity="0.75"/>
        <path d="M200 70 C 154 70, 124 106, 126 150 C 128 188, 150 212, 178 222 L 222 222 C 250 212, 272 188, 274 150 C 276 106, 246 70, 200 70 Z" fill="url(#dmHead)"/>
        <path d="M140 126 L 194 142 L 190 154 L 138 144 Z" fill="#2B0404"/>
        <path d="M260 126 L 206 142 L 210 154 L 262 144 Z" fill="#2B0404"/>
        <motion.g id="bsEyes" {...(groups.eyes ?? {})}>
          <motion.ellipse id="bsGlowLeft" {...(groups.glowLeft ?? {})}  cx="168" cy="154" rx="30" ry="24" fill="url(#dmEyeGlow)"/>
          <motion.ellipse id="bsGlowRight" {...(groups.glowRight ?? {})} cx="232" cy="154" rx="30" ry="24" fill="url(#dmEyeGlow)"/>
          <path id="bsEyeLeft"  d="M148 154 L 178 144 L 190 156 L 160 166 Z" fill="#FFC400"/>
          <path id="bsEyeRight" d="M252 154 L 222 144 L 210 156 L 240 166 Z" fill="#FFC400"/>
          <motion.path id="bsPupilLeft" {...(groups.pupilLeft ?? {})}  d="M164 152 L 172 150 L 174 160 L 166 162 Z" fill="#2B1400"/>
          <motion.path id="bsPupilRight" {...(groups.pupilRight ?? {})} d="M236 152 L 228 150 L 226 160 L 234 162 Z" fill="#2B1400"/>
        </motion.g>
        <path d="M158 190 L 242 190 C 242 214, 222 230, 200 230 C 178 230, 158 214, 158 190 Z" fill="#1E0303"/>
        <path d="M166 192 l 7 18 l 8 -17 Z M188 194 l 7 18 l 8 -17 Z M210 194 l 7 18 l 8 -17 Z M232 191 l 6 16 l 8 -15 Z" fill="#E8E0D0"/>
        <path d="M172 228 l 5 -14 l 8 12 Z M222 228 l -5 -14 l -8 12 Z" fill="#E8E0D0"/>
        <ellipse cx="188" cy="176" rx="5" ry="6" fill="#2B0404"/>
        <ellipse cx="212" cy="176" rx="5" ry="6" fill="#2B0404"/>
        <motion.path id="bsMouth" {...(groups.mouth ?? {})} d="M158 190 L 242 190" stroke="#0F0202" strokeWidth="4"/>
      </motion.g>
  </>
);
