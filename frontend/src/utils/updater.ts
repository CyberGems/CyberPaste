/** Normalize Tauri updater / invoke errors into a readable string for UI + logs. */
export function formatUpdaterError(err: unknown): string {
  if (err == null) return 'Unknown error';

  if (typeof err === 'string') {
    const trimmed = err.trim();
    return trimmed || 'Unknown error';
  }

  if (err instanceof Error) {
    const parts = [err.message?.trim()].filter(Boolean) as string[];
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause != null) {
      const nested = formatUpdaterError(cause);
      if (nested && nested !== parts[0]) parts.push(nested);
    }
    return parts.join(' — ') || 'Unknown error';
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const candidates = [obj.message, obj.error, obj.msg, obj.reason]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim());

    if (candidates.length > 0) {
      const nested =
        obj.cause != null
          ? formatUpdaterError(obj.cause)
          : obj.source != null
            ? formatUpdaterError(obj.source)
            : '';
      if (nested && !candidates.includes(nested)) {
        return `${candidates[0]} — ${nested}`;
      }
      return candidates[0];
    }

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}

/** True when the failure looks like a transport / reachability problem. */
export function isUpdaterNetworkError(message: string): boolean {
  return /fetch|network|connect|timeout|timed out|dns|tls|certificate|sending request|request for url|connection reset|unreachable|name resolution/i.test(
    message
  );
}

/** Compare updater versions while tolerating the optional leading `v` used by release tags. */
export function isSkippedUpdateVersion(
  version: string | null | undefined,
  skippedVersion: string | null | undefined
): boolean {
  if (!version || !skippedVersion) return false;
  const normalize = (value: string) => value.trim().replace(/^v/i, '');
  return normalize(version) === normalize(skippedVersion);
}
