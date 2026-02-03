import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS, COLOR_RGB } from "./colors";

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

// line extension animation timing
const LINE_EXTENSION_DELAY = 2; // Frames to wait after symbol frame is complete
const OPENING_TEXT_DISAPPEAR_DELAY = 4; // Frames to wait after line extension starts
const LINE_EXTENSION_START = SYMBOL_FRAME_DONE + LINE_EXTENSION_DELAY; // When lines start extending & text starts moving
const OPENING_TEXT_DISAPPEAR_START =
  LINE_EXTENSION_START + OPENING_TEXT_DISAPPEAR_DELAY; // When opening text starts disappearing
const LINE_EXTENSION_TOTAL_DURATION = 10; // Frames for furthest letter to reach line
const LINE_EXTENSION_END = LINE_EXTENSION_START + LINE_EXTENSION_TOTAL_DURATION;

// Grid animation timing
const GRID_APPEAR_START = SYMBOL_FRAME_DONE - 3; // Start appearing slightly before symbol frame completes
const GRID_APPEAR_DURATION = 15; // Frames for grid to fade in
const GRID_ROTATE_START = GRID_APPEAR_START; // Rotation starts immediately with appearance
const GRID_ROTATE_DURATION = 25; // Frames for grid rotation (slightly longer to overlap with fade-in)

// Symbol frame vertical growth animation
const FRAME_GROW_START = 62; // Frame when vertical growth begins
const FRAME_GROW_TARGET_HEIGHT = 320; // Final height after growth (from 240 to 320)

// Symbol frame color transitions
const FILL_COLOR_TRANSITION_DELAY = 3; // Frames after frame growth starts
const FILL_COLOR_TRANSITION_START =
  FRAME_GROW_START + FILL_COLOR_TRANSITION_DELAY; // Frame 65
const STROKE_COLOR_TRANSITION_DELAY = 1; // Frames after fill color transition starts
const STROKE_COLOR_TRANSITION_START =
  FILL_COLOR_TRANSITION_START + STROKE_COLOR_TRANSITION_DELAY; // Frame 66

// Symbol pins timing (triggered when frame "smacks" into place during growth spring)
const PINS_SWING_DELAY = 6; // Frames after frame growth starts (when spring first hits target)
const PINS_SWING_START = FRAME_GROW_START + PINS_SWING_DELAY; // Frame 68
const PINS_SWING_STAGGER = 2; // Frames between each pin starting to swing

// Second text timing ("What if there was a better way?")
const SECOND_TEXT_DELAY = 2; // Frames after pins start swinging
const SECOND_TEXT_START = PINS_SWING_START + SECOND_TEXT_DELAY; // Frame 70
const SECOND_TEXT_STAGGER = 3; // Frames between each wordlet (same as opening text)
const SECOND_TEXT_EASE_DURATION = 5; // Frames to ease into position

// =============================================================================
// LETTER DATA
// =============================================================================
// Opening text split into individual letters for animation
const OPENING_TEXT = "Still drawing symbols by hand?";
const OPENING_LETTERS = OPENING_TEXT.split("");

// Map each letter index to its wordlet index (for entrance animation)
// Wordlets: "Still", " draw", "ing", " sym", "bols", " by", " ha", "nd", "?"
const OPENING_WORDLET_BOUNDARIES = [0, 5, 10, 13, 17, 21, 24, 27, 29, 30]; // Start indices
const getOpeningWordletIndex = (letterIndex: number): number => {
  for (let i = OPENING_WORDLET_BOUNDARIES.length - 1; i >= 0; i--) {
    if (letterIndex >= OPENING_WORDLET_BOUNDARIES[i]) return i;
  }
  return 0;
};

// Second text split into individual letters for animation
const SECOND_TEXT = "What if there was a better way?";
const SECOND_LETTERS = SECOND_TEXT.split("");

// Map each letter index to its wordlet index
// Wordlets: "What", " if", " there", " was", " a", " bet", "ter", " way", "?"
const SECOND_WORDLET_BOUNDARIES = [0, 4, 7, 13, 17, 19, 23, 26, 30, 31]; // Start indices
const getSecondWordletIndex = (letterIndex: number): number => {
  for (let i = SECOND_WORDLET_BOUNDARIES.length - 1; i >= 0; i--) {
    if (letterIndex >= SECOND_WORDLET_BOUNDARIES[i]) return i;
  }
  return 0;
};

// =============================================================================
// STYLE CONSTANTS
// =============================================================================
// Colors are imported from src/colors.ts (which reads from Tailwind v4 @theme colors)

const FONTS = {
  sans: "Geist, system-ui, sans-serif",
} as const;

const TYPOGRAPHY = {
  fontSize: 56,
} as const;

// Symbol frame dimensions (centered around text)
// Sized to be exactly 6×6 grid increments (240px at 40px spacing)
const SYMBOL_FRAME = {
  width: 240,
  height: 240, // Square to align with grid (6 increments)
  verticalArmLength: 60, // Length of vertical line segments (1.5 grid increments)
  strokeWidth: 5,
} as const;
const SYMBOL_FRAME_STROKE = {
  linecap: "square" as const,
  linejoin: "miter" as const,
  shapeRendering: "geometricPrecision" as const,
} as const;


// =============================================================================
// HELPERS
// =============================================================================

// Get the frame when an opening text wordlet first appears
const getOpeningWordletAppearFrame = (wordletIndex: number): number =>
  FIRST_WORD_APPEAR + wordletIndex * WORD_STAGGER;

// Get opening text letter's entrance animation (based on its wordlet)
const getOpeningLetterAnimation = (
  frame: number,
  letterIndex: number,
): { yOffset: number; opacity: number } => {
  const wordletIndex = getOpeningWordletIndex(letterIndex);
  const appearFrame = getOpeningWordletAppearFrame(wordletIndex);

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
  const progress = interpolate(framesSinceAppear, [0, EASE_DURATION], [0, 1], {
    extrapolateRight: "clamp",
  });
  const easedProgress = Easing.out(Easing.cubic)(progress);

  return {
    yOffset: WORD_START_OFFSET * (1 - easedProgress),
    opacity: 1,
  };
};

// Get the frame when a second text wordlet first appears
const getSecondWordletAppearFrame = (wordletIndex: number): number =>
  SECOND_TEXT_START + wordletIndex * SECOND_TEXT_STAGGER;

// Get second text letter's entrance animation (based on its wordlet)
const getSecondLetterAnimation = (
  frame: number,
  letterIndex: number,
): { yOffset: number; opacity: number } => {
  const wordletIndex = getSecondWordletIndex(letterIndex);
  const appearFrame = getSecondWordletAppearFrame(wordletIndex);

  // Letter hasn't appeared yet
  if (frame < appearFrame) {
    return { yOffset: WORD_START_OFFSET, opacity: 0 };
  }

  const framesSinceAppear = frame - appearFrame;

  // Letter is fully in position
  if (framesSinceAppear >= SECOND_TEXT_EASE_DURATION) {
    return { yOffset: 0, opacity: 1 };
  }

  // Easing in: strong ease-out curve (fast start, tiny movement at end)
  const progress = interpolate(
    framesSinceAppear,
    [0, SECOND_TEXT_EASE_DURATION],
    [0, 1],
    { extrapolateRight: "clamp" },
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
  lineIndex: number,
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
    { extrapolateRight: "clamp" },
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
  if (frame < LINE_EXTENSION_START) return 0;
  if (frame >= LINE_EXTENSION_END) return 1;

  const progress = interpolate(
    frame,
    [LINE_EXTENSION_START, LINE_EXTENSION_END],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  // Smooth ease for line drawing
  return Easing.inOut(Easing.cubic)(progress);
};

// =============================================================================
// GRID CONSTANTS
// =============================================================================
const GRID = {
  spacing: 40, // Distance between parallel lines in pixels (symbol frame = 6×6 increments)
  strokeWidth: 1.5,
  // Exclusion zone: coordinate dimensions + strokeWidth (visual bounds) + ~100px breathing room
  // The strokeWidth extends beyond the coordinate positions, so we account for that
  exclusionWidth: SYMBOL_FRAME.width + SYMBOL_FRAME.strokeWidth, // 240 + 5 + 105 = 350
  exclusionHeight: SYMBOL_FRAME.height + SYMBOL_FRAME.strokeWidth, // 240 + 5 + 105 = 350 (now square)
} as const;

// Symbol pins configuration
// Pins are 2 grid increments long (80px), thinner than frame stroke
const SYMBOL_PINS = {
  length: GRID.spacing * 2, // 80px (2 grid increments)
  strokeWidth: 3, // Thinner than frame's 5px
  // Pin positions: y-offset from center of frame (negative = above center, positive = below)
  // 3 pins on left, 2 pins on right (asymmetrical - right aligns with top two left)
  left: [-80, 0, 80], // 3 pins
  right: [-80, 0], // 2 pins aligned with top two left pins
} as const;

// =============================================================================
// DIAGONAL GRID COMPONENT
// =============================================================================

// Creates a diagonal grid where lines start at 30° and 150° (120° apart)
// and rotate to 90° and 180° (vertical/horizontal)
// Lines are clipped to avoid the center exclusion zone
const DiagonalGrid: React.FC<{ frame: number }> = ({ frame }) => {
  const { spacing, strokeWidth, exclusionWidth } = GRID;
  const { width: compW, height: compH, fps } = useVideoConfig();

  // Calculate spring-animated exclusion height (follows symbol frame growth)
  const growthSpring = spring({
    fps,
    frame: frame - FRAME_GROW_START,
    config: {
      damping: 12,
      mass: 0.8,
      stiffness: 120,
      overshootClamping: false,
    },
    durationInFrames: 15,
  });

  const baseExclusionHeight = SYMBOL_FRAME.height + SYMBOL_FRAME.strokeWidth;
  const targetExclusionHeight =
    FRAME_GROW_TARGET_HEIGHT + SYMBOL_FRAME.strokeWidth;
  const exclusionHeight =
    frame < FRAME_GROW_START
      ? baseExclusionHeight
      : interpolate(
          growthSpring,
          [0, 1],
          [baseExclusionHeight, targetExclusionHeight],
        );

  // Calculate grid appearance (fade in)
  const appearProgress = interpolate(
    frame,
    [GRID_APPEAR_START, GRID_APPEAR_START + GRID_APPEAR_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Calculate rotation progress (shared timing for both line sets)
  const rotationProgress = interpolate(
    frame,
    [GRID_ROTATE_START, GRID_ROTATE_START + GRID_ROTATE_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const easedRotation = Easing.inOut(Easing.cubic)(rotationProgress);

  const GRID_LINE_ANGLE_START_1 = 30;
  const GRID_LINE_ANGLE_END_1 = 90;
  const GRID_LINE_ANGLE_START_2 = 150;
  const GRID_LINE_ANGLE_END_2 = 180;

  // First set of lines: 30° → 90° (rotates +60°)
  const rotation1 = interpolate(easedRotation, [0, 1], [
    GRID_LINE_ANGLE_START_1,
    GRID_LINE_ANGLE_END_1,
  ]);
  // Second set of lines: 150° → 180° (rotates +30°)
  const rotation2 = interpolate(easedRotation, [0, 1], [
    GRID_LINE_ANGLE_START_2,
    GRID_LINE_ANGLE_END_2,
  ]);

  // Color interpolation from black to shadow-grey
  const colorProgress = appearProgress;
  const r = Math.round(
    interpolate(
      colorProgress,
      [0, 1],
      [COLOR_RGB.black.r, COLOR_RGB.shadowGrey.r],
    ),
  );
  const g = Math.round(
    interpolate(
      colorProgress,
      [0, 1],
      [COLOR_RGB.black.g, COLOR_RGB.shadowGrey.g],
    ),
  );
  const b = Math.round(
    interpolate(
      colorProgress,
      [0, 1],
      [COLOR_RGB.black.b, COLOR_RGB.shadowGrey.b],
    ),
  );
  const gridColor = `rgb(${r}, ${g}, ${b})`;

  // Don't render if not yet visible
  if (appearProgress <= 0) return null;

  // Grid dimensions (must be large enough to cover viewport at any rotation)
  // At 45° rotation, we need sqrt(2) * diagonal of viewport
  // Viewport diagonal = sqrt(1280² + 720²) ≈ 1469, so we need ~2078 minimum
  const viewportSize = 3000; // Large enough to cover all corners at any angle
  const halfView = viewportSize / 2;

  // Generate line positions (centered on 0,0)
  const lineCount = Math.ceil(viewportSize / spacing) + 2;
  const linePositions: number[] = [];
  for (let i = -lineCount; i <= lineCount; i++) {
    linePositions.push(i * spacing);
  }

  // Exclusion zone bounds (rectangle in center)
  const exHalfW = exclusionWidth / 2;
  const exHalfH = exclusionHeight / 2;

  // ViewBox matches composition dimensions exactly (1:1 pixel mapping)
  const halfW = compW / 2;
  const halfH = compH / 2;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`${-halfW} ${-halfH} ${compW} ${compH}`}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        opacity: appearProgress,
        overflow: "hidden",
      }}
    >
      {/* Define clip path that excludes the center rectangle - applied at SVG level so it doesn't rotate */}
      <defs>
        <clipPath id="grid-clip">
          {/* Full viewport minus center exclusion */}
          <path
            d={`
              M ${-halfW} ${-halfH} L ${halfW} ${-halfH} L ${halfW} ${halfH} L ${-halfW} ${halfH} Z
              M ${-exHalfW} ${-exHalfH} 
              L ${-exHalfW} ${exHalfH} 
              L ${exHalfW} ${exHalfH} 
              L ${exHalfW} ${-exHalfH} Z
            `}
            fillRule="evenodd"
          />
        </clipPath>
      </defs>

      {/* Clipped container (doesn't rotate) - clips to viewport with center exclusion */}
      <g clipPath="url(#grid-clip)">
        {/* Rotating grid container */}
        <g transform={`rotate(${rotation1})`}>
          {/* Lines in one direction (30° initially, 90° after rotation) */}
          {linePositions.map((pos, i) => (
            <line
              key={`h-${i}`}
              x1={-halfView}
              y1={pos}
              x2={halfView}
              y2={pos}
              stroke={gridColor}
              strokeWidth={strokeWidth}
            />
          ))}
        </g>
        <g transform={`rotate(${rotation2})`}>
          {/* Lines in perpendicular direction (120° initially, 180° after rotation) */}
          {linePositions.map((pos, i) => (
            <line
              key={`v-${i}`}
              x1={-halfView}
              y1={pos}
              x2={halfView}
              y2={pos}
              stroke={gridColor}
              strokeWidth={strokeWidth}
            />
          ))}
        </g>
      </g>
    </svg>
  );
};

// =============================================================================
// SYMBOL FRAME COMPONENT
// =============================================================================

// 6 lines, each animates independently:
// Bottom group (indices 0-2): left vertical, horizontal, right vertical
// Top group (indices 3-5): left vertical, horizontal, right vertical
// After suck-in starts, left top extends down and right bottom extends up
const SymbolFrame: React.FC<{
  frame: number;
  fillColor: string;
  strokeColor: string;
}> = ({ frame, fillColor, strokeColor }) => {
  const { width, verticalArmLength, strokeWidth } = SYMBOL_FRAME;
  const { fps } = useVideoConfig();

  // Calculate spring-animated height (grows from 240 to 320 starting at frame 62)
  // Spring config tuned for slight overshoot (~5px past target in each direction)
  const growthSpring = spring({
    fps,
    frame: frame - FRAME_GROW_START,
    config: {
      damping: 12, // Lower damping allows overshoot
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
    },
    durationInFrames: 15,
  });

  // Before growth starts, use base height; after, interpolate to target
  const baseHeight = SYMBOL_FRAME.height;
  const height =
    frame < FRAME_GROW_START
      ? baseHeight
      : interpolate(
          growthSpring,
          [0, 1],
          [baseHeight, FRAME_GROW_TARGET_HEIGHT],
        );

  // Get animation for each of the 6 lines
  const lineAnims = Array.from({ length: 6 }, (_, i) =>
    getSymbolLineAnimation(frame, i),
  );

  // Get line extension progress
  const extensionProgress = getLineExtensionProgress(frame);
  const useSegmentLines = frame < SYMBOL_FRAME_DONE;

  // Calculate positions
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;
  const bottom = height / 2;

  // Calculate how far the extending lines should go
  // Gap between top arm end and bottom arm start
  const gap = height - 2 * verticalArmLength;
  const extensionAmount = gap * extensionProgress;

  // Line definitions: [x1, y1, x2, y2, animIndex]
  // Note: Left top vertical extends DOWN, right bottom vertical extends UP
  const lines: [number, number, number, number, number][] = [
    // Bottom group (animate first)
    [left, bottom - verticalArmLength, left, bottom, 0], // Bottom left vertical (static)
    [left, bottom, right, bottom, 1], // Bottom horizontal
    [right, bottom - verticalArmLength - extensionAmount, right, bottom, 2], // Bottom right vertical (extends UP)
    // Top group (animate second)
    [left, top, left, top + verticalArmLength + extensionAmount, 3], // Top left vertical (extends DOWN)
    [left, top, right, top, 4], // Top horizontal
    [right, top, right, top + verticalArmLength, 5], // Top right vertical (static)
  ];
  const bottomPath = [
    `M ${left} ${bottom - verticalArmLength}`,
    `L ${left} ${bottom}`,
    `L ${right} ${bottom}`,
    `L ${right} ${bottom - verticalArmLength - extensionAmount}`,
  ].join(" ");
  const topPath = [
    `M ${left} ${top + verticalArmLength + extensionAmount}`,
    `L ${left} ${top}`,
    `L ${right} ${top}`,
    `L ${right} ${top + verticalArmLength}`,
  ].join(" ");

  // Fill rectangle dimensions (inset by half stroke width to sit inside the frame)
  const fillInset = strokeWidth / 2;
  const fillLeft = left + fillInset;
  const fillTop = top + fillInset;
  const fillWidth = width - strokeWidth;
  const fillHeight = height - strokeWidth;

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
        shapeRendering: SYMBOL_FRAME_STROKE.shapeRendering,
      }}
    >
      {/* Interior fill rectangle (behind the frame lines) */}
      <rect
        x={fillLeft}
        y={fillTop}
        width={fillWidth}
        height={fillHeight}
        fill={fillColor}
      />
      {useSegmentLines ? (
        lines.map(([x1, y1, x2, y2, animIndex], i) => {
          const anim = lineAnims[animIndex];
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap={SYMBOL_FRAME_STROKE.linecap}
              strokeLinejoin={SYMBOL_FRAME_STROKE.linejoin}
              style={{
                transform: `translateY(${anim.yOffset}px)`,
                opacity: anim.opacity,
              }}
            />
          );
        })
      ) : (
        <>
          <path
            d={bottomPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={SYMBOL_FRAME_STROKE.linecap}
            strokeLinejoin={SYMBOL_FRAME_STROKE.linejoin}
          />
          <path
            d={topPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={SYMBOL_FRAME_STROKE.linecap}
            strokeLinejoin={SYMBOL_FRAME_STROKE.linejoin}
          />
        </>
      )}
    </svg>
  );
};

// =============================================================================
// SYMBOL PINS COMPONENT
// =============================================================================

// Pins that swing out from the symbol frame edges
// 3 pins on left (swing left), 2 pins on right (swing right)
const SymbolPins: React.FC<{
  frame: number;
  strokeColor: string;
  frameHeight: number;
}> = ({ frame, strokeColor, frameHeight }) => {
  const { fps } = useVideoConfig();
  const { width: frameWidth } = SYMBOL_FRAME;
  const { length, strokeWidth, left: leftPositions, right: rightPositions } = SYMBOL_PINS;

  // Calculate frame edges
  const leftEdge = -frameWidth / 2;
  const rightEdge = frameWidth / 2;

  // Build array of all pins with their properties
  const pins: Array<{
    side: "left" | "right";
    yOffset: number;
    index: number;
  }> = [
    ...leftPositions.map((y, i) => ({ side: "left" as const, yOffset: y, index: i })),
    ...rightPositions.map((y, i) => ({ side: "right" as const, yOffset: y, index: leftPositions.length + i })),
  ];

  return (
    <svg
      width={frameWidth + length * 2} // Frame width + pin length on each side
      height={frameHeight}
      viewBox={`${leftEdge - length} ${-frameHeight / 2} ${frameWidth + length * 2} ${frameHeight}`}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        overflow: "visible",
        shapeRendering: SYMBOL_FRAME_STROKE.shapeRendering,
      }}
    >
      {pins.map(({ side, yOffset, index }) => {
        // Spring animation for this pin (staggered start)
        const pinStartFrame = PINS_SWING_START + index * PINS_SWING_STAGGER;
        const swingSpring = spring({
          fps,
          frame: frame - pinStartFrame,
          config: {
            damping: 12, // Low damping for visible overshoot and small vibration
            mass: 0.6,
            stiffness: 180,
            overshootClamping: false,
          },
          durationInFrames: 20,
        });

        const swingProgress = frame < pinStartFrame ? 0 : swingSpring;

        // Calculate rotation: starts at 90° (flush/hidden), ends at 0° (horizontal)
        // Left pins rotate from +90° to 0° (swing counterclockwise)
        // Right pins rotate from -90° to 0° (swing clockwise)
        // Swing upward: pins start pointing down, swing up to horizontal
        const startAngle = side === "left" ? -90 : 90;
        const rotation = interpolate(swingProgress, [0, 1], [startAngle, 0]);

        // Pin connection point (pivot) is at the frame edge
        const pivotX = side === "left" ? leftEdge : rightEdge;
        const pivotY = yOffset;

        // Pin extends outward from pivot
        const endX = side === "left" ? pivotX - length : pivotX + length;

        // Don't render if animation hasn't started yet
        if (frame < pinStartFrame) return null;

        return (
          <line
            key={`${side}-${index}`}
            x1={pivotX}
            y1={pivotY}
            x2={endX}
            y2={pivotY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={SYMBOL_FRAME_STROKE.linecap}
            transform={`rotate(${rotation} ${pivotX} ${pivotY})`}
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
  const { fps } = useVideoConfig();

  // Text visibility (hidden instantly when line extension starts)
  const textVisible = frame < OPENING_TEXT_DISAPPEAR_START;

  // Fill color spring animation (black to ivory-mist with overshoot)
  const fillColorSpring = spring({
    fps,
    frame: frame - FILL_COLOR_TRANSITION_START,
    config: {
      damping: 14, // Low enough to allow visible overshoot
      mass: 0.8,
      stiffness: 100,
      overshootClamping: false,
    },
    durationInFrames: 18, // Ends slightly after frame growth (which is 15 frames)
  });

  // Interpolate RGB values for symbol frame fill (spring can overshoot past 1, creating brighter-than-target momentarily)
  const fillProgress =
    frame < FILL_COLOR_TRANSITION_START ? 0 : fillColorSpring;
  const fillR = Math.round(
    interpolate(
      fillProgress,
      [0, 1],
      [COLOR_RGB.black.r, COLOR_RGB.ivoryMist.r],
    ),
  );
  const fillG = Math.round(
    interpolate(
      fillProgress,
      [0, 1],
      [COLOR_RGB.black.g, COLOR_RGB.ivoryMist.g],
    ),
  );
  const fillB = Math.round(
    interpolate(
      fillProgress,
      [0, 1],
      [COLOR_RGB.black.b, COLOR_RGB.ivoryMist.b],
    ),
  );
  const symbolFillColor = `rgb(${fillR}, ${fillG}, ${fillB})`;

  // Stroke color spring animation (silver to blue-slate with overshoot, 1 frame offset from fill)
  const strokeColorSpring = spring({
    fps,
    frame: frame - STROKE_COLOR_TRANSITION_START,
    config: {
      damping: 14,
      mass: 0.8,
      stiffness: 100,
      overshootClamping: false,
    },
    durationInFrames: 18,
  });

  // Interpolate RGB values for symbol frame stroke
  const strokeProgress =
    frame < STROKE_COLOR_TRANSITION_START ? 0 : strokeColorSpring;
  const strokeR = Math.round(
    interpolate(
      strokeProgress,
      [0, 1],
      [COLOR_RGB.silver.r, COLOR_RGB.blueSlate.r],
    ),
  );
  const strokeG = Math.round(
    interpolate(
      strokeProgress,
      [0, 1],
      [COLOR_RGB.silver.g, COLOR_RGB.blueSlate.g],
    ),
  );
  const strokeB = Math.round(
    interpolate(
      strokeProgress,
      [0, 1],
      [COLOR_RGB.silver.b, COLOR_RGB.blueSlate.b],
    ),
  );
  const symbolStrokeColor = `rgb(${strokeR}, ${strokeG}, ${strokeB})`;

  // Calculate frame height for pins (same spring as SymbolFrame uses)
  const frameGrowthSpring = spring({
    fps,
    frame: frame - FRAME_GROW_START,
    config: {
      damping: 12,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
    },
    durationInFrames: 15,
  });
  const frameHeight =
    frame < FRAME_GROW_START
      ? SYMBOL_FRAME.height
      : interpolate(
          frameGrowthSpring,
          [0, 1],
          [SYMBOL_FRAME.height, FRAME_GROW_TARGET_HEIGHT],
        );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Diagonal grid (behind everything) */}
      <DiagonalGrid frame={frame} />

      {/* Symbol frame (behind text) */}
      <SymbolFrame
        frame={frame}
        fillColor={symbolFillColor}
        strokeColor={symbolStrokeColor}
      />

      {/* Symbol pins (swing out from frame edges) */}
      <SymbolPins
        frame={frame}
        strokeColor={symbolStrokeColor}
        frameHeight={frameHeight}
      />

      {/* Opening text - each letter animates independently */}
      {textVisible && (
        <div
          style={{
            fontSize: TYPOGRAPHY.fontSize,
            fontFamily: FONTS.sans,
            color: COLORS.darkText,
          }}
        >
          {OPENING_LETTERS.map((letter, index) => {
            const enterAnim = getOpeningLetterAnimation(frame, index);

            return (
              <span
                key={index}
                style={{
                  display: "inline-block",
                  transform: `translateY(${enterAnim.yOffset}px)`,
                  opacity: enterAnim.opacity,
                  whiteSpace: "pre",
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      )}

      {/* Second text - centered above symbol frame */}
      {frame >= SECOND_TEXT_START && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, calc(-50% - ${frameHeight / 2 + 90}px))`,
            fontSize: TYPOGRAPHY.fontSize * 0.9,
            fontFamily: FONTS.sans,
            color: COLORS.darkText,
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          {SECOND_LETTERS.map((letter, index) => {
            const enterAnim = getSecondLetterAnimation(frame, index);

            return (
              <span
                key={index}
                style={{
                  display: "inline-block",
                  transform: `translateY(${enterAnim.yOffset}px)`,
                  opacity: enterAnim.opacity,
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
