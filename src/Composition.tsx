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
const LETTER_SUCK_DURATION = 8; // Frames for each letter's suck-in animation
const SUCK_IN_TOTAL_STAGGER = 15; // Total frames to stagger all letters (accelerating)
const SUCK_IN_END = SUCK_IN_START + SUCK_IN_TOTAL_STAGGER + LETTER_SUCK_DURATION; // When last letter finishes

// =============================================================================
// LETTER DATA
// =============================================================================
// Full text split into individual letters for animation
const FULL_TEXT = "Still drawing symbols by hand?";
const LETTERS = FULL_TEXT.split("");

// Map each letter index to its wordlet index (for entrance animation)
// Wordlets: "Still", " draw", "ing", " sym", "bols", " by", " ha", "nd", "?"
const WORDLET_BOUNDARIES = [0, 5, 10, 13, 17, 21, 24, 27, 29, 30]; // Start indices
const getWordletIndex = (letterIndex: number): number => {
  for (let i = WORDLET_BOUNDARIES.length - 1; i >= 0; i--) {
    if (letterIndex >= WORDLET_BOUNDARIES[i]) return i;
  }
  return 0;
};

// Calculate center index and distance from center for each letter
const CENTER_INDEX = (LETTERS.length - 1) / 2; // ~14.5

// Sort letter indices by distance from center (closest first)
const LETTERS_BY_CENTER_DISTANCE = [...Array(LETTERS.length).keys()].sort(
  (a, b) => Math.abs(a - CENTER_INDEX) - Math.abs(b - CENTER_INDEX)
);

// Map letter index to its suck-in order (0 = first to be sucked, closest to center)
const SUCK_ORDER: Record<number, number> = {};
LETTERS_BY_CENTER_DISTANCE.forEach((letterIdx, order) => {
  SUCK_ORDER[letterIdx] = order;
});

// Calculate accelerating stagger delay for each letter
// Uses quadratic curve so gaps decrease (speeds up)
const getSuckInDelay = (letterIndex: number): number => {
  const order = SUCK_ORDER[letterIndex];
  const totalLetters = LETTERS.length;
  // Quadratic: earlier letters (center) have bigger gaps, later ones bunch up
  const normalizedOrder = order / (totalLetters - 1); // 0 to 1
  return SUCK_IN_TOTAL_STAGGER * Math.pow(normalizedOrder, 0.6); // Accelerating
};

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
const getWordletAppearFrame = (wordletIndex: number): number =>
  FIRST_WORD_APPEAR + wordletIndex * WORD_STAGGER;

// Get letter's entrance animation (based on its wordlet)
const getLetterEntranceAnimation = (
  frame: number,
  letterIndex: number
): { yOffset: number; opacity: number } => {
  const wordletIndex = getWordletIndex(letterIndex);
  const appearFrame = getWordletAppearFrame(wordletIndex);

  // Letter hasn't appeared yet
  if (frame < appearFrame) {
    return { yOffset: WORD_START_OFFSET, opacity: 0 };
  }

  const framesSinceAppear = frame - appearFrame;

  // Letter is fully in position
  if (framesSinceAppear >= EASE_DURATION) {
    return { yOffset: 0, opacity: 1 };
  }

  // Easing in: strong ease-out curve (fast start, tiny movement at end)
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

// Get letter suck-in animation
const getLetterSuckInAnimation = (
  frame: number,
  letterIndex: number
): { xOffset: number; yOffset: number; opacity: number; scale: number } => {
  // Get this letter's staggered start time
  const letterDelay = getSuckInDelay(letterIndex);
  const letterStart = SUCK_IN_START + letterDelay;
  const letterEnd = letterStart + LETTER_SUCK_DURATION;

  // Before this letter's suck-in starts
  if (frame < letterStart) {
    return { xOffset: 0, yOffset: 0, opacity: 1, scale: 1 };
  }

  // After this letter's suck-in ends
  if (frame >= letterEnd) {
    return { xOffset: 0, yOffset: 0, opacity: 0, scale: 0 };
  }

  const progress = interpolate(
    frame,
    [letterStart, letterEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Ease-in: slow start, fast end (gravity effect)
  const easedProgress = Easing.in(Easing.quad)(progress);

  // Calculate target based on letter position
  // Left half letters go UP into top-left line
  // Right half letters go DOWN into bottom-right line
  const isLeftSide = letterIndex < CENTER_INDEX;

  // Target Y: left side goes up (-), right side goes down (+)
  // Closer to Y=0 (horizontal center line) as requested
  const targetY = isLeftSide ? -40 : 40;

  // Target X: letters move toward their respective vertical line
  // Distance from center determines how far they travel horizontally
  const distanceFromCenter = letterIndex - CENTER_INDEX;
  // Normalize: center letters move less, edge letters move more toward the line
  const targetX = isLeftSide
    ? -80 - distanceFromCenter * 3 // Left side moves left (toward left line)
    : 80 - distanceFromCenter * 3; // Right side moves right (toward right line)

  return {
    xOffset: targetX * easedProgress,
    yOffset: targetY * easedProgress,
    opacity: 1 - easedProgress,
    scale: 1 - easedProgress * 0.5,
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

      {/* Text - each letter animates independently */}
      {textVisible && (
        <div
          style={{
            fontSize: TYPOGRAPHY.fontSize,
            fontFamily: FONTS.sans,
            color: COLORS.text,
          }}
        >
          {LETTERS.map((letter, index) => {
            const enterAnim = getLetterEntranceAnimation(frame, index);
            const suckIn = getLetterSuckInAnimation(frame, index);

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
                {letter}
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
