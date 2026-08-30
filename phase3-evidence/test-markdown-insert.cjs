// Test markdownInsert pure functions (no DOM needed)
const path = require('path');

// Use esbuild to transpile TS to JS
const esbuild = require('esbuild');
const fs = require('fs');

const srcPath = 'D:/workspace/QzBlog/src/components/comments/markdownInsert.ts';
const source = fs.readFileSync(srcPath, 'utf8');

const result = esbuild.transformSync(source, {
  loader: 'ts', format: 'cjs', target: 'es2020'
});

const tmpPath = 'D:/workspace/QzBlog/phase3-evidence/markdownInsert.cjs';
fs.writeFileSync(tmpPath, result.code);

const mi = require(tmpPath);
const {
  wrapSelection,
  linkWrap,
  imageWrap,
  insertLinePrefix,
  insertBlock,
} = mi;

// Helper: apply changes to text
function apply(text, update) {
  let out = '';
  let prev = 0;
  for (const ch of update.changes) {
    out += text.slice(prev, ch.from);
    out += ch.insert;
    prev = ch.to;
  }
  out += text.slice(prev);
  return { text: out, cursor: update.cursor };
}

// Test cases
const results = [];

function snap(name, snap, update) {
  const applied = apply(snap.text, update);
  return { name, input: snap, applied };
}

// 1. bold: empty selection at start
results.push(snap('bold-empty', { text: '', selectionFrom: 0, selectionTo: 0 },
  wrapSelection({ text: '', selectionFrom: 0, selectionTo: 0 }, '**', '**', '粗体文字')));

// 2. bold: existing text "hello" selected from 0..5
results.push(snap('bold-selected', { text: 'hello world', selectionFrom: 0, selectionTo: 5 },
  wrapSelection({ text: 'hello world', selectionFrom: 0, selectionTo: 5 }, '**', '**', '粗体文字')));

// 3. italic
results.push(snap('italic', { text: '', selectionFrom: 0, selectionTo: 0 },
  wrapSelection({ text: '', selectionFrom: 0, selectionTo: 0 }, '*', '*', '斜体文字')));

// 4. link
results.push(snap('link', { text: '', selectionFrom: 0, selectionTo: 0 },
  linkWrap({ text: '', selectionFrom: 0, selectionTo: 0 }, '链接文字', 'https://')));

// 5. image
results.push(snap('image', { text: '', selectionFrom: 0, selectionTo: 0 },
  imageWrap({ text: '', selectionFrom: 0, selectionTo: 0 }, '图片描述', 'https://')));

// 6. H1 prefix on existing line
results.push(snap('h1-empty-doc', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertLinePrefix({ text: '', selectionFrom: 0, selectionTo: 0 }, '# ')));

// 7. H1 prefix on existing text
results.push(snap('h1-existing', { text: 'hello\n', selectionFrom: 0, selectionTo: 0 },
  insertLinePrefix({ text: 'hello\n', selectionFrom: 0, selectionTo: 0 }, '# ')));

// 8. H1 toggle off (already has #)
results.push(snap('h1-toggle-off', { text: '# hello', selectionFrom: 2, selectionTo: 2 },
  insertLinePrefix({ text: '# hello', selectionFrom: 2, selectionTo: 2 }, '# ')));

// 9. unordered list
results.push(snap('ul', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertLinePrefix({ text: '', selectionFrom: 0, selectionTo: 0 }, '- ')));

// 10. ordered list
results.push(snap('ol', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertLinePrefix({ text: '', selectionFrom: 0, selectionTo: 0 }, '1. ')));

// 11. task list
results.push(snap('task', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertLinePrefix({ text: '', selectionFrom: 0, selectionTo: 0 }, '- [ ] ')));

// 12. quote
results.push(snap('quote', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertLinePrefix({ text: '', selectionFrom: 0, selectionTo: 0 }, '> ')));

// 13. inline code
results.push(snap('inline-code', { text: '', selectionFrom: 0, selectionTo: 0 },
  wrapSelection({ text: '', selectionFrom: 0, selectionTo: 0 }, '`', '`', '代码')));

// 14. code block (empty)
results.push(snap('code-block-empty', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertBlock({ text: '', selectionFrom: 0, selectionTo: 0 }, '```\n', '\n```', '代码块')));

// 15. code block (after existing text)
results.push(snap('code-block-after-text', { text: 'hello', selectionFrom: 5, selectionTo: 5 },
  insertBlock({ text: 'hello', selectionFrom: 5, selectionTo: 5 }, '```\n', '\n```', '代码块')));

// 16. table
results.push(snap('table', { text: '', selectionFrom: 0, selectionTo: 0 },
  insertBlock({ text: '', selectionFrom: 0, selectionTo: 0 },
    '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n', '', '| 内容 | 内容 | 内容 |')));

// 17. strikethrough
results.push(snap('strike', { text: '', selectionFrom: 0, selectionTo: 0 },
  wrapSelection({ text: '', selectionFrom: 0, selectionTo: 0 }, '~~', '~~', '删除线')));

// 18. Safety: no script tag injection
const maliciousUpdate = wrapSelection({ text: '', selectionFrom: 0, selectionTo: 0 }, '', '', '<script>alert(1)</script>');
const maliciousApplied = apply('', maliciousUpdate);
const hasScript = maliciousApplied.text.includes('<script>') || maliciousApplied.text.includes('javascript:');
results.push({ name: 'safety-no-script', input: '<script>alert(1)</script>', applied: maliciousApplied, hasScript });

// 19. Safety: javascript: protocol
const jsProto = linkWrap({ text: 'click', selectionFrom: 0, selectionTo: 5 }, 'click', 'javascript:alert(1)');
const jsApplied = apply('click', jsProto);
const hasJs = jsApplied.text.toLowerCase().includes('javascript:');
results.push({ name: 'safety-js-proto', input: 'click', applied: jsApplied, hasJs, note: 'toolbar does not sanitize URLs - responsibility of renderer' });

// 20. H1 toggle - existing prefix removal at non-zero position
results.push(snap('h1-toggle-existing-with-pos', { text: 'foo\n# bar', selectionFrom: 8, selectionTo: 8 },
  insertLinePrefix({ text: 'foo\n# bar', selectionFrom: 8, selectionTo: 8 }, '# ')));

console.log(JSON.stringify(results, null, 2));
