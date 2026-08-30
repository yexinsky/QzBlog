import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

// 预定义支持的语言列表
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'c', 'cpp', 'csharp',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'sql', 'html', 'css', 'json', 'yaml',
  'markdown', 'bash', 'shell', 'dockerfile', 'graphql', 'xml', 'vue', 'jsx', 'tsx',
  'dart', 'elixir', 'erlang', 'haskell', 'lua', 'perl', 'r', 'objectivec', 'groovy',
];

/**
 * 自定义sanitize schema，允许基础格式化和链接
 */
const sanitizeSchema = {
  ...defaultSchema,
  // 站点内容为管理员撰写，标题锚点 id 保留原样（不加 user-content- 前缀），
  // 否则 TOC 的 #锚点 与正文 id 不一致导致跳转失效。
  clobberPrefix: '',
  tagNames: [...(defaultSchema.tagNames ?? []), 'span', 'div', 'mark', 'abbr'],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className', 'class'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className', 'class'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'class'],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
    // KaTeX 的上下标定位完全依赖行内 style（height/top/margin-left 等），
    // 必须放行，否则公式排版塌陷。
    div: [...(defaultSchema.attributes?.div || []), 'className', 'class', 'style'],
    // Heading anchor ids must survive sanitization so the TOC can deep-link.
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
  },
};
// KaTeX 输出大量带行内样式的 span；在上面 span 数组基础上追加 style。
sanitizeSchema.attributes.span = [...(sanitizeSchema.attributes.span || []), 'style'];

/**
 * 给 h1-h6 添加与 extractToc/generateHeadingId 一致的 id，供目录跳转使用。
 */
function rehypeHeadingIds() {
  return (tree: unknown) => {
    const seen = new Map<string, number>();
    visit(tree as never, 'element', (node: { tagName?: string; properties?: Record<string, unknown>; children?: unknown[] }) => {
      if (!node.tagName || !/^h[1-6]$/.test(node.tagName)) return;
      node.properties = node.properties ?? {};
      if (typeof node.properties.id === 'string' && node.properties.id !== '') return;
      const text = collectText(node);
      let id = generateHeadingId(text) || 'section';
      const count = seen.get(id) ?? 0;
      seen.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      node.properties.id = id;
    });
  };
}

function collectText(node: { children?: unknown[] }): string {
  let out = '';
  visit(node as never, 'text', (n: { value?: unknown }) => {
    out += typeof n.value === 'string' ? n.value : '';
  });
  return out;
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 渲染Markdown为HTML（用于文章正文）
 */
export async function renderMarkdown(
  content: string,
  options: { isDark?: boolean; enableMermaid?: boolean } = {}
): Promise<string> {
  const { isDark = false, enableMermaid = true } = options;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeKatex)
    // highlight.js 语法高亮；未知语言静默跳过，避免渲染失败
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeHeadingIds)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);

  const result = await processor.process(content);
  return result.toString();
}

/**
 * 渲染Markdown为HTML（用于评论，限制更多）
 */
export async function renderCommentMarkdown(content: string): Promise<string> {
  // 评论只允许基础格式：加粗、代码、链接
  const commentSanitizeSchema = {
    ...defaultSchema,
    tagNames: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a'],
    attributes: {
      ...defaultSchema.attributes,
      code: ['className', 'class'],
      pre: ['className', 'class'],
      a: ['href', 'target', 'rel'],
    },
  };

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, commentSanitizeSchema)
    .use(rehypeStringify);

  const result = await processor.process(content);
  return result.toString();
}

/**
 * 提取文章目录（TOC）
 */
export interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

export function extractToc(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const seen = new Map<string, number>();
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // 与 rehypeHeadingIds 使用同一套去重规则，保证目录 id 与正文锚点一致
    let id = generateHeadingId(text) || 'section';
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;

    toc.push({
      id,
      text,
      level,
      children: [],
    });
  }

  // 构建层级结构
  const result: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const item of toc) {
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  }

  return result;
}

/**
 * 将层级 TOC 树摊平为带缩进层级的列表，供目录组件按顺序渲染全部条目
 */
export function flattenToc(items: TocItem[]): Array<{ id: string; text: string; level: number }> {
  const out: Array<{ id: string; text: string; level: number }> = [];
  const walk = (nodes: TocItem[]) => {
    for (const item of nodes) {
      out.push({ id: item.id, text: item.text, level: item.level });
      if (item.children.length > 0) walk(item.children);
    }
  };
  walk(items);
  return out;
}

/**
 * 生成标题ID
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-龥\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 计算文章字数
 */
export function countWords(content: string): number {
  // 移除代码块
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  // 移除行内代码
  const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');
  // 移除链接
  const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // 移除图片
  const withoutImages = withoutLinks.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  // 移除Markdown标题符号
  const withoutHeadings = withoutImages.replace(/^#+\s+/gm, '');
  // 移除加粗、斜体标记
  const withoutEmphasis = withoutHeadings.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

  // 计算字符数
  const chineseChars = (withoutEmphasis.match(/[一-龥]/g) || []).length;
  const englishWords = withoutEmphasis
    .replace(/[一-龥]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return chineseChars + englishWords;
}

/**
 * 生成文章摘要
 */
export function generateSummary(content: string, maxLength: number = 200): string {
  // 移除代码块
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  // 移除行内代码
  const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');
  // 移除图片
  const withoutImages = withoutInlineCode.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  // 移除链接
  const withoutLinks = withoutImages.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // 移除标题符号
  const withoutHeadings = withoutLinks.replace(/^#+\s+/gm, '');
  // 移除强调标记（**加粗**、__加粗__、*斜体*、~~删除线~~），保证摘要为纯文本
  const withoutEmphasis = withoutHeadings
    .replace(/(\*\*\*|~~|\*\*|__)([^\n]*?)\1/g, '$2')
    .replace(/(\*|_)([^*_\n]+)\1/g, '$2');
  // 移除多个空格和换行
  const cleaned = withoutEmphasis.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // 在句子边界截断
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPunctuation = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('.')
  );

  if (lastPunctuation > maxLength * 0.7) {
    return truncated.slice(0, lastPunctuation + 1);
  }

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * 生成slug（URL友好的标识符）
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s一-龥-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 生成唯一的slug（带时间戳后缀）
 */
export function generateUniqueSlug(title: string): string {
  const baseSlug = generateSlug(title);
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

export { SUPPORTED_LANGUAGES, escapeHtml };
export default {
  renderMarkdown,
  renderCommentMarkdown,
  extractToc,
  flattenToc,
  generateHeadingId,
  countWords,
  generateSummary,
  generateSlug,
  generateUniqueSlug,
  SUPPORTED_LANGUAGES,
};




