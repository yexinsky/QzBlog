/**
 * Tiny self-contained Markdown -> HTML renderer used only by the
 * home-page test seed scripts. Intentionally NOT depending on
 * `src/lib/markdown.ts` because that module is wired to Next.js /
 * browser globals and is unsuitable for a standalone CLI script.
 *
 * It supports the subset we actually use inside the seed fixtures:
 *   - ATX headings (# ... ######)
 *   - paragraphs (blank-line separated)
 *   - fenced code blocks ```lang ... ```
 *   - inline `code`, *em*, **strong**
 *
 * Output is plain HTML. Sanitization beyond HTML escaping is not needed
 * because the seed fixtures themselves are static and trusted.
 */
export function renderSimpleMarkdown(input: string): string {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length === 0) return;
    const text = buf.join(' ').trim();
    if (text.length > 0) {
      out.push(`<p>${escapeHtmlInline(text)}</p>`);
    }
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i].replace(/\s+$/, '');

    // fenced code block
    const fence = /^```([\w-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || '';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing fence
      const cls = lang ? ` class="language-${escapeAttr(lang)}"` : '';
      out.push(
        `<pre><code${cls}>${escapeHtmlBlock(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    // ATX headings
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      out.push(`<h${level}>${escapeHtmlInline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    // blank line -> paragraph break
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const m = /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (m) items.push(`<li>${escapeHtmlInline(m[1])}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // paragraph accumulator
    const paraBuf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      paraBuf.push(lines[i].replace(/\s+$/, ''));
      i += 1;
    }
    flushParagraph(paraBuf);
  }

  return out.join('\n');
}

function escapeHtmlInline(s: string): string {
  return escapeHtmlBlock(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtmlBlock(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '');
}
