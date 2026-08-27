/**
 * Pure helpers for inserting Markdown syntax into a document at a selection.
 *
 * The functions are deliberately decoupled from CodeMirror so they can be
 * unit-tested in isolation. The MarkdownEditor wires them to the editor via
 * dispatching a single transaction with the computed changes.
 */

export interface EditorSnapshot {
  /** Full document text. */
  text: string;
  /** Start of the (main) selection, in document offsets. */
  selectionFrom: number;
  /** End of the (main) selection, in document offsets. */
  selectionTo: number;
}

export interface EditorChange {
  /** Inclusive start offset to remove. */
  from: number;
  /** Exclusive end offset to remove. */
  to: number;
  /** Replacement text. */
  insert: string;
}

export interface EditorUpdate {
  changes: EditorChange[];
  /** New caret anchor. */
  cursor: number;
}

/**
 * Wrap a selection (or insert a placeholder) with paired Markdown markers.
 *
 * Examples:
 *   wrapSelection(snap, '**', '**', 'bold')  -> inserts '**bold**'
 *   wrapSelection(snap, BACKTICK, BACKTICK, 'code') -> inserts BACKTICKcodeBACKTICK
 */
export function wrapSelection(
  snap: EditorSnapshot,
  before: string,
  after: string,
  placeholder: string
): EditorUpdate {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const hasSelection = selected.length > 0;
  const inner = hasSelection ? selected : placeholder;
  const insert = before + inner + after;
  const cursor = from + before.length + inner.length;
  return {
    changes: [{ from, to, insert }],
    cursor,
  };
}

/**
 * Two-sided wrap where the second half contains a default suffix that the
 * caret is positioned on, allowing the user to immediately overtype it.
 *
 * Example:
 *   linkWrap(snap, 'link', 'https://')
 *     -> '[link](https://)' with caret on 'https://'
 */
export function linkWrap(
  snap: EditorSnapshot,
  placeholder: string,
  urlDefault: string
): EditorUpdate {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const text = selected || placeholder;
  const before = '[';
  const after = '](' + urlDefault + ')';
  const insert = before + text + after;
  const cursor = from + before.length + text.length + 2; // skip past ']('
  return {
    changes: [{ from, to, insert }],
    cursor,
  };
}

/**
 * Insert a Markdown image. The ! prefix and the trailing ](url) are added
 * automatically; caret is placed on the URL part so the user can overtype it.
 *
 * Example:
 *   imageWrap(snap, 'alt', 'https://')
 *     -> '![alt](https://)' with caret on the URL
 */
export function imageWrap(
  snap: EditorSnapshot,
  placeholder: string,
  urlDefault: string
): EditorUpdate {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const alt = selected || placeholder;
  const before = '![';
  const after = '](' + urlDefault + ')';
  const insert = before + alt + after;
  const cursor = from + before.length + alt.length + 2;
  return {
    changes: [{ from, to, insert }],
    cursor,
  };
}

/**
 * Insert a Markdown prefix at the beginning of the current line. If the line
 * already starts with the same prefix, removes it (acts as a toggle).
 */
export function insertLinePrefix(
  snap: EditorSnapshot,
  prefix: string
): EditorUpdate {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const lineStart = lastIndexOf(snap.text, '\n', from - 1) + 1;
  const lineText = readLine(snap.text, lineStart);

  if (lineText.startsWith(prefix)) {
    return {
      changes: [
        { from: lineStart, to: lineStart + prefix.length, insert: '' },
      ],
      cursor: Math.max(from - prefix.length, lineStart),
    };
  }

  // Replace existing leading list markers with the new prefix to avoid stacking.
  const cleaned = lineText.replace(/^([-*+] |\d+\. |\d+\) )/, '');
  const insert = prefix + cleaned;
  return {
    changes: [
      { from: lineStart, to: lineStart + lineText.length, insert },
    ],
    cursor: lineStart + insert.length,
  };
}

/**
 * Insert a block (such as a code block or table) on its own lines.
 * The selection (if non-empty) is wrapped by the block markers; otherwise a
 * placeholder block is inserted at the current cursor.
 */
export function insertBlock(
  snap: EditorSnapshot,
  before: string,
  after: string,
  placeholder: string
): EditorUpdate {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const inner = selected.length > 0 ? selected : placeholder;

  const needsLead = from > 0 && snap.text[from - 1] !== '\n';
  const lead = needsLead ? '\n' : '';
  const trail = !after.endsWith('\n') ? '\n' : '';
  const insert = lead + before + inner + after + trail;

  return {
    changes: [{ from, to, insert }],
    cursor: from + lead.length + before.length + inner.length,
  };
}

// ---- helpers ----------------------------------------------------------------

function lastIndexOf(text: string, needle: string, from: number): number {
  if (from < 0) return -1;
  for (let i = Math.min(from, text.length - 1); i >= 0; i--) {
    if (text[i] === needle) return i;
  }
  return -1;
}

function readLine(text: string, lineStart: number): string {
  let end = text.indexOf('\n', lineStart);
  if (end === -1) end = text.length;
  return text.slice(lineStart, end);
}
