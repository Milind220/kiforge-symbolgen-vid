import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

// =============================================================================
// TIMING CONSTANTS (in frames)
// =============================================================================
const BLANK_DURATION = 10; // Frames of blank screen before first word
const FIRST_WORD_APPEAR = BLANK_DURATION; // Frame 10
const WORD_STAGGER = 3; // Frames between each word appearing (overlap with previous)
const EASE_DURATION = 5; // Total frames to ease into final position
const WORD_START_OFFSET = 25; // Pixels below final position when appearing

// Symbol frame timing (starts after all wordlets are in position)
const LAST_WORDLET_INDEX = 8;
const WORDLETS_DONE_FRAME =
  FIRST_WORD_APPEAR + LAST_WORDLET_INDEX * WORD_STAGGER + EASE_DURATION; // Frame 39
const SYMBOL_FRAME_START = WORDLETS_DONE_FRAME + 2; // Small pause, then frame starts
const SYMBOL_FRAME_EASE_DURATION = 5; // 5 frames to whizz into position
const SYMBOL_FRAME_START_OFFSET = 400; // Start far outside frame (whizz in effect)
const SYMBOL_FRAME_STAGGER = 2; // Frames between bottom and top groups

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
  silver: "#adadad",
} as const;

const FONTS = {
  sans: "Geist, system-ui, sans-serif",
} as const;

const TYPOGRAPHY = {
  fontSize: 56,
} as const;

// Symbol frame dimensions
const SYMBOL_FRAME = {
  width: 180,
  height: 260,
  cornerLength: 40, // Length of corner bracket arms
  strokeWidth: 3,
  // Position offset from center (to the right of "symbols" word)
  offsetX: 120,
  offsetY: -20,
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

// Get symbol frame line animation (whizz in from below)
// groupIndex: 0 = bottom lines (first), 1 = top lines (second)
const getSymbolLineAnimation = (
  frame: number,
  groupIndex: number
): { yOffset: number; opacity: number } => {
  const appearFrame = SYMBOL_FRAME_START + groupIndex * SYMBOL_FRAME_STAGGER;

  // Line hasn't appeared yet
  if (frame < appearFrame) {
    return { yOffset: SYMBOL_FRAME_START_OFFSET, opacity: 0 };
  }

  const framesSinceAppear = frame - appearFrame;

  // Line is fully in position
  if (framesSinceAppear >= SYMBOL_FRAME_EASE_DURATION) {
    return { yOffset: 0, opacity: 1 };
  }

  // Whizz in: strong ease-out for fast entry that decelerates
  const progress = interpolate(
    framesSinceAppear,
    [0, SYMBOL_FRAME_EASE_DURATION],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  // Use aggressive bezier curve for whizz effect (fast start, strong deceleration)
  const easedProgress = Easing.bezier(0.22, 1, 0.36, 1)(progress);

  return {
    yOffset: SYMBOL_FRAME_START_OFFSET * (1 - easedProgress),
    opacity: 1,
  };
};

// =============================================================================
// SYMBOL FRAME COMPONENT
// =============================================================================

const SymbolFrame: React.FC<{ frame: number }> = ({ frame }) => {
  const { width, height, cornerLength, strokeWidth, offsetX, offsetY } =
    SYMBOL_FRAME;

  // Bottom lines animate first (group 0), top lines second (group 1)
  const bottomAnim = getSymbolLineAnimation(frame, 0);
  const topAnim = getSymbolLineAnimation(frame, 1);

  // Calculate corner positions
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;
  const bottom = height / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${left} ${top} ${width} ${height}`}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
        overflow: "visible",
      }}
    >
      {/* Bottom left corner */}
      <g
        style={{
          transform: `translateY(${bottomAnim.yOffset}px)`,
          opacity: bottomAnim.opacity,
        }}
      >
        <line
          x1={left}
          y1={bottom - cornerLength}
          x2={left}
          y2={bottom}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
        <line
          x1={left}
          y1={bottom}
          x2={left + cornerLength}
          y2={bottom}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
      </g>

      {/* Bottom right corner */}
      <g
        style={{
          transform: `translateY(${bottomAnim.yOffset}px)`,
          opacity: bottomAnim.opacity,
        }}
      >
        <line
          x1={right - cornerLength}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
        <line
          x1={right}
          y1={bottom}
          x2={right}
          y2={bottom - cornerLength}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
      </g>

      {/* Top left corner */}
      <g
        style={{
          transform: `translateY(${topAnim.yOffset}px)`,
          opacity: topAnim.opacity,
        }}
      >
        <line
          x1={left}
          y1={top + cornerLength}
          x2={left}
          y2={top}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
        <line
          x1={left}
          y1={top}
          x2={left + cornerLength}
          y2={top}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
      </g>

      {/* Top right corner */}
      <g
        style={{
          transform: `translateY(${topAnim.yOffset}px)`,
          opacity: topAnim.opacity,
        }}
      >
        <line
          x1={right - cornerLength}
          y1={top}
          x2={right}
          y2={top}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
        <line
          x1={right}
          y1={top}
          x2={right}
          y2={top + cornerLength}
          stroke={COLORS.silver}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
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
      {/* Symbol frame (behind text) */}
      <SymbolFrame frame={frame} />

      {/* Text */}
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
