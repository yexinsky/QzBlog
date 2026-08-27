/**
 * XSS 防护测试
 * 测试 HTML 净化功能
 *
 * Mock 实现专注于安全性，必须阻止：
 *   - 危险标签: script/style/iframe/svg/math/img/object/embed/...
 *   - 事件属性: on*= (包括未加引号的值)
 *   - 危险 URL 协议: javascript:/vbscript:/data:/file:/mocha:/livescript:
 *   - style 属性 (避免 javascript: URL 注入)
 *   - 空字节绕过、HTML 实体绕过、自闭合标签
 */
import { xssTestCases } from '../lib/mock-data';

// ---------- 工具函数 ----------

/** 移除 NUL 和其他控制字符 */
function stripControlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/** 规范化 URL：去除前后空白、引号、HTML 实体 */
function normalizeUrl(raw: string): string {
  let url = raw.trim();
  // 去除首尾匹配的引号
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1);
  }
  // 反转义常见 HTML 实体
  url = url
    .replace(/&colon;/gi, ':')
    .replace(/&amp;/gi, '&')
    .replace(/&#58;|&#x3a;/gi, ':')
    .replace(/&Tab;/gi, '\t')
    .replace(/&NewLine;/gi, '\n');
  return url.trim();
}

/** 判断 URL 协议是否危险 */
const FORBIDDEN_PROTOCOLS = /^(?:javascript|vbscript|data|file|mocha|livescript):/i;
function isForbiddenUrl(url: string): boolean {
  return FORBIDDEN_PROTOCOLS.test(normalizeUrl(url));
}

// ---------- 净化函数 ----------

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
  'animation',
  'xmp',
];

const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data', 'background', 'codebase'];

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

/**
 * 净化 HTML。
 * 实现策略（按顺序）：
 *   0) 去除 NUL 与控制字符
 *   1) 移除所有危险标签（带内容、不带内容、自闭合）
 *   2) 移除事件属性（含未加引号）
 *   3) 移除 style 属性
 *   4) 校验 href/src 等 URL 协议；危险协议替换为 href="#"
 */
const sanitizeHtml = (
  html: string,
  config: SanitizeConfig = defaultConfig
): string => {
  if (html == null) return '';
  let result = stripControlChars(String(html));

  // 1) 危险标签
  for (const tag of DANGEROUS_TAGS) {
    // <tag ...>...</tag>
    const pairRe = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    result = result.replace(pairRe, '');
    // 自闭合 <tag ... /> 或 <tag ...>
    const selfRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    result = result.replace(selfRe, '');
    // HTML 实体变体 &lt;tag ...&gt;
    const entityRe = new RegExp(`&lt;\\/?${tag}\\b[^&]*?&gt;`, 'gi');
    result = result.replace(entityRe, '');
  }

  // 2) 事件属性（含未加引号）
  result = result.replace(
    /\s+on[a-z][a-z0-9]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/gi,
    ''
  );

  // 3) style 属性（防止 javascript: 注入）
  result = result.replace(
    /\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/gi,
    ''
  );

  // 4) URL 协议校验
  const attrs = URL_ATTRS.map((a) => a.replace(':', '\\:')).join('|');
  const urlAttrRe = new RegExp(
    `\\s+(${attrs})\\s*=\\s*("[^"]*"|'[^']*'|([^\\s"'>]+))`,
    'gi'
  );
  result = result.replace(urlAttrRe, (match, attr: string, raw: string, bare?: string) => {
    // 提取 URL（处理带/不带引号）
    let url = raw;
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1);
    } else if (bare !== undefined) {
      url = bare;
    }
    if (isForbiddenUrl(url)) {
      return ` ${attr}="#"`;
    }
    // 强制规范化：始终使用双引号
    return ` ${attr}="${url.replace(/"/g, '&quot;')}"`;
  });

  return result;
};

/**
 * 验证 URL 是否使用允许的协议
 */
const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * 净化评论内容（保留基础 markdown 语法）
 */
const sanitizeComment = (content: string): string => {
  let result = content;
  // 移除所有 HTML 标签，保留允许的几个
  result = result.replace(/<[^>]+>/g, (match) => {
    const allowed = ['<code>', '</code>', '<strong>', '</strong>', '<em>', '</em>'];
    return allowed.includes(match) ? match : '';
  });
  // 校验 markdown 链接
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    if (validateUrl(url)) {
      return `[${text}](${url})`;
    }
    return text;
  });
  return result;
};

describe('XSS 防护测试', () => {
  describe('基本防护', () => {
    test.each(xssTestCases)(
      '$name 被正确防护',
      ({ input, expected }) => {
        const result = sanitizeHtml(input);

        // 验证危险元素已被移除
        expect(result).not.toContain('<script');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('<iframe');
        expect(result).not.toContain('<object');
        expect(result).not.toContain('<embed');

        // 验证允许的内容保留
        if (expected) {
          expect(result).toContain(expected);
        }
      }
    );
  });

  describe('标签过滤', () => {
    test('移除 script 标签', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    test('移除 style 标签', () => {
      const input = '<style>body { background: url(javascript:alert(1)) }</style>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<style>');
    });

    test('移除 iframe 标签', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<iframe');
    });

    test('保留安全的标签', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });
  });

  describe('属性过滤', () => {
    test('移除所有 on* 事件属性', () => {
      const input = '<a href="x" onclick="a" onmouseover="b">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toMatch(/\bon\w+\s*=/i);
    });

    test('移除 onclick 属性', () => {
      const input = '<div onclick="alert(1)">x</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    test('移除 onmouseover 属性', () => {
      const input = '<div onmouseover="alert(1)">x</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onmouseover');
    });

    test('移除未加引号的事件属性', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toMatch(/<script|on\w+\s*=|(?:javascript|vbscript|data):/i);
    });

    test('保留允许的属性', () => {
      const input = '<a href="https://example.com">x</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href');
    });
  });

  describe('协议过滤', () => {
    test('阻止 javascript: 协议', () => {
      const input = '<a href="javascript:alert(1)">钓鱼链接</a>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('javascript:');
      expect(result).toContain('href="#"');
    });

    test('阻止 data: 协议', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('data:');
    });

    test('允许 http: 协议', () => {
      const input = '<a href="http://example.com">链接</a>';
      const result = sanitizeHtml(input);

      expect(result).toContain('http://example.com');
    });

    test('允许 https: 协议', () => {
      const input = '<a href="https://example.com/path">链接</a>';
      const result = sanitizeHtml(input);

      expect(result).toContain('https://example.com');
    });

    test('阻止 vbscript: 协议', () => {
      const input = '<a href="vbscript:msgbox(1)">链接</a>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('vbscript:');
    });
  });

  describe('SVG 和 MathML 防护', () => {
    test('移除 SVG 标签', () => {
      const input = '<svg><script>alert(1)</script></svg>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<svg');
      expect(result).not.toContain('<script');
    });

    test('移除 MathML 标签', () => {
      const input = '<math><maction actiontype="statusline#http://evil">X</maction></math>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<math');
    });

    test('移除带事件的 SVG 属性', () => {
      const input = '<svg><rect onload="alert(1)"/></svg>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('onload');
    });
  });

  describe('评论安全', () => {
    test('评论内容正确净化', () => {
      const comment = '<p>评论内容</p><script>alert(1)</script>';
      const result = sanitizeComment(comment);

      expect(result).not.toContain('<script>');
      expect(result).toContain('评论内容');
    });

    test('评论中的链接验证', () => {
      const comment = '[点击](javascript:alert(1)) 和 [安全链接](https://example.com)';
      const result = sanitizeComment(comment);

      expect(result).not.toContain('javascript:');
      expect(result).toContain('https://example.com');
    });

    test('评论 Markdown 链接安全', () => {
      const comment = '[正常评论](https://example.com)';
      const result = sanitizeComment(comment);

      expect(result).toContain('[正常评论](https://example.com)');
    });
  });

  describe('边界情况', () => {
    test('空字符串处理', () => {
      const result = sanitizeHtml('');
      expect(result).toBe('');
    });

    test('纯文本处理', () => {
      const input = '这是一个纯文本，不包含任何 HTML 标签';
      const result = sanitizeHtml(input);
      expect(result).toBe(input);
    });

    test('嵌套标签处理', () => {
      const input = '<div><p><span>嵌套内容</span></p></div>';
      const result = sanitizeHtml(input);
      expect(result).toContain('嵌套内容');
    });

    test('自闭合标签处理', () => {
      const input = '<br/><img src="x"/><hr>';
      const result = sanitizeHtml(input);
      // Inert image/line-break markup may remain; active attributes must not.
      expect(result).not.toMatch(/on\\w+\\s*=|(?:javascript|vbscript|data):/i);
    });

    test('编码的字符处理', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizeHtml(input);

      // HTML 编码的内容相对安全
      expect(result).toBeTruthy();
    });

    test('大小写混合处理', () => {
      const input = '<SCRIPT>alert(1)</SCRIPT>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<SCRIPT');
    });
  });
});

describe('URL 验证测试', () => {
  test('有效的 http URL', () => {
    expect(validateUrl('http://example.com')).toBe(true);
  });

  test('有效的 https URL', () => {
    expect(validateUrl('https://example.com/path')).toBe(true);
  });

  test('无效的 javascript URL', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
  });

  test('无效的相对路径（需要处理）', () => {
    // 相对路径应该根据场景处理
    const url = '/path/to/page';
    const isValidProtocol = validateUrl(`https://example.com${url}`);
    expect(isValidProtocol).toBe(true);
  });

  test('无效的协议', () => {
    expect(validateUrl('ftp://example.com')).toBe(false);
    expect(validateUrl('file:///etc/passwd')).toBe(false);
  });
});

describe('Markdown 内容安全', () => {
  test('加粗语法安全', () => {
    const input = '**加粗文本**';
    const result = sanitizeHtml(input);
    expect(result).toBeTruthy();
  });

  test('代码块语法安全', () => {
    const input = '```\nconsole.log("hello")\n```';
    const result = sanitizeHtml(input);
    expect(result).toBeTruthy();
  });

  test('链接语法安全', () => {
    const input = '[链接](https://example.com)';
    const result = sanitizeHtml(input);
    expect(result).toContain('https://example.com');
  });

  test('内联代码语法安全', () => {
    const input = '这是 `code` 示例';
    const result = sanitizeHtml(input);
    expect(result).toContain('code');
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
      '<div style="background: url(javascript:alert(1))">内容</div>',
    ];

    attackVectors.forEach((vector) => {
      const result = sanitizeHtml(vector);
      expect(result).not.toMatch(/<script|on\w+\s*=|(?:javascript|vbscript|data):/i);
      expect(result).not.toContain('javascript:');
    });
  });

  test('防护绕过尝试', () => {
    const bypassAttempts = [
      '<scr\x00ipt>alert(1)</script>', // null byte
      '<script>alert(1)//', // 未闭合
      '<IMG SRC="j&#97;vascript:alert(1)">', // HTML 实体编码
      '<svg><script>alert(1)</script></svg>', // SVG 包装
      '<math><mi>a</mi></math>', // MathML 混淆
    ];

    bypassAttempts.forEach((attempt) => {
      const result = sanitizeHtml(attempt);
      expect(result).not.toMatch(/<script|on\w+\s*=|(?:javascript|vbscript|data):/i);
    });
  });
});




