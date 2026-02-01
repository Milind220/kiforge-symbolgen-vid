import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

// =============================================================================
// TIMING CONSTANTS (in frames)
// =============================================================================
const BLANK_DURATION = 10; // Frames of blank screen before first word
const FIRST_WORD_APPEAR = BLANK_DURATION; // Frame 10
const WORD_STAGGER = 3; // Frames between each word appearing (overlap with previous)
const EASE_DURATION = 5; // Total frames to ease into final position
const WORD_START_OFFSET = 25; // Pixels below final position when appearing

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
} as const;

const FONTS = {
  sans: "Geist, system-ui, sans-serif",
} as const;

const TYPOGRAPHY = {
  fontSize: 56,
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

          return (
            <span
              key={index}
              style={{
                display: "inline-block",
                transform: `translateY(${anim.yOffset}px)`,
                opacity: anim.opacity,
                whiteSpace: "pre",
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
