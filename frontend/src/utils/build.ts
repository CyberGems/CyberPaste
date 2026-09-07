/** Build-time flags used to keep distribution-specific behavior isolated. */
export const IS_PORTABLE_BUILD = import.meta.env.VITE_CYBERPASTE_PORTABLE === 'true';
