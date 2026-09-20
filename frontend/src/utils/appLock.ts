const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function formatRecoveryKeyInput(value: string): string {
  const normalized = value
    .toUpperCase()
    .split('')
    .filter((char) => RECOVERY_ALPHABET.includes(char))
    .join('')
    .slice(0, 16);
  return normalized.replace(/(.{4})(?=.)/g, '$1-');
}
