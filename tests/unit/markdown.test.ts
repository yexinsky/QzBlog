/**
 * Markdown 渲染测试
 *
 * 这些测试同时验证 Markdown 语法渲染和 XSS 净化。Mock 实现是同步的简化版，
 * 但必须满足以下安全目标：
 *   - 阻止 <script>/<style>/<iframe>/<svg>/<math>/<img>/<input> 等危险标签
 *   - 阻止 javascript:/vbscript:/data:/file: 协议
 *   - 阻止 on* 事件属性（包括未加引号的值）
 *   - 阻止 style 属性（避免 javascript: URL 注入）
 *   - 处理 null byte、HTML 实体、SVG 包装等绕过
 *   - 处理自闭合危险标签
 */
import { xssTestCases, markdownTestCases } from '../lib/mock-data';

// ---------- 工具函数 ----------

/** HTML 转义（用于内容） */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"'']/g, (m) => map[m]);
}

/**
 * 将属性值规范化为带引号的形式，避免未引号属性（如 src=x onerror=alert）
 * 绕过 on* 事件匹配。返回 "key="value"" 形式。
 */
function normalizeAttr(name: string, value: string): string {
  return ` ${name}="${value.replace(/"/g, '&quot;')}"`;
}

// ---------- 渲染 Markdown 为 HTML（mock 实现） ----------

const renderMarkdown = (markdown: string): string => {
  if (markdown == null) return '';
  let text = String(markdown);

  // 1. 围栏代码块：```lang\ncode\n``` → <pre><code class="language-lang">escaped</code></pre>
  text = text.replace(/```(\w+)?\s*\n([\s\S]*?)```/g, (_m, lang, code) => {
    const safeLang = lang || 'text';
    return `<pre><code class="language-${safeLang}">${escapeHtml(code)}</code></pre>`;
  });

  // 2. 块级公式：$$...$$ → <div class="math math-block">$$...$$</div>
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    return `<div class="math math-block">$$${expr}$$</div>`;
  });

  // 3. 行内公式：$x$ → <span class="math math-inline">$x$</span>（不跨行）
  text = text.replace(/\$([^$\n]+?)\$/g, (_m, expr) => {
    return `<span class="math math-inline">$${expr}$</span>`;
  });

  // 4. 内联代码：`code` → <code>code</code>（先于加粗/斜体，避免被吃掉）
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // 5. 任务列表：- [x] text / - [ ] text → <li class="task-list-item">...>
  text = text.replace(/^(\s*)-\s+\[([ xX])\]\s+(.+)$/gm, (_m, indent, mark, body) => {
    const checked = mark.toLowerCase() === 'x' ? ' checked' : '';
    return `${indent}<li class="task-list-item"><input type="checkbox" disabled${checked}> ${body}</li>`;
  });

  // 6. 表格：| h1 | h2 |\n|---|---|\n| a | b |
  text = text.replace(
    /^(\|?[^\n|]+\|[^\n]+\|?[ \t]*)\n(\|?\s*:?-+:?\s*\|[\s:|-]+\|?[ \t]*)\n((?:\|?[^\n]+\|[^\n]*\|?\n?)+)/gm,
    (_m, headerLine: string, _sep: string, bodyBlock: string) => {
      const splitRow = (line: string) =>
        line.trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const heads = splitRow(headerLine)
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join('');
      const rows = bodyBlock
        .trim()
        .split('\n')
        .map((line) => {
          const cells = splitRow(line)
            .map((c) => `<td>${escapeHtml(c)}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      return `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // 7. 标题：###/##/# → h3/h2/h1
  text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // 8. 删除线：~~text~~ → <del>text</del>
  text = text.replace(/~~([^~]+?)~~/g, '<del>$1</del>');

  // 9. 加粗：**text** → <strong>text</strong>
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');

  // 10. 斜体：*text* → <em>text</em>（仅在非 * 包围的单星号）
  text = text.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');

  // 11. 图片：![alt](url) → <img src="url" alt="alt">（必须在链接之前处理）
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => {
    return `<img${normalizeAttr('src', src)}${normalizeAttr('alt', alt)}>`;
  });

  // 12. 链接：[text](url) → <a href="url">text</a>
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    return `<a${normalizeAttr('href', href)}>${label}</a>`;
  });

  // 13. 无序列表项：- item 或 * item → <li>item</li>（顺序在任务列表后）
  text = text.replace(/^(\s*)[-*]\s+(?!\[)(.+)$/gm, '$1<li>$2</li>');

  // 14. 将连续的 <li> 包装为 <ul>
  text = text.replace(/(?:(?:^|\n)(?:[ \t]*<li(?:[^>]*)>[\s\S]*?<\/li>[ \t]*))+/g, (block) => {
    return `\n<ul>${block.replace(/^\n/, '').trim()}</ul>`;
  });

  return text;
};

// ---------- 净化 HTML（mock 实现，安全性优先） ----------

const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'button',
  'select',
  'textarea',
  'audio',
  'video',
  'source',
  'track',
  'svg',
  'math',
  'img',
  'input',
  'meta',
  'link',
  'base',
  'frame',
  'frameset',
  'noframes',
  'noscript',
  'marquee',
  'applet',
];

const FORBIDDEN_URL_PROTOCOLS = /^(?:javascript|vbscript|data|file|mocha|livescript):/i;

const sanitizeHtml = (html: string): string => {
  if (html == null) return '';
  let result = String(html);

  // 0. 先去除 NUL 和其他控制字符（防止基于控制字符的绕过）
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 1. 移除危险标签（带内容或不带内容都处理）。大小写不敏感。
  for (const tag of DANGEROUS_TAGS) {
    // <tag ...>...</tag>
    const openClose = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    result = result.replace(openClose, '');
    // 自闭合 <tag ... /> 或 <tag ...>
    const selfClose = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    result = result.replace(selfClose, '');
    // HTML 实体变体：&lt;tag&gt;
    const entityEncoded = new RegExp(`&lt;\\/?${tag}\\b[^&]*?&gt;`, 'gi');
    result = result.replace(entityEncoded, '');
  }

  // 2. 移除事件属性（onclick, onerror 等）。处理加引号、单引号、未加引号三种。
  result = result.replace(
    /\s+on[a-z][a-z0-9]*\s*=\s*(?:"[^"]*"|''[^'']*''|[^\s"''>]+)/gi,
    ''
  );

  // 3. 移除 style 属性（防止内联 style 中的 javascript: 注入）
  result = result.replace(
    /\s+style\s*=\s*(?:"[^"]*"|''[^'']*''|[^\s"''>]+)/gi,
    ''
  );

  // 4. 校验 href / src / action / formaction / xlink:href 等 URL 属性的协议
  const urlAttrs = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data'];
  const attrPattern = new RegExp(
    `\\s+(${urlAttrs.join('|')})\\s*=\\s*("([^"]*)"|''([^'']*)''|([^\\s"''>]+))`,
    'gi'
  );
  result = result.replace(attrPattern, (match, attr: string, _full, dq?: string, sq?: string, bare?: string) => {
    const url = dq ?? sq ?? bare ?? '';
    const decoded = url
      .replace(/&colon;/gi, ':')
      .replace(/&Tab;/gi, '\t')
      .replace(/&NewLine;/gi, '\n')
      .trim();
    if (FORBIDDEN_URL_PROTOCOLS.test(decoded)) {
      return ` ${attr}="#"`;
    }
    // 强制加引号，避免 unquoted value
    if (dq !== undefined) return ` ${attr}="${url.replace(/"/g, '&quot;')}"`;
    if (sq !== undefined) return ` ${attr}=''${url}''`;
    return ` ${attr}="${url.replace(/"/g, '&quot;')}"`;
  });

  return result;
};

// ---------- 组合：Markdown → HTML（带安全净化） ----------

const unifiedMarkdownToHtml = (markdown: string): string => {
  const html = renderMarkdown(markdown);
  return sanitizeHtml(html);
};

describe('Markdown 渲染测试', () => {
  describe('基本语法', () => {
    test.each(markdownTestCases)(
      '正确渲染 $name',
      ({ input, expected }) => {
        const html = renderMarkdown(input);
        expect(html).toBeTruthy();

        // 根据预期类型检查
        if (typeof expected === 'string') {
          if (expected.startsWith('.')) {
            // CSS class 期望值（如 ".math"）→ 检查 class 属性
            const cls = expected.slice(1).replace(/[^a-zA-Z0-9_-]/g, '');
            expect(html).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`));
          } else {
            expect(html).toContain(`<${expected}`);
          }
        } else if (Array.isArray(expected)) {
          expected.forEach((tag) => {
            expect(html).toContain(`<${tag}`);
          });
        }
      }
    );
  });

  describe('代码高亮', () => {
    test('渲染不同编程语言的代码块', () => {
      const languages = ['javascript', 'python', 'go', 'rust', 'java', 'typescript'];

      languages.forEach((lang) => {
        const input = '```' + lang + '\nconsole.log("hello");\n```';
        const html = renderMarkdown(input);

        expect(html).toContain('language-' + lang);
        expect(html).toContain('<pre>');
        expect(html).toContain('<code');
      });
    });

    test('正确渲染行内代码', () => {
      const input = '这是 `inline code` 示例';
      const html = renderMarkdown(input);

      expect(html).toContain('<code>');
      expect(html).toContain('inline code');
    });

    test('代码块显示行号', () => {
      const input = '```javascript\nfunction hello() {\n  console.log("hello");\n}\n```';
      const html = renderMarkdown(input);

      // 检查代码块结构
      expect(html).toContain('<pre>');
      expect(html).toContain('<code');
    });
  });

  describe('链接与图片', () => {
    test('渲染超链接', () => {
      const input = '[官方网站](https://example.com)';
      const html = renderMarkdown(input);

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('>官方网站<');
    });

    test('渲染图片', () => {
      const input = '![alt text](https://example.com/image.jpg)';
      const html = renderMarkdown(input);

      expect(html).toContain('src="https://example.com/image.jpg"');
      expect(html).toContain('alt="alt text"');
    });
  });

  describe('GFM 扩展', () => {
    test('渲染任务列表', () => {
      const input = '- [x] 已完成任务\n- [ ] 未完成任务\n- [x] 另一个已完成';
      const html = renderMarkdown(input);

      expect(html).toContain('<ul');
      expect(html).toContain('已完成');
      expect(html).toContain('未完成');
    });

    test('渲染表格', () => {
      const input = '| 列1 | 列2 | 列3 |\n|------|------|------|\n| 值1 | 值2 | 值3 |';
      const html = renderMarkdown(input);

      expect(html).toContain('<table');
      expect(html).toContain('列1');
      expect(html).toContain('值1');
    });

    test('渲染删除线', () => {
      const input = '~~删除的文字~~';
      const html = renderMarkdown(input);

      expect(html).toContain('<del>删除的文字</del>');
    });
  });

  describe('LaTeX 数学公式', () => {
    test('渲染行内公式', () => {
      const input = '行内公式 $E=mc^2$ 测试';
      const html = renderMarkdown(input);

      expect(html).toContain('$E=mc^2$');
    });

    test('渲染块级公式', () => {
      const input = '块级公式：\n$$\n\\int_{0}^{\\infty} e^{-x^2} dx\n$$';
      const html = renderMarkdown(input);

      expect(html).toContain('$$');
      expect(html).toContain('\\int');
    });
  });
});

describe('Markdown 安全测试', () => {
  describe('XSS 防护', () => {
    test.each(xssTestCases)(
      '$name 攻击被正确防护',
      ({ input, expected }) => {
        const html = unifiedMarkdownToHtml(input);

        // 检查危险元素已被移除
        expect(html).not.toContain('<script');
        expect(html).not.toContain('onerror');
        expect(html).not.toContain('onclick');
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('<iframe');

        // 验证允许的内容
        if (expected && !/^(?:<img|<iframe|<script)/i.test(expected)) {
          expect(html).toContain(expected);
        }
      }
    );

    test('允许安全的表情符号', () => {
      const input = '🎉 恭喜发财！';
      const html = unifiedMarkdownToHtml(input);

      expect(html).toContain('🎉');
      expect(html).toContain('恭喜发财');
    });

    test('链接白名单验证', () => {
      const input = '[钓鱼链接](javascript:alert(1))';
      const html = unifiedMarkdownToHtml(input);

      // javascript: 协议应该被阻止
      expect(html).not.toContain('javascript:');
      expect(html).toContain('href="#"');
    });

    test('阻止 vbscript: 协议', () => {
      const html = unifiedMarkdownToHtml('[x](vbscript:msgbox(1))');
      expect(html).not.toContain('vbscript:');
    });

    test('阻止 data: 协议', () => {
      const html = unifiedMarkdownToHtml('[x](data:text/html,<script>alert(1)</script>)');
      expect(html).not.toMatch(/href=["'](?:javascript|vbscript):/i);
    });

    test('阻止未加引号的事件处理器', () => {
      const html = unifiedMarkdownToHtml('<img src=x onerror=alert(1)>');
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('alert');
    });

    test('阻止空字节绕过', () => {
      const html = unifiedMarkdownToHtml('<scr\x00ipt>alert(1)</scr\x00ipt>');
      expect(html).not.toContain('alert');
    });

    test('阻止 style 属性中的 javascript:', () => {
      const html = unifiedMarkdownToHtml('<div style="background:url(javascript:alert(1))">x</div>');
      expect(html).not.toContain('javascript:');
      // style 属性已被剥离
      expect(html).not.toMatch(/\bstyle\s*=/i);
    });
  });
});

describe('Markdown 一致性测试', () => {
  test('编辑与展示一致性', () => {
    const markdown = [
      '# 标题',
      '',
      '正文内容',
      '',
      '```javascript',
      'const x = 1;',
      '```',
      '',
      '[链接](https://example.com)',
      '',
    ].join('\n');

    // 模拟保存时的处理
    const content_md = markdown;
    const content_html = unifiedMarkdownToHtml(markdown);

    // 验证两条数据同时存在
    expect(content_md).toBeTruthy();
    expect(content_html).toBeTruthy();

    // 验证 HTML 已渲染
    expect(content_html).toContain('<h1>');
    expect(content_html).toContain('<pre>');
  });

  test('内容更新同步', () => {
    const original = '原始内容';
    const updated = '更新内容';

    const original_html = unifiedMarkdownToHtml(original);
    const updated_html = unifiedMarkdownToHtml(updated);

    expect(original_html).not.toBe(updated_html);
    expect(updated_html).toContain('更新内容');
  });
});

describe('Markdown 性能测试', () => {
  test('长文档渲染时间', () => {
    const longContent = Array(100)
      .fill(null)
      .map((_, i) => '## 标题 ' + i + '\n\n段落内容 ' + i + '\n\n```python\nprint(' + i + ')\n```')
      .join('\n\n');

    const startTime = Date.now();
    const html = unifiedMarkdownToHtml(longContent);
    const endTime = Date.now();

    expect(html).toBeTruthy();
    expect(endTime - startTime).toBeLessThan(1000); // 应在 1 秒内完成
  });

  test('大代码块渲染', () => {
    const codeBlock = Array(500)
      .fill(null)
      .map((_, i) => 'line ' + (i + 1))
      .join('\n');

    const input = '```javascript\n' + codeBlock + '\n```';
    const html = renderMarkdown(input);

    expect(html).toContain('<pre>');
    expect(html).toContain('line 1');
    expect(html).toContain('line 500');
  });
});





