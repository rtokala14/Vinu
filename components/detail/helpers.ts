const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Pure-JS base64 encoder — `btoa` is not guaranteed to exist on Hermes.
 * Only used for ASCII ids (ABS series ids are UUIDs).
 */
export function base64Encode(input: string): string {
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const c1 = input.charCodeAt(i) & 0xff;
    const c2 = i + 1 < input.length ? input.charCodeAt(i + 1) & 0xff : undefined;
    const c3 = i + 2 < input.length ? input.charCodeAt(i + 2) & 0xff : undefined;
    output += B64_CHARS.charAt(c1 >> 2);
    output += B64_CHARS.charAt(((c1 & 3) << 4) | (c2 === undefined ? 0 : c2 >> 4));
    output +=
      c2 === undefined
        ? '='
        : B64_CHARS.charAt(((c2 & 15) << 2) | (c3 === undefined ? 0 : c3 >> 6));
    output += c3 === undefined ? '=' : B64_CHARS.charAt(c3 & 63);
  }
  return output;
}

/** Strip HTML tags/entities from server-provided rich-text descriptions. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** "Mar 4, 2026" style date from an epoch-ms timestamp. */
export function formatDate(ms: number | undefined | null): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
