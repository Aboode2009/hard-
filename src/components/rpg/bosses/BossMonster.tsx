import { motion } from "framer-motion";
import type { BossArtProps } from "./types";

/**
 * BossMonster artwork.
 *
 * GENERATED from src/assets/boss-monster.svg by scripts/generate-boss-art.cjs.
 * Edit the SVG and re-run the script rather than editing this file.
 *
 * Named groups are `motion.g` elements so the shared controller in
 * BossCreature.tsx can animate body, head, tail, wings, eyes and shadow
 * independently. All four bosses expose the same group names.
 */
export const BossMonster = ({ groups = {} }: BossArtProps) => (
  <>
    <defs>
        <linearGradient id="moHide" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#2E5F3A"/><stop offset="55%" stopColor="#1A3D24"/><stop offset="100%" stopColor="#0B1F12"/>
        </linearGradient>
        <linearGradient id="moHead" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#3A7546"/><stop offset="60%" stopColor="#1F4A2B"/><stop offset="100%" stopColor="#0D2415"/>
        </linearGradient>
        <linearGradient id="moClaw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4DCC6"/><stop offset="100%" stopColor="#8A7F63"/>
        </linearGradient>
        <radialGradient id="moEyeGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#C6FF4A" stopOpacity="0.95"/><stop offset="60%" stopColor="#8BD32A" stopOpacity="0.28"/><stop offset="100%" stopColor="#8BD32A" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="moShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.55"/><stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <motion.ellipse id="bsGroundShadow" {...(groups.shadow ?? {})} cx="200" cy="392" rx="126" ry="21" fill="url(#moShadow)"/>

      <motion.g id="bsTail" {...(groups.tail ?? {})}>
        <path d="M272 330 C 320 342, 356 320, 356 284 C 356 258, 336 244, 320 251 C 306 257, 306 274, 316 280"
              fill="none" stroke="#1A3D24" strokeWidth="24" strokeLinecap="round"/>
        <path d="M316 280 l 24 -16 l -8 18 l 20 -2 Z" fill="url(#moClaw)"/>
      </motion.g>

      <motion.g id="bsWings" {...(groups.wings ?? {})}>
        <motion.g id="bsWingLeft" {...(groups.wingLeft ?? {})}>
          <path d="M138 218 l -30 -46 l 8 44 l -34 -22 l 22 40 Z" fill="#16331F"/>
          <path d="M108 172 l -6 -14 M104 240 l -16 -4" stroke="url(#moClaw)" strokeWidth="5" strokeLinecap="round"/>
        </motion.g>
        <motion.g id="bsWingRight" {...(groups.wingRight ?? {})}>
          <path d="M262 218 l 30 -46 l -8 44 l 34 -22 l -22 40 Z" fill="#16331F"/>
          <path d="M292 172 l 6 -14 M296 240 l 16 -4" stroke="url(#moClaw)" strokeWidth="5" strokeLinecap="round"/>
        </motion.g>
      </motion.g>

      <motion.g id="bsBody" {...(groups.body ?? {})}>
        <path d="M200 200 C 142 200, 108 250, 114 306 C 120 356, 156 380, 200 380 C 244 380, 280 356, 286 306 C 292 250, 258 200, 200 200 Z" fill="url(#moHide)"/>
        <ellipse cx="200" cy="310" rx="62" ry="52" fill="#2E5F3A" opacity="0.55"/>
        <path d="M162 292 h 76 M158 320 h 84 M170 266 h 60" stroke="#0B1F12" strokeWidth="5" strokeLinecap="round" opacity="0.65"/>
        <path d="M118 258 l -22 -14 l 26 -8 Z M112 302 l -24 -8 l 24 -18 Z" fill="url(#moClaw)"/>
        <path d="M282 258 l 22 -14 l -26 -8 Z M288 302 l 24 -8 l -24 -18 Z" fill="url(#moClaw)"/>
        <path d="M126 268 C 96 288, 94 322, 116 336 C 132 346, 152 334, 150 316" fill="none" stroke="#1A3D24" strokeWidth="28" strokeLinecap="round"/>
        <path d="M274 268 C 304 288, 306 322, 284 336 C 268 346, 248 334, 250 316" fill="none" stroke="#1A3D24" strokeWidth="28" strokeLinecap="round"/>
        <path d="M106 338 l -14 12 M116 348 l -10 16 M130 352 l -4 18" stroke="url(#moClaw)" strokeWidth="6" strokeLinecap="round"/>
        <path d="M294 338 l 14 12 M284 348 l 10 16 M270 352 l 4 18" stroke="url(#moClaw)" strokeWidth="6" strokeLinecap="round"/>
        <path d="M156 378 l -12 -14 M172 382 l -2 -16 M188 378 l 10 -14" stroke="url(#moClaw)" strokeWidth="7" strokeLinecap="round"/>
        <path d="M244 378 l 12 -14 M228 382 l 2 -16 M212 378 l -10 -14" stroke="url(#moClaw)" strokeWidth="7" strokeLinecap="round"/>
      </motion.g>

      <motion.g id="bsHead" {...(groups.head ?? {})}>
        <path id="bsHornLeft"  d="M148 108 C 130 76, 108 56, 78 44 C 96 76, 110 92, 130 126 Z" fill="url(#moClaw)"/>
        <path id="bsHornRight" d="M252 108 C 270 76, 292 56, 322 44 C 304 76, 290 92, 270 126 Z" fill="url(#moClaw)"/>
        <path d="M200 74 C 148 74, 114 112, 116 158 C 118 198, 146 222, 178 230 L 222 230 C 254 222, 282 198, 284 158 C 286 112, 252 74, 200 74 Z" fill="url(#moHead)"/>
        <path d="M132 132 L 192 148 L 188 160 L 130 150 Z" fill="#0D2415"/>
        <path d="M268 132 L 208 148 L 212 160 L 270 150 Z" fill="#0D2415"/>
        <motion.g id="bsEyes" {...(groups.eyes ?? {})}>
          <motion.ellipse id="bsGlowLeft" {...(groups.glowLeft ?? {})}  cx="166" cy="160" rx="32" ry="25" fill="url(#moEyeGlow)"/>
          <motion.ellipse id="bsGlowRight" {...(groups.glowRight ?? {})} cx="234" cy="160" rx="32" ry="25" fill="url(#moEyeGlow)"/>
          <path id="bsEyeLeft"  d="M144 160 L 176 150 L 188 162 L 156 172 Z" fill="#C6FF4A"/>
          <path id="bsEyeRight" d="M256 160 L 224 150 L 212 162 L 244 172 Z" fill="#C6FF4A"/>
          <motion.path id="bsPupilLeft" {...(groups.pupilLeft ?? {})}  d="M160 158 L 168 156 L 170 166 L 162 168 Z" fill="#0F2400"/>
          <motion.path id="bsPupilRight" {...(groups.pupilRight ?? {})} d="M240 158 L 232 156 L 230 166 L 238 168 Z" fill="#0F2400"/>
          <ellipse cx="200" cy="120" rx="15" ry="11" fill="#C6FF4A" opacity="0.9"/>
          <ellipse cx="200" cy="120" rx="5" ry="9" fill="#0F2400"/>
        </motion.g>
        <path d="M140 196 L 260 196 C 260 224, 232 244, 200 244 C 168 244, 140 224, 140 196 Z" fill="#0A1A0E"/>
        <path d="M148 198 l 8 20 l 9 -19 Z M172 199 l 8 21 l 9 -20 Z M196 200 l 8 21 l 9 -20 Z M220 199 l 8 20 l 9 -19 Z M244 197 l 7 18 l 9 -17 Z" fill="#E4DCC6"/>
        <path d="M158 242 l 6 -16 l 9 14 Z M198 246 l 5 -17 l 9 15 Z M236 242 l -6 -16 l -9 14 Z" fill="#E4DCC6"/>
        <motion.path id="bsMouth" {...(groups.mouth ?? {})} d="M140 196 L 260 196" stroke="#050D07" strokeWidth="4"/>
        <ellipse cx="186" cy="184" rx="5" ry="6" fill="#0D2415"/>
        <ellipse cx="214" cy="184" rx="5" ry="6" fill="#0D2415"/>
      </motion.g>
  </>
);
