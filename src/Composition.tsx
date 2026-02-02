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
const SYMBOL_FRAME_DELAY = 0; // Frames to wait after wordlets done (adjustable keyframe)
const SYMBOL_FRAME_START = WORDLETS_DONE_FRAME + SYMBOL_FRAME_DELAY;
const SYMBOL_FRAME_EASE_DURATION = 5; // 5 frames to whizz into position
const SYMBOL_FRAME_START_OFFSET = 400; // Start far outside frame (whizz in effect)
const SYMBOL_LINE_STAGGER = 1; // Frames between each line element
const SYMBOL_FRAME_DONE =
  SYMBOL_FRAME_START + 5 * SYMBOL_LINE_STAGGER + SYMBOL_FRAME_EASE_DURATION; // All 6 lines in place

// Text suck-in / line extension animation timing
const SUCK_IN_DELAY = 2; // Frames to wait after symbol frame is complete
const SUCK_IN_START = SYMBOL_FRAME_DONE + SUCK_IN_DELAY; // When lines start extending & text starts moving
const SUCK_IN_DURATION = 12; // Frames for the suck-in animation
const SUCK_IN_END = SUCK_IN_START + SUCK_IN_DURATION;

// Suck-in target positions for each wordlet (relative to their starting position)
// Left side wordlets get sucked into the TOP-LEFT extending line (which goes DOWN)
// Right side wordlets get sucked into the BOTTOM-RIGHT extending line (which goes UP)
// Format: [xOffset, yOffset] - where the wordlet ends up relative to start
const SUCK_IN_TARGETS: Record<number, [number, number]> = {
  // Left side → sucked UP into top-left vertical line
  0: [120, -80],   // "Still" → right and up (toward center-top)
  1: [80, -80],    // " draw" → right and up
  2: [0, -100],    // "ing" → straight up into the line
  3: [-60, -80],   // " sym" → left and up (from outside toward line)
  // Right side → sucked DOWN into bottom-right vertical line
  4: [60, 80],     // "bols" → right and down (toward line)
  5: [-40, 100],   // " by" → left and down (inward)
  6: [-80, 100],   // " ha" → left and down
  7: [-100, 100],  // "nd" → left and down
  8: [-120, 80],   // "?" → left and down (from outside)
};

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

// Symbol frame dimensions (centered around text)
const SYMBOL_FRAME = {
  width: 240,
  height: 200, // Reduced to sit closer to the text
  verticalArmLength: 50, // Length of vertical line segments
  strokeWidth: 5,
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
// lineIndex: 0-2 = bottom lines (first), 3-5 = top lines (second)
const getSymbolLineAnimation = (
  frame: number,
  lineIndex: number
): { yOffset: number; opacity: number } => {
  const appearFrame = SYMBOL_FRAME_START + lineIndex * SYMBOL_LINE_STAGGER;

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

// Get line extension progress (0 = arm length, 1 = full height)
const getLineExtensionProgress = (frame: number): number => {
  if (frame < SUCK_IN_START) return 0;
  if (frame >= SUCK_IN_END) return 1;

  const progress = interpolate(
    frame,
    [SUCK_IN_START, SUCK_IN_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Smooth ease for line drawing
  return Easing.inOut(Easing.cubic)(progress);
};

// Get text suck-in animation
const getTextSuckInAnimation = (
  frame: number,
  wordletIndex: number
): { xOffset: number; yOffset: number; opacity: number; scale: number } => {
  // Before suck-in starts, no offset
  if (frame < SUCK_IN_START) {
    return { xOffset: 0, yOffset: 0, opacity: 1, scale: 1 };
  }

  // After suck-in ends, text is gone
  if (frame >= SUCK_IN_END) {
    return { xOffset: 0, yOffset: 0, opacity: 0, scale: 0 };
  }

  const progress = interpolate(
    frame,
    [SUCK_IN_START, SUCK_IN_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Ease-in: slow start, fast end (gravity effect)
  const easedProgress = Easing.in(Easing.quad)(progress);

  // Get target position for this wordlet
  const [targetX, targetY] = SUCK_IN_TARGETS[wordletIndex] ?? [0, 0];

  return {
    xOffset: targetX * easedProgress,
    yOffset: targetY * easedProgress,
    opacity: 1 - easedProgress,
    scale: 1 - easedProgress * 0.6,
  };
};

// =============================================================================
// SYMBOL FRAME COMPONENT
// =============================================================================

// 6 lines, each animates independently:
// Bottom group (indices 0-2): left vertical, horizontal, right vertical
// Top group (indices 3-5): left vertical, horizontal, right vertical
// After suck-in starts, left top extends down and right bottom extends up
const SymbolFrame: React.FC<{ frame: number }> = ({ frame }) => {
  const { width, height, verticalArmLength, strokeWidth } = SYMBOL_FRAME;

  // Get animation for each of the 6 lines
  const lineAnims = Array.from({ length: 6 }, (_, i) =>
    getSymbolLineAnimation(frame, i)
  );

  // Get line extension progress
  const extensionProgress = getLineExtensionProgress(frame);

  // Calculate positions
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;
  const bottom = height / 2;

  // Extend horizontal lines by half stroke width for clean 90° corners
  const cornerOverlap = strokeWidth / 2;

  // Calculate how far the extending lines should go
  // Gap between top arm end and bottom arm start
  const gap = height - 2 * verticalArmLength;
  const extensionAmount = gap * extensionProgress;

  // Line definitions: [x1, y1, x2, y2, animIndex]
  // Note: Left top vertical extends DOWN, right bottom vertical extends UP
  const lines: [number, number, number, number, number][] = [
    // Bottom group (animate first)
    [left, bottom - verticalArmLength, left, bottom, 0], // Bottom left vertical (static)
    [left - cornerOverlap, bottom, right + cornerOverlap, bottom, 1], // Bottom horizontal
    [right, bottom - verticalArmLength - extensionAmount, right, bottom, 2], // Bottom right vertical (extends UP)
    // Top group (animate second)
    [left, top, left, top + verticalArmLength + extensionAmount, 3], // Top left vertical (extends DOWN)
    [left - cornerOverlap, top, right + cornerOverlap, top, 4], // Top horizontal
    [right, top, right, top + verticalArmLength, 5], // Top right vertical (static)
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${left} ${top} ${width} ${height}`}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        overflow: "visible",
      }}
    >
      {lines.map(([x1, y1, x2, y2, animIndex], i) => {
        const anim = lineAnims[animIndex];
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={COLORS.silver}
            strokeWidth={strokeWidth}
            style={{
              transform: `translateY(${anim.yOffset}px)`,
              opacity: anim.opacity,
            }}
          />
        );
      })}
    </svg>
  );
};

// =============================================================================
// MAIN COMPOSITION
// =============================================================================

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();

  // Text visibility (hidden after suck-in completes)
  const textVisible = frame < SUCK_IN_END;

  // Get animation state for each wordlet
  const wordletAnimations = WORDLETS.map((_, index) =>
    getWordletAnimation(frame, index)
  );

  // Get suck-in animation for each wordlet
  const suckInAnimations = WORDLETS.map((_, index) =>
    getTextSuckInAnimation(frame, index)
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

      {/* Text - gets sucked into the extending lines */}
      {textVisible && (
        <div
          style={{
            fontSize: TYPOGRAPHY.fontSize,
            fontFamily: FONTS.sans,
            color: COLORS.text,
          }}
        >
          {WORDLETS.map((wordlet, index) => {
            const enterAnim = wordletAnimations[index];
            const suckIn = suckInAnimations[index];

            // Combine Y offsets: enter animation + suck-in animation
            const totalYOffset = enterAnim.yOffset + suckIn.yOffset;

            return (
              <span
                key={index}
                style={{
                  display: "inline-block",
                  transform: `translate(${suckIn.xOffset}px, ${totalYOffset}px) scale(${suckIn.scale})`,
                  opacity: enterAnim.opacity * suckIn.opacity,
                  whiteSpace: "pre",
                }}
              >
                {wordlet}
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
