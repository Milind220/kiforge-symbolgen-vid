# AGENTS.md

Personal notes for working in this repo (symbol-gen). Short, practical, derived from CLAUDE.md.

## Project
- KiForge launch video: Symbol Generator (Remotion/React).
- Brand: fast, precise, minimal; terminal crisp + minimal GUI.
- Visual: boxy, sharp edges; shadcn/Lyra vibe.

## Style + Theme
- Fonts: Geist + Geist Mono.
- Dark palette: #000000, #272727, #adadad, #ffffff, #008282.
- Light palette: #fdf6e3, #eee8d5, #000000, #272727, #008282.

## Code + Architecture
- Entry: `src/index.ts`, `src/Root.tsx`, `src/Composition.tsx`.
- Config: `remotion.config.ts` + Tailwind v4; theme in `src/index.css`.

## Parameterization (must)
- No magic numbers; constants for timing/colors/sizes/animation values.
- Define keyframes; derive all later timings from prior keyframes.
- Named easing/spring presets.

## Visual Continuity
- Keep motion direction consistent unless intentional.
- Keep shapes/composition evolving, not resetting.
- Avoid camera direction flips; smooth continuity.

## Audio Reactivity
- Prefer `@remotion/media-utils` FFT; avoid hardcoded beat timestamps.
- Drive scale/opacity/position/glow/particles from bass bins.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npx remotion render`.

## Commits
- Conventional: `feat|fix|style|chore|docs|refactor`.

## Remotion guidance
- Use skill: `.agents/skills/remotion-best-practices/`.
