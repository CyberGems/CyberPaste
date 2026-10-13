function sanitizeNotes(text: string): string {
  return (
    text
      // Strip HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Strip header logo paragraphs
      .replace(/<p\s+align=["']center["']>[\s\S]*?<\/p>/gi, '')
      // Strip release title if duplicate (e.g. ## 📋 CyberPaste v1.24.0: Release Notes)
      .replace(/^#{1,2}\s*.*?CyberPaste\s+v?[\d.]+:?\s*Release Notes\s*$/gim, '')
      // Strip download / asset tables and checksum sections from modal preview
      .replace(/#{2,4}\s*📦\s*(?:Downloads|Descargas)[\s\S]*/i, '')
      .replace(/#{2,4}\s*🔐\s*(?:Checksums|Sumas de verificación)[\s\S]*/i, '')
      // Strip footer
      .replace(/\*Crafted with precision[\s\S]*/i, '')
      // Strip introductory blockquotes
      .replace(/^>\s*\*\*.*?(?:New to CyberPaste|Nuevo en CyberPaste).*?(?:\r?\n|$)/gim, '')
      // Normalize excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Localized GitHub release-notes selector (CyberClock pattern).
 *
 * Release bodies ship English first plus a Spanish `<details>` block
 * (`<summary>...Español...</summary>`). This picks the section matching the
 * user's language: Spanish users see only the Spanish notes, everyone else
 * sees the English notes with the Spanish block removed.
 */
export function normalizeReleaseLang(lang?: string | null): string {
  const raw = (lang || '').toLowerCase().split('-')[0];
  if (!raw || raw === 'auto') {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().split('-')[0] || 'en';
    }
    return 'en';
  }
  return raw;
}

export function extractLocalizedReleaseNotes(
  body: string | null | undefined,
  lang?: string | null
): string {
  if (!body) return '';
  const code = normalizeReleaseLang(lang);

  // 1. Explicit comment tags: <!-- lang:es --> ... <!-- /lang:es -->
  const commentRegex = new RegExp(
    `<!--\\s*lang:${code}\\s*-->([\\s\\S]*?)<!--\\s*/lang:${code}\\s*-->`,
    'i'
  );
  const commentMatch = body.match(commentRegex);
  if (commentMatch?.[1]?.trim()) return sanitizeNotes(commentMatch[1].trim());

  // 2. Spanish <details> block or Spanish header section.
  if (code === 'es') {
    const esBlockRegex =
      /(?:<details>[\s\S]*?<summary>[\s\S]*?(?:español|spanish)[\s\S]*?<\/summary>([\s\S]*?)<\/details>)|(?:#{2,4}\s*(?:.*?(?:español|novedades|cambios).*?)\r?\n([\s\S]*?)(?=(?:#{2,4}\s)|<\/details>|$))/i;
    const esMatch = body.match(esBlockRegex);
    const content = esMatch ? esMatch[1] || esMatch[2] : null;
    if (content?.trim()) return sanitizeNotes(content.trim());
  }

  // 3. Fallback: strip Spanish details blocks so other languages stay clean.
  const cleaned = body.replace(
    /<details>[\s\S]*?<summary>[\s\S]*?(?:español|spanish)[\s\S]*?<\/summary>[\s\S]*?<\/details>/gi,
    ''
  );
  return sanitizeNotes(cleaned);
}
