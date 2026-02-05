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
const GRID_ROTATE_DELAY = 0; // Frames to admire the obtuse angle grid before rotation (adjustable)
const GRID_ROTATE_START = GRID_APPEAR_START + GRID_APPEAR_DURATION + GRID_ROTATE_DELAY; // Rotation starts after appear + delay
const GRID_ROTATE_DURATION = 25; // Frames for grid rotation
const GRID_FINE_APPEAR_PROGRESS = 0.4; // Fine grid starts appearing at this rotation progress (0-1)
const GRID_FINE_FADE_DURATION = 10; // Frames for fine grid to fade in

// Symbol frame vertical growth animation (relative to grid rotation for tight coupling)
const FRAME_GROW_DELAY_FROM_GRID_ROTATE = 10; // Frames after grid starts rotating (adjustable)
const FRAME_GROW_START = GRID_ROTATE_START + FRAME_GROW_DELAY_FROM_GRID_ROTATE;
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

// Cursor drag animation for the last pin (index 5: right side, y=80 - bottom right)
// Appears after frame snaps and all other pins have flipped out
const PINS_DONE_FRAME = PINS_SWING_START + 4 * PINS_SWING_STAGGER + 20; // Last regular pin done swinging
const CURSOR_DRAG_DELAY = 0; // Frames to wait after pins are done
const CURSOR_DRAG_START = PINS_DONE_FRAME + CURSOR_DRAG_DELAY;
const CURSOR_DRAG_DURATION = 25; // Frames for cursor to drag pin into place
const CURSOR_START_POS = { x: 350, y: 300 }; // Bottom-right start position (relative to center)

// Click spark animation when cursor places the pin
const CLICK_SPARK_START = CURSOR_DRAG_START + CURSOR_DRAG_DURATION; // When cursor arrives
const CLICK_SPARK_DURATION = 12; // Frames for sparks to animate
const CLICK_SPARK_CONFIG = {
  count: 5, // Number of spark lines
  length: 20, // Length of each spark line
  startRadius: 8, // Starting distance from cursor tip
  endRadius: 35, // Ending distance from cursor tip
  strokeWidth: 3,
  // Angles in degrees (0 = right, 90 = down, radiating from top-left of cursor)
  angles: [-120, -90, -60, -150, -30], // Spread around top-left
} as const;

// Big zoom animation - zooms into symbol, swaps colors
const ZOOM_DELAY = 8; // Frames after sparks before zoom starts
const ZOOM_START = CLICK_SPARK_START + CLICK_SPARK_DURATION + ZOOM_DELAY;
const ZOOM_DURATION = 10; // Frames for zoom animation
const ZOOM_SCALE = 8; // How much to scale up (fills screen with symbol interior)

// Logo zoom animation - appears after main zoom, grows from tiny dot
const LOGO_ZOOM_DELAY = 0; // Frames after main zoom completes
const LOGO_ZOOM_START = ZOOM_START + ZOOM_DURATION + LOGO_ZOOM_DELAY;
const LOGO_ZOOM_DURATION = 15; // Frames for logo to zoom in
const LOGO_INITIAL_SCALE = 0.01; // Start as tiny dot
const LOGO_FINAL_SIZE = 380; // Final width in pixels (similar to symbolFrame's 240)

// Browser window zoom-out animation - reveals the full interface
// Starts exactly when logo zoom ends for seamless transition
const BROWSER_ZOOM_START = LOGO_ZOOM_START + LOGO_ZOOM_DURATION; // No delay
const BROWSER_ZOOM_DURATION = 15; // Frames for zoom-out effect
// Calculate initial scale so logo (at 48px) appears at same size as standalone (380px)
const LOGO_CORNER_SIZE = 48; // Final logo size in corner
const BROWSER_INITIAL_SCALE = LOGO_FINAL_SIZE / LOGO_CORNER_SIZE; // ~7.92
const BROWSER_FINAL_SCALE = 1; // End at normal size

// Browser window dimensions
const BROWSER_WINDOW = {
  width: 1100, // Browser window width
  height: 650, // Browser window height
  titleBarHeight: 52, // Height of title bar with traffic lights + URL
  borderRadius: 12, // Corner radius for the window
  verticalOffset: 130, // Pixels to lower the screen (positive = down)
  tiltDegrees: 10, // 3D tilt: positive = top leans back (appears farther)
  shadow: "0 0 25px 5px rgba(253, 246, 227, 0.05), 0 0 42px 10px rgba(253, 246, 227, 0.06), 0 0 76px 21px rgba(253, 246, 227, 0.04), 0 0 119px 38px rgba(253, 246, 227, 0.024)", // Screen glow halo (4-layer blend, tight)
} as const;

// Logo position within browser (animates from content-center to corner)
const LOGO_CORNER_PADDING = 24; // Distance from content edge

// Search bar animation - appears during browser zoom-out
const SEARCH_BAR_APPEAR_DELAY = 8; // Frames after browser zoom starts
const SEARCH_BAR_APPEAR_START = BROWSER_ZOOM_START + SEARCH_BAR_APPEAR_DELAY;
const SEARCH_BAR_APPEAR_DURATION = 15; // Frames to fade/scale in

// Headline text above browser ("Get any symbol < 3 minutes")
const HEADLINE_APPEAR_DELAY = 12; // Frames after browser zoom starts
const HEADLINE_APPEAR_START = BROWSER_ZOOM_START + HEADLINE_APPEAR_DELAY;
const HEADLINE_APPEAR_DURATION = 12; // Frames to fade in

// =============================================================================
// SYMBOL GENERATION FLOW TIMING (after browser settles)
// =============================================================================
const FLOW_START_DELAY = 25; // Frames after browser zoom ends before typing starts
const FLOW_START = BROWSER_ZOOM_START + BROWSER_ZOOM_DURATION + FLOW_START_DELAY;

// Phase 1: Typing animation
const PART_NUMBER = "AS3933-BQFT";
const TYPING_SPEED = 0.5; // Characters typed per frame (higher = faster typing)
const TYPING_DURATION = Math.ceil(PART_NUMBER.length / TYPING_SPEED);
const TYPING_START = FLOW_START;
const TYPING_END = TYPING_START + TYPING_DURATION;

// Phase 1.5: Search submission (run button visible, then search bar exits)
const RUN_BUTTON_VISIBLE_DURATION = 12; // Frames the run button is visible before "click"
const SEARCH_EXIT_START = TYPING_END + RUN_BUTTON_VISIBLE_DURATION; // When search bar starts exiting
const SEARCH_EXIT_DURATION = 10; // Frames for search bar to fade/slide out

// Phase 2: Generating card (appears as search exits, shows progress 5% → 100%)
const GENERATING_START = SEARCH_EXIT_START; // Generating fades in as search exits
const GENERATING_DURATION = 90; // Frames for progress bar to go 5% → 100%
const GENERATING_END = GENERATING_START + GENERATING_DURATION;

// Progress bar phases within generation
const PROGRESS_START_PERCENT = 5;
const PROGRESS_END_PERCENT = 100;
// Message timing: "Fetching datasheet URL" for first 40%, then "Analyzing datasheet with AI"
const MESSAGE_SWITCH_PROGRESS = 40;

// Phase 3: Symbol complete card
const COMPLETE_APPEAR_DELAY = 12; // Frames after generation ends
const COMPLETE_START = GENERATING_END + COMPLETE_APPEAR_DELAY;

// Subtitle text changes (synced with flow phases)
const SUBTITLE_TEXTS = [
  "Search for any part",
  "wait 2 min or less",
  "enjoy your symbol",
] as const;
// Subtitle changes at: generating start, complete start
const SUBTITLE_PHASE_2_START = GENERATING_START; // "wait 2 min or less"
const SUBTITLE_PHASE_3_START = COMPLETE_START; // "enjoy your symbol"
const SUBTITLE_TRANSITION_DURATION = 10; // Frames to fade between subtitles

// Second text timing ("What if there was a better way?")
const SECOND_TEXT_DELAY = 2; // Frames after pins start swinging
const SECOND_TEXT_START = PINS_SWING_START + SECOND_TEXT_DELAY; // Frame 70
const SECOND_TEXT_STAGGER = 1; // Frames between each wordlet (same as opening text)
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
// Wordlets: "Wh", "at", " if", " the", "re", " was", " a", " bet", "ter", " way", "?"
const SECOND_WORDLET_BOUNDARIES = [0, 2, 4, 7, 11, 13, 17, 19, 23, 26, 30, 31]; // Start indices
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
  mono: "Geist Mono, monospace",
} as const;

const TYPOGRAPHY = {
  fontSize: 56,
} as const;

// Symbol frame dimensions (centered around text)
// Sized to be 6×6 fine grid increments (240px) or 3×3 coarse increments
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
  coarseSpacing: 80, // Initial coarse grid (symbol frame = 3×3 increments)
  fineSpacing: 40, // Final fine grid (symbol frame = 6×6 increments)
  strokeWidth: 1.5,
  // Exclusion zone: coordinate dimensions + strokeWidth (visual bounds)
  exclusionWidth: SYMBOL_FRAME.width + SYMBOL_FRAME.strokeWidth,
  exclusionHeight: SYMBOL_FRAME.height + SYMBOL_FRAME.strokeWidth,
} as const;

// Teal highlight segments that zip outward when rotation begins
// Each segment: { line: grid line index, length: segment length in px }
// startOffset is auto-calculated to just touch the symbol frame edge
const TEAL_HIGHLIGHTS = {
  strokeWidth: 2, // Slightly thicker than grid lines for visibility
  zipDistance: 600, // How far they travel during zip-out
  zipDuration: 18, // Frames for the zip-out animation
  // Per-segment config for direction 1 (30° → 90°)
  direction1: [
    { line: -2, length: 240 },
    { line: -1, length: 280 },
    { line: 1, length: 280 },
    { line: 2, length: 240 },
  ],
  // Per-segment config for direction 2 (150° → 180°) - asymmetrical
  direction2: [
    { line: -3, length: 220 },
    { line: -1, length: 280 },
    { line: 1, length: 280 },
    { line: 2, length: 260 },
  ],
} as const;

// Calculate where a grid line exits the symbol frame (for highlight positioning)
// Returns the x-offset along the line where it intersects the frame boundary
const getLineFrameIntersection = (
  lineYPos: number, // y-position of line in rotated coordinates
  angleDeg: number, // rotation angle in degrees
  frameHalfW: number, // half-width of symbol frame
  frameHalfH: number, // half-height of symbol frame
): number => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Find intersection with right edge (x' = frameHalfW)
  const xRight = (frameHalfW + lineYPos * sinA) / cosA;
  const yAtRight = xRight * sinA + lineYPos * cosA;
  const rightValid = Math.abs(yAtRight) <= frameHalfH;

  // Find intersection with top/bottom edges
  const yEdge = lineYPos * cosA > 0 ? frameHalfH : -frameHalfH;
  const xTopBot = (yEdge - lineYPos * cosA) / sinA;
  const xAtTopBot = xTopBot * cosA - lineYPos * sinA;
  const topBotValid = Math.abs(xAtTopBot) <= frameHalfW;

  // Return the smaller valid positive x value (closest exit point)
  const candidates: number[] = [];
  if (rightValid && xRight > 0) candidates.push(xRight);
  if (topBotValid && xTopBot > 0) candidates.push(xTopBot);

  // Add small buffer (2px) so highlights don't quite touch the frame
  return candidates.length > 0 ? Math.min(...candidates) + 2 : 150;
};

// Symbol pins configuration
// Pins are 2 fine grid increments (80px) = 1 coarse grid increment
const SYMBOL_PINS = {
  length: GRID.fineSpacing * 2, // 80px (2 fine increments, 1 coarse increment)
  strokeWidth: 3, // Thinner than frame's 5px
  // Pin positions: y-offset from center of frame (negative = above center, positive = below)
  // 3 pins on left, 3 pins on right (symmetrical)
  left: [-80, 0, 80], // 3 pins
  right: [-80, 0, 80], // 3 pins (last one dragged in by cursor)
} as const;

// Pin number configuration
const PIN_NUMBER = {
  fontSize: 18, // Small text
  offsetFromPin: 16, // How far above the pin line
  offsetAlongPin: 0.4, // Fraction along pin from frame edge (0 = at frame, 1 = at tip)
  appearDelay: 8, // Frames after pin starts swinging before number appears
} as const;

// =============================================================================
// DIAGONAL GRID COMPONENT
// =============================================================================

// Creates a diagonal grid where lines start at 30° and 150° (120° apart)
// and rotate to 90° and 180° (vertical/horizontal)
// Starts with coarse grid (80px), fine interstitial lines (40px) fade in midway through rotation
const DiagonalGrid: React.FC<{ frame: number }> = ({ frame }) => {
  const { coarseSpacing, fineSpacing, strokeWidth, exclusionWidth } = GRID;
  const { width: compW, height: compH, fps } = useVideoConfig();

  // Calculate spring-animated exclusion height (follows symbol frame growth)
  const growthSpring = spring({
    fps,
    frame: frame - FRAME_GROW_START,
    config: {
      damping: 12,
      mass: 10,
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

  // Calculate fine grid appearance (starts midway through rotation)
  const fineGridStartFrame =
    GRID_ROTATE_START + GRID_ROTATE_DURATION * GRID_FINE_APPEAR_PROGRESS;
  const fineGridOpacity = interpolate(
    frame,
    [fineGridStartFrame, fineGridStartFrame + GRID_FINE_FADE_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Calculate teal highlight zip-out animation (starts when rotation starts)
  const {
    strokeWidth: hlStrokeWidth,
    zipDistance: hlZipDistance,
    zipDuration: hlZipDuration,
    direction1: hlDir1Config,
    direction2: hlDir2Config,
  } = TEAL_HIGHLIGHTS;

  const hlZipProgress = interpolate(
    frame,
    [GRID_ROTATE_START, GRID_ROTATE_START + hlZipDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const easedZip = Easing.out(Easing.cubic)(hlZipProgress); // Fast start, slow end
  const hlOpacity = interpolate(hlZipProgress, [0, 0.7, 1], [1, 0.6, 0]); // Fade out as they zip

  // Symbol frame dimensions for intersection calculation
  const frameHalfW = SYMBOL_FRAME.width / 2;
  const frameHalfH = SYMBOL_FRAME.height / 2;

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
  const viewportSize = 3000;
  const halfView = viewportSize / 2;

  // Generate coarse line positions (80px spacing, centered on 0,0)
  const coarseLineCount = Math.ceil(viewportSize / coarseSpacing) + 2;
  const coarseLinePositions: number[] = [];
  for (let i = -coarseLineCount; i <= coarseLineCount; i++) {
    coarseLinePositions.push(i * coarseSpacing);
  }

  // Generate fine interstitial line positions (offset by fineSpacing from coarse lines)
  // These sit between the coarse lines to create the 40px grid
  const fineLinePositions: number[] = [];
  for (let i = -coarseLineCount; i <= coarseLineCount; i++) {
    fineLinePositions.push(i * coarseSpacing + fineSpacing);
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
      {/* Define clip path that excludes the center rectangle */}
      <defs>
        <clipPath id="grid-clip">
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

      {/* Clipped container */}
      <g clipPath="url(#grid-clip)">
        {/* First direction lines (30° → 90°) */}
        <g transform={`rotate(${rotation1})`}>
          {/* Coarse lines (always visible) */}
          {coarseLinePositions.map((pos, i) => (
            <line
              key={`h-coarse-${i}`}
              x1={-halfView}
              y1={pos}
              x2={halfView}
              y2={pos}
              stroke={gridColor}
              strokeWidth={strokeWidth}
            />
          ))}
          {/* Fine interstitial lines (fade in midway through rotation) */}
          {fineGridOpacity > 0 &&
            fineLinePositions.map((pos, i) => (
              <line
                key={`h-fine-${i}`}
                x1={-halfView}
                y1={pos}
                x2={halfView}
                y2={pos}
                stroke={gridColor}
                strokeWidth={strokeWidth}
                opacity={fineGridOpacity}
              />
            ))}
          {/* Teal highlight segments (zip outward when rotation starts) */}
          {hlOpacity > 0 &&
            hlDir1Config.flatMap(({ line: lineIdx, length: hlLength }) => {
              const yPos = lineIdx * coarseSpacing;
              const baseOffset = getLineFrameIntersection(
                yPos,
                GRID_LINE_ANGLE_START_1,
                frameHalfW,
                frameHalfH,
              );
              const hlOffset = baseOffset + easedZip * hlZipDistance;
              return [
                // Positive side (extends right)
                <line
                  key={`hl1-pos-${lineIdx}`}
                  x1={hlOffset}
                  y1={yPos}
                  x2={hlOffset + hlLength}
                  y2={yPos}
                  stroke={COLORS.teal}
                  strokeWidth={hlStrokeWidth}
                  opacity={hlOpacity}
                />,
                // Negative side (extends left)
                <line
                  key={`hl1-neg-${lineIdx}`}
                  x1={-hlOffset}
                  y1={yPos}
                  x2={-hlOffset - hlLength}
                  y2={yPos}
                  stroke={COLORS.teal}
                  strokeWidth={hlStrokeWidth}
                  opacity={hlOpacity}
                />,
              ];
            })}
        </g>

        {/* Second direction lines (150° → 180°) */}
        <g transform={`rotate(${rotation2})`}>
          {/* Coarse lines (always visible) */}
          {coarseLinePositions.map((pos, i) => (
            <line
              key={`v-coarse-${i}`}
              x1={-halfView}
              y1={pos}
              x2={halfView}
              y2={pos}
              stroke={gridColor}
              strokeWidth={strokeWidth}
            />
          ))}
          {/* Fine interstitial lines (fade in midway through rotation) */}
          {fineGridOpacity > 0 &&
            fineLinePositions.map((pos, i) => (
              <line
                key={`v-fine-${i}`}
                x1={-halfView}
                y1={pos}
                x2={halfView}
                y2={pos}
                stroke={gridColor}
                strokeWidth={strokeWidth}
                opacity={fineGridOpacity}
              />
            ))}
          {/* Teal highlight segments (zip outward when rotation starts) */}
          {hlOpacity > 0 &&
            hlDir2Config.flatMap(({ line: lineIdx, length: hlLength }) => {
              const yPos = lineIdx * coarseSpacing;
              const baseOffset = getLineFrameIntersection(
                yPos,
                GRID_LINE_ANGLE_START_2,
                frameHalfW,
                frameHalfH,
              );
              const hlOffset = baseOffset + easedZip * hlZipDistance;
              return [
                // Positive side (extends right)
                <line
                  key={`hl2-pos-${lineIdx}`}
                  x1={hlOffset}
                  y1={yPos}
                  x2={hlOffset + hlLength}
                  y2={yPos}
                  stroke={COLORS.teal}
                  strokeWidth={hlStrokeWidth}
                  opacity={hlOpacity}
                />,
                // Negative side (extends left)
                <line
                  key={`hl2-neg-${lineIdx}`}
                  x1={-hlOffset}
                  y1={yPos}
                  x2={-hlOffset - hlLength}
                  y2={yPos}
                  stroke={COLORS.teal}
                  strokeWidth={hlStrokeWidth}
                  opacity={hlOpacity}
                />,
              ];
            })}
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
            damping: 15, // Low damping for visible overshoot and small vibration
            mass: 0.6,
            stiffness: 250,
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

        // Skip the last pin (index 5) - it's handled by the cursor drag animation
        if (index === 5) return null;

        // Pin number animation (appears after pin swings out)
        const numberStartFrame = pinStartFrame + PIN_NUMBER.appearDelay;
        const numberSpring = spring({
          fps,
          frame: frame - numberStartFrame,
          config: {
            damping: 12,
            mass: 0.5,
            stiffness: 200,
            overshootClamping: false,
          },
          durationInFrames: 15,
        });
        const numberScale = frame < numberStartFrame ? 0 : numberSpring;

        // Calculate pin number position (along the pin, above it)
        // Position is relative to pivot, then rotated with the pin
        const numberAlongPin = length * PIN_NUMBER.offsetAlongPin;
        const numberX = side === "left"
          ? pivotX - numberAlongPin
          : pivotX + numberAlongPin;
        const numberY = pivotY - PIN_NUMBER.offsetFromPin;

        // Pin numbers: left side = 1,2,3 (top to bottom), right side = 4,5,6 (top to bottom)
        // But index 5 is skipped here, so right side shows 4,5 for indices 3,4
        const pinNumber = index + 1;

        return (
          <g key={`${side}-${index}`} transform={`rotate(${rotation} ${pivotX} ${pivotY})`}>
            <line
              x1={pivotX}
              y1={pivotY}
              x2={endX}
              y2={pivotY}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap={SYMBOL_FRAME_STROKE.linecap}
            />
            {/* Pin number */}
            <text
              x={numberX}
              y={numberY}
              fill={COLORS.silver}
              fontFamily={FONTS.mono}
              fontSize={PIN_NUMBER.fontSize}
              textAnchor="middle"
              dominantBaseline="auto"
              style={{
                transform: `scale(${numberScale})`,
                transformOrigin: `${numberX}px ${numberY}px`,
                transformBox: "fill-box",
              }}
            >
              {pinNumber}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// =============================================================================
// MOUSE CURSOR WITH DRAGGED PIN COMPONENT
// =============================================================================

// Mouse cursor that drags the last pin (index 5) into place
const MouseCursorWithPin: React.FC<{
  frame: number;
  strokeColor: string;
}> = ({ frame, strokeColor }) => {
  const { width: compW, height: compH } = useVideoConfig();
  const { width: frameWidth } = SYMBOL_FRAME;
  const { length: pinLength, strokeWidth: pinStrokeWidth } = SYMBOL_PINS;

  // Target position: right edge of frame, y=80 (bottom right pin position)
  const targetX = frameWidth / 2 + pinLength; // Tip of the pin when horizontal
  const targetY = 80; // Bottom right pin (matches bottom left at y=80)

  // Calculate drag progress with easing (slows down as it approaches target)
  const dragProgress = interpolate(
    frame,
    [CURSOR_DRAG_START, CURSOR_DRAG_START + CURSOR_DRAG_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const easedDrag = Easing.out(Easing.quad)(dragProgress); // Smooth deceleration like a human

  // Current cursor position (interpolate from start to target)
  const cursorX = interpolate(easedDrag, [0, 1], [CURSOR_START_POS.x, targetX]);
  const cursorY = interpolate(easedDrag, [0, 1], [CURSOR_START_POS.y, targetY]);

  // Click spark animation (triggers when cursor arrives at target)
  const sparkProgress = interpolate(
    frame,
    [CLICK_SPARK_START, CLICK_SPARK_START + CLICK_SPARK_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const showSparks = frame >= CLICK_SPARK_START;

  // Don't render before animation starts
  if (frame < CURSOR_DRAG_START) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: compW,
        height: compH,
        pointerEvents: "none",
      }}
    >
      {/* SVG for the dragged pin */}
      <svg
        width={compW}
        height={compH}
        viewBox={`${-compW / 2} ${-compH / 2} ${compW} ${compH}`}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          overflow: "visible",
        }}
      >
        {/* The dragged pin - always horizontal, extends left from cursor tip */}
        <line
          x1={cursorX - pinLength}
          y1={cursorY}
          x2={cursorX}
          y2={cursorY}
          stroke={strokeColor}
          strokeWidth={pinStrokeWidth}
          strokeLinecap={SYMBOL_FRAME_STROKE.linecap}
        />
        {/* Pin number 6 - moves with the dragged pin */}
        <text
          x={cursorX - pinLength * (1 - PIN_NUMBER.offsetAlongPin)}
          y={cursorY - PIN_NUMBER.offsetFromPin}
          fill={COLORS.silver}
          fontFamily={FONTS.mono}
          fontSize={PIN_NUMBER.fontSize}
          textAnchor="middle"
          dominantBaseline="auto"
        >
          6
        </text>
      </svg>

      {/* Cursor SVG (large exaggerated arrow pointer ~80x80) */}
      <svg
        width={80}
        height={80}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: `calc(50% + ${cursorX}px)`,
          top: `calc(50% + ${cursorY}px)`,
          transform: "translate(-6px, -6px)", // Offset so tip is at exact position
        }}
      >
        {/* Classic arrow cursor shape - scaled up via viewBox */}
        <path
          d="M 0 0 L 0 17 L 4 13 L 7 20 L 10 19 L 7 12 L 12 12 Z"
          fill={COLORS.white}
          stroke={COLORS.black}
          strokeWidth={0.5}
        />
      </svg>

      {/* Click spark animation - radiating lines from cursor tip */}
      {showSparks && (
        <svg
          width={compW}
          height={compH}
          viewBox={`${-compW / 2} ${-compH / 2} ${compW} ${compH}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            overflow: "visible",
          }}
        >
          {CLICK_SPARK_CONFIG.angles.map((angle, i) => {
            // Each spark line animates outward from cursor tip
            const angleRad = (angle * Math.PI) / 180;

            // Animate radius outward
            const currentRadius = interpolate(
              sparkProgress,
              [0, 1],
              [CLICK_SPARK_CONFIG.startRadius, CLICK_SPARK_CONFIG.endRadius],
            );

            // Fade out as sparks expand
            const opacity = interpolate(sparkProgress, [0, 0.3, 1], [0, 1, 0]);

            // Calculate line start and end points
            const startX = cursorX + Math.cos(angleRad) * currentRadius;
            const startY = cursorY + Math.sin(angleRad) * currentRadius;
            const endX = cursorX + Math.cos(angleRad) * (currentRadius + CLICK_SPARK_CONFIG.length);
            const endY = cursorY + Math.sin(angleRad) * (currentRadius + CLICK_SPARK_CONFIG.length);

            return (
              <line
                key={i}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={COLORS.teal}
                strokeWidth={CLICK_SPARK_CONFIG.strokeWidth}
                strokeLinecap="round"
                opacity={opacity}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

// =============================================================================
// KIFORGE LOGO (SVG only, used inside browser window)
// =============================================================================

const KiForgeLogoSVG: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* IC chip shape - single unified path with no seams */}
    <path
      d="M 25 20 L 75 20 L 75 42 L 100 42 L 100 58 L 75 58 L 75 80 L 25 80 L 25 58 L 0 58 L 0 42 L 25 42 Z"
      fill={COLORS.teal}
    />
  </svg>
);

// =============================================================================
// STANDALONE LOGO (for initial zoom-in animation)
// =============================================================================

const StandaloneLogo: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  // Spring animation for the zoom-in effect
  const logoSpring = spring({
    fps,
    frame: frame - LOGO_ZOOM_START,
    config: {
      damping: 15,
      mass: 1,
      stiffness: 120,
      overshootClamping: false,
    },
    durationInFrames: LOGO_ZOOM_DURATION,
  });

  // Don't render before animation starts or after browser window appears
  if (frame < LOGO_ZOOM_START || frame >= BROWSER_ZOOM_START) return null;

  const scale = interpolate(logoSpring, [0, 1], [LOGO_INITIAL_SCALE, 1]);
  const displaySize = LOGO_FINAL_SIZE * scale;

  const opacity = interpolate(
    frame,
    [LOGO_ZOOM_START, LOGO_ZOOM_START + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        opacity,
      }}
    >
      <KiForgeLogoSVG size={displaySize} />
    </div>
  );
};

// =============================================================================
// BROWSER WINDOW COMPONENT
// =============================================================================

// macOS-style traffic light colors
const TRAFFIC_LIGHTS = {
  red: "#ff5f57",
  yellow: "#febc2e",
  green: "#28c840",
  size: 14,
  gap: 8,
} as const;

// Browser window that zooms out from the logo, revealing the full interface
const BrowserWindow: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const { width, height, titleBarHeight, borderRadius, shadow, verticalOffset, tiltDegrees } = BROWSER_WINDOW;

  // Ease-out animation for browser zoom-out (fast start, slow finish)
  const zoomEase = interpolate(
    frame,
    [BROWSER_ZOOM_START, BROWSER_ZOOM_START + BROWSER_ZOOM_DURATION],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // Spring for search bar appearance
  const searchBarSpring = spring({
    fps,
    frame: frame - SEARCH_BAR_APPEAR_START,
    config: {
      damping: 15,
      mass: 0.6,
      stiffness: 180,
      overshootClamping: false,
    },
    durationInFrames: SEARCH_BAR_APPEAR_DURATION,
  });

  // Don't render before browser animation starts
  if (frame < BROWSER_ZOOM_START) return null;

  const zoomProgress = zoomEase;

  // Scale from zoomed-in to normal
  const browserScale = interpolate(
    zoomProgress,
    [0, 1],
    [BROWSER_INITIAL_SCALE, BROWSER_FINAL_SCALE],
  );

  // Content area dimensions
  const contentHeight = height - titleBarHeight;

  // Animate vertical offset from 0 to final value (seamless transition)
  const currentVerticalOffset = interpolate(zoomProgress, [0, 1], [0, verticalOffset]);

  // Animate tilt from 0 to final value (seamless transition with zoom)
  const currentTilt = interpolate(zoomProgress, [0, 1], [0, tiltDegrees]);

  // Logo position animation: starts at content-center, moves to corner
  // Content center in browser coords (from top-left of content area)
  const contentCenterX = width / 2;
  const contentCenterY = contentHeight / 2;
  // Corner position
  const cornerX = LOGO_CORNER_PADDING + LOGO_CORNER_SIZE / 2;
  const cornerY = LOGO_CORNER_PADDING + LOGO_CORNER_SIZE / 2;
  // Interpolate logo position
  const logoX = interpolate(zoomProgress, [0, 1], [contentCenterX, cornerX]);
  const logoY = interpolate(zoomProgress, [0, 1], [contentCenterY, cornerY]);

  // Transform origin: content-center (so logo stays at screen center during zoom)
  // Content center from browser top-left: (width/2, titleBarHeight + contentHeight/2)
  const originX = width / 2;
  const originY = titleBarHeight + contentHeight / 2;
  const transformOriginPercent = `${(originX / width) * 100}% ${(originY / height) * 100}%`;

  // Search bar visibility
  const showSearchBar = frame >= SEARCH_BAR_APPEAR_START;
  const searchBarOpacity = showSearchBar
    ? interpolate(
        frame,
        [SEARCH_BAR_APPEAR_START, SEARCH_BAR_APPEAR_START + 8],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;
  const searchBarScale = showSearchBar
    ? interpolate(searchBarSpring, [0, 1], [0.9, 1])
    : 0.9;

  return (
    // Position wrapper: center in screen space (no 3D transforms here)
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: `calc(50% + ${currentVerticalOffset}px)`,
        transform: "translate(-50%, -50%)",
        width,
        height,
        perspective: "2000px",
        perspectiveOrigin: "center center",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
      }}
    >
      {/* 3D tilt wrapper: ensures symmetric perspective on both edges */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `rotateX(${currentTilt}deg)`,
          transformOrigin: "center center",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Inner container handles scale with content-center origin for logo animation */}
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${browserScale})`,
            transformOrigin: transformOriginPercent,
            borderRadius,
            boxShadow: shadow,
            overflow: "visible", // Allow overflow at bottom
            display: "flex",
            flexDirection: "column",
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
        >
      {/* Title bar with traffic lights and URL */}
      <div
        style={{
          height: titleBarHeight,
          backgroundColor: "#f5f5f5", // Light grey for realistic URL bar
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 16,
          flexShrink: 0,
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
          transform: "translateZ(0px)",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: TRAFFIC_LIGHTS.gap }}>
          <div
            style={{
              width: TRAFFIC_LIGHTS.size,
              height: TRAFFIC_LIGHTS.size,
              borderRadius: "50%",
              backgroundColor: TRAFFIC_LIGHTS.red,
            }}
          />
          <div
            style={{
              width: TRAFFIC_LIGHTS.size,
              height: TRAFFIC_LIGHTS.size,
              borderRadius: "50%",
              backgroundColor: TRAFFIC_LIGHTS.yellow,
            }}
          />
          <div
            style={{
              width: TRAFFIC_LIGHTS.size,
              height: TRAFFIC_LIGHTS.size,
              borderRadius: "50%",
              backgroundColor: TRAFFIC_LIGHTS.green,
            }}
          />
        </div>

        {/* URL bar */}
        <div
          style={{
            flex: 1,
            height: 32,
            backgroundColor: "#ffffff", // White URL bar (realistic)
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 12,
            border: "1px solid #e0e0e0", // Subtle border
          }}
        >
          {/* URL text */}
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              color: COLORS.shadowGrey,
            }}
          >
            kiforge.io/symbols
          </span>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          backgroundColor: COLORS.ivoryMist,
          position: "relative",
          height: contentHeight,
          borderBottomLeftRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          overflow: "hidden",
          transform: "translateZ(0px)",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo - animates from content-center to top-left corner */}
        <div
          style={{
            position: "absolute",
            left: logoX,
            top: logoY,
            transform: "translate(-50%, -50%)",
          }}
        >
          <KiForgeLogoSVG size={LOGO_CORNER_SIZE} />
        </div>

        {/* Flow content area - centered in browser content */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 520,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Phase 1: Search input (visible until search exits) */}
          {frame < SEARCH_EXIT_START + SEARCH_EXIT_DURATION && (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: frame < SEARCH_EXIT_START
                  ? searchBarOpacity
                  : interpolate(
                      frame,
                      [SEARCH_EXIT_START, SEARCH_EXIT_START + SEARCH_EXIT_DURATION],
                      [1, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
                transform: frame < SEARCH_EXIT_START
                  ? `scale(${searchBarScale})`
                  : `scale(${searchBarScale}) translateY(${interpolate(
                      frame,
                      [SEARCH_EXIT_START, SEARCH_EXIT_START + SEARCH_EXIT_DURATION],
                      [0, -20],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    )}px)`,
              }}
            >
              {/* Search input container */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "14px 20px",
                  backgroundColor: COLORS.eggshell,
                  width: "100%",
                  boxSizing: "border-box",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                {/* Terminal prompt */}
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 18,
                    color: COLORS.teal,
                    userSelect: "none",
                  }}
                >
                  {">"}
                </span>

                {/* Animated text or placeholder */}
                <div style={{ position: "relative", flex: 1 }}>
                  {frame < TYPING_START ? (
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 18,
                        color: COLORS.silver,
                      }}
                    >
                      start typing to search, e.g. "74HC595"
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 18,
                        color: COLORS.shadowGrey,
                      }}
                    >
                      {PART_NUMBER.slice(
                        0,
                        Math.min(
                          PART_NUMBER.length,
                          Math.floor((frame - TYPING_START) * TYPING_SPEED)
                        )
                      )}
                      {frame >= TYPING_START && frame < TYPING_END && (
                        <span
                          style={{
                            color: COLORS.teal,
                            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                          }}
                        >
                          ▌
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Run button appears after typing completes */}
                {frame >= TYPING_END && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      backgroundColor: COLORS.teal,
                      fontFamily: FONTS.mono,
                      fontSize: 13,
                      color: COLORS.white,
                      opacity: interpolate(
                        frame,
                        [TYPING_END, TYPING_END + 8],
                        [0, 1],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      ),
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <polygon points="0,0 10,5 0,10" />
                    </svg>
                    run
                  </div>
                )}
              </div>

              {/* Hint text - only before typing starts */}
              {frame < TYPING_START && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    color: COLORS.silver,
                    fontFamily: FONTS.sans,
                  }}
                >
                  <span>press</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 22,
                      minWidth: 22,
                      padding: "0 5px",
                      backgroundColor: COLORS.eggshell,
                      borderRadius: 4,
                      fontFamily: FONTS.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: COLORS.shadowGrey,
                    }}
                  >
                    ↵
                  </span>
                  <span>to search</span>
                </div>
              )}
            </div>
          )}

          {/* Phase 2: Generating status card (centered, like KiForge web) */}
          {frame >= GENERATING_START && frame < COMPLETE_START && (
            <div
              style={{
                width: "100%",
                opacity: interpolate(
                  frame,
                  [GENERATING_START, GENERATING_START + SEARCH_EXIT_DURATION],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              {/* Title */}
              <div style={{ marginBottom: 24 }}>
                <h2
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 18,
                    fontWeight: 500,
                    color: COLORS.shadowGrey,
                    margin: 0,
                  }}
                >
                  Generating symbol...
                </h2>
              </div>

              {/* Terminal output - matches KiForge web styling */}
              <div
                style={{
                  minHeight: 140,
                  padding: 16,
                  backgroundColor: COLORS.eggshell,
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                {/* Initial line */}
                <div style={{ color: COLORS.silver }}>
                  <span style={{ color: COLORS.teal }}>{">"}</span>{" "}
                  Processing <span style={{ color: COLORS.shadowGrey }}>{PART_NUMBER}</span>
                </div>

                {/* Status messages - appear sequentially */}
                {(() => {
                  const progress = interpolate(
                    frame,
                    [GENERATING_START, GENERATING_END],
                    [PROGRESS_START_PERCENT, PROGRESS_END_PERCENT],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  return (
                    <>
                      {/* First message appears immediately */}
                      <div style={{ marginTop: 8, color: COLORS.silver }}>
                        <span style={{ color: COLORS.teal }}>{">"}</span> Fetching datasheet URL...
                      </div>

                      {/* Second message appears after progress passes threshold */}
                      {progress >= MESSAGE_SWITCH_PROGRESS && (
                        <div style={{ marginTop: 8, color: COLORS.silver }}>
                          <span style={{ color: COLORS.teal }}>{">"}</span> Analyzing datasheet with AI...
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Blinking cursor */}
                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      color: COLORS.teal,
                      opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                    }}
                  >
                    _
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    height: 4,
                    width: "100%",
                    backgroundColor: COLORS.eggshell,
                    borderRadius: 9999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: COLORS.teal,
                      width: `${interpolate(
                        frame,
                        [GENERATING_START, GENERATING_END],
                        [PROGRESS_START_PERCENT, PROGRESS_END_PERCENT],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      )}%`,
                    }}
                  />
                </div>
                <p
                  style={{
                    marginTop: 8,
                    textAlign: "center",
                    fontSize: 12,
                    color: COLORS.silver,
                    fontFamily: FONTS.sans,
                  }}
                >
                  {Math.round(
                    interpolate(
                      frame,
                      [GENERATING_START, GENERATING_END],
                      [PROGRESS_START_PERCENT, PROGRESS_END_PERCENT],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    )
                  )}%
                </p>
              </div>
            </div>
          )}

          {/* Phase 3: Symbol complete card */}
          {frame >= COMPLETE_START && (
            <div
              style={{
                width: "100%",
                backgroundColor: COLORS.eggshell,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                opacity: interpolate(
                  frame,
                  [COMPLETE_START, COMPLETE_START + 10],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Success icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 130, 130, 0.1)",
                      boxShadow: "inset 0 0 0 1px rgba(0, 130, 130, 0.2)",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke={COLORS.teal} strokeWidth="1.5" />
                      <path d="M6 10l3 3 5-6" stroke={COLORS.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: COLORS.silver,
                        marginBottom: 2,
                      }}
                    >
                      Complete
                    </p>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: COLORS.shadowGrey,
                        fontFamily: FONTS.sans,
                      }}
                    >
                      Symbol generated
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12 }}>
                  <div
                    style={{
                      fontFamily: FONTS.mono,
                      color: COLORS.shadowGrey,
                    }}
                  >
                    {PART_NUMBER}.kicad_sym
                  </div>
                  <div style={{ color: COLORS.silver, marginTop: 2 }}>
                    KiCad symbol file
                  </div>
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: COLORS.silver,
                      marginBottom: 4,
                    }}
                  >
                    Part number
                  </p>
                  <p
                    style={{
                      fontSize: 24,
                      fontWeight: 500,
                      fontFamily: FONTS.mono,
                      color: COLORS.shadowGrey,
                    }}
                  >
                    {PART_NUMBER}
                  </p>
                </div>
                {/* Download button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    backgroundColor: "transparent",
                    boxShadow: `inset 0 0 0 1px ${COLORS.silver}`,
                    fontFamily: FONTS.sans,
                    fontSize: 14,
                    color: COLORS.shadowGrey,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2v9M4 8l4 4 4-4M2 14h12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
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

  // Zoom animation - zooms into symbol and swaps background color
  const zoomProgress = interpolate(
    frame,
    [ZOOM_START, ZOOM_START + ZOOM_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const easedZoom = Easing.inOut(Easing.cubic)(zoomProgress);
  const zoomScale = interpolate(easedZoom, [0, 1], [1, ZOOM_SCALE]);

  // Background color transitions:
  // Phase 1: dark to ivory-mist during symbol zoom
  // Phase 2: ivory-mist to shadow-grey when browser window appears
  const browserZoomProgress = interpolate(
    frame,
    [BROWSER_ZOOM_START, BROWSER_ZOOM_START + BROWSER_ZOOM_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // During symbol zoom: dark -> ivory-mist
  const phase1R = interpolate(easedZoom, [0, 1], [COLOR_RGB.darkBg.r, COLOR_RGB.ivoryMist.r]);
  const phase1G = interpolate(easedZoom, [0, 1], [COLOR_RGB.darkBg.g, COLOR_RGB.ivoryMist.g]);
  const phase1B = interpolate(easedZoom, [0, 1], [COLOR_RGB.darkBg.b, COLOR_RGB.ivoryMist.b]);

  // During browser zoom: ivory-mist -> shadow-grey
  const bgR = Math.round(
    interpolate(browserZoomProgress, [0, 1], [phase1R, COLOR_RGB.shadowGrey.r]),
  );
  const bgG = Math.round(
    interpolate(browserZoomProgress, [0, 1], [phase1G, COLOR_RGB.shadowGrey.g]),
  );
  const bgB = Math.round(
    interpolate(browserZoomProgress, [0, 1], [phase1B, COLOR_RGB.shadowGrey.b]),
  );
  const backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

  // Hide grid and text during zoom
  const showGrid = frame < ZOOM_START;
  const showSecondText = frame >= SECOND_TEXT_START && frame < ZOOM_START;

  // Hide the zoomed symbol frame when logo starts appearing
  const showSymbolFrame = frame < LOGO_ZOOM_START;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Diagonal grid (behind everything, hidden during zoom) */}
      {showGrid && <DiagonalGrid frame={frame} />}

      {/* Zoomable container for symbol and cursor */}
      {showSymbolFrame && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${zoomScale})`,
            transformOrigin: "center center",
          }}
        >
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

          {/* Mouse cursor dragging the last pin into place */}
          <MouseCursorWithPin frame={frame} strokeColor={symbolStrokeColor} />
        </div>
      )}

      {/* Standalone logo - zooms in from tiny dot, visible until browser window appears */}
      <StandaloneLogo frame={frame} />

      {/* Browser window - zooms out to reveal the full interface */}
      <BrowserWindow frame={frame} />

      {/* Headline text above browser */}
      {frame >= HEADLINE_APPEAR_START && (
        <div
          style={{
            position: "absolute",
            top: `calc(50% + ${BROWSER_WINDOW.verticalOffset}px - ${BROWSER_WINDOW.height / 2 + 135}px)`,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: interpolate(
              frame,
              [HEADLINE_APPEAR_START, HEADLINE_APPEAR_START + HEADLINE_APPEAR_DURATION],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 48,
              fontWeight: 300,
              color: COLORS.white,
              whiteSpace: "nowrap",
            }}
          >
            Get New Symbols Easily
          </span>
          {/* Subtitle - changes based on flow phase */}
          <div style={{ position: "relative", height: 28 }}>
            {/* Phase 1: "Search for any part" */}
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: FONTS.sans,
                fontSize: 22,
                fontWeight: 400,
                color: COLORS.silver,
                whiteSpace: "nowrap",
                opacity: frame < SUBTITLE_PHASE_2_START
                  ? 1
                  : interpolate(
                      frame,
                      [SUBTITLE_PHASE_2_START, SUBTITLE_PHASE_2_START + SUBTITLE_TRANSITION_DURATION],
                      [1, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
              }}
            >
              {SUBTITLE_TEXTS[0]}
            </span>
            {/* Phase 2: "wait 2 min or less" */}
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: FONTS.sans,
                fontSize: 22,
                fontWeight: 400,
                color: COLORS.silver,
                whiteSpace: "nowrap",
                opacity: frame < SUBTITLE_PHASE_2_START
                  ? 0
                  : frame < SUBTITLE_PHASE_3_START
                    ? interpolate(
                        frame,
                        [SUBTITLE_PHASE_2_START, SUBTITLE_PHASE_2_START + SUBTITLE_TRANSITION_DURATION],
                        [0, 1],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      )
                    : interpolate(
                        frame,
                        [SUBTITLE_PHASE_3_START, SUBTITLE_PHASE_3_START + SUBTITLE_TRANSITION_DURATION],
                        [1, 0],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      ),
              }}
            >
              {SUBTITLE_TEXTS[1]}
            </span>
            {/* Phase 3: "enjoy your symbol" */}
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: FONTS.sans,
                fontSize: 22,
                fontWeight: 400,
                color: COLORS.silver,
                whiteSpace: "nowrap",
                opacity: frame < SUBTITLE_PHASE_3_START
                  ? 0
                  : interpolate(
                      frame,
                      [SUBTITLE_PHASE_3_START, SUBTITLE_PHASE_3_START + SUBTITLE_TRANSITION_DURATION],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
              }}
            >
              {SUBTITLE_TEXTS[2]}
            </span>
          </div>
        </div>
      )}

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
      {showSecondText && (
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
