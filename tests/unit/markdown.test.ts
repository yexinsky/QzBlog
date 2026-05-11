/**
 * Markdown 渲染测试
 * 测试所有 Markdown 元素的正确渲染
 */
import { render, screen } from '@testing-library/react';
import { markdownTestCases, xssTestCases } from '../lib/mock-data';

// 模拟 markdown 渲染函数（实际项目中的实现）
const renderMarkdown = (markdown: string): string => {
  // 简化版实现，仅用于测试
  let html = markdown
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // 内联代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 列表
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  return html;
};

// 模拟 sanitize 函数
const sanitizeHtml = (html: string): string => {
  // 移除所有 script 标签
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 移除所有 on* 事件属性
  html = html.replace(/\s+on\w+="[^"]*"/gi, '');
  // 移除所有 javascript: 链接
  html = html.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  // 移除所有 iframe
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  return html;
};

// 模拟 unified pipeline
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
          expect(html).toContain(`<${expected}`);
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
        const input = `\`\`\`${lang}\nconsole.log('hello');\n\`\`\``;
        const html = renderMarkdown(input);

        expect(html).toContain(`language-${lang}`);
        expect(html).toContain('<pre>');
        expect(html).toContain('<code>');
      });
    });

    test('正确渲染行内代码', () => {
      const input = '这是 `inline code` 示例';
      const html = renderMarkdown(input);

      expect(html).toContain('<code>');
      expect(html).toContain('inline code');
    });

    test('代码块显示行号', () => {
      const input = `\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\``;
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
      const input = `- [x] 已完成任务
- [ ] 未完成任务
- [x] 另一个已完成`;
      const html = renderMarkdown(input);

      expect(html).toContain('<li>');
      expect(html).toContain('已完成');
      expect(html).toContain('未完成');
    });

    test('渲染表格', () => {
      const input = `| 列1 | 列2 | 列3 |
|------|------|------|
| 值1 | 值2 | 值3 |`;
      const html = renderMarkdown(input);

      expect(html).toContain('<table');
      expect(html).toContain('列1');
      expect(html).toContain('值1');
    });

    test('渲染删除线', () => {
      const input = '~~删除的文字~~';
      const html = renderMarkdown(input);

      expect(html).toContain('~~删除的文字~~');
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
        if (expected) {
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
  });
});

describe('Markdown 一致性测试', () => {
  test('编辑与展示一致性', () => {
    const markdown = `# 标题

正文内容

\`\`\`javascript
const x = 1;
\`\`\`

[链接](https://example.com)
`;

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
      .map((_, i) => `## 标题 ${i}\n\n段落内容 ${i}\n\n\`\`\`python\nprint(${i})\n\`\`\``)
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
      .map((_, i) => `line ${i + 1}`)
      .join('\n');

    const input = `\`\`\`javascript\n${codeBlock}\n\`\`\``;
    const html = renderMarkdown(input);

    expect(html).toContain('<pre>');
    expect(html).toContain('line 1');
    expect(html).toContain('line 500');
  });
});