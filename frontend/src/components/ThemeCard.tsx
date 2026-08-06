import React from 'react';

/**
 * ThemeCard — a macOS-style theme picker tile, ported from CyberSnap's WPF
 * ThemeCard control (src/CyberSnap/UI/Controls/ThemeCard.cs).
 *
 * A metallic card holding a live mini-preview of a theme (window + text lines +
 * accent dot), with a caption below and an accent glow when selected. Behaves as
 * a radio option (role="radio" + keyboard) since the settings row is a radiogroup.
 *
 * The preview is painted from a per-theme `ThemePalette` (Background / Surface /
 * Accent / TextLine / TextMuted), mirroring Theme.PreviewPalette in CyberSnap.
 * The "System" card renders a diagonal light/dark split to signal "follows OS".
 */

export type ThemeMode = 'cyberpaste' | 'dark' | 'light' | 'system';

export interface ThemePalette {
  background: string;
  surface: string;
  accent: string;
  textLine: string;
  textMuted: string;
}

// Palettes for the mini-previews. Dark/Light mirror CyberSnap's Theme.Palette()
// (Theme.cs € "keep in sync with BgPrimary/BgCard/Accent/TextPrimary/TextSecondary").
// cyberpaste is this app's own signature dark; system is rendered as a split.
export const THEME_PALETTES: Record<ThemeMode, ThemePalette> = {
  cyberpaste: {
    background: '#0D0F17',
    surface: '#171A28',
    accent: '#00FFFF',
    textLine: '#E6F0FF',
    textMuted: 'rgba(230,240,255,0.65)',
  },
  dark: {
    background: '#1E1E1E',
    surface: '#1E1E1E',
    accent: '#6d28d9',
    textLine: '#FAFAFA',
    textMuted: 'rgba(250,250,250,0.65)',
  },
  light: {
    background: '#DFE2EA',
    surface: '#ECEFF6',
    accent: '#0078D7',
    textLine: '#1A1A1A',
    textMuted: 'rgba(26,26,26,0.55)',
  },
  system: {
    // Not used directly — "system" paints a diagonal light/dark split.
    background: '#0D0F17',
    surface: '#171A28',
    accent: '#00FFFF',
    textLine: '#E6F0FF',
    textMuted: 'rgba(230,240,255,0.65)',
  },
};

const CARD_W = 120;
const PREVIEW_ASPECT = 70 / 108; // height / width of the mini-window
const CARD_PAD = 9; // metallic frame around the preview

interface ThemeCardProps {
  mode: ThemeMode;
  caption: string;
  selected: boolean;
  onSelect: (mode: ThemeMode) => void;
  cardWidth?: number;
}

/** Content of one mini-window: ring glyph, three text lines, an accent dot. */
function WindowContent({ pal, w }: { pal: ThemePalette; w: number }) {
  const inset = w * 0.085;
  const inner = w - inset * 2;
  const line: React.CSSProperties = { height: 4, borderRadius: 2 };
  return (
    <div
      className="relative flex h-full w-full items-center"
      style={{ padding: `${inset * 0.9}px ${inset}px` }}
    >
      {/* ring glyph, top-left */}
      <div
        className="absolute rounded-full"
        style={{
          width: 9,
          height: 9,
          top: inset * 0.9,
          left: inset,
          border: `1.4px solid ${pal.textMuted}`,
        }}
      />
      {/* three text lines */}
      <div className="flex w-full flex-col" style={{ gap: 6 }}>
        <div
          style={{
            ...line,
            width: inner * 0.46,
            background: pal.textLine,
            opacity: 0.92,
            alignSelf: 'flex-start',
          }}
        />
        <div
          style={{
            ...line,
            width: inner * 0.64,
            background: pal.textMuted,
            opacity: 0.75,
            alignSelf: 'flex-start',
          }}
        />
        <div
          style={{
            ...line,
            width: inner * 0.38,
            background: pal.textMuted,
            opacity: 0.55,
            alignSelf: 'flex-start',
          }}
        />
      </div>
      {/* accent dot, bottom-right */}
      <div
        className="absolute rounded-full"
        style={{ width: 8, height: 8, right: inset, bottom: inset * 0.9, background: pal.accent }}
      />
    </div>
  );
}

/** Diagonal light/dark split for the "System / follows OS" card. */
function SystemSplit({ w }: { w: number }) {
  const light = THEME_PALETTES.light;
  const dark = THEME_PALETTES.dark;
  const darkBg = dark.background;
  const lightBg = light.background;
  return (
    <div className="absolute inset-0" style={{ background: darkBg }}>
      <WindowContent pal={dark} w={w} />
      {/* light half: clipped to the top-left triangle */}
      <div
        className="absolute inset-0"
        style={{ background: lightBg, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
      >
        <WindowContent pal={light} w={w} />
      </div>
    </div>
  );
}

export function ThemeCard({
  mode,
  caption,
  selected,
  onSelect,
  cardWidth = CARD_W,
}: ThemeCardProps) {
  const [hover, setHover] = React.useState(false);

  const pal = THEME_PALETTES[mode];
  // The glow of the "System" card uses the dark face's accent (matches CyberSnap).
  const glowAccent = mode === 'system' ? THEME_PALETTES.dark.accent : pal.accent;

  const previewW = cardWidth - CARD_PAD * 2;
  const previewH = previewW * PREVIEW_ASPECT;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(mode)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group flex cursor-pointer flex-col items-center outline-none"
      style={{ width: cardWidth }}
    >
      {/* accent glow UNDER the card when selected */}
      <div className="relative" style={{ width: cardWidth }}>
        <div
          className="pointer-events-none absolute -inset-px rounded-[12px] transition-opacity duration-150"
          style={{
            background: selected ? glowAccent : 'transparent',
            boxShadow: selected ? `0 0 9px 1px ${glowAccent}80` : 'none',
            opacity: selected ? 1 : 0,
          }}
        />
        {/* metallic card frame */}
        <div
          className="relative rounded-[11px] border transition-all duration-150"
          style={{
            width: cardWidth,
            padding: CARD_PAD,
            background: 'linear-gradient(115deg, #404247 0%, #303237 45%, #26282D 100%)',
            borderColor: selected
              ? glowAccent
              : hover
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(255,255,255,0.16)',
            borderWidth: selected ? 1.6 : 1,
          }}
        >
          {/* mini "app window" preview */}
          <div
            className="relative overflow-hidden rounded-[7px]"
            style={{
              width: previewW,
              height: previewH,
              background: pal.background,
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            {mode === 'system' ? (
              <SystemSplit w={previewW} />
            ) : (
              <WindowContent pal={pal} w={previewW} />
            )}
          </div>
        </div>
      </div>
      {/* caption */}
      <span
        className="mt-2 text-center transition-colors duration-150"
        style={{
          fontSize: 12.5,
          fontWeight: selected ? 600 : 400,
          color: selected ? '#F0F2F6' : '#969AA2',
        }}
      >
        {caption}
      </span>
    </button>
  );
}
