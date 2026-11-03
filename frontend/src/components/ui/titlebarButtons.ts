/**
 * Shared hover/state language for the icon buttons that live in the title
 * bars (Full control bar and Compact title bar): a background tint on hover
 * and on toggled states, never a border outline and never a glow shadow.
 *
 * Compose with clsx: TITLEBAR_ICON_BUTTON + the button's size/radius classes
 * + one idle state, or an ON-state tint when the button is toggled.
 */

/** Shape/reset shared by every titlebar icon button (add size/radius per site). */
export const TITLEBAR_ICON_BUTTON =
  'flex items-center justify-center border transition-all focus:outline-none';

/** Idle + hover: neutral background tint. */
export const TITLEBAR_BTN_IDLE =
  'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80';

/** Idle + hover for secondary rows (dimmer idle icon). */
export const TITLEBAR_BTN_IDLE_SOFT =
  'border-transparent text-muted-foreground/70 hover:bg-accent hover:text-foreground active:bg-accent/80';

/** Toggled-on state: primary tint that deepens on hover (peek, emoji). */
export const TITLEBAR_BTN_ON_PRIMARY =
  'border-transparent bg-primary/15 text-primary hover:bg-primary/25';

/** Toggled-on state without hover change (pin, open More menu). */
export const TITLEBAR_BTN_ON_PRIMARY_STRONG = 'border-transparent bg-primary/20 text-primary';

/** Paused-monitoring state (amber tint). */
export const TITLEBAR_BTN_ON_AMBER =
  'border-transparent bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 active:bg-amber-500/25';

/** Destructive-flavored hover (close button), same no-outline rule. */
export const TITLEBAR_BTN_DANGER =
  'border-transparent text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/25';

/** View-mode toggle: primary icon with the neutral hover. */
export const TITLEBAR_BTN_MODE_TOGGLE =
  'border-transparent bg-transparent text-primary hover:bg-accent active:bg-accent/80';
