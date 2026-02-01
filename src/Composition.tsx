import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

// =============================================================================
// TIMING CONSTANTS (in seconds, converted to frames via fps)
// =============================================================================
const CHANGE_START_TIME = 0.5; // When "symbols" and "Still" change
const CHANGE_DURATION = 0.15; // How long the transition takes

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
// MAIN COMPOSITION
// =============================================================================

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert timing constants to frames
  const changeStartFrame = CHANGE_START_TIME * fps;
  const changeEndFrame = (CHANGE_START_TIME + CHANGE_DURATION) * fps;

  // Calculate transition progress (0 to 1)
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
          color: COLORS.text,
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: FONTS.sans,
            fontWeight: stillFontWeight,
          }}
        >
          Still
        </span>
        <span style={{ fontFamily: FONTS.sans, fontWeight: TYPOGRAPHY.fontWeightNormal }}>
          {" "}drawing{" "}
        </span>
        <span
          style={{
            fontFamily: transitionProgress > 0.5 ? FONTS.mono : FONTS.sans,
            color: symbolsColor,
            fontWeight: TYPOGRAPHY.fontWeightNormal,
          }}
        >
          symbols
        </span>
        <span style={{ fontFamily: FONTS.sans, fontWeight: TYPOGRAPHY.fontWeightNormal }}>
          {" "}by hand?
        </span>
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
