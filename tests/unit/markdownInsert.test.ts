/**
 * Markdown insert helper tests.
 *
 * These tests verify the pure helpers in src/components/comments/markdownInsert
 * that power the MarkdownEditor toolbar. They run without a DOM or CodeMirror.
 */
import {
  wrapSelection,
  linkWrap,
  imageWrap,
  insertLinePrefix,
  insertBlock,
  EditorSnapshot,
} from '@/components/comments/markdownInsert';

function snap(text: string, from = text.length, to = text.length): EditorSnapshot {
  return { text, selectionFrom: from, selectionTo: to };
}

const BT = String.fromCharCode(96); // backtick

describe('wrapSelection', () => {
  test('wraps empty selection with paired markers', () => {
    const update = wrapSelection(snap(''), '**', '**', 'X');
    expect(update.changes).toEqual([
      { from: 0, to: 0, insert: '**X**' },
    ]);
    expect(update.cursor).toBe(1 + 2);
  });

  test('wraps selected text without losing content', () => {
    const update = wrapSelection(snap('hello world', 0, 5), '**', '**', 'X');
    expect(update.changes[0]).toEqual({ from: 0, to: 5, insert: '**hello**' });
    expect(update.cursor).toBe(7);
  });

  test('handles reversed selection range', () => {
    const update = wrapSelection(snap('hello world', 5, 0), '**', '**', 'X');
    expect(update.changes[0]).toEqual({ from: 0, to: 5, insert: '**hello**' });
    expect(update.cursor).toBe(7);
  });

  test('inserts symmetric markers for inline code', () => {
    const update = wrapSelection(snap('a b', 1, 2), BT, BT, 'X');
    expect(update.changes[0]).toEqual({ from: 1, to: 2, insert: BT + ' ' + BT });
  });

  test('strikethrough uses double tilde markers', () => {
    const update = wrapSelection(snap('old text'), '~~', '~~', 'X');
    expect(update.changes[0].insert).toBe('~~X~~');
  });

  test('italic uses single asterisk markers', () => {
    const update = wrapSelection(snap(''), '*', '*', 'X');
    expect(update.changes[0].insert).toBe('*X*');
  });
});

describe('linkWrap', () => {
  test('produces a valid markdown link with caret on URL part', () => {
    const update = linkWrap(snap(''), 'link', 'https://');
    expect(update.changes[0].insert).toBe('[link](https://)');
    expect(update.cursor).toBe(1 + 4 + 2);
  });

  test('wraps selection as the anchor text', () => {
    const update = linkWrap(snap('Qzhou Blog', 0, 11), 'link', 'https://');
    expect(update.changes[0]).toEqual({
      from: 0,
      to: 11,
      insert: '[Qzhou Blog](https://)',
    });
  });

  test('handles reversed selection range', () => {
    const update = linkWrap(snap('Qzhou Blog', 11, 0), 'link', 'https://');
    expect(update.changes[0]).toEqual({
      from: 0,
      to: 11,
      insert: '[Qzhou Blog](https://)',
    });
  });
});

describe('imageWrap', () => {
  test('produces a valid markdown image with caret on URL part', () => {
    const update = imageWrap(snap(''), 'alt', 'https://');
    expect(update.changes[0].insert).toBe('![alt](https://)');
    // Caret past ![
    expect(update.cursor).toBe(2 + 3 + 2);
  });

  test('uses selected text as alt when selection present', () => {
    const update = imageWrap(snap('Sunset Beach', 0, 12), 'alt', 'https://');
    expect(update.changes[0]).toEqual({
      from: 0,
      to: 12,
      insert: '![Sunset Beach](https://)',
    });
  });
});

describe('insertLinePrefix', () => {
  test('prefixes an empty line with # (H1)', () => {
    const update = insertLinePrefix(snap('', 0), '# ');
    expect(update.changes[0]).toEqual({ from: 0, to: 0, insert: '# ' });
    expect(update.cursor).toBe(2);
  });

  test('prefixes a non-empty line', () => {
    const update = insertLinePrefix(snap('hello', 0), '## ');
    expect(update.changes[0]).toEqual({ from: 0, to: 5, insert: '## hello' });
  });

  test('toggles off an existing heading prefix', () => {
    const update = insertLinePrefix(snap('# title', 4), '# ');
    expect(update.changes[0]).toEqual({ from: 0, to: 2, insert: '' });
    expect(update.cursor).toBe(2);
  });

  test('replaces existing list marker to avoid stacking', () => {
    const update = insertLinePrefix(snap('- item', 0), '* ');
    expect(update.changes[0].insert).toBe('* item');
  });

  test('places prefix at the start of the line even when cursor is mid-line', () => {
    const text = 'first line\nsecond line';
    const update = insertLinePrefix(snap(text, text.length - 3), '> ');
    expect(update.changes[0]).toEqual({
      from: 'first line'.length + 1,
      to: text.length,
      insert: '> second line',
    });
  });
});

describe('insertBlock', () => {
  test('inserts a fenced code block with caret on inner content', () => {
    const update = insertBlock(snap(''), BT + BT + BT + '\n', '\n' + BT + BT + BT, 'code here');
    expect(update.changes[0].insert).toBe(BT + BT + BT + '\ncode here\n' + BT + BT + BT + '\n');
  });

  test('wraps a multi-line selection in a block', () => {
    const text = 'line one\nline two';
    const update = insertBlock(snap(text, 0, text.length), '> ', '\n', 'quote');
    expect(update.changes[0].insert.startsWith('> ')).toBe(true);
    expect(update.changes[0].insert).toContain('\n');
  });

  test('does not duplicate a leading newline', () => {
    const update = insertBlock(snap('\nstart', 1, 1), BT + BT + BT + '\n', '\n' + BT + BT + BT, 'code');
    expect(update.changes[0].insert.startsWith('\n\n')).toBe(false);
  });
});
