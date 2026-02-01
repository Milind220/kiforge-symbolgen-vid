# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**KiForge** is the AI layer for KiCAD. Software engineering has leaped ahead in the past 20 years, but PCB design and electrical engineering tools haven't changed significantly. That changes now — without it, PCB design becomes a bottleneck while everything else around it moves fast.

This is the launch video for **Symbol Generator**, KiForge's first product. The idea: you never have to hand-draw schematic symbols ever again.

**Brand Feel:**
- The crispness and speed of doing things in a terminal (evoking the speed of code)
- The sleekness of a minimal GUI (accessible for electrical engineers)
- Fast, precise, modern
- Visual style like shadcn/Lyra — boxy, sharp edges, minimal

## Color Themes

**Fonts:** Geist (sans) and Geist Mono throughout.

**Dark Mode** (Vercel/MKBHD style):
- `black` (#000000) — primary background
- `shadow-grey` (#272727) — secondary background, carbon/graphite accents
- `silver` (#adadad) — matte silver for shapes and drawings
- `white` (#ffffff) — text
- `teal` (#008282) — highlights

**Light Mode** (Solarized Light style):
- `ivory-mist` (#fdf6e3) — primary background
- `eggshell` (#eee8d5) — secondary background
- `black` (#000000) — text
- `shadow-grey` (#272727) — elements
- `teal` (#008282) — highlights

## Commit Convention

Use conventional commit prefixes: `feat:`, `fix:`, `style:`, `chore:`, `docs:`, `refactor:`

## Commands

```bash
npm run dev      # Start Remotion Studio preview
npm run build    # Bundle the project
npm run lint     # Run ESLint and TypeScript checks
npx remotion render  # Render video output
```

## Architecture

This is a Remotion project for programmatic video creation using React.

**Entry Points:**
- `src/index.ts` - Registers the Remotion root
- `src/Root.tsx` - Defines compositions with dimensions, fps, and duration
- `src/Composition.tsx` - Main video component

**Configuration:**
- `remotion.config.ts` - CLI config with Tailwind v4 integration enabled
- Tailwind v4 is configured via `@remotion/tailwind-v4` with custom theme colors in `src/index.css`

## Parameterization (CRITICAL)

**Always parameterize everything.** Create reusable, intuitive, well-named constants for all values:

### Keyframe-Based Timing
Think in keyframes — frames where something significant happens (animation starts/ends, transitions trigger). Define keyframes as constants and calculate all timings relative to them so changes cascade automatically.

```tsx
// Example: Define keyframes and durations as constants
const INTRO_START = 0;
const INTRO_DURATION = 45;
const LOGO_REVEAL_START = INTRO_START + INTRO_DURATION;
const LOGO_REVEAL_DURATION = 30;
const FEATURE_SECTION_START = LOGO_REVEAL_START + LOGO_REVEAL_DURATION;
// ... subsequent sections derive from previous ones
```

### What to Parameterize
- **Timing**: All keyframes, durations, delays, transition lengths
- **Colors**: Use semantic names (`PRIMARY_ACCENT`, `BG_DARK`) not raw hex values
- **Sizes**: Dimensions, margins, font sizes, stroke widths
- **Animation values**: Scale factors, rotation degrees, opacity levels
- **Easing/springs**: Define named presets for consistent motion

### Why This Matters
This is a KiForge.io launch video with many animations. If you change how long a transition takes, everything after it should shift automatically. Never hardcode frame numbers mid-component — always derive from constants.

## Visual Continuity (KEEP IT SIMPLE)

Once you establish a motion, shape, or theme — **keep playing with it**. Don't change things abruptly unless intentional.

- **Motion direction**: If things are moving up, the next element probably wants to move up too. Don't go up → down → left → up. Pick a direction and commit, or switch only with purpose.
- **Shapes**: If there's a centered box as the main character, the next scene probably wants a similarly sized centered box. Let elements evolve from each other.
- **Camera**: Don't switch camera motions and directions every few seconds. Maintain consistent movement patterns.

This gives the video fluidity and continuity. Abrupt changes feel jarring; intentional consistency feels polished.

## Audio-Reactive Animations

Sync visuals to the music using `@remotion/media-utils` — don't hardcode beat timestamps.

This package provides real-time frequency analysis (FFT) for each frame during rendering. Extract bass intensity (low frequencies) and use it to drive animations: scaling, opacity, position, color shifts, particle bursts, text reveals — all synced frame-perfectly to kicks and beats.

**Why this approach:**
- Works for any song without knowing beat locations upfront
- Frame-perfect sync, automatically
- Same technique used in Remotion's official music visualization templates

**What to drive with audio:**
- Scale pulses on bass hits
- Opacity/glow intensity
- Position offsets or shake
- Color shifts or saturation boosts
- Particle emission rates
- Element reveals timed to drops

**Tuning for your song:**
Tweak the bin slice, power, and thresholds to match the track. Bass/kicks usually live in the lowest 5–15 bins. If syncing to highs or mids instead (hats, synths), adjust the bin range accordingly. Experiment with power curves and thresholds until hits feel crisp and reactive.

## Remotion Patterns

Use the `remotion-best-practices` skill (`.agents/skills/remotion-best-practices/`) for domain-specific guidance on:
- Animations and timing (interpolation, springs, easing)
- Audio/video embedding and trimming
- Captions and subtitles
- 3D content with Three.js
- Sequencing and transitions
