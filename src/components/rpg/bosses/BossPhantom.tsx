import { motion } from "framer-motion";
import type { BossArtProps } from "./types";

/**
 * BossPhantom artwork.
 *
 * GENERATED from src/assets/boss-phantom.svg by scripts/generate-boss-art.cjs.
 * Edit the SVG and re-run the script rather than editing this file.
 *
 * Named groups are `motion.g` elements so the shared controller in
 * BossCreature.tsx can animate body, head, tail, wings, eyes and shadow
 * independently. All four bosses expose the same group names.
 */
export const BossPhantom = ({ groups = {} }: BossArtProps) => (
  <>
    <defs>
        <linearGradient id="phBody" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#CFE3F0" stopOpacity="0.96"/>
          <stop offset="55%" stopColor="#8FA9C4" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#4A5F7C" stopOpacity="0.35"/>
        </linearGradient>
        <linearGradient id="phHood" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#9FB8D0" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#41556F" stopOpacity="0.75"/>
        </linearGradient>
        <radialGradient id="phVoid" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="#04070C"/><stop offset="70%" stopColor="#0B1119"/><stop offset="100%" stopColor="#1B2635" stopOpacity="0.85"/>
        </radialGradient>
        <radialGradient id="phEyeGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7DF9FF" stopOpacity="0.95"/><stop offset="55%" stopColor="#39C6E0" stopOpacity="0.28"/><stop offset="100%" stopColor="#39C6E0" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="phAura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7DF9FF" stopOpacity="0.16"/><stop offset="100%" stopColor="#7DF9FF" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="phShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.4"/><stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <motion.ellipse id="bsGroundShadow" {...(groups.shadow ?? {})} cx="200" cy="392" rx="92" ry="16" fill="url(#phShadow)"/>
      <ellipse id="bsAura" cx="200" cy="210" rx="160" ry="180" fill="url(#phAura)"/>

      <motion.g id="bsTail" {...(groups.tail ?? {})}>
        <path d="M132 300 C 122 336, 136 356, 128 384 C 118 360, 112 336, 116 306 Z" fill="#6B85A4" opacity="0.5"/>
        <path d="M268 300 C 278 336, 264 356, 272 384 C 282 360, 288 336, 284 306 Z" fill="#6B85A4" opacity="0.5"/>
        <path d="M200 330 C 196 358, 206 372, 200 392 C 190 374, 186 352, 190 332 Z" fill="#7E97B4" opacity="0.4"/>
      </motion.g>

      <motion.g id="bsWings" {...(groups.wings ?? {})}>
        <motion.g id="bsWingLeft" {...(groups.wingLeft ?? {})}>
          <path d="M136 214 C 88 196, 52 214, 46 246 C 40 278, 76 296, 122 282 C 138 277, 143 260, 136 244 Z" fill="#6B85A4" opacity="0.42"/>
        </motion.g>
        <motion.g id="bsWingRight" {...(groups.wingRight ?? {})}>
          <path d="M264 214 C 312 196, 348 214, 354 246 C 360 278, 324 296, 278 282 C 262 277, 257 260, 264 244 Z" fill="#6B85A4" opacity="0.42"/>
        </motion.g>
      </motion.g>

      <motion.g id="bsBody" {...(groups.body ?? {})}>
        <path d="M200 176 C 148 176, 120 230, 124 292 C 127 336, 140 356, 136 380 C 154 366, 160 348, 176 356 C 188 362, 196 380, 200 380 C 204 380, 212 362, 224 356 C 240 348, 246 366, 264 380 C 260 356, 273 336, 276 292 C 280 230, 252 176, 200 176 Z" fill="url(#phBody)"/>
        <path d="M170 260 C 182 276, 218 276, 230 260" fill="none" stroke="#516A88" strokeWidth="5" strokeLinecap="round" opacity="0.6"/>
        <path d="M162 300 C 180 320, 220 320, 238 300" fill="none" stroke="#516A88" strokeWidth="5" strokeLinecap="round" opacity="0.5"/>
        <path d="M142 244 C 112 258, 104 288, 120 304 C 132 316, 150 308, 150 292" fill="none" stroke="#8FA9C4" strokeWidth="20" strokeLinecap="round" opacity="0.8"/>
        <path d="M258 244 C 288 258, 296 288, 280 304 C 268 316, 250 308, 250 292" fill="none" stroke="#8FA9C4" strokeWidth="20" strokeLinecap="round" opacity="0.8"/>
        <path d="M114 306 l -10 12 M122 312 l -6 16 M132 316 l 0 16" stroke="#CFE3F0" strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
        <path d="M286 306 l 10 12 M278 312 l 6 16 M268 316 l 0 16" stroke="#CFE3F0" strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
      </motion.g>

      <motion.g id="bsHead" {...(groups.head ?? {})}>
        <path d="M200 54 C 146 54, 116 96, 118 148 C 119 184, 140 210, 166 220 L 234 220 C 260 210, 281 184, 282 148 C 284 96, 254 54, 200 54 Z" fill="url(#phHood)"/>
        <path d="M200 78 C 162 78, 142 108, 143 146 C 144 178, 164 202, 200 206 C 236 202, 256 178, 257 146 C 258 108, 238 78, 200 78 Z" fill="url(#phVoid)"/>
        <motion.g id="bsEyes" {...(groups.eyes ?? {})}>
          <motion.ellipse id="bsGlowLeft" {...(groups.glowLeft ?? {})}  cx="172" cy="144" rx="30" ry="26" fill="url(#phEyeGlow)"/>
          <motion.ellipse id="bsGlowRight" {...(groups.glowRight ?? {})} cx="228" cy="144" rx="30" ry="26" fill="url(#phEyeGlow)"/>
          <path id="bsEyeLeft"  d="M154 146 L 182 134 L 192 148 L 164 160 Z" fill="#7DF9FF"/>
          <path id="bsEyeRight" d="M246 146 L 218 134 L 208 148 L 236 160 Z" fill="#7DF9FF"/>
          <motion.path id="bsPupilLeft" {...(groups.pupilLeft ?? {})}  d="M168 144 L 176 141 L 178 152 L 170 155 Z" fill="#052026"/>
          <motion.path id="bsPupilRight" {...(groups.pupilRight ?? {})} d="M232 144 L 224 141 L 222 152 L 230 155 Z" fill="#052026"/>
        </motion.g>
        <motion.path id="bsMouth" {...(groups.mouth ?? {})} d="M176 182 L 182 192 L 190 180 L 198 194 L 206 180 L 214 192 L 224 182" fill="none" stroke="#7DF9FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
        <path d="M118 148 C 100 138, 88 146, 90 160 M282 148 C 300 138, 312 146, 310 160" fill="none" stroke="#8FA9C4" strokeWidth="7" strokeLinecap="round" opacity="0.6"/>
      </motion.g>
  </>
);
