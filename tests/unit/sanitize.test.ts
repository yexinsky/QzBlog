/**
 * XSS 防护测试
 */
import { xssTestCases } from '../lib/mock-data';

interface SanitizeConfig {
  allowedTags: string[];
  allowedAttributes: string[];
  allowedProtocols: string[];
}

const defaultConfig: SanitizeConfig = {
  allowedTags: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: ['href', 'class'],
  allowedProtocols: ['http:', 'https:'],
};

const sanitizeHtml = (html: string, config: SanitizeConfig = defaultConfig): string => {
  let result = html;
  const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'svg', 'math', 'link', 'meta'];
  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
    result = result.replace(regex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    result = result.replace(selfClosingRegex, '');
  });
  const eventAttrRegex = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
  result = result.replace(eventAttrRegex, '');
  const jsProtocolRegex = /(?:href|src)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi;
  result = result.replace(jsProtocolRegex, 'href="#"');
  const vbscriptRegex = /(?:href|src)\s*=\s*["']?\s*vbscript:[^"'>\s]*/gi;
  result = result.replace(vbscriptRegex, 'href="#"');
  const dataProtocolRegex = /(?:href|src)\s*=\s*["']?\s*data:[^"'>\s]*/gi;
  result = result.replace(dataProtocolRegex, '');
  const styleJsRegex = /style\s*=\s*["']?[^"']*(?:javascript|data):[^"'>\s]*/gi;
  result = result.replace(styleJsRegex, '');
  result = result.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  result = result.replace(/<svg[^>]*\/>/gi, '');
  result = result.replace(/<math[^>]*>[\s\S]*?<\/math>/gi, '');
  result = result.replace(/<math[^>]*\/>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*$/gi, '');
  result = result.replace(/<style[^>]*>[\s\S]*$/gi, '');
  result = result.replace(/\x00/g, '');
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  return result;
};

const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const sanitizeComment = (content: string): string => {
  let result = content;
  result = result.replace(/<[^>]+>/g, (match) => {
    const allowed = ['<code>', '</code>', '<strong>', '</strong>', '<em>', '</em>'];
    return allowed.includes(match) ? match : '';
  });
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    if (validateUrl(url)) return match;
    return text;
  });
  return result;
};

describe('XSS 防护测试', () => {
  describe('基本防护', () => {
    test.each(xssTestCases)('$name 被正确防护', ({ input, expected }) => {
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });
  });

  describe('标签过滤', () => {
    test('移除 script 标签', () => {
      const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script><p>World</p>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });
    test('移除 iframe 标签', () => {
      const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
      expect(result).not.toContain('<iframe');
    });
    test('保留安全的标签', () => {
      const result = sanitizeHtml('<p>Hello <strong>World</strong></p>');
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });
  });

  describe('属性过滤', () => {
    test('移除 onerror 属性', () => {
      const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain('onerror');
    });
    test('移除 onclick 属性', () => {
      const result = sanitizeHtml('<div onclick="alert(1)">点击我</div>');
      expect(result).not.toContain('onclick');
      expect(result).toContain('点击我');
    });
  });

  describe('协议过滤', () => {
    test('阻止 javascript: 协议', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">钓鱼链接</a>');
      expect(result).not.toContain('javascript:');
      expect(result).toContain('href="#"');
    });
    test('阻止 vbscript: 协议', () => {
      const result = sanitizeHtml('<a href="vbscript:msgbox(1)">链接</a>');
      expect(result).not.toContain('vbscript:');
    });
  });

  describe('SVG 和 MathML 防护', () => {
    test('移除 SVG 标签', () => {
      const result = sanitizeHtml('<svg><script>alert(1)</script></svg>');
      expect(result).not.toContain('<svg');
      expect(result).not.toContain('<script');
    });
    test('移除 MathML 标签', () => {
      const result = sanitizeHtml('<math><maction actiontype="statusline#http://evil">X</maction></math>');
      expect(result).not.toContain('<math');
    });
  });

  describe('边界情况', () => {
    test('空字符串处理', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });
});

describe('URL 验证测试', () => {
  test('有效的 https URL', () => {
    expect(validateUrl('https://example.com/path')).toBe(true);
  });
  test('无效的 javascript URL', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
  });
  test('无效的协议', () => {
    expect(validateUrl('ftp://example.com')).toBe(false);
  });
});

describe('集成安全测试', () => {
  test('完整攻击向量测试', () => {
    const attackVectors = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<a href="javascript:alert(1)">点击</a>',
      '<iframe src="https://evil.com"></iframe>',
    ];
    attackVectors.forEach((vector) => {
      const result = sanitizeHtml(vector);
      expect(result).not.toContain('alert');
      expect(result).not.toContain('javascript:');
    });
  });
});
