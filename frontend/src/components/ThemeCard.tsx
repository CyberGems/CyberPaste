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
    background: '#16181B',
    surface: '#24272B',
    accent: '#B8BEC6',
    textLine: '#E8EAEC',
    textMuted: 'rgba(166,171,178,0.65)',
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

const CARD_W = 90;
const CARD_PAD = 6; // metallic frame around the preview

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
  const line: React.CSSProperties = { height: 3, borderRadius: 1.5 };
  return (
    <div
      className="relative flex h-full w-full items-center"
      style={{ padding: `${inset * 0.9}px ${inset}px` }}
    >
      {/* ring glyph, top-left */}
      <div
        className="absolute rounded-full"
        style={{
          width: 7,
          height: 7,
          top: inset * 0.9,
          left: inset,
          border: `1.2px solid ${pal.textMuted}`,
        }}
      />
      {/* three text lines */}
      <div className="flex w-full flex-col" style={{ gap: 4.5 }}>
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
        style={{ width: 6, height: 6, right: inset, bottom: inset * 0.9, background: pal.accent }}
      />
    </div>
  );
}

/** Diagonal light/dark split for the "System / follows OS" card. */
function SystemSplit({ w }: { w: number }) {
  const light = THEME_PALETTES.light;
  const cyber = THEME_PALETTES.cyberpaste;
  const cyberBg = cyber.background;
  const lightBg = light.background;
  return (
    <div className="absolute inset-0" style={{ background: cyberBg }}>
      <WindowContent pal={cyber} w={w} />
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
  // The glow of the "System" card uses the cyberpaste face's accent.
  const glowAccent = mode === 'system' ? THEME_PALETTES.cyberpaste.accent : pal.accent;

  const PREVIEW_W = 76;

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
      {/* metallic card frame */}
      <div
        className="relative box-border flex items-center justify-center rounded-[9px] border transition-all duration-150"
        style={{
          width: cardWidth,
          height: 62,
          padding: CARD_PAD,
          background: 'linear-gradient(115deg, #404247 0%, #303237 45%, #26282D 100%)',
          borderColor: selected
            ? glowAccent
            : hover
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(255,255,255,0.16)',
          borderWidth: 1.5,
          boxShadow: selected
            ? `0 0 10px 0 ${glowAccent}80, 0 2px 6px rgba(0,0,0,0.4)`
            : '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        {/* mini "app window" preview */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[5px]"
          style={{
            background: pal.background,
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        >
          {mode === 'system' ? (
            <SystemSplit w={PREVIEW_W} />
          ) : (
            <WindowContent pal={pal} w={PREVIEW_W} />
          )}
        </div>
      </div>
      {/* caption */}
      <span
        className="mt-1.5 text-center text-[11.5px] leading-tight transition-colors duration-150"
        style={{
          fontWeight: selected ? 600 : 500,
          color: selected ? '#F0F2F6' : '#969AA2',
        }}
      >
        {caption}
      </span>
    </button>
  );
}
