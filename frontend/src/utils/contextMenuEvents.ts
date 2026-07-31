/** Dispatched when the app context menu opens/closes so rows can keep hover highlight. */
export const CONTEXT_MENU_EVENT = 'cyberpaste:context-menu';

export type ContextMenuEventDetail = {
  open: boolean;
  highlightId?: string | null;
};

export function dispatchContextMenuEvent(detail: ContextMenuEventDetail) {
  window.dispatchEvent(new CustomEvent(CONTEXT_MENU_EVENT, { detail }));
}
