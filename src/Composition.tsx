import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

// =============================================================================
// TIMING CONSTANTS (in frames)
// =============================================================================
const BLANK_DURATION = 10; // Frames of blank screen before first word
const FIRST_WORD_APPEAR = BLANK_DURATION; // Frame 10
const WORD_STAGGER = 3; // Frames between each word appearing (overlap with previous)
const EASE_DURATION = 5; // Total frames to ease into final position
const WORD_START_OFFSET = 25; // Pixels below final position when appearing

// Later animation timing (in seconds, converted to frames via fps)
const CHANGE_START_TIME = 1.5; // When "symbols" and "Still" change (after words settle)
const CHANGE_DURATION = 0.15; // How long the transition takes

// =============================================================================
// WORDLET DATA
// =============================================================================
// Each wordlet is an individual animation unit
const WORDLETS = [
  "Still",
  " draw",
  "ing",
  " sym",
  "bols",
  " by",
  " ha",
  "nd",
  "?",
] as const;

// =============================================================================
// STYLE CONSTANTS
// =============================================================================
const COLORS = {
  background: "#000000",
  text: "#ffffff",
  teal: "#008282",
} as const;

const FONTS = {
  sans: "Geist, system-ui, sans-serif",
  mono: "Geist Mono, ui-monospace, monospace",
} as const;

const TYPOGRAPHY = {
  fontSize: 56,
  fontWeightNormal: 400,
  fontWeightBold: 700,
} as const;

// =============================================================================
// HELPERS
// =============================================================================

// Get the frame when a wordlet first appears
const getWordletAppearFrame = (index: number): number =>
  FIRST_WORD_APPEAR + index * WORD_STAGGER;

// Get wordlet's current Y offset and opacity based on frame
const getWordletAnimation = (
  frame: number,
  index: number
): { yOffset: number; opacity: number } => {
  const appearFrame = getWordletAppearFrame(index);

  // Word hasn't appeared yet
  if (frame < appearFrame) {
    return { yOffset: WORD_START_OFFSET, opacity: 0 };
  }

  const framesSinceAppear = frame - appearFrame;

  // Word is fully in position
  if (framesSinceAppear >= EASE_DURATION) {
    return { yOffset: 0, opacity: 1 };
  }

  // Easing in: strong ease-out curve (fast start, tiny movement at end)
  // Using cubic for pronounced deceleration in final frames
  const progress = interpolate(
    framesSinceAppear,
    [0, EASE_DURATION],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  const easedProgress = Easing.out(Easing.cubic)(progress);

  return {
    yOffset: WORD_START_OFFSET * (1 - easedProgress),
    opacity: 1,
  };
};

// =============================================================================
// MAIN COMPOSITION
// =============================================================================

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert timing constants to frames for the later color/weight transition
  const changeStartFrame = CHANGE_START_TIME * fps;
  const changeEndFrame = (CHANGE_START_TIME + CHANGE_DURATION) * fps;

  // Calculate transition progress (0 to 1) for color/weight changes
  const transitionProgress = interpolate(
    frame,
    [changeStartFrame, changeEndFrame],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Interpolate colors for "symbols"
  const symbolsColor = interpolateColor(COLORS.text, COLORS.teal, transitionProgress);

  // Interpolate font weight for "Still"
  const stillFontWeight = interpolate(
    transitionProgress,
    [0, 1],
    [TYPOGRAPHY.fontWeightNormal, TYPOGRAPHY.fontWeightBold]
  );

  // Get animation state for each wordlet
  const wordletAnimations = WORDLETS.map((_, index) =>
    getWordletAnimation(frame, index)
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: TYPOGRAPHY.fontSize,
          fontFamily: FONTS.sans,
          color: COLORS.text,
        }}
      >
        {WORDLETS.map((wordlet, index) => {
          const anim = wordletAnimations[index];
          const isSymbols = index === 3 || index === 4; // " sym" and "bols"
          const isStill = index === 0;

          return (
            <span
              key={index}
              style={{
                display: "inline-block",
                transform: `translateY(${anim.yOffset}px)`,
                opacity: anim.opacity,
                whiteSpace: "pre",
                // Special styles for "symbols" wordlets
                ...(isSymbols && {
                  fontFamily:
                    transitionProgress > 0.5 ? FONTS.mono : FONTS.sans,
                  color: symbolsColor,
                }),
                // Special style for "Still"
                ...(isStill && {
                  fontWeight: stillFontWeight,
                }),
              }}
            >
              {wordlet}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function interpolateColor(from: string, to: string, progress: number): string {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
